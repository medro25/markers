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
  Title
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

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

// Plugin to draw channel labels aligned left
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

const MultiChannelGraph = ({ eegData }) => {
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef();

  useEffect(() => {
    if (!eegData || !eegData.data.length || !eegData.timestamps.length) return;

    const verticalSpacing = 100; // Fixed spacing between signals
    const total = eegData.data.length;

    const datasets = eegData.data.map((channelData, i) => {
      // Center each signal vertically at a separate baseline
      const mean = channelData.reduce((a, b) => a + b, 0) / channelData.length;
      const amplitude = 100000; // try 500 or 1000
      const offsetData = channelData.map(val => (val - mean) * amplitude + i * verticalSpacing);
      

      return {
        label: eegData.selected_channels[i],
        data: offsetData,
        borderColor: "blue",
        borderWidth: 1,
        tension: 0,
        pointRadius: 0
      };
    });

    setChartData({
      labels: eegData.timestamps,
      datasets: datasets
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
        grid: { display: true, color: "#f0f0f0" },
        ticks: { display: false }
      }
    },
    elements: {
      line: { fill: false }
    }
  };

  return (
    <div style={{ width: "100%", height: `${eegData.data.length * 100}px`, backgroundColor: "white" }}>
      {chartData && <Line ref={chartRef} data={chartData} options={chartOptions} />}
    </div>
  );
};

export default MultiChannelGraph;
