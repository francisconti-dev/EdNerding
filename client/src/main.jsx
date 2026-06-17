import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Host from "./pages/Host";
import HostLobby from "./pages/HostLobby";
import HostGame from "./pages/HostGame";
import PlayerJoin from "./pages/PlayerJoin";
import PlayerGame from "./pages/PlayerGame";
import PlayerFishingGame from "./pages/PlayerFishingGame";
import QuestionSetList from "./pages/QuestionSetList";
import QuestionSetEditor from "./pages/QuestionSetEditor";
import Login from "./pages/Login";
import Account from "./pages/Account";

import { AuthProvider } from "./AuthContext";

import "./styles.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host />} />
          <Route path="/host/lobby" element={<HostLobby />} />
          <Route path="/host/game" element={<HostGame />} />
          <Route path="/join" element={<PlayerJoin />} />
          <Route path="/play" element={<PlayerGame />} />
          <Route path="/play-fishing" element={<PlayerFishingGame />} />
          <Route path="/question-sets" element={<QuestionSetList />} />
          <Route path="/edit/:key" element={<QuestionSetEditor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);