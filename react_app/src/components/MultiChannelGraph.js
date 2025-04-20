import React, { useEffect, useRef, useState } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

const MultiChannelGraphUPlot = ({
  eegData,
  referenceChannels = [],
  selectedChannels = [],
  channels = []
}) => {
  const chartRef = useRef(null);
  const [verticalSpacing, setVerticalSpacing] = useState(10);
  const [signalScale, setSignalScale] = useState(20);
  const [refreshTime, setRefreshTime] = useState(1000);
  const [useRefresh, setUseRefresh] = useState(true);
  const lastUpdateRef = useRef(Date.now());
  const [triggers, setTriggers] = useState([]);

  // 🔔 Listen for global trigger updates
  useEffect(() => {
    const handler = (event) => {
      console.log("📡 Triggers received:", event.detail);
      setTriggers(event.detail || []);
    };
    window.addEventListener("update-triggers", handler);
    return () => window.removeEventListener("update-triggers", handler);
  }, []);

  const handleRefreshTimeChange = (e) => {
    setRefreshTime(Number(e.target.value));
  };

  const handleToggleRefresh = () => {
    setUseRefresh(prev => !prev);
  };

  useEffect(() => {
    if (!eegData || !eegData.data.length || !eegData.timestamps.length) return;

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    if (useRefresh && elapsed < refreshTime) return;
    lastUpdateRef.current = now;

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
      {}, // X-axis
      ...eegData.selected_channels.map(() => ({
        stroke: "blue",
        width: 1,
      })),
    ];

    const data = [timestamps, ...signals];

    // 🎯 Handle triggers as red dots
    if (selectedChannels.length === channels.length && triggers.length > 0) {
      const triggerYs = [];
      const triggerXs = [];

      triggers.forEach(trigger => {
        const ts = parseFloat(trigger.timestamp);
        const idx = timestamps.findIndex(t => Math.abs(Number(t) - ts) < 0.01); // more wiggle room

        if (idx !== -1) {
          triggerXs.push(timestamps[idx]);
          triggerYs.push(5); // Y value (bottom of graph)
          console.log(`[✅ Trigger Match] '${trigger.trigger}' at ${timestamps[idx]}`);
        } else {
          const closest = timestamps.reduce((prev, curr) =>
            Math.abs(curr - ts) < Math.abs(prev - ts) ? curr : prev
          );
          console.warn(`[⚠️ Trigger Skipped] No match for ${ts} | Closest was ${closest}`);
        }
      });

      if (triggerYs.length > 0) {
        data[0].push(...triggerXs); // Add trigger X values to timestamps
        data.push(triggerYs); // Add Y values for red dots

        series.push({
          label: "Triggers",
          points: {
            show: true,
            size: 6,
            stroke: "red",
            fill: "red",
          },
          width: 0,
          show: true,
        });

        console.log(`[🎯 Trigger Marker] Marked ${triggerYs.length} red dots on graph`);
      }
    }

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
          values: () => [],
        },
        {
          show: true,
          stroke: "black",
          grid: { stroke: "black", width: 0.5 },
          values: () => [],
        },
      ],
      cursor: {
        drag: {
          x: false,
          y: false,
        },
      },
    };

    chartRef.current = { opts, data };
  }, [eegData, referenceChannels, verticalSpacing, signalScale, refreshTime, useRefresh, selectedChannels, channels.length, triggers]);

  return (
    <>
      {selectedChannels.length === channels.length && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
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
              onChange={handleRefreshTimeChange}
              style={{ width: "80px" }}
              disabled={!useRefresh}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="checkbox"
              checked={useRefresh}
              onChange={handleToggleRefresh}
            />
            Use Refresh Time
          </label>
        </div>
      )}

      {chartRef.current ? (
        <UplotReact options={chartRef.current.opts} data={chartRef.current.data} />
      ) : (
        <p>Loading EEG signals...</p>
      )}
    </>
  );
};

export default MultiChannelGraphUPlot;
