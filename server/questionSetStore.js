const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "questionSets.json");

const DEFAULT_SETS = {
  default: {
    name: "General Trivia",
    questions: [
      {
        id: "q1",
        text: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        answer: 2
      },
      {
        id: "q2",
        text: "What is 7 x 8?",
        choices: ["54", "56", "58", "64"],
        answer: 1
      },
      {
        id: "q3",
        text: "Which planet is known as the Red Planet?",
        choices: ["Venus", "Mars", "Jupiter", "Saturn"],
        answer: 1
      },
      {
        id: "q4",
        text: "What is the chemical symbol for water?",
        choices: ["O2", "H2O", "CO2", "NaCl"],
        answer: 1
      },
      {
        id: "q5",
        text: "Who wrote 'Romeo and Juliet'?",
        choices: ["Dickens", "Shakespeare", "Austen", "Hemingway"],
        answer: 1
      }
    ]
  }
};

function loadSets() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_SETS, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_SETS));
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read question sets file, using defaults:", err);
    return JSON.parse(JSON.stringify(DEFAULT_SETS));
  }
}

function saveSets(sets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(sets, null, 2));
}

function getAllSets() {
  return loadSets();
}

function getSet(key) {
  const sets = loadSets();
  return sets[key] || null;
}

function createSet(key, name) {
  const sets = loadSets();
  if (sets[key]) {
    return { success: false, reason: "A set with this key already exists" };
  }
  sets[key] = { name, questions: [] };
  saveSets(sets);
  return { success: true, set: sets[key] };
}

function updateSetMeta(key, name) {
  const sets = loadSets();
  if (!sets[key]) return { success: false, reason: "Set not found" };
  sets[key].name = name;
  saveSets(sets);
  return { success: true, set: sets[key] };
}

function deleteSet(key) {
  const sets = loadSets();
  if (!sets[key]) return { success: false, reason: "Set not found" };
  if (key === "default") return { success: false, reason: "Cannot delete the default set" };
  delete sets[key];
  saveSets(sets);
  return { success: true };
}

function addQuestion(key, question) {
  const sets = loadSets();
  if (!sets[key]) return { success: false, reason: "Set not found" };

  const id = "q" + Date.now();
  const newQuestion = { ...question, id };
  sets[key].questions.push(newQuestion);
  saveSets(sets);
  return { success: true, question: newQuestion };
}

function updateQuestion(key, questionId, updates) {
  const sets = loadSets();
  if (!sets[key]) return { success: false, reason: "Set not found" };

  const q = sets[key].questions.find((q) => q.id === questionId);
  if (!q) return { success: false, reason: "Question not found" };

  Object.assign(q, updates);
  saveSets(sets);
  return { success: true, question: q };
}

function deleteQuestion(key, questionId) {
  const sets = loadSets();
  if (!sets[key]) return { success: false, reason: "Set not found" };

  const idx = sets[key].questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return { success: false, reason: "Question not found" };

  sets[key].questions.splice(idx, 1);
  saveSets(sets);
  return { success: true };
}

module.exports = {
  getAllSets,
  getSet,
  createSet,
  updateSetMeta,
  deleteSet,
  addQuestion,
  updateQuestion,
  deleteQuestion
};
