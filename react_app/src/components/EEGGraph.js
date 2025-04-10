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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

const EEGGraph = ({ eegData, selectedChannel, triggers }) => {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});

  useEffect(() => {
    if (!selectedChannel || !eegData.data.length || !eegData.timestamps.length) return;

    const channelIndex = eegData.selected_channels.indexOf(selectedChannel);
    if (channelIndex === -1) {
      console.warn(`Channel ${selectedChannel} not found.`);
      setChartData(null);
      return;
    }

    const timestamps = eegData.timestamps;
    const dataPoints = eegData.data[channelIndex];

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
          title: { display: true, text: "EEG Signal" },
        },
      },
    });

  }, [eegData, selectedChannel, triggers]);

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
