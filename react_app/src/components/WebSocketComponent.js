import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

const WebSocketComponent = () => {
  const [eegData, setEegData] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [channelNames, setChannelNames] = useState([]);
  const [winSize, setWinSize] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('[INFO] WebSocket connection established');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setEegData(message.data);
        setTimestamps(message.timestamp);
        setChannelNames(message.ch_names);
        setWinSize(message.winsize);
      } catch (error) {
        console.error('[ERROR] Failed to process incoming message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[ERROR] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[INFO] WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  const generateChartData = (channelIndex) => ({
    labels: timestamps,
    datasets: [
      {
        label: `EEG ${channelNames[channelIndex]}`,
        data: eegData[channelIndex] || [],
        borderColor: ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow'][channelIndex % 6],
        borderWidth: 2,
        fill: false,
        pointRadius: 0, // Removes small circles
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Timestamp (LSL time)',
        },
        ticks: {
          display: false, // Removes x-axis numbers
        },
      },
      y: {
        title: {
          display: true,
          text: 'EEG Data',
        },
      },
    },
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>EEG Visualizer</h1>
      <p><strong>Window Size:</strong> {winSize}</p>
      <p><strong>Channels:</strong> {channelNames.join(', ')}</p>

      <div>
        {channelNames.map((channel, index) => (
          <div key={index} style={{ height: '200px', marginBottom: '20px' }}>
            <h3>{`EEG ${channel}`}</h3>
            <Line data={generateChartData(index)} options={chartOptions} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebSocketComponent;
