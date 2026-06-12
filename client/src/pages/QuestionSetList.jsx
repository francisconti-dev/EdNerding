import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function QuestionSetList() {
  const navigate = useNavigate();
  const [sets, setSets] = useState({});
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const loadSets = () => {
    api.getAllSets().then(setSets).catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadSets();
  }, []);

  const handleCreate = async () => {
    setError("");
    const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!key || !newName.trim()) {
      setError("Please enter both an ID and a name.");
      return;
    }
    try {
      await api.createSet(key, newName.trim());
      setNewKey("");
      setNewName("");
      loadSets();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete question set "${sets[key].name}"? This cannot be undone.`)) return;
    try {
      await api.deleteSet(key);
      loadSets();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Question Sets</h1>
        <p>Create and edit question sets to use when hosting a game.</p>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </div>

      <div className="card">
        <h3>Your Sets</h3>
        {Object.keys(sets).length === 0 && <p>No question sets yet.</p>}
        <ul className="player-list">
          {Object.entries(sets).map(([key, set]) => (
            <li key={key}>
              <span>
                <strong>{set.name}</strong> ({set.questions.length} questions)
              </span>
              <span>
                <button onClick={() => navigate(`/edit/${key}`)} style={{ marginRight: 8 }}>
                  Edit
                </button>
                {key !== "default" && (
                  <button onClick={() => handleDelete(key)} style={{ background: "#dc2626" }}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Create New Set</h3>
        <input
          placeholder="ID (e.g. science-quiz, no spaces)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          placeholder="Display Name (e.g. Science Quiz)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={handleCreate}>Create Set</button>
      </div>

      <button onClick={() => navigate("/")}>Back to Home</button>
    </div>
  );
}
