import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MultiChannelGraph = ({ eegData, referenceChannels, triggers }) => {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() => {
    if (!eegData.data.length || !eegData.timestamps.length) return;

    const timestamps = eegData.timestamps;

    const datasets = eegData.selected_channels.map((channel, idx) => {
      let data = eegData.data[idx].slice();

      // Apply reference cleaning
      if (referenceChannels && referenceChannels.length > 0) {
        const refIndices = referenceChannels
          .map(ref => eegData.selected_channels.indexOf(ref))
          .filter(index => index !== -1);

        if (refIndices.length > 0) {
          const referenceData = refIndices.map(i => eegData.data[i]);
          const avgRef = data.map((_, j) =>
            referenceData.reduce((sum, refArr) => sum + refArr[j], 0) / refIndices.length
          );
          data = data.map((val, j) => val - avgRef[j]);
        }
      }

      // Trigger dot style (shared logic)
      const dotStyle = timestamps.map(t =>
        triggers.some(trigger => Math.abs(trigger.timestamp - t) < 0.001)
          ? 5 : 0
      );
      const dotColor = timestamps.map(t =>
        triggers.some(trigger => Math.abs(trigger.timestamp - t) < 0.001)
          ? 'red' : 'transparent'
      );

      return {
        label: channel,
        data,
        borderColor: "blue",
        borderWidth: 1.5,
        tension: 0.1,
        pointRadius: dotStyle,
        pointBackgroundColor: dotColor,
      };
    });

    setChartData({ labels: timestamps, datasets });

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    });
  }, [eegData, referenceChannels, triggers]);

  return (
    <div style={{
      width: "100%",
      padding: "10px",
      marginTop: "20px",
      border: "1px solid #ccc"
    }}>
      {chartData ? (
        <Line data={chartData} options={chartOptions} />
      ) : (
        <p>No EEG data</p>
      )}
    </div>
  );
};

export default MultiChannelGraph;
