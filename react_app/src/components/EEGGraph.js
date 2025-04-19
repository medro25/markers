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

// Global shared values
let globalSettings = {
  scale: 1, // Fixed scale
  height: "100px",
  marginBottom: "10px"
};

const EEGGraph = ({ eegData, selectedChannel, triggers, referenceChannels }) => {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0); // used to force re-render

  const handleChange = (key, value) => {
    // Ensure unit is always in pixels
    const validValue = value.endsWith("px") ? value : `${value}px`;
    globalSettings[key] = validValue;
    setUpdateTrigger(prev => prev + 1);
    window.dispatchEvent(new Event("global-eeg-settings-changed"));
  };

  useEffect(() => {
    const listener = () => setUpdateTrigger(prev => prev + 1);
    window.addEventListener("global-eeg-settings-changed", listener);
    return () => window.removeEventListener("global-eeg-settings-changed", listener);
  }, []);

  useEffect(() => {
    if (!selectedChannel || !eegData.data.length || !eegData.timestamps.length) return;

    const channelIndex = eegData.selected_channels.indexOf(selectedChannel);
    if (channelIndex === -1) {
      setChartData(null);
      return;
    }

    const timestamps = eegData.timestamps;
    let dataPoints = eegData.data[channelIndex].slice();

    // Apply reference subtraction
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

    // Apply fixed scale
    dataPoints = dataPoints.map(val => val * globalSettings.scale);

    // Match triggers
    const dotStyle = timestamps.map((t) => {
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
      layout: { padding: 0 },
      elements: { point: { radius: 0 } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    });

  }, [eegData, selectedChannel, triggers, referenceChannels, updateTrigger]);

  return (
    <>
      {/* Global height/margin inputs only shown once */}
      {selectedChannel === eegData.selected_channels[0] && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "10px" }}>
          <label>
            Height:{" "}
            <input
              type="text"
              value={globalSettings.height}
              onChange={(e) => handleChange("height", e.target.value)}
              style={{ width: "80px" }}
            />
          </label>
          <label>
            Margin Bottom:{" "}
            <input
              type="text"
              value={globalSettings.marginBottom}
              onChange={(e) => handleChange("marginBottom", e.target.value)}
              style={{ width: "80px" }}
            />
          </label>
        </div>
      )}

      {/* EEG graph */}
      <div style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: globalSettings.height,
        marginBottom: globalSettings.marginBottom,
        borderBottom: "1px solid #eee"
      }}>
        <div style={{
          width: "80px",
          textAlign: "right",
          paddingRight: "10px",
          fontSize: "0.9em",
          fontWeight: "bold"
        }}>
          {selectedChannel}
        </div>

        <div style={{ flex: 1, height: "100%" }}>
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p style={{ margin: 0 }}>No data</p>
          )}
        </div>
      </div>
    </>
  );
};

export default EEGGraph;
