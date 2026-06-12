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
    <div>
      {/* Top nav */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">🎓 EdNerding</div>
          <div className="navbar-actions">
            {!loading && (
              user ? (
                <button className="btn-ghost" onClick={() => navigate("/account")}>
                  {avatarEmoji(user.equippedAvatar)} {user.username} · ${user.balance}
                </button>
              ) : (
                <button className="btn-ghost" onClick={() => navigate("/login")}>
                  Log In
                </button>
              )
            )}
            <button className="btn-ghost" onClick={() => navigate("/question-sets")}>
              My Question Sets
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1 className="hero-title">
              Learning, <span className="highlight">leveled up.</span>
            </h1>
            <p className="hero-subtitle">
              Answer questions at your own pace, earn cash, and spend it on
              upgrades that boost your score. The classroom game where strategy
              meets knowledge.
            </p>

            <div className="hero-actions">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="hero-select"
              >
                {Object.entries(sets).map(([key, set]) => (
                  <option key={key} value={key}>
                    {set.name} ({set.questions.length} questions)
                  </option>
                ))}
              </select>
              <button className="btn-primary btn-large" onClick={handleHost}>
                🚀 Host a Game
              </button>
            </div>

            <div className="hero-secondary">
              <button className="btn-secondary" onClick={() => navigate("/join")}>
                Enter Room Code
              </button>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="floating-card card-money">💰 +$15</div>
            <div className="floating-card card-streak">🔥 Streak x3</div>
            <div className="floating-card card-upgrade">⚡ Upgrade!</div>
            <div className="hero-blob" />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="features">
        <div className="features-inner">
          <FeatureCard
            emoji="📝"
            title="Make it yours"
            description="Build custom question sets on any topic in minutes — perfect for any subject or grade level."
          />
          <FeatureCard
            emoji="💸"
            title="Earn while you learn"
            description="Every correct answer pays out. Build up a balance and watch it grow as you play."
          />
          <FeatureCard
            emoji="🛒"
            title="Strategic upgrades"
            description="Spend earnings on upgrades like Double or Nothing, Streak Bonuses, and Compound Interest."
          />
          <FeatureCard
            emoji="🦄"
            title="Unlock avatars"
            description="Create a free account to save your earnings between games and unlock new avatars in the shop."
          />
        </div>
      </section>

      <footer className="footer">
        <p>Made for classrooms everywhere. Have fun, learn something. 🎓</p>
      </footer>
    </div>
  );
}

function FeatureCard({ emoji, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-emoji">{emoji}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}