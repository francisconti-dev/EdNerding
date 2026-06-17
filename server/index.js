const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");

const { GameSession, UPGRADES } = require("./GameSession");
const { FishingSession } = require("./FishingSession");
const { MAP_LAYOUT, FISH_CATALOG } = require("./fishingMapData");
const questionSetStore = require("./questionSetStore");
const db = require("./db");
const { generateToken, verifyToken, requireAuth } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// --- REST API for question set authoring ---

app.get("/api/question-sets", (req, res) => {
  res.json(questionSetStore.getAllSets());
});

app.get("/api/question-sets/:key", (req, res) => {
  const set = questionSetStore.getSet(req.params.key);
  if (!set) return res.status(404).json({ error: "Not found" });
  res.json(set);
});

app.post("/api/question-sets", (req, res) => {
  const { key, name } = req.body;
  if (!key || !name) return res.status(400).json({ error: "key and name are required" });

  const result = questionSetStore.createSet(key, name);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.set);
});

app.put("/api/question-sets/:key", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const result = questionSetStore.updateSetMeta(req.params.key, name);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.set);
});

app.delete("/api/question-sets/:key", (req, res) => {
  const result = questionSetStore.deleteSet(req.params.key);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json({ success: true });
});

app.post("/api/question-sets/:key/questions", (req, res) => {
  const { text, choices, answer } = req.body;
  if (!text || !Array.isArray(choices) || choices.length < 2 || typeof answer !== "number") {
    return res.status(400).json({ error: "text, choices (array of 2+), and answer (index) are required" });
  }

  const result = questionSetStore.addQuestion(req.params.key, { text, choices, answer });
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.question);
});

app.put("/api/question-sets/:key/questions/:questionId", (req, res) => {
  const { text, choices, answer } = req.body;
  const updates = {};
  if (text !== undefined) updates.text = text;
  if (choices !== undefined) updates.choices = choices;
  if (answer !== undefined) updates.answer = answer;

  const result = questionSetStore.updateQuestion(req.params.key, req.params.questionId, updates);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.question);
});

app.delete("/api/question-sets/:key/questions/:questionId", (req, res) => {
  const result = questionSetStore.deleteQuestion(req.params.key, req.params.questionId);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json({ success: true });
});

// --- Account / Auth API ---

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: "Username must be 3-20 characters" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const result = db.createUser(username.trim(), password);
  if (!result.success) return res.status(400).json({ error: result.reason });

  const token = generateToken(result.user.id);
  res.json({ token, user: result.user });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const result = db.verifyLogin(username.trim(), password);
  if (!result.success) return res.status(401).json({ error: result.reason });

  const token = generateToken(result.user.id);
  res.json({ token, user: result.user });
});

app.get("/api/account/me", requireAuth, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// --- Avatar Shop API ---

app.get("/api/avatars", (req, res) => {
  res.json(db.getAvatarCatalog());
});

app.post("/api/account/avatars/:avatarId/purchase", requireAuth, (req, res) => {
  const result = db.purchaseAvatar(req.userId, req.params.avatarId);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.user);
});

app.post("/api/account/avatars/:avatarId/equip", requireAuth, (req, res) => {
  const result = db.equipAvatar(req.userId, req.params.avatarId);
  if (!result.success) return res.status(400).json({ error: result.reason });
  res.json(result.user);
});

// --- Fishing Mode static data ---

app.get("/api/fishing/map", (req, res) => {
  res.json({ layout: MAP_LAYOUT, fishCatalog: FISH_CATALOG });
});

// In-memory store of active games: code -> GameSession
const games = new Map();

