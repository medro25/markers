import time
from mne_lsl.stream import StreamLSL as Stream
from pylsl import resolve_byprop


class LSLStreamConnector:
    def __init__(self, bufsize, ch_names=None, sfreq=None):
        self.bufsize = bufsize
        self.ch_names = ch_names
        self.sfreq = sfreq
        self.stream = None
        print(f"[INIT] LSLStreamConnector initialized with bufsize={self.bufsize}")

    def connect(self, stream_name):
        try:
            print(f"[CONNECT] Connecting to LSL stream by name: {stream_name}...")
            self.stream = Stream(bufsize=self.bufsize, name=stream_name)
            self.stream.connect()
            print(f"[CONNECT] Successfully connected to stream: {stream_name}")
            self._update_stream_info()
            return True
        except Exception as e:
            print(f"[ERROR] Failed to connect to LSL stream by name: {e}")
            return False

    def connect_by_source_id(self, source_id, wait_sec=2):
        attempt = 0
        while True:
            try:
                print(f"[CONNECT] Attempt {attempt + 1}: Resolving LSL stream with source_id={source_id}...")
                streams = resolve_byprop("source_id", source_id, timeout=3)
                if not streams:
                    raise RuntimeError(f"No stream found with source_id={source_id}")

                resolved_stream = streams[0]
                stream_name = resolved_stream.name()
                stream_type = resolved_stream.type()

                print(f"[CONNECT] Found stream with name='{stream_name}', type='{stream_type}', source_id='{source_id}'")

                self.stream = Stream(bufsize=self.bufsize, name=stream_name, stype=stream_type)
                self.stream.connect()

                print(f"[CONNECT] Successfully connected to stream with source_id: {source_id}")
                self._update_stream_info()
                return True

            except Exception as e:
                print(f"[ERROR] Connection failed: {e}. Retrying in {wait_sec} seconds...")
                time.sleep(wait_sec)
                attempt += 1

    def _update_stream_info(self):
        if self.sfreq is None:
            self.sfreq = self.stream.info["sfreq"]
            print(f"[INFO] Retrieved sampling frequency: {self.sfreq} Hz")
        if self.ch_names is None:
            self.ch_names = self.stream.info["ch_names"]
            print(f"[INFO] Retrieved channel names: {self.ch_names}")

    def get_data(self, winsize=None, picks=None):
        if not self.stream:
            print("[ERROR] No active LSL stream. Run connect() or connect_by_source_id() first.")
            return None, None

        try:
            if not self.ch_names:
                raise AttributeError("ch_names attribute is not set.")
            if not self.sfreq:
                raise AttributeError("sfreq attribute is not set.")

            if picks is None:
                picks = self.ch_names[:6]

            if winsize is None:
                winsize = self.stream.n_new_samples / self.sfreq

            print(f"[GET DATA] Retrieving data: winsize={winsize}, picks={picks}")
            data, ts = self.stream.get_data(winsize, picks=picks)
            return data, ts

        except Exception as e:
            print(f"[ERROR] Data retrieval failed: {e}")
            return None, None

    def stream_real_time(self):
        if not self.stream:
            print("[ERROR] No active stream. Use connect_by_source_id() or connect().")
            return

        interval = self.bufsize / self.sfreq if self.sfreq else 0.1
        print("[INFO] Streaming EEG data in real-time... (Ctrl+C to stop)")

        try:
            while True:
                data, timestamps = self.get_data(winsize=1)
                if data is not None:
                    print(f"[DEBUG] Received {data.shape[1]} samples.")
                time.sleep(interval)

        except KeyboardInterrupt:
            print("[INFO] Stopping stream.")
            if self.stream:
                self.stream.disconnect()
