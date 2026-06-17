import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const code = location.state?.code;
  const mode = location.state?.mode || "classic";

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const onPlayerList = ({ players }) => setPlayers(players);
    socket.on("host:player_list", onPlayerList);

    return () => {
      socket.off("host:player_list", onPlayerList);
    };
  }, [code, navigate]);

  const handleStart = () => {
    socket.emit("host:start_game", { code });
    navigate("/host/game", { state: { code, mode } });
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Join at this code:</h2>
        <div className="room-code">{code}</div>
        <p style={{ textAlign: "center" }}>
          Players go to the Join page and enter this code.
        </p>
      </div>

      <div className="card">
        <h3>Players ({players.length})</h3>
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id}>
              <span>{p.nickname}</span>
            </li>
          ))}
        </ul>
        {players.length === 0 && <p>Waiting for players to join...</p>}
      </div>

      <button onClick={handleStart} disabled={players.length === 0}>
        Start Game
      </button>
    </div>
  );
}