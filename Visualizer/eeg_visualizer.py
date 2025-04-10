from matplotlib import pyplot as plt

class EEGVisualizer:
    def __init__(self, ch_names, picks):
        self.ch_names = ch_names
        self.picks = picks
        self.colors = ['r', 'g', 'b', 'c', 'm', 'y']
        print("Initializing EEGVisualizer...")
        print(f"Channel Names: {self.ch_names}")
        print(f"Picks: {self.picks}")
        self.fig, self.ax = self.setup_plot()

    def setup_plot(self):
        """Set up the Matplotlib plot for the EEG channels."""
        plt.ion()  # Enable interactive mode for live plotting
        print("Setting up the plot...")
        fig, ax = plt.subplots(6, 1, sharex=True, constrained_layout=True)
        plt.show()  # Ensure the plot window appears
        print("Plot setup complete.")
        return fig, ax

    def update_plot(self, ts, data):
        """Update the plot with new EEG data."""
        print("Updating plot with new data...")
        print(f"Timestamps: {ts}")
        print(f"Data: {data}")

        for axis in self.ax:
            axis.clear()  # Clear previous plot
        print("Cleared previous plot.")

        # Plot each channel's data
        for idx, data_channel in enumerate(data):
            print(f"Plotting data for channel {self.picks[idx]} with color {self.colors[idx]}")
            self.ax[idx].plot(ts, data_channel, color=self.colors[idx])

        # Add titles and labels
        for idx, ch in enumerate(self.picks):
            self.ax[idx].set_title(f"EEG {ch}")
            print(f"Set title for channel {ch}")
        self.ax[-1].set_xlabel("Timestamp (LSL time)")
        print("Set x-axis label.")

        plt.pause(0.1)  # Increase pause duration slightly
        plt.show(block=True)  # Ensures the plot is displayed without blocking
        print("Plot update complete.\n")

if __name__ == "__main__":
    ch_names = ["Fp1", "Fp2", "F3", "F4", "C3", "C4"]
    picks = ch_names[:6]

    visualizer = EEGVisualizer(ch_names, picks)

    ts = list(range(100))
    data = [[i + j for i in range(100)] for j in range(6)]

    
    plt.show(block=True)  # Keep the plot window open
