import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [mode, setMode] = useState(location.state?.mode === "register" ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter a username and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>🎓 EdNerding</h1>
        <h2>{mode === "login" ? "Log In" : "Create Account"}</h2>
        <p>
          {mode === "login"
            ? "Log in to save your earnings and unlock avatars."
            : "Create an account to save your earnings between games and unlock new avatars."}
        </p>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </div>

      <div className="card">
        {mode === "login" ? (
          <p>
            Don't have an account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(""); }}>
              Create one
            </a>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }}>
              Log in
            </a>
          </p>
        )}
        <button onClick={() => navigate("/")} style={{ background: "#6b7280" }}>
          Continue without an account
        </button>
      </div>
    </div>
  );
}
