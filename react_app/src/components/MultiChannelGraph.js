import React, { useEffect, useRef, useState } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";

const MultiChannelGraphUPlot = ({
  eegData,
  referenceChannels = [],
  selectedChannels = [],
  channels = [],
}) => {
  const chartRef = useRef(null);
  const [verticalSpacing, setVerticalSpacing] = useState(10);
  const [signalScale, setSignalScale] = useState(20);
  const [refreshTime, setRefreshTime] = useState(1000);
  const [useRefresh, setUseRefresh] = useState(true);
  const lastUpdateRef = useRef(Date.now());
  const [triggers, setTriggers] = useState([]);

  useEffect(() => {
    const handler = (event) => {
      console.log("[Event] Trigger update received");
      setTriggers(event.detail || []);
    };
    window.addEventListener("update-triggers", handler);
    return () => window.removeEventListener("update-triggers", handler);
  }, []);

  const handleRefreshTimeChange = (e) => {
    setRefreshTime(Number(e.target.value));
  };

  const handleToggleRefresh = () => {
    setUseRefresh((prev) => !prev);
  };

  const annotationPlugin = {
    hooks: {
      draw: (u) => {
        const ctx = u.ctx;
        const chartLeft = u.bbox.left;
        const chartRight = u.bbox.left + u.bbox.width;

        const eegStart = eegData.timestamps?.[0] ?? 0;
        const eegEnd = eegData.timestamps?.[eegData.timestamps.length - 1] ?? eegStart;

        triggers.forEach(({ timestamp }) => {
          let xValue;

          if (timestamp >= eegStart && timestamp <= eegEnd) {
            xValue = timestamp;
          } else {
            xValue = timestamp - eegStart;
          }

          const xPos = u.valToPos(xValue, "x", true);
          const yPos = u.bbox.top + u.bbox.height - 10;

          console.log(`[Trigger Marker] Raw: ${timestamp}, Adjusted: ${xValue}, xPos: ${xPos}`);

          if (xPos >= chartLeft && xPos <= chartRight) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1.5;

            ctx.moveTo(xPos - 5, yPos);
            ctx.lineTo(xPos + 5, yPos);
            ctx.moveTo(xPos, yPos - 5);
            ctx.lineTo(xPos, yPos + 5);

            ctx.stroke();
            ctx.restore();
          } else {
            console.log(`[Trigger Marker] Skipped (out of bounds): ${timestamp} at xPos ${xPos}`);
          }
        });
      },
    },
  };

  useEffect(() => {
    console.log("[useEffect] Chart update triggered");

    if (!eegData?.data?.length || !eegData.timestamps?.length) {
      console.log("[Skip] No EEG data or timestamps available");
      return;
    }

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (useRefresh && elapsed < refreshTime) {
      console.log(`[Skip Update] elapsed=${elapsed}ms < refreshTime=${refreshTime}ms`);
      return;
    }

    if (useRefresh) {
      console.log(`[Update] Refresh time passed (${elapsed}ms >= ${refreshTime}ms), updating chart`);
    } else {
      console.log("[Update] Refresh disabled, updating chart immediately");
    }

    lastUpdateRef.current = now;

    const timestamps = eegData.timestamps;
    const totalChannels = eegData.selected_channels.length;

    const referenceIndices = referenceChannels
      .map((ref) => eegData.selected_channels.indexOf(ref))
      .filter((i) => i !== -1);
    const referenceData = referenceIndices.map((idx) => eegData.data[idx]);

    const avgReference = eegData.data[0].map((_, i) =>
      referenceData.length
        ? referenceData.reduce((sum, arr) => sum + arr[i], 0) / referenceData.length
        : 0
    );

    const normalize = (arr) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const range = max - min || 1;
      return arr.map((val) => ((val - min) / range) * 2 - 1);
    };

    const signals = eegData.data.map((chData, i) => {
      const adjusted = chData.map((v, j) => v - avgReference[j]);
      const normalized = normalize(adjusted);
      const offset = (totalChannels - i - 1) * verticalSpacing;
      return normalized.map((v) => v * signalScale + offset);
    });

    const series = [
      {}, // X-axis
      ...eegData.selected_channels.map(() => ({
        stroke: "blue",
        width: 1,
      })),
    ];

    const data = [timestamps, ...signals];

    const opts = {
      width: window.innerWidth - 100,
      height: totalChannels * verticalSpacing + 40,
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
          show: false,
          stroke: "black",
          grid: { stroke: "black", width: 0.5 },
        },
        {
          show: true,
          stroke: "black",
          grid: { stroke: "black", width: 0.5 },
        },
      ],
      cursor: {
        drag: { x: false, y: false },
      },
      plugins: [annotationPlugin],
    };

    chartRef.current = { opts, data };
  }, [
    eegData,
    referenceChannels,
    verticalSpacing,
    signalScale,
    refreshTime,
    useRefresh,
    selectedChannels,
    channels.length,
    triggers,
  ]);

  return (
    <>
      {selectedChannels.length === channels.length && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
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
