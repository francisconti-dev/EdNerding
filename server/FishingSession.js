const { UPGRADES } = require("./gameData");
const { getSet } = require("./questionSetStore");
const {
  MAP_WIDTH,
  MAP_HEIGHT,
  isWalkable,
  isAdjacentToTileType,
  rollFish,
  FISH_CATALOG
} = require("./fishingMapData");

const BASE_BAIT_REWARD = 1;
const FISH_COST_BAIT = 1;
const CAST_DURATION_MS = 1800; // time between casting and a result

// Spawn points scattered across walkable grass tiles
const SPAWN_POINTS = [
  { x: 9, y: 4 },
  { x: 10, y: 4 },
  { x: 9, y: 9 },
  { x: 10, y: 9 },
  { x: 2, y: 4 },
  { x: 17, y: 4 }
];

class FishingSession {
  constructor(code, hostSocketId, questionSetKey = "default") {
    this.code = code;
    this.hostSocketId = hostSocketId;
    this.mode = "fishing";
    this.questionSet = getSet(questionSetKey) || getSet("default");
    this.status = "lobby"; // lobby | active | ended
    this.players = new Map(); // socketId -> player state
  }

  addPlayer(socketId, nickname, avatar = "default") {
    const spawn = SPAWN_POINTS[this.players.size % SPAWN_POINTS.length];
    this.players.set(socketId, {
      id: socketId,
      nickname,
      avatar,
      userId: null,
      x: spawn.x,
      y: spawn.y,
      bait: 0,
      money: 0,
      inventory: [], // array of fish ids caught but not yet sold
      correct: 0,
      incorrect: 0,
      upgrades: [],
      currentQuestionIndex: 0,
      isCasting: false
    });
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  start() {
    this.status = "active";
  }

  end() {
    this.status = "ended";
  }

  getPlayerList() {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      x: p.x,
      y: p.y,
      bait: p.bait,
      money: p.money,
      inventoryCount: p.inventory.length,
      correct: p.correct,
      incorrect: p.incorrect
    }));
  }

  getQuestionForPlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;
    const questions = this.questionSet.questions;
    if (!questions || questions.length === 0) return null;
    if (player.currentQuestionIndex >= questions.length) {
      player.currentQuestionIndex = 0;
    }
    const q = questions[player.currentQuestionIndex];
    return {
      id: q.id,
      text: q.text,
      choices: q.choices,
      index: player.currentQuestionIndex
    };
  }

  // Moves a player by one tile in a direction, if the destination is walkable
  movePlayer(socketId, direction) {
    const player = this.players.get(socketId);
    if (!player) return null;

    let { x, y } = player;
    if (direction === "up") y -= 1;
    else if (direction === "down") y += 1;
    else if (direction === "left") x -= 1;
    else if (direction === "right") x += 1;
    else return null;

    x = Math.max(0, Math.min(MAP_WIDTH - 1, x));
    y = Math.max(0, Math.min(MAP_HEIGHT - 1, y));

    if (!isWalkable(x, y)) return { moved: false, x: player.x, y: player.y };

    player.x = x;
    player.y = y;
    return { moved: true, x, y };
  }

  // Submits an answer at the question station; rewards bait instead of cash
  submitAnswer(socketId, choiceIndex) {
    const player = this.players.get(socketId);
    if (!player) return null;

    const questions = this.questionSet.questions;
    const q = questions[player.currentQuestionIndex];
    const isCorrect = choiceIndex === q.answer;

    let baitDelta = 0;

    if (isCorrect) {
      player.correct += 1;
      baitDelta = BASE_BAIT_REWARD;

      // Money Printer upgrade boosts bait reward too, reusing existing upgrade
      if (player.upgrades.includes("money_printer")) {
        baitDelta = 2;
      }
    } else {
      player.incorrect += 1;
    }

    player.bait += baitDelta;
    player.currentQuestionIndex += 1;

    return {
      isCorrect,
      correctAnswerIndex: q.answer,
      baitDelta,
      newBaitBalance: player.bait,
      nextQuestion: this.getQuestionForPlayer(socketId)
    };
  }

  // Returns true if the player is currently standing next to a station of the given type
  isPlayerNearZone(socketId, zoneType) {
    const player = this.players.get(socketId);
    if (!player) return false;
    return isAdjacentToTileType(player.x, player.y, zoneType);
  }

  // Starts a cast attempt if the player has bait and is near water
  startCast(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, reason: "Player not found" };
    if (player.isCasting) return { success: false, reason: "Already casting" };
    if (player.bait < FISH_COST_BAIT) return { success: false, reason: "Not enough bait" };
    if (!isAdjacentToTileType(player.x, player.y, "W")) {
      return { success: false, reason: "You need to be near water to fish" };
    }

    player.bait -= FISH_COST_BAIT;
    player.isCasting = true;

    return { success: true, durationMs: CAST_DURATION_MS };
  }

  // Resolves a cast after the wait duration, adding a fish to the player's inventory
  resolveCast(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;
    if (!player.isCasting) return null;

    player.isCasting = false;
    const fish = rollFish();
    player.inventory.push(fish.id);

    return { fish };
  }

  // Sells all fish in inventory if the player is near a sell station
  sellFish(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, reason: "Player not found" };
    if (!isAdjacentToTileType(player.x, player.y, "S")) {
      return { success: false, reason: "You need to be near the sell station" };
    }
    if (player.inventory.length === 0) {
      return { success: false, reason: "No fish to sell" };
    }

    let totalValue = 0;
    const soldCounts = {};

    for (const fishId of player.inventory) {
      const fish = FISH_CATALOG.find((f) => f.id === fishId);
      if (fish) {
        totalValue += fish.value;
        soldCounts[fishId] = (soldCounts[fishId] || 0) + 1;
      }
    }

    player.inventory = [];
    player.money += totalValue;

    return { success: true, totalValue, soldCounts, newBalance: player.money };
  }

  // Attempts to purchase an upgrade using money earned from selling fish
  purchaseUpgrade(socketId, upgradeId) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, reason: "Player not found" };

    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return { success: false, reason: "Upgrade not found" };

    if (player.upgrades.includes(upgradeId)) {
      return { success: false, reason: "Already owned" };
    }

    if (player.money < upgrade.cost) {
      return { success: false, reason: "Not enough money" };
    }

    player.money -= upgrade.cost;
    player.upgrades.push(upgradeId);

    return { success: true, player };
  }
}

module.exports = { FishingSession };