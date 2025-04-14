import uuid
import time
import numpy as np
from matplotlib import pyplot as plt
from mne import set_log_level
 
# MNE-LSL components
from mne_lsl.datasets import sample
from mne_lsl.player import PlayerLSL as Player
from mne_lsl.stream import StreamLSL as Stream
 
# Suppress extensive logs
set_log_level("WARNING")
 
# Generate unique source IDs for the EEG and ECG streams
source_id_eeg = uuid.uuid4().hex
source_id_ecg = uuid.uuid4().hex
 
# Load EEG data from MNE-LSL dataset
fname_eeg = sample.data_path() / "sample-ant-raw.fif"
print("Downloading EEG data...")
player_eeg = Player(fname_eeg, chunk_size=200, source_id=source_id_eeg)
player_eeg.start()
 
# Load ECG data from MNE-LSL dataset
fname_ecg = sample.data_path() / "sample-ecg-raw.fif"
print("Downloading ECG data...")
player_ecg = Player(fname_ecg, chunk_size=200, source_id=source_id_ecg)
player_ecg.start()
 
# Retrieve player info to get metadata
info_eeg = player_eeg.info
sfreq_eeg = info_eeg["sfreq"]  # Sampling frequency for EEG
ch_names_eeg = info_eeg['ch_names']  # EEG Channel names
print(ch_names_eeg)
print(f"EEG Streaming at {sfreq_eeg} Hz with channels: {ch_names_eeg}")
 
info_ecg = player_ecg.info
sfreq_ecg = info_ecg["sfreq"]  # Sampling frequency for ECG
ch_names_ecg = info_ecg['ch_names']  # ECG Channel names
print(ch_names_ecg)
print(f"ECG Streaming at {sfreq_ecg} Hz with channels: {ch_names_ecg}")
 
# Initialize LSL streams
stream_eeg = Stream(bufsize=2, source_id=source_id_eeg)
stream_ecg = Stream(bufsize=2, source_id=source_id_ecg)
stream_eeg.connect()
stream_ecg.connect()
 
# Select 3 EEG and 3 ECG channels
picks_eeg = ch_names_eeg[:3]  # Select the first 3 EEG channels dynamically
picks_ecg = ch_names_ecg[:3]  # Select the first 3 ECG channels dynamically
colors_eeg = ['r', 'g', 'b']  # Colors for EEG signals
colors_ecg = ['c', 'm', 'y']  # Colors for ECG signals
 
# Create two separate figure windows
plt.ion()  # Turn on interactive mode
fig_eeg, axes_eeg = plt.subplots(3, 1, sharex=True, constrained_layout=True)
fig_eeg.canvas.manager.set_window_title("EEG Stream Visualization")
 
fig_ecg, axes_ecg = plt.subplots(3, 1, sharex=True, constrained_layout=True)
fig_ecg.canvas.manager.set_window_title("ECG Stream Visualization")
 
# Start streaming and plotting data in real-time
while True:
    # Clear previous plots
    for ax in axes_eeg:
        ax.clear()
    for ax in axes_ecg:
        ax.clear()
 
    # Retrieve EEG data
    winsize_eeg = max(1, stream_eeg.n_new_samples / sfreq_eeg)
    data_eeg, ts_eeg = stream_eeg.get_data(winsize=winsize_eeg, picks=picks_eeg)
    print("eeg data",data_eeg)
 
    # Retrieve ECG data
    winsize_ecg = max(1, stream_ecg.n_new_samples / sfreq_ecg)
    data_ecg, ts_ecg = stream_ecg.get_data(winsize=winsize_ecg, picks=picks_ecg)
 
    # Ensure data is received before plotting
    if len(data_eeg) == 0:
        print("Warning: No EEG data received")
        continue
    if len(data_ecg) == 0:
        print("Warning: No ECG data received")
        continue
 
    # Remove DC offset and scale EEG data
    data_eeg = np.array(data_eeg) - np.mean(data_eeg, axis=1, keepdims=True)
    data_eeg *= 1e6  # Convert EEG data to microvolts
 
    # Remove DC offset and scale ECG data
    data_ecg = np.array(data_ecg) - np.mean(data_ecg, axis=1, keepdims=True)
 
    # Set labels and legends
    axes_eeg[-1].set_xlabel("Timestamp (LSL time)")
    axes_ecg[-1].set_xlabel("Timestamp (LSL time)")
    for ax in axes_eeg:
        ax.legend()
    for ax in axes_ecg:
        ax.legend()
 
    # Pause briefly to simulate real-time acquisition
    plt.pause(0.01)
 
# Cleanup: stop the streams and disconnect
stream_eeg.disconnect()
stream_ecg.disconnect()
player_eeg.stop()
player_ecg.stop()
 