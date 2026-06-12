// Upgrades players can buy with earned currency.
// Each upgrade modifies a multiplier or grants a passive bonus applied on future correct answers.
const UPGRADES = [
  {
    id: "double_or_nothing",
    name: "Double or Nothing",
    description: "Correct answers pay 2x, but wrong answers cost you $5.",
    cost: 50,
    effect: { type: "multiplier_risky", value: 2, penalty: 5 }
  },
  {
    id: "streak_bonus",
    name: "Streak Bonus",
    description: "Every 3 correct answers in a row earns a +$15 bonus.",
    cost: 75,
    effect: { type: "streak", every: 3, bonus: 15 }
  },
  {
    id: "money_printer",
    name: "Money Printer",
    description: "Increases base reward per correct answer from $10 to $15.",
    cost: 100,
    effect: { type: "base_reward", value: 15 }
  },
  {
    id: "insurance",
    name: "Insurance Policy",
    description: "Wrong answers no longer cost you any in-progress streak.",
    cost: 60,
    effect: { type: "streak_protect" }
  },
  {
    id: "interest",
    name: "Compound Interest",
    description: "Earn 5% of your current balance as a bonus every correct answer.",
    cost: 150,
    effect: { type: "interest", rate: 0.05 }
  }
];

module.exports = { UPGRADES };
