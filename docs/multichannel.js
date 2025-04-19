import React, { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  Title,
  Zoom
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

// Register ChartJS features
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  Title,
  zoomPlugin
);

// Plugin to draw channel labels on the left of each line
const channelLabelsPlugin = {
  id: "channelLabels",
  afterDatasetsDraw(chart) {
    const { ctx, data, chartArea: { left } } = chart;
    ctx.save();
    data.datasets.forEach((dataset, index) => {
      const meta = chart.getDatasetMeta(index);
      const point = meta.data[0];
      if (point) {
        const y = point.y;
        ctx.fillStyle = "black";
        ctx.font = "12px monospace";
        ctx.textAlign = "right";
        ctx.fillText(dataset.label, left - 10, y + 4);
      }
    });
    ctx.restore();
  }
};

ChartJS.register(channelLabelsPlugin);

const getGradientColor = (index, total) => {
  const ratio = index / (total - 1);
  const r = Math.round(255 * ratio);
  const g = 64;
  const b = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},${b})`;
};

const MultiChannelGraph = ({ eegData }) => {
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef();

  useEffect(() => {
    if (!eegData || !eegData.data.length || !eegData.timestamps.length) return;

    const verticalSpacing = 400;
    const scaleFactor = 1_000_00000;

    const total = eegData.data.length;
    const datasets = eegData.data.map((channelData, i) => {
      const offsetData = channelData.map(val => (val * scaleFactor) + i * verticalSpacing);
      return {
        label: eegData.selected_channels[i],
        data: offsetData,
        borderColor: getGradientColor(i, total),
        borderWidth: 1.5,
        tension: 0.2,
        pointRadius: 0,
      };
    });

    setChartData({
      labels: eegData.timestamps,
      datasets
    });
  }, [eegData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      channelLabels: {},
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "xy"
        },
        pan: {
          enabled: true,
          mode: "xy"
        },
        limits: {
          x: { min: "original", max: "original" },
          y: { min: "original", max: "original" }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: { display: true, color: "#e0e0e0" },
        ticks: { display: false }
      },
      y: {
        display: true,
        grid: { display: true, color: "#e0e0e0" },
        ticks: { display: false }
      }
    },
    elements: {
      line: { fill: false },
    },
  };

  return (
    <div style={{ width: "100%", height: "1000px", marginTop: "30px", backgroundColor: "white" }}>
      {chartData && <Line ref={chartRef} data={chartData} options={chartOptions} />}
    </div>
  );
};

export default MultiChannelGraph;
