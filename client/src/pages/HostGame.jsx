import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { avatarEmoji } from "../avatars";

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const code = location.state?.code;
  const mode = location.state?.mode || "classic";

  const [players, setPlayers] = useState([]);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const onPlayerList = ({ players }) => setPlayers(players);
    const onEnded = ({ players }) => {
      setPlayers(players);
      setEnded(true);
    };

    socket.on("host:player_list", onPlayerList);
    socket.on("game:ended", onEnded);

    return () => {
      socket.off("host:player_list", onPlayerList);
      socket.off("game:ended", onEnded);
    };
  }, [code, navigate]);

  const handleEnd = () => {
    socket.emit("host:end_game", { code });
  };

  const sorted = [...players].sort((a, b) => b.money - a.money);

  return (
    <div className="container">
      <div className="card">
        <h2>Live Leaderboard — Room {code}</h2>
        <ul className="player-list">
          {sorted.map((p, i) => (
            <li key={p.id}>
              <span>
                #{i + 1} {avatarEmoji(p.avatar)} {p.nickname}
              </span>
              <span>
                {mode === "fishing" && <>🪱 {p.bait} | 🐟 {p.inventoryCount} | </>}
                💰 ${p.money} | ✅ {p.correct} | ❌ {p.incorrect}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {!ended ? (
        <button onClick={handleEnd}>End Game</button>
      ) : (
        <div className="card">
          <h3>Game Over!</h3>
          <button onClick={() => navigate("/")}>Back to Home</button>
        </div>
      )}
    </div>
  );
}