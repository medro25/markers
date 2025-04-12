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
        self.reference_channels = []  # Will be set by the frontend (user's selection)

    async def websocket_handler(self, websocket):
        logging.info("[WebSocket] New client connected.")

        try:
            all_streams = self.simulator.find_streams()
            if not all_streams:
                await websocket.send(json.dumps({"error": "No streams available."}))
                return

            marker_streams = []
            data_streams = []

            for stream in all_streams:
                if stream.type().lower() == "markers":
                    marker_streams.append(stream)
                else:
                    data_streams.append(stream)

            # Send available streams information to frontend
            await websocket.send(json.dumps({
                "type": "stream_list",
                "data_streams": [{"name": s.name(), "type": s.type()} for s in data_streams],
                "marker_streams": [{"name": s.name(), "type": s.type()} for s in marker_streams]
            }))

            message = await websocket.recv()
            selection = json.loads(message)
            selected_data_name = selection.get("data_stream")
            selected_marker_name = selection.get("marker_stream")

            # Receive the selected reference channels from the frontend
            self.reference_channels = selection.get("reference_channels", [])  # Updated to allow dynamic selection

            if not selected_data_name:
                await websocket.send(json.dumps({"error": "No data stream selected."}))
                return

            if selected_marker_name:
                marker_task = asyncio.create_task(
                    self.marker_listener(websocket, selected_marker_name)
                )

            self.connector = LSLStreamConnector(bufsize=self.bufsize)
            if not self.connector.connect(selected_data_name):
                await websocket.send(json.dumps({"error": "Failed to connect to EEG stream."}))
                return

            # Send available channels to the frontend for selection
            await websocket.send(json.dumps({"channels": self.connector.ch_names}))

            await self.stream_real_time(websocket, self.connector.ch_names)

        except websockets.exceptions.ConnectionClosed:
            logging.info("WebSocket disconnected.")
        finally:
            if self.connector:
                if self.connector.stream:
                    if self.connector.stream.connected:
                        logging.info("Disconnecting from EEG stream.")
                        self.connector.stream.disconnect()
                    else:
                        logging.warning("Tried to disconnect, but stream was not connected.")
                else:
                    logging.warning("No stream to disconnect.")


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

    def apply_reference_cleaning(self, data, channels):
        # Use the selected reference channels
        ref_indices = [channels.index(ch) for ch in self.reference_channels if ch in channels]
        if not ref_indices:
            return data  # No reference channels found
        ref_data = np.mean(data[ref_indices, :], axis=0)
        cleaned_data = data - ref_data
        return cleaned_data

    async def stream_real_time(self, websocket, channels):
        interval = self.connector.bufsize / self.connector.sfreq if self.connector.sfreq else 0.1
        logging.info("Streaming EEG data with reference cleaning...")

        try:
            while True:
                data, timestamps = self.connector.get_data(winsize=1, picks=channels)
                if data is None or timestamps is None or len(data) == 0:
                    continue

                # Apply reference cleaning based on the selected channels
                cleaned_data = self.apply_reference_cleaning(data, channels)
                logging.debug(f"Reference channels: {self.reference_channels}")
                logging.debug(f"Cleaned data sample for channel 0: {cleaned_data[0][:10]}")


                # Send cleaned EEG data to frontend
                await websocket.send(json.dumps({
                    "type": "eeg",
                    "timestamps": timestamps.tolist(),
                    "data": cleaned_data.tolist(),
                    "selected_channels": channels
                }))
                await asyncio.sleep(interval)
        except websockets.exceptions.ConnectionClosed:
            logging.info("EEG stream closed.")

    async def start_server(self):
        logging.info(f"Server running at ws://{self.host}:{self.port}")
        async with websockets.serve(self.websocket_handler, self.host, self.port, ping_interval=None):
            await asyncio.Future()

    def run(self):
        asyncio.run(self.start_server())

if __name__ == "__main__":
    EEGWebSocketServer().run()
