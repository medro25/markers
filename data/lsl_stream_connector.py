import time
from mne_lsl.stream import StreamLSL as Stream

class LSLStreamConnector:
    def __init__(self, bufsize, ch_names=None, sfreq=None):
        """
        Initialize the LSL Stream Connector.

        Parameters:
        - bufsize: Buffer size for the stream.
        - ch_names: List of channel names (optional).
        - sfreq: Sampling frequency of the EEG data (optional).
        """
        self.bufsize = bufsize
        self.ch_names = ch_names  # Define default if necessary
        self.sfreq = sfreq  # Define default if necessary
        self.stream = None
        print(f"[INIT] LSLStreamConnector initialized with bufsize={self.bufsize}")

    def connect(self, stream_name):
        """Connect to an LSL stream by its name."""
        try:
            print(f"[CONNECT] Connecting to LSL stream: {stream_name}...")
            self.stream = Stream(bufsize=self.bufsize, name=stream_name)
            self.stream.connect()
            print(f"✅ Successfully connected to stream: {stream_name}")

            # Set default `sfreq` and `ch_names` from the stream if not provided
            if self.sfreq is None:
                self.sfreq = self.stream.info["sfreq"]
                print(f"[CONNECT] Retrieved sfreq: {self.sfreq} Hz")
            if self.ch_names is None:
                self.ch_names = self.stream.info["ch_names"]
                print(f"[CONNECT] Retrieved ch_names: {self.ch_names}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to connect to LSL stream: {e}")
            return False

    def get_data(self, winsize=None, picks=None):
        """
        Retrieve EEG data from the stream.

        Parameters:
        - winsize: Size of the window in seconds to retrieve data.
        - picks: Channels to pick for data retrieval.

        Returns:
        - data: EEG data for the specified window and channels.
        - ts: Timestamps for the retrieved data.
        """
        if not self.stream:
            print(" ERROR: No active LSL stream. Run `connect()` first.")
            return None, None

        try:
            if not self.ch_names:
                raise AttributeError("ch_names attribute is not set.")
            if not self.sfreq:
                raise AttributeError("sfreq attribute is not set.")

            if picks is None:
                picks = self.ch_names[:6]  # Default to first 6 channels

            if winsize is None:
                winsize = self.stream.n_new_samples / self.sfreq

            print(f"[GET DATA] Retrieving data with winsize={winsize} sec and picks={picks}...")
            data, ts = self.stream.get_data(winsize, picks=picks)

            #print(f"✅ Retrieved {data.shape[1]} samples.")
            #print(f"[GET DATA] Sample data (first 5 values from first channel): {data[0][:5]}")  # Print first 5 values
            #print("data",data)
            #print("ts",ts)
            return data, ts

        except Exception as e:
            print(f"[ERROR] Data retrieval failed: {e}")
            return None, None

    def stream_real_time(self):
        """Continuously streams EEG data in real-time."""
        if not self.stream:
            print(" ERROR: No active stream. Connect first using `connect()`.")
            return

        interval = self.bufsize / self.sfreq if self.sfreq else 0.1
        print("\n📡 Streaming real-time EEG data... (Press Ctrl+C to stop)")

        try:
            while True:
                data, timestamps = self.get_data(winsize=1)
                if data is not None:
                    print(f"[DEBUG] Received {data.shape[1]} samples.")
                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n Stopping real-time stream.")
            self.stream.disconnect()

# Running the script to test 
if __name__ == "__main__":
    stream_name = input("\nEnter the stream name to connect: ")  # User selects stream name
    connector = LSLStreamConnector(bufsize=2)

    if connector.connect(stream_name):  # FIXED: Call `connect()` instead of `connect_by_name()`
        connector.stream_real_time()  # Start streaming
