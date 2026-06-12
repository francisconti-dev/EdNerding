import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { useAuth } from "../AuthContext";
import { avatarEmoji } from "../avatars";

export default function PlayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const code = location.state?.code;
  const allUpgrades = location.state?.upgrades || [];

  const [question, setQuestion] = useState(null);
  const [money, setMoney] = useState(0);
  const [streak, setStreak] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState([]);
  const [feedback, setFeedback] = useState(null); // { isCorrect, moneyDelta, correctAnswerIndex, selectedIndex }
  const [showShop, setShowShop] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [moneyBump, setMoneyBump] = useState(false);
  const [newAccountBalance, setNewAccountBalance] = useState(null);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const onStarted = () => setWaiting(false);
    const onQuestion = (q) => {
      setQuestion(q);
      setFeedback(null);
    };
    const onAnswerResult = (result) => {
      setMoney(result.newBalance);
      setStreak(result.streak);
      setMoneyBump(true);
      setTimeout(() => setMoneyBump(false), 400);
      setFeedback({
        isCorrect: result.isCorrect,
        moneyDelta: result.moneyDelta,
        correctAnswerIndex: result.correctAnswerIndex,
        bonusEvents: result.bonusEvents
      });
    };
    const onEnded = () => setGameEnded(true);
    const onBalanceUpdated = ({ balance }) => {
      setNewAccountBalance(balance);
      updateBalance(balance);
    };

    socket.on("game:started", onStarted);
    socket.on("player:question", onQuestion);
    socket.on("player:answer_result", onAnswerResult);
    socket.on("game:ended", onEnded);
    socket.on("account:balance_updated", onBalanceUpdated);

    return () => {
      socket.off("game:started", onStarted);
      socket.off("player:question", onQuestion);
      socket.off("player:answer_result", onAnswerResult);
      socket.off("game:ended", onEnded);
      socket.off("account:balance_updated", onBalanceUpdated);
    };
  }, [code, navigate, updateBalance]);

  const handleAnswer = (choiceIndex) => {
    if (feedback) return; // already answered, waiting for next question
    setFeedback({ selectedIndex: choiceIndex, pending: true });
    socket.emit("player:submit_answer", { choiceIndex });
  };

  const handleBuyUpgrade = (upgradeId) => {
    socket.emit("player:buy_upgrade", { upgradeId }, (res) => {
      if (res.success) {
        setMoney(res.newBalance);
        setOwnedUpgrades(res.upgrades);
      } else {
        alert(res.reason);
      }
    });
  };

  if (gameEnded) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Game Over!</h2>
          <p>This game's earnings: ${money}</p>
          {user && newAccountBalance !== null && (
            <div style={{ margin: "16px 0" }}>
              <div style={{ fontSize: 48 }}>{avatarEmoji(user.equippedAvatar)}</div>
              <p style={{ margin: "4px 0" }}>Added to your account!</p>
              <div className="money-display bump">💰 ${newAccountBalance}</div>
            </div>
          )}
          {!user && (
            <p>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>
                Log in or create an account
              </a>{" "}
              next time to save earnings like this and unlock new avatars!
            </p>
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

  return (
    <div className="container">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className={`money-display ${moneyBump ? "bump" : ""}`}>💰 ${money}</div>
          {streak > 1 && <div className="streak-display">🔥 Streak: {streak}</div>}
        </div>
        <button onClick={() => setShowShop(!showShop)}>
          {showShop ? "Back to Game" : "🛒 Shop"}
        </button>
      </div>

      {showShop ? (
        <ShopView
          allUpgrades={allUpgrades}
          ownedUpgrades={ownedUpgrades}
          money={money}
          onBuy={handleBuyUpgrade}
        />
      ) : (
        <QuestionView question={question} feedback={feedback} onAnswer={handleAnswer} />
      )}
    </div>
  );
}

function QuestionView({ question, feedback, onAnswer }) {
  if (!question) {
    return (
      <div className="card">
        <p>Loading question...</p>
      </div>
    );
  }

  const showResult = feedback && !feedback.pending;

  return (
    <div className="card">
      {showResult && (
        <div className={`feedback-banner ${feedback.isCorrect ? "correct" : "incorrect"}`}>
          {feedback.isCorrect ? `Correct! +$${feedback.moneyDelta}` : `Wrong! ${feedback.moneyDelta < 0 ? `-$${Math.abs(feedback.moneyDelta)}` : "+$0"}`}
          {feedback.bonusEvents?.map((b, i) => (
            <div key={i} style={{ fontSize: 14, fontWeight: 500 }}>
              {b.type === "streak_bonus" && `🔥 Streak Bonus: +$${b.amount}`}
              {b.type === "interest" && `📈 Compound Interest: +$${b.amount}`}
              {b.type === "penalty" && `⚠️ Double or Nothing Penalty: -$${Math.abs(b.amount)}`}
            </div>
          ))}
        </div>
      )}

      <h2>{question.text}</h2>
      <div className="choices">
        {question.choices.map((choice, i) => {
          let className = "choice-btn";
          if (showResult) {
            if (i === feedback.correctAnswerIndex) className += " correct";
            else if (i === feedback.selectedIndex) className += " incorrect";
          }
          return (
            <button
              key={i}
              className={className}
              onClick={() => onAnswer(i)}
              disabled={!!feedback}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {showResult && (
        <p style={{ marginTop: 12, color: "#6b7280" }}>
          Next question loading...
        </p>
      )}
    </div>
  );
}

function ShopView({ allUpgrades, ownedUpgrades, money, onBuy }) {
  return (
    <div className="card">
      <h2>Upgrade Shop</h2>
      <p>Spend your earnings on upgrades that boost future rewards!</p>
      {allUpgrades.map((upgrade) => {
        const owned = ownedUpgrades.includes(upgrade.id);
        const canAfford = money >= upgrade.cost;
        return (
          <div key={upgrade.id} className={`upgrade-card ${owned ? "owned" : ""}`}>
            <div>
              <strong>{upgrade.name}</strong>
              <p style={{ margin: "4px 0", color: "#6b7280" }}>{upgrade.description}</p>
            </div>
            <button
              onClick={() => onBuy(upgrade.id)}
              disabled={owned || !canAfford}
            >
              {owned ? "Owned" : `$${upgrade.cost}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
