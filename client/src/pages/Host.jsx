import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Host() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sets, setSets] = useState({});
  const [selectedKey, setSelectedKey] = useState("default");
  const [mode, setMode] = useState("classic"); // "classic" | "fishing"

  useEffect(() => {
    api
      .getAllSets()
      .then((data) => {
        setSets(data);
        if (!data[selectedKey]) {
          const firstKey = Object.keys(data)[0];
          if (firstKey) setSelectedKey(firstKey);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHost = () => {
    socket.emit("host:create_game", { questionSetKey: selectedKey, mode }, (res) => {
      if (res.success) {
        navigate("/host/lobby", { state: { code: res.code, mode: res.mode } });
      }
    });
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Log in to host a game</h2>
          <p>You'll need an account to host — it's free and only takes a moment.</p>
          <button onClick={() => navigate("/login")}>Log In or Create Account</button>
        </div>
        <button onClick={() => navigate("/")} style={{ background: "#6b7280" }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Host a Game</h2>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Game Mode:
        </label>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => setMode("classic")}
            style={{
              flex: 1,
              background: mode === "classic" ? undefined : "#e5e7eb",
              color: mode === "classic" ? undefined : "#374151"
            }}
          >
            🎯 Classic Mode
          </button>
          <button
            onClick={() => setMode("fishing")}
            style={{
              flex: 1,
              background: mode === "fishing" ? undefined : "#e5e7eb",
              color: mode === "fishing" ? undefined : "#374151"
            }}
          >
            🎣 Fishing Mode
          </button>
        </div>
        <p style={{ marginTop: -8, marginBottom: 16, fontSize: 14 }}>
          {mode === "classic"
            ? "Players answer questions at their own pace and earn cash directly."
            : "Players walk around a map, answer questions for bait, fish near water, and sell their catch for cash."}
        </p>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Question Set:
        </label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 16,
            marginBottom: 12
          }}
        >
          {Object.entries(sets).map(([key, set]) => (
            <option key={key} value={key}>
              {set.name} ({set.questions.length} questions)
            </option>
          ))}
        </select>

        <button onClick={handleHost}>🚀 Host a Game</button>
      </div>

      <button onClick={() => navigate("/")} style={{ background: "#6b7280" }}>
        Back to Home
      </button>
    </div>
  );
}