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
      layout: {
        padding: 0,
      },
      elements: {
        point: {
          radius: 0
        }
      },
      scales: {
        x: { display: false }, // ❌ hide x-axis
        y: { display: false }, // ❌ hide y-axis
      },
    });
    
    
  }, [eegData, selectedChannel, triggers, referenceChannels]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "100px", // 👈 Minimized height
      marginBottom: "0px", // 👈 No space between signals
      borderBottom: "1px solid #eee" // optional light separator
    }}>
      {/* Channel name on the left */}
      <div style={{
        width: "80px",
        textAlign: "right",
        paddingRight: "10px",
        fontSize: "0.9em",
        fontWeight: "bold"
      }}>
        {selectedChannel}
      </div>
  
      {/* Signal chart */}
      <div style={{ flex: 1, height: "100%" }}>
        {chartData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <p style={{ margin: 0 }}>No data</p>
        )}
      </div>
    </div>
  );
  
};

export default EEGGraph;
