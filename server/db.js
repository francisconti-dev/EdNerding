const path = require("path");
const bcrypt = require("bcryptjs");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(path.join(__dirname, "db.json"));
const db = low(adapter);

// Default DB shape
db.defaults({ users: [], nextUserId: 1 }).write();

// --- Avatar catalog (server-side source of truth for prices) ---
const AVATAR_CATALOG = [
  { id: "default", name: "Classic", emoji: "🙂", cost: 0 },
  { id: "robot", name: "Robot", emoji: "🤖", cost: 0 },
  { id: "cat", name: "Cat", emoji: "🐱", cost: 50 },
  { id: "dog", name: "Dog", emoji: "🐶", cost: 50 },
  { id: "fox", name: "Fox", emoji: "🦊", cost: 75 },
  { id: "panda", name: "Panda", emoji: "🐼", cost: 75 },
  { id: "alien", name: "Alien", emoji: "👽", cost: 100 },
  { id: "ninja", name: "Ninja", emoji: "🥷", cost: 100 },
  { id: "dragon", name: "Dragon", emoji: "🐉", cost: 150 },
  { id: "unicorn", name: "Unicorn", emoji: "🦄", cost: 150 },
  { id: "wizard", name: "Wizard", emoji: "🧙", cost: 200 },
  { id: "crown", name: "Royalty", emoji: "👑", cost: 300 }
];

function getAvatarCatalog() {
  return AVATAR_CATALOG;
}

function getAvatarCost(avatarId) {
  const avatar = AVATAR_CATALOG.find((a) => a.id === avatarId);
  return avatar ? avatar.cost : null;
}

// --- User functions ---

function createUser(username, password) {
  const existing = db.get("users").find({ username }).value();
  if (existing) {
    return { success: false, reason: "Username already taken" };
  }

  const id = db.get("nextUserId").value();
  const passwordHash = bcrypt.hashSync(password, 10);

  const freeAvatars = AVATAR_CATALOG.filter((a) => a.cost === 0).map((a) => a.id);

  const user = {
    id,
    username,
    passwordHash,
    balance: 0,
    equippedAvatar: "default",
    ownedAvatars: freeAvatars
  };

  db.get("users").push(user).write();
  db.set("nextUserId", id + 1).write();

  return { success: true, user: sanitizeUser(user) };
}

function verifyLogin(username, password) {
  const user = db.get("users").find({ username }).value();
  if (!user) return { success: false, reason: "Invalid username or password" };

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return { success: false, reason: "Invalid username or password" };

  return { success: true, user: sanitizeUser(user) };
}

function getUserById(userId) {
  const user = db.get("users").find({ id: userId }).value();
  if (!user) return null;
  return sanitizeUser(user);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    balance: user.balance,
    equippedAvatar: user.equippedAvatar,
    ownedAvatars: user.ownedAvatars
  };
}

// Adds (or subtracts, if negative) to a user's permanent balance
function addToBalance(userId, amount) {
  const userRef = db.get("users").find({ id: userId });
  const current = userRef.value();
  if (!current) return null;

  userRef.assign({ balance: current.balance + amount }).write();
  return getUserById(userId);
}

// Attempts to purchase an avatar with account balance
function purchaseAvatar(userId, avatarId) {
  const userRef = db.get("users").find({ id: userId });
  const user = userRef.value();
  if (!user) return { success: false, reason: "User not found" };

  const cost = getAvatarCost(avatarId);
  if (cost === null) return { success: false, reason: "Avatar not found" };

  if (user.ownedAvatars.includes(avatarId)) {
    return { success: false, reason: "Already owned" };
  }

  if (user.balance < cost) return { success: false, reason: "Not enough money" };

  userRef
    .assign({
      balance: user.balance - cost,
      ownedAvatars: [...user.ownedAvatars, avatarId]
    })
    .write();

  return { success: true, user: getUserById(userId) };
}

// Sets the equipped avatar (must be owned)
function equipAvatar(userId, avatarId) {
  const userRef = db.get("users").find({ id: userId });
  const user = userRef.value();
  if (!user) return { success: false, reason: "User not found" };

  if (!user.ownedAvatars.includes(avatarId)) {
    return { success: false, reason: "Avatar not owned" };
  }

  userRef.assign({ equippedAvatar: avatarId }).write();
  return { success: true, user: getUserById(userId) };
}

module.exports = {
  getAvatarCatalog,
  createUser,
  verifyLogin,
  getUserById,
  addToBalance,
  purchaseAvatar,
  equipAvatar
};
