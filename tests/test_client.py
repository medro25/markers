import asyncio
import websockets
import json
import matplotlib.pyplot as plt

async def visualize_eeg_data():
    uri = "ws://127.0.0.1:8765"  # WebSocket server address
    try:
        print(f"Attempting to connect to WebSocket server at {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected to the WebSocket server.")
            plt.ion()  # Enable interactive mode

            # Create subplots for 6 EEG channels
            fig, axes = plt.subplots(6, 1, sharex=True, constrained_layout=True, figsize=(10, 8))
            channel_colors = ['r', 'g', 'b', 'c', 'm', 'y']  # Colors for channels

            while True:
                try:
                    print("Waiting for data from the server...")
                    message = await websocket.recv()
                    print("Received data from server.")
                    data = json.loads(message)
                    timestamps = data["timestamp"]
                    eeg_data = data["data"]
                    ch_names = data["ch_names"]

                    # Clear previous plots
                    for ax in axes:
                        ax.clear()

                    # Plot data for each channel
                    for k, (channel_data, ax) in enumerate(zip(eeg_data, axes)):
                        ax.plot(timestamps, channel_data, color=channel_colors[k])
                        ax.set_title(f"EEG {ch_names[k]}")

                    axes[-1].set_xlabel("Timestamp (LSL time)")  # Add x-axis label to the last subplot
                    plt.pause(0.01)  # Pause to update the plot
                except Exception as e:
                    print(f"Error receiving or plotting data: {e}")
                    break
    except Exception as e:
        print(f"Failed to connect to WebSocket server: {e}")

# Run the visualization
asyncio.run(visualize_eeg_data())
