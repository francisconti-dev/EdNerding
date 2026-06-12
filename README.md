# EdNerding — Gimkit-Style Educational Game

A real-time multiplayer trivia game where players answer questions at their own
pace, earn in-game currency, and spend it on upgrades that boost future earnings.

## Project Structure

```
gimkit-clone/
├── server/          # Node.js + Socket.io backend
│   ├── index.js          # Server entry, socket event handlers
│   ├── GameSession.js     # Core game logic: scoring, upgrades, state
│   └── gameData.js        # Question sets + upgrade definitions
└── client/          # React + Vite frontend
    └── src/
        ├── socket.js       # Socket.io client connection
        ├── main.jsx        # Routing
        ├── styles.css
        └── pages/
            ├── Home.jsx        # Landing page
            ├── HostLobby.jsx   # Host: room code + waiting players
            ├── HostGame.jsx    # Host: live leaderboard
            ├── PlayerJoin.jsx  # Player: enter code + nickname
            └── PlayerGame.jsx  # Player: questions + shop
```

## Running Locally

### 1. Start the server
```bash
cd server
npm install
npm start
```
Runs on `http://localhost:3001`.

### 2. Start the client
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### 3. Play
- Open the client in one browser tab → click "Host a Game" → note the room code.
- Open the client in other tabs/devices → click "Enter Room Code" → join with that code.
- Host clicks "Start Game" once players have joined.
- Players answer questions at their own pace, earning money for correct answers.
- Players can open the Shop anytime to spend money on upgrades.

## How the Currency/Upgrade System Works

Each player has independent state: `money`, `streak`, `upgrades` (array of owned
upgrade IDs), and their own position in the question set (so players progress
independently, just like Gimkit).

**Base reward:** $10 per correct answer (configurable in `gameData.js`).

**Upgrades** (defined in `gameData.js`, applied in `GameSession.js`):
- **Double or Nothing** — 2x reward for correct, but -$5 penalty for wrong
- **Streak Bonus** — +$15 every 3 correct answers in a row
- **Money Printer** — raises base reward from $10 → $15
- **Insurance Policy** — wrong answers don't break your streak
- **Compound Interest** — earn 5% of current balance as bonus on each correct answer

Upgrades stack — a player can own multiple and all effects apply together.

## Extending This Starter

**Add more question sets:** edit `QUESTION_SETS` in `server/gameData.js`, then
pass a `questionSetKey` when hosting creates a game.

**Add a question authoring UI:** build a form that POSTs to a new Express route,
saving question sets to a database (Postgres recommended) instead of the
in-memory `gameData.js`.

**Persist results:** currently all game state lives in memory and is lost when
the server restarts. Add a database layer (e.g., Postgres + Prisma) to save
game results, player accounts, and custom question sets.

**Add more upgrades:** extend the `UPGRADES` array and add a corresponding
`case` in `GameSession.computeCorrectReward()` or `submitAnswer()` for new
effect types.

**Scale beyond one server:** the in-memory `games` Map won't work across
multiple server instances. Use Redis to store game state if you need to
horizontally scale, plus the Socket.io Redis adapter for cross-instance
broadcasting.

**Authentication:** add teacher accounts (e.g., with JWT or OAuth) so hosts
can save question sets and view past game reports. Players can remain
anonymous (join by code + nickname), matching Gimkit's UX.
