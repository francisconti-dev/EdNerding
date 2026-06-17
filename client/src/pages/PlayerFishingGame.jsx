import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { useAuth } from "../AuthContext";
import { avatarEmoji } from "../avatars";

const TILE_SIZE = 32;

export default function PlayerFishingGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const code = location.state?.code;
  const allUpgrades = location.state?.upgrades || [];
  const initialPlayer = location.state?.initialPlayer;

  const [mapLayout, setMapLayout] = useState(null);
  const [myId, setMyId] = useState(null);
  const [players, setPlayers] = useState({});
  const [me, setMe] = useState(initialPlayer || null);

  const [question, setQuestion] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [isCasting, setIsCasting] = useState(false);
  const [catchToast, setCatchToast] = useState(null);
  const [sellToast, setSellToast] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [ownedUpgrades, setOwnedUpgrades] = useState([]);
  const [waiting, setWaiting] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [newAccountBalance, setNewAccountBalance] = useState(null);
  const [actionError, setActionError] = useState("");

  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    setMyId(socket.id);

    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
    fetch(`${serverUrl}/api/fishing/map`)
      .then((r) => r.json())
      .then((data) => {
        setMapLayout(data.layout);
      })
      .catch(() => {});

    const onStarted = () => setWaiting(false);

    const onQuestion = (q) => {
      setQuestion(q);
      setFeedback(null);
    };

    const onAnswerResult = (result) => {
      setFeedback({
        isCorrect: result.isCorrect,
        correctAnswerIndex: result.correctAnswerIndex,
        baitDelta: result.baitDelta
      });
      setMe((prev) => (prev ? { ...prev, bait: result.newBaitBalance } : prev));
    };

    const onPlayerMoved = ({ id, x, y }) => {
      setPlayers((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), x, y }
      }));
      if (id === socket.id) {
        setMe((prev) => (prev ? { ...prev, x, y } : prev));
      }
    };

    const onStateSync = ({ players: list }) => {
      const map = {};
      for (const p of list) map[p.id] = p;
      setPlayers(map);
      const mine = map[socket.id];
      if (mine) {
        setMe((prev) => ({ ...(prev || {}), ...mine }));
      }
    };

    const onCatchResult = ({ fish }) => {
      setIsCasting(false);
      setCatchToast(fish);
      setTimeout(() => setCatchToast(null), 2500);
    };

    const onEnded = () => setGameEnded(true);

    const onBalanceUpdated = ({ balance }) => {
      setNewAccountBalance(balance);
      updateBalance(balance);
    };

    socket.on("game:started", onStarted);
    socket.on("player:question", onQuestion);
    socket.on("player:answer_result", onAnswerResult);
    socket.on("fishing:player_moved", onPlayerMoved);
    socket.on("fishing:state_sync", onStateSync);
    socket.on("fishing:catch_result", onCatchResult);
    socket.on("game:ended", onEnded);
    socket.on("account:balance_updated", onBalanceUpdated);

    return () => {
      socket.off("game:started", onStarted);
      socket.off("player:question", onQuestion);
      socket.off("player:answer_result", onAnswerResult);
      socket.off("fishing:player_moved", onPlayerMoved);
      socket.off("fishing:state_sync", onStateSync);
      socket.off("fishing:catch_result", onCatchResult);
      socket.off("game:ended", onEnded);
      socket.off("account:balance_updated", onBalanceUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, navigate]);

  // Keyboard movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showQuestion || showShop || waiting || gameEnded) return;
      const map = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
      };
      const direction = map[e.key];
      if (!direction) return;
      e.preventDefault();
      socket.emit("fishing:move", { direction });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showQuestion, showShop, waiting, gameEnded]);

  const handleDirectionButton = (direction) => {
    socket.emit("fishing:move", { direction });
  };

  const handleCast = () => {
    setActionError("");
    socket.emit("fishing:cast", {}, (res) => {
      if (res.success) {
        setIsCasting(true);
      } else {
        setActionError(res.reason);
        setTimeout(() => setActionError(""), 2000);
      }
    });
  };

  const handleSell = () => {
    setActionError("");
    socket.emit("fishing:sell", {}, (res) => {
      if (res.success) {
        setSellToast(res);
        setMe((prev) => (prev ? { ...prev, money: res.newBalance, inventoryCount: 0 } : prev));
        setTimeout(() => setSellToast(null), 2500);
      } else {
        setActionError(res.reason);
        setTimeout(() => setActionError(""), 2000);
      }
    });
  };

  const handleAnswer = (choiceIndex) => {
    socket.emit("player:submit_answer", { choiceIndex });
  };

  const handleBuyUpgrade = (upgradeId) => {
    socket.emit("player:buy_upgrade", { upgradeId }, (res) => {
      if (res.success) {
        setMe((prev) => (prev ? { ...prev, money: res.newBalance } : prev));
        setOwnedUpgrades(res.upgrades);
      } else {
        setActionError(res.reason);
        setTimeout(() => setActionError(""), 2000);
      }
    });
  };

  if (gameEnded) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Game Over!</h2>
          <p>Final earnings: ${me?.money || 0}</p>
          {user && newAccountBalance !== null && (
            <div style={{ margin: "16px 0" }}>
              <p style={{ margin: "4px 0" }}>Added to your account!</p>
              <div className="money-display bump">💰 ${newAccountBalance}</div>
            </div>
          )}
          <button onClick={() => navigate("/")}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="container">
        <div className="card">
          <h2>Waiting for host to start the game...</h2>
          <p>Room: {code}</p>
        </div>
      </div>
    );
  }

  if (!mapLayout || !me) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  const nearWater = isNear(mapLayout, me.x, me.y, "W");
  const nearQuestionStation = isNear(mapLayout, me.x, me.y, "Q");
  const nearSellStation = isNear(mapLayout, me.x, me.y, "S");

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div>🪱 Bait: <strong>{me.bait ?? 0}</strong></div>
          <div>🐟 Fish: <strong>{me.inventoryCount ?? 0}</strong></div>
          <div className="money-display" style={{ fontSize: 20 }}>💰 ${me.money ?? 0}</div>
        </div>
        <button onClick={() => setShowShop(!showShop)}>{showShop ? "Back to Map" : "🛒 Shop"}</button>
      </div>

      {actionError && (
        <div className="feedback-banner incorrect" style={{ fontSize: 16 }}>
          {actionError}
        </div>
      )}

      {showShop ? (
        <FishingShop
          allUpgrades={allUpgrades}
          ownedUpgrades={ownedUpgrades}
          money={me.money ?? 0}
          onBuy={handleBuyUpgrade}
        />
      ) : (
        <>
          <div className="card" style={{ padding: 8, overflow: "auto" }}>
            <FishingMap mapLayout={mapLayout} players={players} myId={myId || socket.id} />
          </div>

          <div className="card">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                maxWidth: 220,
                margin: "0 auto 16px"
              }}
            >
              <div />
              <DirButton onClick={() => handleDirectionButton("up")}>↑</DirButton>
              <div />
              <DirButton onClick={() => handleDirectionButton("left")}>←</DirButton>
              <DirButton onClick={() => handleDirectionButton("down")}>↓</DirButton>
              <DirButton onClick={() => handleDirectionButton("right")}>→</DirButton>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {nearQuestionStation && (
                <button onClick={() => setShowQuestion(true)}>📝 Answer Question</button>
              )}
              {nearWater && (
                <button onClick={handleCast} disabled={isCasting || (me.bait ?? 0) < 1}>
                  {isCasting ? "🎣 Casting..." : "🎣 Cast Line"}
                </button>
              )}
              {nearSellStation && (
                <button onClick={handleSell} disabled={(me.inventoryCount ?? 0) === 0}>
                  💵 Sell Fish
                </button>
              )}
              {!nearWater && !nearQuestionStation && !nearSellStation && (
                <p style={{ margin: 0 }}>
                  Walk to a 📝 question station, 🌊 water, or 💵 sell station to take action.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {catchToast && (
        <div className="card feedback-banner correct">
          You caught a {catchToast.emoji} {catchToast.name}!
        </div>
      )}

      {sellToast && (
        <div className="card feedback-banner correct">Sold your catch for +${sellToast.totalValue}!</div>
      )}

      {showQuestion && question && (
        <QuestionModal
          question={question}
          feedback={feedback}
          onAnswer={handleAnswer}
          onClose={() => setShowQuestion(false)}
        />
      )}
    </div>
  );
}

