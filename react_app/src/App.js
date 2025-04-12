import React, { useState, useEffect, useRef } from "react";
import EEGGraph from "./components/EEGGraph";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [dataStreams, setDataStreams] = useState([]);
  const [markerStreams, setMarkerStreams] = useState([]);
  const [selectedDataStream, setSelectedDataStream] = useState("");
  const [selectedMarkerStream, setSelectedMarkerStream] = useState("");
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [referenceChannels, setReferenceChannels] = useState([]); // ✅ now supports multiple
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
        console.log("📩 Received from server:", message);

        if (message.type === "stream_list") {
          setDataStreams(message.data_streams || []);
          setMarkerStreams(message.marker_streams || []);
        }

        if (message.channels) setChannels(message.channels);

        if (message.data && message.timestamps && message.selected_channels) {
          setEegData({
            data: message.data,
            timestamps: message.timestamps,
            selected_channels: message.selected_channels,
          });
        }

        if (message.type === "trigger") {
          setTriggers((prev) => [
            ...prev.slice(-19),
            { trigger: message.trigger, timestamp: message.timestamp },
          ]);
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

  const sendStreamSelection = (data, marker, reference) => {
    if (socket && data && marker) {
      socket.send(JSON.stringify({
        data_stream: data,
        marker_stream: marker,
        reference_channels: reference
      }));
      console.log("📤 Sent stream selection:", { data, marker, reference });
    }
  };

  const handleDataStreamSelect = (event) => {
    const streamName = event.target.value;
    setSelectedDataStream(streamName);
    setSelectedChannels([]);
    sendStreamSelection(streamName, selectedMarkerStream, referenceChannels);
  };

  const handleMarkerStreamSelect = (event) => {
    const streamName = event.target.value;
    setSelectedMarkerStream(streamName);
    sendStreamSelection(selectedDataStream, streamName, referenceChannels);
  };

  const handleChannelToggle = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleReferenceChannelToggle = (channel) => {
    setReferenceChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  useEffect(() => {
    console.log("🧠 Reference channels updated:", referenceChannels);
    if (selectedDataStream && selectedMarkerStream) {
      sendStreamSelection(selectedDataStream, selectedMarkerStream, referenceChannels);
    }
  }, [referenceChannels]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        referenceDropdownRef.current && !referenceDropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
        setReferenceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "100vw" }}>
      <h1>EEG Visualizer</h1>

      {/* EEG Data Stream Selection */}
      <div>
        <label><strong>EEG Data Stream:</strong></label>
        <select value={selectedDataStream} onChange={handleDataStreamSelect} style={{ marginLeft: "10px" }}>
          <option value="">-- Choose a Data Stream --</option>
          {dataStreams.map((stream, index) => (
            <option key={index} value={stream.name}>{stream.name}</option>
          ))}
        </select>
      </div>

      {/* Marker Stream Selection */}
      <div style={{ marginTop: "10px" }}>
        <label><strong>Marker Stream:</strong></label>
        <select value={selectedMarkerStream} onChange={handleMarkerStreamSelect} style={{ marginLeft: "10px" }}>
          <option value="">-- Choose a Marker Stream --</option>
          {markerStreams.map((stream, index) => (
            <option key={index} value={stream.name}>{stream.name}</option>
          ))}
        </select>
      </div>

      {/* EEG Channel Selection */}
      {channels.length > 0 && (
        <div style={{ marginTop: "20px", position: "relative" }}>
          <label><strong>Select EEG Channels:</strong></label>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              cursor: "pointer",
              display: "inline-block",
              backgroundColor: "#f9f9f9",
              userSelect: "none"
            }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedChannels.length > 0 ? selectedChannels.join(", ") : "Select Channels"} ▼
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
              {channels.map((channel, index) => (
                <label key={index} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 0" }}>
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
      )}

      {/* Reference Channel Selection (multi) */}
      {channels.length > 0 && (
        <div style={{ marginTop: "10px", position: "relative" }}>
          <label><strong>Select Reference Channels:</strong></label>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              cursor: "pointer",
              display: "inline-block",
              backgroundColor: "#f9f9f9",
              userSelect: "none"
            }}
            onClick={() => setReferenceDropdownOpen(!referenceDropdownOpen)}
          >
            {referenceChannels.length > 0 ? referenceChannels.join(", ") : "Select Reference Channels"} ▼
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
                <label key={index} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 0" }}>
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
      )}

      {/* Trigger Display */}
      {triggers.length > 0 && (
        <div style={{ marginTop: "20px", maxWidth: "100%", backgroundColor: "#f1f1f1", padding: "10px" }}>
          <h3>Recent UE5 Triggers</h3>
          <ul style={{ maxHeight: "100px", overflowY: "auto", listStyle: "none", padding: 0 }}>
            {triggers.map((t, i) => (
              <li key={i}>
                <strong>{Number(t.timestamp).toFixed(3)}:</strong> {t.trigger}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* EEG Graphs */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {selectedChannels.length > 0 && selectedChannels.map((channel) => (
          <EEGGraph
            key={channel}
            eegData={eegData}
            selectedChannel={channel}
            triggers={triggers}
            referenceChannels={referenceChannels}
          />
        ))}
      </div>
    </div>
  );
};

export default App;
