import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { avatarEmoji } from "../avatars";

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, logout, refreshUser } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
      return;
    }
    api.getAvatarCatalog().then(setCatalog).catch((e) => setError(e.message));
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handlePurchase = async (avatarId) => {
    setError("");
    setBusyId(avatarId);
    try {
      await api.purchaseAvatar(avatarId);
      await refreshUser();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleEquip = async (avatarId) => {
    setError("");
    setBusyId(avatarId);
    try {
      await api.equipAvatar(avatarId);
      await refreshUser();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>{avatarEmoji(user.equippedAvatar)}</div>
        <h2>{user.username}</h2>
        <div className="money-display">💰 ${user.balance}</div>
        <p>Earn money in games to spend on new avatars below!</p>
      </div>

      {error && (
        <div className="card">
          <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="card">
        <h3>Avatar Shop</h3>
        {catalog.map((avatar) => {
          const owned = user.ownedAvatars.includes(avatar.id);
          const equipped = user.equippedAvatar === avatar.id;
          const canAfford = user.balance >= avatar.cost;
          const isBusy = busyId === avatar.id;

          return (
            <div key={avatar.id} className={`upgrade-card ${equipped ? "owned" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 36 }}>{avatar.emoji}</div>
                <div>
                  <strong>{avatar.name}</strong>
                  <p style={{ margin: "4px 0", color: "#6b7280" }}>
                    {avatar.cost === 0 ? "Free" : `$${avatar.cost}`}
                  </p>
                </div>
              </div>

              {equipped ? (
                <button disabled style={{ background: "#22c55e" }}>
                  Equipped ✓
                </button>
              ) : owned ? (
                <button onClick={() => handleEquip(avatar.id)} disabled={isBusy}>
                  {isBusy ? "..." : "Equip"}
                </button>
              ) : (
                <button onClick={() => handlePurchase(avatar.id)} disabled={!canAfford || isBusy}>
                  {isBusy ? "..." : `Buy $${avatar.cost}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => navigate("/")} style={{ background: "#6b7280", marginRight: 8 }}>
        Back to Home
      </button>
      <button onClick={handleLogout} style={{ background: "#dc2626" }}>
        Log Out
      </button>
    </div>
  );
}
