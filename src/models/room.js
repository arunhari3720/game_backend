const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// Player Schema
// ─────────────────────────────────────────────
const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  slot: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },

  ready: {
    type: Boolean,
    default: false,
  },

  connected: {
    type: Boolean,
    default: true,
  },

  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

// ─────────────────────────────────────────────
// Hand Cricket Schema
// ─────────────────────────────────────────────
const handCricketSchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ["playing", "result"],
    default: "playing",
  },

  currentPlayer: {
    type: Number,
    default: 0,
  },

  scores: {
    type: [Number],
    default: [0, 0, 0, 0],
  },

  isOut: {
    type: [Boolean],
    default: [false, false, false, false],
  },

  lastChoices: {
    type: [Number],
    default: [null, null, null, null],
  },

  message: {
    type: String,
    default: "Game started!",
  },

  round: {
    type: Number,
    default: 1,
  },

  maxRounds: {
    type: Number,
    default: 10,
  },
});

// ─────────────────────────────────────────────
// XO Game Schema
// ─────────────────────────────────────────────
const xoGameSchema = new mongoose.Schema({
  board: {
    type: [String],
    default: () => Array(16).fill(null),
  },

  turn: {
    type: Number,
    default: 0,
  },

  winner: {
    type: String,
    default: null,
  },

  winningLine: {
    type: [Number],
    default: () => [],
  },
});

// ─────────────────────────────────────────────
// Room Schema
// ─────────────────────────────────────────────
const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  hostName: {
    type: String,
    required: true,
    trim: true,
  },

  players: {
    type: [playerSchema],
    default: [null, null, null, null],
  },

  status: {
    type: String,
    enum: ["waiting", "playing", "finished"],
    default: "waiting",
  },

  game: {
    type: String,
    enum: ["handcricket", "xo", null],
    default: null,
  },

  hc: {
    type: handCricketSchema,
    default: () => ({}),
  },

  xo: {
    type: xoGameSchema,
    default: () => ({}),
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ─────────────────────────────────────────────
// Update timestamp before save
// ─────────────────────────────────────────────
roomSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

// ─────────────────────────────────────────────
// Generate unique room code
// ─────────────────────────────────────────────
roomSchema.statics.generateRoomCode = function () {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return code;
};

// ─────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────
module.exports = mongoose.model("Room", roomSchema);