// Fishing Mode map data: a simple tile-based world with three zone types.
// Coordinates are in tile units; the client renders each tile as a fixed pixel size.

const MAP_WIDTH = 20; // tiles
const MAP_HEIGHT = 14; // tiles

// Tile types: "grass" (walkable), "water" (fishable, not walkable),
// "question" (question station zone), "sell" (sell station zone)
// The map is defined as a 2D array of single-character codes for compactness:
// G = grass, W = water, Q = question station, S = sell station
const MAP_LAYOUT = [
  "GGGGGGGGGGGGGGGGGGGG",
  "GGGGQQGGGGGGGGSSGGGG",
  "GGGGQQGGGGGGGGSSGGGG",
  "GGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGG",
  "WWWWWGGGGGGGGGWWWWWW",
  "WWWWWGGGGGGGGGWWWWWW",
  "WWWWWGGGGGGGGGWWWWWW",
  "GGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGG",
  "GGGGGGWWWWWWWWGGGGGG",
  "GGGGGGWWWWWWWWGGGGGG",
  "GGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGG"
];

function getTile(x, y) {
  if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) return "G";
  return MAP_LAYOUT[y][x];
}

function isWalkable(x, y) {
  const tile = getTile(x, y);
  return tile === "G" || tile === "Q" || tile === "S";
}

function isWater(x, y) {
  return getTile(x, y) === "W";
}

// Returns true if (x, y) is adjacent (including diagonally) to a tile of the given type
function isAdjacentToTileType(x, y, type) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (getTile(x + dx, y + dy) === type) return true;
    }
  }
  return false;
}

// Fish catalog: each fish has a rarity weight (higher = more common) and a sell value
const FISH_CATALOG = [
  { id: "minnow", name: "Minnow", emoji: "🐟", weight: 50, value: 5 },
  { id: "bass", name: "Bass", emoji: "🐠", weight: 30, value: 12 },
  { id: "salmon", name: "Salmon", emoji: "🐡", weight: 15, value: 25 },
  { id: "shark", name: "Shark", emoji: "🦈", weight: 4, value: 75 },
  { id: "treasure", name: "Treasure Chest", emoji: "💰", weight: 1, value: 150 }
];

function rollFish() {
  const totalWeight = FISH_CATALOG.reduce((sum, f) => sum + f.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const fish of FISH_CATALOG) {
    if (roll < fish.weight) return fish;
    roll -= fish.weight;
  }
  return FISH_CATALOG[0];
}

module.exports = {
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_LAYOUT,
  getTile,
  isWalkable,
  isWater,
  isAdjacentToTileType,
  FISH_CATALOG,
  rollFish
};