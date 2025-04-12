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
  Legend,
  TimeScale
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

const EEGGraph = ({ eegData, selectedChannel, triggers, referenceChannels }) => {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() => {
    console.log(`🧠 EEGGraph render for ${selectedChannel}`);
    console.log("👉 Selected reference channels:", referenceChannels);
    console.log("📊 EEG data:", eegData);

    if (!selectedChannel || !eegData.data.length || !eegData.timestamps.length) return;

    const channelIndex = eegData.selected_channels.indexOf(selectedChannel);
    if (channelIndex === -1) {
      console.warn(`⚠️ Channel ${selectedChannel} not found.`);
      setChartData(null);
      return;
    }

    const timestamps = eegData.timestamps;
    let rawDataPoints = eegData.data[channelIndex].slice(); // Clone raw data
    let dataPoints = rawDataPoints.slice(); // Working copy for cleaning

    // 🧼 Apply average reference if multiple reference channels selected
    if (referenceChannels && referenceChannels.length > 0) {
      const referenceIndices = referenceChannels
        .map(ref => eegData.selected_channels.indexOf(ref))
        .filter(index => index !== -1);

      console.log("✅ Reference channel indices found in data:", referenceIndices);

      if (referenceIndices.length > 0) {
        const referenceData = referenceIndices.map(idx => eegData.data[idx]);
        const avgReference = dataPoints.map((_, i) => {
          const sum = referenceData.reduce((acc, arr) => acc + arr[i], 0);
          return sum / referenceIndices.length;
        });

        dataPoints = dataPoints.map((val, i) => val - avgReference[i]);

        console.log("✅ Reference channel indices found in data:", referenceIndices);
        console.log("🔹 Raw EEG values (first 10):", rawDataPoints.slice(0, 10));
        console.log("🟡 Reference EEG values (first 10):", avgReference.slice(0, 10));
        console.log("🧼 Cleaned EEG values (first 10):", dataPoints.slice(0, 10));
      } else {
        console.warn("⚠️ No valid reference channels found in EEG data.");
      }
    }

    // 🔔 Prepare trigger annotations
    const annotations = {};
    triggers.forEach((t, i) => {
      annotations[`trigger-${i}`] = {
        type: "line",
        borderColor: "red",
        borderWidth: 2,
        scaleID: "x",
        value: t.timestamp,
        label: {
          content: t.trigger,
          enabled: true,
          position: "top",
          backgroundColor: "red",
          color: "white",
          font: { size: 10 }
        }
      };
    });

    // 📈 Build chart data
    setChartData({
      labels: timestamps,
      datasets: [
        {
          label: selectedChannel,
          data: dataPoints,
          borderColor: "blue",
          borderWidth: 1.5,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    });

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: { annotations },
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
