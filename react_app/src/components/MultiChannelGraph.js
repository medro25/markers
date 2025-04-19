import React, { useEffect, useRef, useState } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

const MultiChannelGraphUPlot = ({ eegData, referenceChannels = [] }) => {
  const chartRef = useRef(null);

  const [verticalSpacing, setVerticalSpacing] = useState(10);
  const [signalScale, setSignalScale] = useState(20);
  const [refreshTime, setRefreshTime] = useState(1000); // New state

  useEffect(() => {
    if (!eegData || !eegData.data.length || !eegData.timestamps.length) return;

    const timestamps = eegData.timestamps;
    const totalChannels = eegData.selected_channels.length;

    const referenceIndices = referenceChannels
      .map(ref => eegData.selected_channels.indexOf(ref))
      .filter(i => i !== -1);
    const referenceData = referenceIndices.map(idx => eegData.data[idx]);

    const avgReference = eegData.data[0].map((_, i) =>
      referenceData.length
        ? referenceData.reduce((sum, arr) => sum + arr[i], 0) / referenceData.length
        : 0
    );

    const normalize = (arr) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const range = max - min || 1;
      return arr.map(val => ((val - min) / range) * 2 - 1);
    };

    const signals = eegData.data.map((chData, i) => {
      const adjusted = chData.map((v, j) => v - avgReference[j]);
      const normalized = normalize(adjusted);
      const offset = (totalChannels - i - 1) * verticalSpacing;
      return normalized.map(v => v * signalScale + offset);
    });

    const series = [
      {}, // x-axis (timestamps)
      ...eegData.selected_channels.map(() => ({
        stroke: "blue",
        width: 1,
      })),
    ];

    const data = [timestamps, ...signals];

    const opts = {
      width: window.innerWidth - 100,
      height: totalChannels * verticalSpacing + 20,
      scales: {
        x: { time: false },
        y: {
          auto: false,
          range: () => [0, totalChannels * verticalSpacing + 20],
        },
      },
      series,
      axes: [
        {
          show: true,
          stroke: "black",
          grid: { stroke: "black", width: 0.5 },
          values: () => [] // Hide x-axis labels
        },
        {
          show: true,
          stroke: "black",
          grid: { stroke: "black", width: 0.5 },
          values: () => [] // Hide y-axis labels
        }
      ],
      cursor: {
        drag: {
          x: false,
          y: false,
        }
      }
      // Removed draw hook to disable channel names
    };

    chartRef.current = { opts, data };
  }, [eegData, referenceChannels, verticalSpacing, signalScale, refreshTime]);

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <label>
          Vertical Spacing:{" "}
          <input
            type="number"
            value={verticalSpacing}
            onChange={(e) => setVerticalSpacing(Number(e.target.value))}
            style={{ width: "60px" }}
          />
        </label>
        <label>
          Signal Scale:{" "}
          <input
            type="number"
            value={signalScale}
            onChange={(e) => setSignalScale(Number(e.target.value))}
            style={{ width: "60px" }}
          />
        </label>
        <label>
          Refresh Time (ms):{" "}
          <input
            type="number"
            value={refreshTime}
            onChange={(e) => setRefreshTime(Number(e.target.value))}
            style={{ width: "80px" }}
          />
        </label>
      </div>
      {chartRef.current ? (
        <UplotReact
          options={chartRef.current.opts}
          data={chartRef.current.data}
        />
      ) : (
        <p>Loading EEG signals...</p>
      )}
    </>
  );
};

export default MultiChannelGraphUPlot;