function isNear(mapLayout, x, y, tileChar) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const row = mapLayout[y + dy];
      if (row && row[x + dx] === tileChar) return true;
    }
  }
  return false;
}

function tileColor(char) {
  switch (char) {
    case "W":
      return "#60a5fa";
    case "Q":
      return "#fbbf24";
    case "S":
      return "#f472b6";
    default:
      return "#86efac";
  }
}

function FishingMap({ mapLayout, players, myId }) {
  const width = mapLayout[0].length * TILE_SIZE;
  const height = mapLayout.length * TILE_SIZE;

  return (
    <div style={{ position: "relative", width, height, margin: "0 auto" }}>
      {mapLayout.map((row, y) =>
        row.split("").map((char, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: x * TILE_SIZE,
              top: y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
              background: tileColor(char),
              border: "1px solid rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14
            }}
          >
            {char === "Q" && "📝"}
            {char === "S" && "💵"}
          </div>
        ))
      )}

      {Object.entries(players).map(([id, p]) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: (p.x ?? 0) * TILE_SIZE,
            top: (p.y ?? 0) * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            transition: "left 0.15s linear, top 0.15s linear",
            filter: id === myId ? "none" : "grayscale(0.2)",
            zIndex: id === myId ? 2 : 1
          }}
          title={p.nickname}
        >
          {avatarEmoji(p.avatar)}
        </div>
      ))}
    </div>
  );
}

function DirButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "14px 0", fontSize: 20 }}>
      {children}
    </button>
  );
}

function QuestionModal({ question, feedback, onAnswer, onClose }) {
  const showResult = feedback && feedback.baitDelta !== undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16
      }}
    >
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        {showResult && (
          <div className={`feedback-banner ${feedback.isCorrect ? "correct" : "incorrect"}`}>
            {feedback.isCorrect ? `Correct! +${feedback.baitDelta} bait` : "Wrong answer, no bait earned."}
          </div>
        )}

        <h3>{question.text}</h3>
        <div className="choices">
          {question.choices.map((choice, i) => {
            let className = "choice-btn";
            if (showResult) {
              if (i === feedback.correctAnswerIndex) className += " correct";
            }
            return (
              <button key={i} className={className} onClick={() => onAnswer(i)}>
                {choice}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{ marginTop: 16, background: "#6b7280" }}>
          Close
        </button>
      </div>
    </div>
  );
}

function FishingShop({ allUpgrades, ownedUpgrades, money, onBuy }) {
  return (
    <div className="card">
      <h2>Upgrade Shop</h2>
      <p>Spend cash earned from selling fish on upgrades!</p>
      {allUpgrades.map((upgrade) => {
        const owned = ownedUpgrades.includes(upgrade.id);
        const canAfford = money >= upgrade.cost;
        return (
          <div key={upgrade.id} className={`upgrade-card ${owned ? "owned" : ""}`}>
            <div>
              <strong>{upgrade.name}</strong>
              <p style={{ margin: "4px 0", color: "#6b7280" }}>{upgrade.description}</p>
            </div>
            <button onClick={() => onBuy(upgrade.id)} disabled={owned || !canAfford}>
              {owned ? "Owned" : `$${upgrade.cost}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}