const express = require("express");

const router = express.Router();

const {
  createRoom,
  getRoom,
  pickSlot,
  toggleReady,
  startGame,
  playHandCricket,
  playXo,
  resetXo,
  disconnectPlayer,
} = require("../controller/room");

// ─────────────────────────────────────────────
// Create a room
// POST /api/rooms
// Body: { hostName }
// ─────────────────────────────────────────────
router.post("/", createRoom);

// ─────────────────────────────────────────────
// Get room by code
// GET /api/rooms/:code
// ─────────────────────────────────────────────
router.get("/:code", getRoom);

// ─────────────────────────────────────────────
// Pick / switch player slot
// POST /api/rooms/:code/slot
// Body: { name, slot }
// ─────────────────────────────────────────────
router.post("/:code/slot", pickSlot);

// ─────────────────────────────────────────────
// Toggle player ready status
// POST /api/rooms/:code/ready
// Body: { name }
// ─────────────────────────────────────────────
router.post("/:code/ready", toggleReady);

// ─────────────────────────────────────────────
// Start game
// POST /api/rooms/:code/start
// Body: { gameType: "handcricket" | "xo" }
// ─────────────────────────────────────────────
router.post("/:code/start", startGame);

// ─────────────────────────────────────────────
// Hand Cricket move
// POST /api/rooms/:code/hc/play
// Body: { name, choice }
// ─────────────────────────────────────────────
router.post("/:code/hc/play", playHandCricket);

// ─────────────────────────────────────────────
// XO move
// POST /api/rooms/:code/xo/play
// Body: { name, idx }
// ─────────────────────────────────────────────
router.post("/:code/xo/play", playXo);

// ─────────────────────────────────────────────
// Reset XO board
// POST /api/rooms/:code/xo/reset
// ─────────────────────────────────────────────
router.post("/:code/xo/reset", resetXo);

// ─────────────────────────────────────────────
// Disconnect player
// POST /api/rooms/:code/disconnect
// Body: { name }
// ─────────────────────────────────────────────
router.post("/:code/disconnect", disconnectPlayer);

module.exports = router;