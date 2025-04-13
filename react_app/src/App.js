import React, { useState, useEffect, useRef } from "react";
import EEGGraph from "./components/EEGGraph";
import MultiChannelGraph from "./components/MultiChannelGraph"; // ✅ NEW

const App = () => {
  const [socket, setSocket] = useState(null);
  const [dataStreams, setDataStreams] = useState([]);
  const [markerStreams, setMarkerStreams] = useState([]);
  const [selectedDataStream, setSelectedDataStream] = useState(null);
  const [selectedMarkerStream, setSelectedMarkerStream] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [referenceChannels, setReferenceChannels] = useState([]);
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
  const [showAllChannels, setShowAllChannels] = useState(false); // ✅ NEW

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
        marker_stream: marker || null,
        reference_channels: reference
      }));
      console.log("📤 Sent stream selection:", { data, marker, reference });
    }
  };

  const handleDataStreamSelect = (event) => {
    const selected = JSON.parse(event.target.value);
    setSelectedDataStream(selected);
    setSelectedChannels([]);
    sendStreamSelection(selected, selectedMarkerStream, referenceChannels);
  };

  const handleMarkerStreamSelect = (event) => {
    const selected = event.target.value
      ? JSON.parse(event.target.value)
      : null;
    setSelectedMarkerStream(selected);
    sendStreamSelection(selectedDataStream, selected, referenceChannels);
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
    if (selectedDataStream && selectedMarkerStream) {
      sendStreamSelection(selectedDataStream, selectedMarkerStream, referenceChannels);
    }
  }, [referenceChannels]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        referenceDropdownRef.current && !referenceDropdownRef.current.contains(event.target)
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

      {/* Horizontal Dropdowns */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start", marginBottom: "20px" }}>
        
        {/* EEG Stream */}
        <div>
          <label><strong>EEG Data Stream:</strong></label>
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
          <label><strong>Marker Stream:</strong></label>
          <select onChange={handleMarkerStreamSelect} style={{ marginLeft: "10px" }}>
            <option value="">-- Choose a Marker Stream --</option>
            {markerStreams.map((stream, index) => (
              <option key={index} value={JSON.stringify(stream)}>
                {stream.name} ({stream.type})
              </option>
            ))}
          </select>
        </div>

        {/* EEG Channels Dropdown */}
        <div style={{ position: "relative" }}>
          <label><strong>Select EEG Channels:</strong></label>
          <div
            style={{
              marginLeft: "10px",
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

        {/* Reference Channels Dropdown */}
        <div style={{ position: "relative" }}>
          <label><strong>Select Reference Channels:</strong></label>
          <div
            style={{
              marginLeft: "10px",
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
      </div>

      {/* Toggle Multi-Channel Button */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => setShowAllChannels(prev => !prev)}
          style={{
            padding: "10px 15px",
            backgroundColor: showAllChannels ? "#ddd" : "#4CAF50",
            color: showAllChannels ? "#000" : "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {showAllChannels ? "Hide All Channels View" : "Show All Channels View"}
        </button>
      </div>

      {/* Triggers */}
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

        {showAllChannels && (
          <MultiChannelGraph eegData={eegData} />
        )}
      </div>
    </div>
  );
};

export default App;
