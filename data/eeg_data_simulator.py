import time
import uuid
from pylsl import resolve_streams
from mne_lsl.stream import StreamLSL as Stream  # Use MNE-LSL's StreamLSL instead of pylsl's StreamInlet

class LSLDataSimulator:
    def __init__(self, chunk_size=200):
        """Initialize LSLDataSimulator to detect LSL streams dynamically."""
        self.chunk_size = chunk_size
        self.source_id = uuid.uuid4().hex
        self.stream = None
        self.sfreq = None
        self.n_channels = None
        self.ch_names = None
        self.streams = None  # Store discovered streams
        print(f"[DEBUG] Initialized LSLDataSimulator with chunk_size={self.chunk_size} and source_id={self.source_id}")

    def find_streams(self):
        """Searches for active LSL streams and lists all available streams with channel names."""
        print("[DEBUG] Searching for active LSL streams...")

        # Look for all available LSL streams
        self.streams = resolve_streams()
        if not self.streams:
            print("WARNING: No LSL streams found. Make sure your LSL stream is active.")
            return None

        print(f"✅ Found {len(self.streams)} LSL stream(s):\n")

        for i, stream in enumerate(self.streams):
            print(f"📡 Stream {i+1}:")
            print(f"  🔹 Name: {stream.name()}")
            print(f"  🔹 Type: {stream.type()}")
            print(f"  🔹 Source ID: {stream.source_id()}")
            print(f"  🔹 Sampling Rate: {stream.nominal_srate()} Hz")
            print(f"  🔹 Channel Count: {stream.channel_count()}")
            print("-" * 50)

        return self.streams
    # that is only for testing the streams not a real connecting to the streams

    def stream_data(self, stream_index=0):
        """Selects a stream by index, prints channel names, and starts data streaming using MNE-LSL."""
        if not self.streams:
            print("⚠️ ERROR: No streams available. Run `find_streams()` first.")
            return

        if stream_index >= len(self.streams):
            print(f" ERROR: Invalid stream index {stream_index}. Only {len(self.streams)} streams available.")
            return

        # Select the stream
        selected_stream = self.streams[stream_index]

        print(f"\n🔗 Connecting to Stream '{selected_stream.name()}' using MNE-LSL...")

        # Create a StreamLSL object (MNE-LSL)
        self.stream = Stream(bufsize=2, name=selected_stream.name(), stype=selected_stream.type())
        self.stream.connect()

        # Extract metadata
        self.sfreq = self.stream.info["sfreq"]
        self.n_channels = self.stream.info["nchan"]
        self.ch_names = self.stream.info["ch_names"]

        # Print Stream Information & Channel Names
        print(f"✅ Connected to Stream '{selected_stream.name()}'")
        print(f"  🔹 Type: {selected_stream.type()}")
        print(f"  🔹 Sampling Rate: {self.sfreq} Hz")
        print(f"  🔹 Channel Count: {self.n_channels}")
        print(f"  🔹 Channel Names: {', '.join(self.ch_names) if self.ch_names else 'Unknown'}")
        print("\n📡 Streaming data... (Press Ctrl+C to stop)")

        # Start Data Streaming
        interval = self.chunk_size / self.sfreq if self.sfreq > 0 else 0.1
        try:
            while True:
                data, timestamps = self.stream.get_data(winsize=1)  # Get data from MNE-LSL stream
                print("data",data)
                if data.size > 0:
                    print(f"[DEBUG] Received {data.shape[1]} samples.")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n Stopping LSL streaming.")
            self.stream.disconnect()

# Testing the class
if __name__ == "__main__":
    simulator = LSLDataSimulator(chunk_size=200)
    available_streams = simulator.find_streams()  # List available streams

    if available_streams:
        print("[TEST] Stream discovery completed successfully.")
        simulator.stream_data(0)  # Connect to the first available stream and start streaming
