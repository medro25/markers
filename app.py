import asyncio
import json
import logging
import websockets
import numpy as np
from pylsl import resolve_streams, resolve_byprop, StreamInlet
from data.eeg_data_simulator import LSLDataSimulator
from data.lsl_stream_connector import LSLStreamConnector

logging.basicConfig(level=logging.DEBUG)

class EEGWebSocketServer:
    def __init__(self, host="0.0.0.0", port=8765, bufsize=200):
        self.host = host
        self.port = port
        self.bufsize = bufsize
        self.simulator = LSLDataSimulator()
        self.connector = None

    async def websocket_handler(self, websocket):
        logging.info("[WebSocket] New client connected.")

        try:
            # Find all available LSL streams
            all_streams = self.simulator.find_streams()
            if not all_streams:
                await websocket.send(json.dumps({"error": "No streams available."}))
                return

            # Log all found streams
            logging.info("Found LSL streams:")
            for stream in all_streams:
                logging.info(f"  - Name: {stream.name()}, Type: {stream.type()}")

            # Separate marker and numerical data streams
            marker_streams = []
            data_streams = []

            for stream in all_streams:
                if stream.type().lower() == "markers":
                    marker_streams.append(stream)
                else:
                    data_streams.append(stream)

            # Send stream lists to frontend
            await websocket.send(json.dumps({
                "type": "stream_list",
                "data_streams": [{"name": s.name(), "type": s.type()} for s in data_streams],
                "marker_streams": [{"name": s.name(), "type": s.type()} for s in marker_streams]
            }))

            # Receive selected stream names
            message = await websocket.recv()
            selection = json.loads(message)
            selected_data_name = selection.get("data_stream")
            selected_marker_name = selection.get("marker_stream")

            if not selected_data_name:
                await websocket.send(json.dumps({"error": "No data stream selected."}))
                return

            # Start marker stream listener if selected
            if selected_marker_name:
                marker_task = asyncio.create_task(
                    self.marker_listener(websocket, selected_marker_name)
                )

            # Connect to EEG data stream
            self.connector = LSLStreamConnector(bufsize=self.bufsize)
            if not self.connector.connect(selected_data_name):
                await websocket.send(json.dumps({"error": "Failed to connect to EEG stream."}))
                return

            await websocket.send(json.dumps({"channels": self.connector.ch_names}))

            # Stream EEG data
            await self.stream_real_time(websocket, self.connector.ch_names)

        except websockets.exceptions.ConnectionClosed:
            logging.info("WebSocket disconnected.")
        finally:
            if self.connector:
                self.connector.stream.disconnect()

    async def marker_listener(self, websocket, marker_stream_name):
        logging.info(f"Looking for Marker stream '{marker_stream_name}'...")
        streams = resolve_byprop('name', marker_stream_name, timeout=5)
        if not streams:
            logging.warning(f"Marker stream '{marker_stream_name}' not found.")
            return

        inlet = StreamInlet(streams[0])
        logging.info(f"Connected to Marker stream: {marker_stream_name}")

        try:
            while True:
                sample, timestamp = inlet.pull_sample(timeout=0.0)
                if sample:
                    await websocket.send(json.dumps({
                        "type": "trigger",
                        "stream_name": marker_stream_name,
                        "trigger": sample[0],
                        "timestamp": timestamp
                    }))
                await asyncio.sleep(0.01)
        except websockets.exceptions.ConnectionClosed:
            logging.warning("Marker stream stopped.")

    async def stream_real_time(self, websocket, channels):
        interval = self.connector.bufsize / self.connector.sfreq if self.connector.sfreq else 0.1
        logging.info("Streaming EEG data...")

        try:
            while True:
                data, timestamps = self.connector.get_data(winsize=1, picks=channels)
                if data is None or timestamps is None or len(data) == 0:
                    continue

                await websocket.send(json.dumps({
                    "type": "eeg",
                    "timestamps": timestamps.tolist(),
                    "data": data.tolist(),
                    "selected_channels": channels
                }))
                await asyncio.sleep(interval)
        except websockets.exceptions.ConnectionClosed:
            logging.info("EEG stream closed.")

    async def start_server(self):
        logging.info(f"Server running at ws://{self.host}:{self.port}")
        async with websockets.serve(self.websocket_handler, self.host, self.port):
            await asyncio.Future()  # Keep server alive

    def run(self):
        asyncio.run(self.start_server())

if __name__ == "__main__":
    EEGWebSocketServer().run()
