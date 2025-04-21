import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { fft } from "fft-js";

const SpectralAnalysis = ({ eegData, selectedChannels }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!eegData.data.length || !eegData.timestamps.length || !selectedChannels.length) return;

    const timestamps = eegData.timestamps;
    if (timestamps.length < 2) return;

    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    const sfreq = eegData.data[0].length / duration;

    const freqLimit = 60;
    let allDatasets = [];
    let freqsLimited = [];

    selectedChannels.forEach((chName, chIdx) => {
      const index = eegData.selected_channels.indexOf(chName);
      if (index === -1) return;

      const signal = eegData.data[index];
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      const cleanedSignal = signal.map(val => val - mean);

      const phasors = fft(cleanedSignal);
      const magnitudes = phasors.map(([re, im]) => Math.sqrt(re ** 2 + im ** 2));

      // Only keep the first half of the FFT result
      const half = Math.floor(magnitudes.length / 2);
      const freqs = Array.from({ length: half }, (_, i) => i * sfreq / magnitudes.length);
      const mags = magnitudes.slice(0, half);

      const limitedIndexes = freqs.map((f, i) => (f <= freqLimit ? i : null)).filter(i => i !== null);
      const limitedFreqs = limitedIndexes.map(i => freqs[i]);
      const limitedMagnitudes = limitedIndexes.map(i => mags[i]);

      if (freqsLimited.length === 0) {
        freqsLimited = limitedFreqs.map(f => f.toFixed(1));
      }

      allDatasets.push({
        label: `Power Spectrum: ${chName}`,
        data: limitedMagnitudes,
        borderColor: `hsl(${(chIdx * 60) % 360}, 70%, 50%)`,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4, // smooth curves
        fill: false,
      });
    });

    setChartData({
      labels: freqsLimited,
      datasets: allDatasets,
    });
  }, [eegData, selectedChannels]);

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>
      <h3>Spectral Analysis (FFT)</h3>
      {chartData ? (
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "top",
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Frequency (Hz)",
                },
                ticks: {
                  callback: function (value) {
                    const tickValue = Number(this.getLabelForValue(value));
                    return [0, 10, 20, 30, 40, 50, 60].includes(tickValue) ? tickValue : '';
                  },
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Amplitude",
                },
              },
            },
            elements: {
              line: {
                tension: 0.4,
              },
              point: {
                radius: 0,
              },
            },
          }}
        />
      ) : (
        <p>Loading FFT...</p>
      )}
    </div>
  );
};

export default SpectralAnalysis;
