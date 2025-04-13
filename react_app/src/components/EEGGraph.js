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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const EEGGraph = ({ eegData, selectedChannel, triggers, referenceChannels }) => {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() => {
    if (!selectedChannel || !eegData.data.length || !eegData.timestamps.length) return;

    const channelIndex = eegData.selected_channels.indexOf(selectedChannel);
    if (channelIndex === -1) {
      setChartData(null);
      return;
    }

    const timestamps = eegData.timestamps;
    let rawDataPoints = eegData.data[channelIndex].slice();
    let dataPoints = rawDataPoints.slice();

    if (referenceChannels && referenceChannels.length > 0) {
      const referenceIndices = referenceChannels
        .map(ref => eegData.selected_channels.indexOf(ref))
        .filter(index => index !== -1);

      if (referenceIndices.length > 0) {
        const referenceData = referenceIndices.map(idx => eegData.data[idx]);
        const avgReference = dataPoints.map((_, i) => {
          const sum = referenceData.reduce((acc, arr) => acc + arr[i], 0);
          return sum / referenceIndices.length;
        });

        dataPoints = dataPoints.map((val, i) => val - avgReference[i]);
      }
    }

    // Match trigger timestamps to nearest EEG timestamps (for rendering red dots)
    const dotStyle = timestamps.map((t, i) => {
      const isTrigger = triggers.some(trigger => Math.abs(trigger.timestamp - t) < 0.001);
      return {
        pointRadius: isTrigger ? 5 : 0,
        pointBackgroundColor: isTrigger ? 'red' : 'transparent'
      };
    });

    setChartData({
      labels: timestamps,
      datasets: [
        {
          label: selectedChannel,
          data: dataPoints,
          borderColor: "blue",
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: dotStyle.map(p => p.pointRadius),
          pointBackgroundColor: dotStyle.map(p => p.pointBackgroundColor),
        },
      ],
    });

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          title: { display: true, text: "Timestamp" },
        },
        y: {
          title: { display: true, text: "EEG Signal (µV)" },
        },
      },
    });
  }, [eegData, selectedChannel, triggers, referenceChannels]);

  return (
    <div style={{ marginTop: "20px", width: "100%", maxWidth: "90vw" }}>
      <h2>EEG Data for {selectedChannel}</h2>
      {chartData ? (
        <div style={{
          width: "100%",
          height: "40vh",
          minHeight: "300px",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "20px"
        }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p>No data available for {selectedChannel}.</p>
      )}
    </div>
  );
};

export default EEGGraph;
