import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MultiChannelGraph = ({ eegData, referenceChannels, triggers }) => {
  if (!eegData.data.length || !eegData.timestamps.length) return <p>No EEG data</p>;

  const labels = eegData.timestamps;

  const datasets = eegData.selected_channels.map((channel, idx) => {
    let data = eegData.data[idx].slice();

    // Apply reference
    if (referenceChannels && referenceChannels.length > 0) {
      const refIndices = referenceChannels.map(ref => eegData.selected_channels.indexOf(ref)).filter(i => i !== -1);
      if (refIndices.length > 0) {
        const refData = refIndices.map(i => eegData.data[i]);
        const avgRef = data.map((_, j) => refData.reduce((sum, r) => sum + r[j], 0) / refData.length);
        data = data.map((val, j) => val - avgRef[j]);
      }
    }

    return {
      label: channel,
      data,
      borderColor: `hsl(${(idx * 360) / eegData.selected_channels.length}, 70%, 50%)`,
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.1
    };
  });

  return (
    <div style={{ width: "100%", height: "500px", padding: "10px" }}>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }}
      />
    </div>
  );
};

export default MultiChannelGraph;
