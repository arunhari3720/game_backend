// models/room.js

const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// Player Schema
// ─────────────────────────────────────────────

const playerSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Toss Schema
// ─────────────────────────────────────────────

const tossSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: ["waiting", "toss", "decision", "completed"],
      default: "waiting",
    },

    challenger: {
      type: Number,
      default: null,
    },

    opponent: {
      type: Number,
      default: null,
    },

    winner: {
      type: Number,
      default: null,
    },

    choice: {
      type: String,
      enum: ["bat", "bowl", null],
      default: null,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    result: {
      type: String,
      enum: ["heads", "tails", null],
      default: null,
    },

    call: {
      type: String,
      enum: ["heads", "tails", null],
      default: null,
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Hand Cricket Schema
// ─────────────────────────────────────────────

const handCricketSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: [
        "waiting",
        "toss",
        "decision",
        "playing",
        "inningsBreak",
        "finished",
        "result",
      ],
      default: "waiting",
    },

    // Kept for compatibility with existing frontend.
    // During hand cricket this points to the batsman.
    currentPlayer: {
      type: Number,
      default: 0,
    },

    // Current innings score for each player.
    scores: {
      type: [Number],
      default: () => [0, 0, 0, 0],
    },

    // Total score across the complete match.
    totalRuns: {
      type: [Number],
      default: () => [0, 0, 0, 0],
    },

    // Score made during each innings.
    inningsScores: {
      type: [Number],
      default: () => [0, 0, 0, 0],
    },

    isOut: {
      type: [Boolean],
      default: () => [false, false, false, false],
    },

    lastChoices: {
      type: [Number],
      default: () => [null, null, null, null],
    },

    // IMPORTANT:
    // Stores both players' submitted choices for current round.
    pendingChoices: {
      type: [Number],
      default: () => [null, null, null, null],
    },

    message: {
      type: String,
      default: "Waiting to start",
    },

    round: {
      type: Number,
      default: 0,
    },

    // Number of completed rounds in current innings.
    inningsRound: {
      type: Number,
      default: 0,
    },

    maxRounds: {
      type: Number,
      default: 10,
    },

    batting: {
      type: Number,
      default: null,
    },

    bowling: {
      type: Number,
      default: null,
    },

    innings: {
      type: Number,
      default: 1,
    },

    // Second innings target.
    target: {
      type: Number,
      default: null,
    },

    // First innings score preserved here.
    firstInningsScore: {
      type: Number,
      default: 0,
    },

    wickets: {
      type: [Number],
      default: () => [0, 0, 0, 0],
    },

    balls: {
      type: [Number],
      default: () => [0, 0, 0, 0],
    },

    winner: {
      type: Number,
      default: null,
    },

    // Draw indicator.
    draw: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// XO Game Schema
// ─────────────────────────────────────────────

const xoGameSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

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

    validate: {
      validator: function (v) {
        return v.length === 4;
      },

      message: "Players array must have exactly 4 slots",
    },

    default: () => [null, null, null, null],
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

  toss: {
    type: tossSchema,
    default: () => ({}),
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
// Update timestamp
// ─────────────────────────────────────────────

roomSchema.pre("save", function () {
  this.updatedAt = new Date();
});

// ─────────────────────────────────────────────
// Generate unique room code
// ─────────────────────────────────────────────

roomSchema.statics.generateRoomCode = function () {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += characters.charAt(
      Math.floor(
        Math.random() * characters.length
      )
    );
  }

  return code;
};

module.exports = mongoose.model(
  "Room",
  roomSchema
);