function generateRoomCode() {
  let code;
  do {
    code = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "A");
  } while (games.has(code));
  return code;
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // HOST: create a new game session
  socket.on("host:create_game", ({ questionSetKey, mode } = {}, callback) => {
    console.log("Creating game with mode:", mode);
    const code = generateRoomCode();
    const game =
      mode === "fishing"
        ? new FishingSession(code, socket.id, questionSetKey)
        : new GameSession(code, socket.id, questionSetKey);
    games.set(code, game);
    socket.join(code);
    socket.data.role = "host";
    socket.data.gameCode = code;

    callback({ success: true, code, mode: mode === "fishing" ? "fishing" : "classic" });
  });

  // HOST: start the game (players begin receiving questions)
  socket.on("host:start_game", ({ code }) => {
    const game = games.get(code);
    if (!game || game.hostSocketId !== socket.id) return;

    game.start();
    io.to(code).emit("game:started");

    // Send each player their first question
    for (const playerId of game.players.keys()) {
      const question = game.getQuestionForPlayer(playerId);
      io.to(playerId).emit("player:question", question);
    }

    broadcastLeaderboard(game);
  });

  // HOST: end the game
  socket.on("host:end_game", ({ code }) => {
    const game = games.get(code);
    if (!game || game.hostSocketId !== socket.id) return;

    game.end();
    creditPlayerEarnings(game);
    io.to(code).emit("game:ended", { players: game.getPlayerList() });
  });

  // PLAYER: join a game by room code
  socket.on("player:join", ({ code, nickname, token }, callback) => {
    const game = games.get(code);
    if (!game) {
      return callback({ success: false, reason: "Game not found" });
    }
    if (game.status === "ended") {
      return callback({ success: false, reason: "Game has ended" });
    }

    // If a logged-in user joins, link their account so earnings carry over
    let user = null;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        user = db.getUserById(decoded.userId);
        socket.data.userId = decoded.userId;
      }
    }

    const finalNickname = nickname || (user ? user.username : `Player${Math.floor(Math.random() * 1000)}`);
    const avatar = user ? user.equippedAvatar : "default";

    game.addPlayer(socket.id, finalNickname, avatar);
    if (user) {
      game.players.get(socket.id).userId = user.id;
    }
    socket.join(code);
    socket.data.role = "player";
    socket.data.gameCode = code;

    const isFishing = game.mode === "fishing";

    callback({
      success: true,
      code,
      upgrades: UPGRADES,
      loggedIn: !!user,
      mode: isFishing ? "fishing" : "classic",
      player: isFishing ? game.players.get(socket.id) : undefined
    });

    // Notify host of updated player list
    broadcastLeaderboard(game);

    // If game already active, immediately send a question
    if (game.status === "active") {
      const question = game.getQuestionForPlayer(socket.id);
      socket.emit("player:question", question);
    }
  });

  // PLAYER: submit an answer to current question
  socket.on("player:submit_answer", ({ choiceIndex }) => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game || game.status !== "active") return;

    const result = game.submitAnswer(socket.id, choiceIndex);
    if (!result) return;

    socket.emit("player:answer_result", result);
    socket.emit("player:question", result.nextQuestion);

    broadcastLeaderboard(game);
  });

  // PLAYER: purchase an upgrade from the shop
  socket.on("player:buy_upgrade", ({ upgradeId }, callback) => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game) return callback({ success: false, reason: "Game not found" });

    const result = game.purchaseUpgrade(socket.id, upgradeId);

    if (result.success) {
      callback({
        success: true,
        newBalance: result.player.money,
        upgrades: result.player.upgrades
      });
      broadcastLeaderboard(game);
    } else {
      callback({ success: false, reason: result.reason });
    }
  });

  // FISHING MODE: move a player one tile in a direction
  socket.on("fishing:move", ({ direction }) => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game || game.mode !== "fishing" || game.status !== "active") return;

    const result = game.movePlayer(socket.id, direction);
    if (!result) return;

    // Broadcast the updated position to everyone in the room (host + other players)
    io.to(code).emit("fishing:player_moved", { id: socket.id, x: result.x, y: result.y });
  });

  // FISHING MODE: cast a line near water
  socket.on("fishing:cast", (_, callback) => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game || game.mode !== "fishing" || game.status !== "active") {
      return callback({ success: false, reason: "Game not active" });
    }

    const result = game.startCast(socket.id);
    if (!result.success) return callback(result);

    callback(result);

    setTimeout(() => {
      const catchResult = game.resolveCast(socket.id);
      if (catchResult) {
        io.to(socket.id).emit("fishing:catch_result", catchResult);
        broadcastLeaderboard(game);
      }
    }, result.durationMs);
  });

  // FISHING MODE: sell all fish in inventory at the sell station
  socket.on("fishing:sell", (_, callback) => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game || game.mode !== "fishing") return callback({ success: false, reason: "Game not active" });

    const result = game.sellFish(socket.id);
    callback(result);
    if (result.success) broadcastLeaderboard(game);
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    const code = socket.data.gameCode;
    const game = games.get(code);
    if (!game) return;

    if (socket.data.role === "player") {
      const player = game.players.get(socket.id);
      if (player && player.userId && player.money > 0) {
        db.addToBalance(player.userId, player.money);
      }
      game.removePlayer(socket.id);
      io.to(game.hostSocketId).emit("host:player_list", { players: game.getPlayerList() });
    } else if (socket.data.role === "host") {
      // Optionally end the game if host disconnects
      creditPlayerEarnings(game);
      io.to(code).emit("game:ended", { players: game.getPlayerList(), reason: "Host disconnected" });
      games.delete(code);
    }
  });
});

function broadcastLeaderboard(game) {
  io.to(game.hostSocketId).emit("host:player_list", { players: game.getPlayerList() });

  // Fishing players need their own state (position, bait, inventory) too,
  // since host:player_list is host-only. Broadcast to the whole room.
  if (game.mode === "fishing") {
    io.to(game.code).emit("fishing:state_sync", { players: game.getPlayerList() });
  }
}

// Converts each logged-in player's in-game earnings to permanent account balance
function creditPlayerEarnings(game) {
  for (const [socketId, player] of game.players.entries()) {
    if (player.userId && player.money > 0) {
      const updatedUser = db.addToBalance(player.userId, player.money);
      io.to(socketId).emit("account:balance_updated", { balance: updatedUser.balance });
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  
});