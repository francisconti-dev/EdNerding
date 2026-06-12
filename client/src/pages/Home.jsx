import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { avatarEmoji } from "../avatars";

export default function Home() {
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

  return (
    <div className="container">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>🎓 EdNerding</h1>
          <p style={{ margin: "4px 0 0" }}>A Gimkit-style trivia game with in-game currency and upgrades.</p>
        </div>
        {!loading && (
          user ? (
            <button onClick={() => navigate("/account")} style={{ whiteSpace: "nowrap" }}>
              {avatarEmoji(user.equippedAvatar)} {user.username} (${user.balance})
            </button>
          ) : (
            <button onClick={() => navigate("/login")} style={{ whiteSpace: "nowrap" }}>
              Log In
            </button>
          )
        )}
      </div>

      <div className="card">
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

        <button onClick={handleHost}>Host a Game</button>
      </div>

      <div className="card">
        <h2>Join a Game</h2>
        <button onClick={() => navigate("/join")}>Enter Room Code</button>
      </div>

      <div className="card">
        <h2>Manage Question Sets</h2>
        <button onClick={() => navigate("/question-sets")}>Create / Edit Questions</button>
      </div>
    </div>
  );
}
