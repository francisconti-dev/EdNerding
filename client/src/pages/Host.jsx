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
    socket.emit("host:create_game", { questionSetKey: selectedKey }, (res) => {
      if (res.success) {
        navigate("/host/lobby", { state: { code: res.code } });
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
