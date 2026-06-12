const jwt = require("jsonwebtoken");

// In a real production app, store this in an environment variable.
const JWT_SECRET = "trivia-tycoon-dev-secret-change-me";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Express middleware: requires a valid Bearer token, attaches req.userId
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid or expired token" });

  req.userId = decoded.userId;
  next();
}

module.exports = { generateToken, verifyToken, requireAuth };
