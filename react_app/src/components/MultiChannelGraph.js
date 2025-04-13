import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
} from "chart.js";

// Plugin to draw channel labels
const channelLabelsPlugin = {
  id: 'channelLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data, chartArea: { left } } = chart;
    ctx.save();
    data.datasets.forEach((dataset, index) => {
      const y = chart.getDatasetMeta(index).data[0]?.y;
      if (y !== undefined) {
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(dataset.label, left - 40, y + 4);
      }
    });
    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  channelLabelsPlugin
);

// Gradient color from red to blue
const getGradientColor = (index, total) => {
  const ratio = index / (total - 1);
  const r = Math.round(255 * ratio);
  const g = 64;
  const b = Math.round(255 * (1 - ratio));
  return `rgb(${r},${g},${b})`;
};

const MultiChannelGraph = ({ eegData }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!eegData || !eegData.data.length || !eegData.timestamps.length) return;

    const verticalSpacing = 100;
    const scaleFactor = 1000000; // 🔥 Massive boost to show EEG shape

    // Log signal range for debugging
    const flat = eegData.data.flat();
    const minVal = Math.min(...flat);
    const maxVal = Math.max(...flat);
    console.log("🔍 EEG value range:", { minVal, maxVal });

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
      datasets: datasets,
    });
  }, [eegData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      channelLabels: {},
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      line: {
        fill: false,
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "1000px", marginTop: "30px", backgroundColor: "black" }}>
      {chartData && <Line data={chartData} options={chartOptions} />}
    </div>
  );
};

export default MultiChannelGraph;
