import asyncio
import json
import logging
import websockets
import numpy as np
from pylsl import resolve_byprop, StreamInlet
from data.eeg_data_simulator import LSLDataSimulator
from data.lsl_stream_connector import LSLStreamConnector

logging.basicConfig(level=logging.DEBUG)

class EEGWebSocketServer:
    def __init__(self, host="0.0.0.0", port=8765, bufsize=20):
        self.host = host
        self.port = port
        self.bufsize = bufsize
        self.simulator = LSLDataSimulator()
        self.connector = None
        self.reference_channels = []

    async def websocket_handler(self, websocket):
        logging.info("[WebSocket] New client connected.")
        try:
            # Discover all LSL streams
            all_streams = self.simulator.find_streams()
            if not all_streams:
                await websocket.send(json.dumps({"error": "No streams available."}))
                return

            marker_streams = []
            data_streams = []

            for stream in all_streams:
                stream_info = {
                    "name": stream.name(),
                    "type": stream.type(),
                    "source_id": stream.source_id()
                }

                if stream.type().lower() == "markers":
                    marker_streams.append(stream_info)
                else:
                    data_streams.append(stream_info)

            await websocket.send(json.dumps({
                "type": "stream_list",
                "data_streams": data_streams,
                "marker_streams": marker_streams
            }))

            while True:
                message = await websocket.recv()
                selection = json.loads(message)

                if selection.get("type") == "start_data":
                    selected_data = selection.get("data_stream")
                    self.reference_channels = selection.get("reference_channels", [])
                    if not selected_data or "source_id" not in selected_data:
                        await websocket.send(json.dumps({"error": "Invalid EEG data stream selection."}))
                        continue

                    self.connector = LSLStreamConnector(bufsize=self.bufsize)
                    if not self.connector.connect_by_source_id(selected_data["source_id"]):
                        await websocket.send(json.dumps({"error": "Failed to connect to EEG stream."}))
                        return

                    await websocket.send(json.dumps({"channels": self.connector.ch_names}))
                    asyncio.create_task(self.stream_real_time(websocket, self.connector.ch_names))

                elif selection.get("type") == "start_marker":
                    selected_marker = selection.get("marker_stream")
                    if selected_marker and "source_id" in selected_marker:
                        logging.info(f"Marker stream selected: {selected_marker['name']} ({selected_marker['source_id']})")
                        asyncio.create_task(self.marker_listener(websocket, selected_marker))
                    else:
                        logging.info("No marker stream selected.")

        except websockets.exceptions.ConnectionClosed:
            logging.info("WebSocket disconnected.")
        finally:
            stream = self.connector.stream if self.connector else None
            if stream and hasattr(stream, "connected"):
                try:
                    if stream.connected:
                        stream.disconnect()
                        logging.info("Disconnected from EEG stream.")
                except Exception as e:
                    logging.error(f"Error during stream disconnect: {e}")

    async def marker_listener(self, websocket, marker_stream_info):
        name = marker_stream_info["name"]
        source_id = marker_stream_info["source_id"]
        logging.info(f"Looking for Marker stream '{name}' (source_id={source_id})...")

        streams = resolve_byprop("source_id", source_id, timeout=5)
        if not streams:
            logging.warning(f"Marker stream '{name}' not found.")
            return

        inlet = StreamInlet(streams[0])
        logging.info(f"Connected to Marker stream: {name}")

        try:
            while True:
                sample, timestamp = inlet.pull_sample(timeout=0.0)
                if sample:
                    logging.debug(f"[MARKER] Trigger received: {sample[0]} at {timestamp}")
                    await websocket.send(json.dumps({
                        "type": "trigger",
                        "stream_name": name,
                        "trigger": sample[0],
                        "timestamp": timestamp
                    }))
                await asyncio.sleep(0.01)
        except websockets.exceptions.ConnectionClosed:
            logging.warning("Marker stream stopped.")

    def apply_reference_cleaning(self, data, channels):
        ref_indices = [channels.index(ch) for ch in self.reference_channels if ch in channels]
        if not ref_indices:
            return data
        ref_data = np.mean(data[ref_indices, :], axis=0)
        return data - ref_data

    async def stream_real_time(self, websocket, channels):
        interval = self.connector.bufsize / self.connector.sfreq if self.connector.sfreq else 0.1
        logging.info("Streaming EEG data with reference cleaning...")

        try:
            while True:
                data, timestamps = self.connector.get_data(winsize=1, picks=channels)
                if data is None or timestamps is None or len(data) == 0:
                    continue

                cleaned_data = self.apply_reference_cleaning(data, channels)

                logging.debug(f"[EEG] Data received: shape={data.shape}, first 5 ts={timestamps[:5].tolist()}")
                logging.debug(f"[EEG] Sending {len(channels)} channels with {len(timestamps)} samples")

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
