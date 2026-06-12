import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { useAuth } from "../AuthContext";
import { avatarEmoji } from "../avatars";

export default function PlayerJoin() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!code.trim()) {
      setError("Please enter a room code.");
      return;
    }
    if (!user && !nickname.trim()) {
      setError("Please enter a nickname.");
      return;
    }

    const token = localStorage.getItem("authToken");

    socket.emit(
      "player:join",
      { code: code.trim().toUpperCase(), nickname: nickname.trim(), token },
      (res) => {
        if (res.success) {
          navigate("/play", { state: { code: res.code, upgrades: res.upgrades } });
        } else {
          setError(res.reason || "Could not join game.");
        }
      }
    );
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Join Game</h2>

        {!loading && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "#f0fdf4",
              borderRadius: 12,
              marginBottom: 12
            }}
          >
            <div style={{ fontSize: 32 }}>{avatarEmoji(user.equippedAvatar)}</div>
            <div>
              <strong>Playing as {user.username}</strong>
              <p style={{ margin: 0, color: "#6b7280" }}>
                💰 ${user.balance} — earnings from this game will be added to your account
              </p>
            </div>
          </div>
        )}

        <input
          placeholder="Room Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />

        {!loading && !user && (
          <input
            placeholder="Your Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
        )}

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        <button onClick={handleJoin}>Join</button>

        {!loading && !user && (
          <p style={{ marginTop: 12 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>
              Log in
            </a>{" "}
            to save your earnings and unlock avatars!
          </p>
        )}
      </div>
    </div>
  );
}
