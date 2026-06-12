const { UPGRADES } = require("./gameData");
const { getSet } = require("./questionSetStore");

const BASE_REWARD = 10;
const WRONG_PENALTY = 0; // default: wrong answers earn nothing (can be modified by upgrades)

class GameSession {
  constructor(code, hostSocketId, questionSetKey = "default") {
    this.code = code;
    this.hostSocketId = hostSocketId;
    this.questionSet = getSet(questionSetKey) || getSet("default");
    this.status = "lobby"; // lobby | active | ended
    this.players = new Map(); // socketId -> player state
  }

  addPlayer(socketId, nickname, avatar = "default") {
    this.players.set(socketId, {
      id: socketId,
      nickname,
      avatar,
      userId: null,
      money: 0,
      correct: 0,
      incorrect: 0,
      streak: 0,
      upgrades: [], // array of upgrade ids owned
      currentQuestionIndex: 0
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
      money: p.money,
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
      // loop back to start so players can keep earning (Gimkit-style endless play)
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

  // Applies all owned upgrades to compute the reward for a correct answer
  computeCorrectReward(player) {
    let reward = BASE_REWARD;
    let bonusEvents = [];

    for (const upgradeId of player.upgrades) {
      const upgrade = UPGRADES.find((u) => u.id === upgradeId);
      if (!upgrade) continue;
      const effect = upgrade.effect;

      switch (effect.type) {
        case "base_reward":
          reward = Math.max(reward, effect.value);
          break;
        case "multiplier_risky":
          reward *= effect.value;
          break;
        case "interest": {
          const interestBonus = Math.floor(player.money * effect.rate);
          if (interestBonus > 0) {
            reward += interestBonus;
            bonusEvents.push({ type: "interest", amount: interestBonus });
          }
          break;
        }
        default:
          break;
      }
    }

    // Streak bonus is evaluated after incrementing streak, handled separately
    return { reward, bonusEvents };
  }

  hasUpgrade(player, upgradeId) {
    return player.upgrades.includes(upgradeId);
  }

  // Submits an answer, updates player state, returns result info
  submitAnswer(socketId, choiceIndex) {
    const player = this.players.get(socketId);
    if (!player) return null;

    const questions = this.questionSet.questions;
    const q = questions[player.currentQuestionIndex];
    const isCorrect = choiceIndex === q.answer;

    let moneyDelta = 0;
    let bonusEvents = [];
    let streakBonusEarned = 0;

    if (isCorrect) {
      player.correct += 1;
      player.streak += 1;

      const { reward, bonusEvents: interestEvents } = this.computeCorrectReward(player);
      moneyDelta += reward;
      bonusEvents.push(...interestEvents);

      // Streak bonus upgrade
      const streakUpgrade = UPGRADES.find((u) => u.id === "streak_bonus");
      if (streakUpgrade && this.hasUpgrade(player, "streak_bonus")) {
        if (player.streak % streakUpgrade.effect.every === 0) {
          streakBonusEarned = streakUpgrade.effect.bonus;
          moneyDelta += streakBonusEarned;
          bonusEvents.push({ type: "streak_bonus", amount: streakBonusEarned });
        }
      }
    } else {
      player.incorrect += 1;

      // Reset streak unless player has insurance
      if (!this.hasUpgrade(player, "insurance")) {
        player.streak = 0;
      }

      // Double or nothing penalty
      if (this.hasUpgrade(player, "double_or_nothing")) {
        const penalty = UPGRADES.find((u) => u.id === "double_or_nothing").effect.penalty;
        moneyDelta -= penalty;
        bonusEvents.push({ type: "penalty", amount: -penalty });
      } else {
        moneyDelta += WRONG_PENALTY;
      }
    }

    player.money = Math.max(0, player.money + moneyDelta);
    player.currentQuestionIndex += 1;

    return {
      isCorrect,
      correctAnswerIndex: q.answer,
      moneyDelta,
      newBalance: player.money,
      streak: player.streak,
      bonusEvents,
      nextQuestion: this.getQuestionForPlayer(socketId)
    };
  }

  // Attempts to purchase an upgrade. Returns { success, reason, player }
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

module.exports = { GameSession, UPGRADES };
