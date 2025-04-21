import React, { useState, useEffect, useRef } from "react";
import EEGGraph from "./components/EEGGraph";
import MultiChannelGraph from "./components/MultiChannelGraph";
import SpectralAnalysis from "./components/SpectralAnalysis";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [dataStreams, setDataStreams] = useState([]);
  const [markerStreams, setMarkerStreams] = useState([]);
  const [selectedDataStream, setSelectedDataStream] = useState(null);
  const [selectedMarkerStream, setSelectedMarkerStream] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [referenceChannels, setReferenceChannels] = useState([]);
  const [showSpectralAnalysis, setShowSpectralAnalysis] = useState(false);

  const [eegData, setEegData] = useState({
    data: [],
    timestamps: [],
    selected_channels: [],
  });
  const [triggers, setTriggers] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [referenceDropdownOpen, setReferenceDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const referenceDropdownRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8765");
    ws.onopen = () => console.log("✅ Connected to WebSocket server");

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "stream_list") {
          setDataStreams(message.data_streams || []);
          setMarkerStreams(message.marker_streams || []);
        }

        if (message.channels) {
          setChannels(message.channels);
        }

        if (
          message.type === "eeg" &&
          message.data &&
          message.timestamps &&
          message.selected_channels
        ) {
          setEegData({
            data: message.data,
            timestamps: message.timestamps,
            selected_channels: message.selected_channels,
          });
        }

        if (message.type === "trigger") {
          const newTrigger = {
            trigger: message.trigger,
            timestamp: message.timestamp,
          };

          setTriggers((prev) => {
            const updated = [...prev.slice(-19), newTrigger];
            window.dispatchEvent(
              new CustomEvent("update-triggers", { detail: updated })
            );
            setEegData((prevData) => ({
              ...prevData,
            }));
            return updated;
          });
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket error:", error);
    ws.onclose = () => console.log("🔌 WebSocket connection closed");

    setSocket(ws);
    return () => ws.close();
  }, []);

  const sendStartDataStream = (data, reference) => {
    if (socket && data) {
      socket.send(
        JSON.stringify({
          type: "start_data",
          data_stream: data,
          reference_channels: reference || [],
        })
      );
    }
  };

  const sendStartMarkerStream = (marker) => {
    if (socket && marker) {
      socket.send(
        JSON.stringify({
          type: "start_marker",
          marker_stream: marker,
        })
      );
    }
  };

  const handleDataStreamSelect = (event) => {
    const selected = JSON.parse(event.target.value);
    setSelectedDataStream(selected);
    setSelectedChannels([]);
    sendStartDataStream(selected, referenceChannels);
  };

  const handleMarkerStreamSelect = (event) => {
    const selected = event.target.value
      ? JSON.parse(event.target.value)
      : null;
    setSelectedMarkerStream(selected);
    sendStartMarkerStream(selected);
  };

  const handleChannelToggle = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleReferenceChannelToggle = (channel) => {
    setReferenceChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  useEffect(() => {
    if (selectedDataStream) {
      sendStartDataStream(selectedDataStream, referenceChannels);
    }
  }, [referenceChannels]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        referenceDropdownRef.current &&
        !referenceDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
        setReferenceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "100vw" }}>
      <h1>EEG Visualizer</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          alignItems: "flex-start",
          marginBottom: "20px",
        }}
      >
        {/* EEG Stream */}
        <div>
          <label>
            <strong>EEG Data Stream:</strong>
          </label>
          <select onChange={handleDataStreamSelect} style={{ marginLeft: "10px" }}>
            <option value="">-- Choose a Data Stream --</option>
            {dataStreams.map((stream, index) => (
              <option key={index} value={JSON.stringify(stream)}>
                {stream.name} ({stream.type})
              </option>
            ))}
          </select>
        </div>

        {/* Marker Stream */}
        <div>
          <label>
            <strong>Marker Stream:</strong>
          </label>
          <select onChange={handleMarkerStreamSelect} style={{ marginLeft: "10px" }}>
            <option value="">-- Choose a Marker Stream --</option>
            {markerStreams.map((stream, index) => (
              <option key={index} value={JSON.stringify(stream)}>
                {stream.name} ({stream.type})
              </option>
            ))}
          </select>
        </div>

        {/* EEG Channels */}
        <div style={{ position: "relative" }}>
          <label>
            <strong>Select EEG Channels:</strong>
          </label>
          <div
            style={{
              marginLeft: "10px",
              border: "1px solid #ccc",
              padding: "10px",
              cursor: "pointer",
              backgroundColor: "#f9f9f9",
            }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedChannels.length > 0
              ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''} selected`
              : "Select Channels"} ▼
          </div>

          {dropdownOpen && (
            <div
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #ccc",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "10px",
                width: "200px",
                zIndex: 1000,
              }}
            >
              <label style={{ fontWeight: "bold" }}>
                <input
                  type="checkbox"
                  checked={selectedChannels.length === channels.length}
                  onChange={() =>
                    setSelectedChannels(
                      selectedChannels.length === channels.length
                        ? []
                        : channels
                    )
                  }
                />
                Select All Channels
              </label>
              <hr />
              {channels.map((channel, index) => (
                <label key={index} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                  />
                  {channel}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Reference Channels */}
        <div style={{ position: "relative" }}>
          <label>
            <strong>Select Reference Channels:</strong>
          </label>
          <div
            style={{
              marginLeft: "10px",
              border: "1px solid #ccc",
              padding: "10px",
              cursor: "pointer",
              backgroundColor: "#f9f9f9",
            }}
            onClick={() => setReferenceDropdownOpen(!referenceDropdownOpen)}
          >
            {referenceChannels.length > 0
              ? referenceChannels.join(", ")
              : "Select Reference Channels"} ▼
          </div>

          {referenceDropdownOpen && (
            <div
              ref={referenceDropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #ccc",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "10px",
                width: "200px",
                zIndex: 1000,
              }}
            >
              {channels.map((channel, index) => (
                <label key={index} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={referenceChannels.includes(channel)}
                    onChange={() => handleReferenceChannelToggle(channel)}
                  />
                  {channel}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Spectral Analysis Toggle */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <label>
            <input
              type="checkbox"
              checked={showSpectralAnalysis}
              onChange={() => setShowSpectralAnalysis(!showSpectralAnalysis)}
              style={{ marginRight: "6px" }}
            />
            <strong>Show Spectral Analysis</strong>
          </label>
        </div>
      </div>

      {/* Trigger Display */}
      {triggers.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            backgroundColor: "#f1f1f1",
            padding: "10px",
          }}
        >
          <h3>Recent Triggers</h3>
          <ul
            style={{
              maxHeight: "100px",
              overflowY: "auto",
              listStyle: "none",
              padding: 0,
            }}
          >
            {triggers.map((t, i) => (
              <li key={i}>
                <strong>{Number(t.timestamp).toFixed(3)}:</strong> {t.trigger}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EEG Visuals */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        {selectedChannels.length === channels.length ? (
          <MultiChannelGraph
            eegData={eegData}
            referenceChannels={referenceChannels}
            selectedChannels={selectedChannels}
            channels={channels}
          />
        ) : (
          selectedChannels.map((channel) => (
            <EEGGraph
              key={channel}
              eegData={eegData}
              selectedChannel={channel}
              triggers={triggers}
              referenceChannels={referenceChannels}
            />
          ))
        )}
      </div>

      {/* Spectral Analysis Component */}
      {showSpectralAnalysis && (
        <div style={{ marginTop: "20px", width: "100%" }}>
          <SpectralAnalysis
            eegData={eegData}
            selectedChannels={selectedChannels}
          />
        </div>
      )}
    </div>
  );
};

export default App;
