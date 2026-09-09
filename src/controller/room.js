// controller/room.js

const Room = require("../models/room");

// ─────────────────────────────────────────────
// XO CONSTANTS
// ─────────────────────────────────────────────

const WIN_LINES = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],

  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],

  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

const XO_SYMBOLS = ["❌", "⭕", "🔷", "🔶"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const normalizeCode = (code) => String(code || "").toUpperCase();

const findPlayerIndex = (room, name) => {
  return room.players.findIndex(
    (player) => player && player.name === name
  );
};

const getActivePlayers = (room) => {
  return room.players
    .map((player, index) => ({
      player,
      index,
    }))
    .filter(({ player }) => player !== null);
};

const getHandCricketPlayers = (room) => {
  const players = room.players
    .map((player, index) => ({
      player,
      index,
    }))
    .filter(({ player }) => player && player.ready);

  return players.slice(0, 2);
};

const resetHandCricketArrays = (hc) => {
  hc.scores = [0, 0, 0, 0];
  hc.inningsScores = [0, 0, 0, 0];

  hc.isOut = [false, false, false, false];

  hc.lastChoices = [null, null, null, null];

  hc.pendingChoices = [null, null, null, null];

  hc.wickets = [0, 0, 0, 0];

  hc.balls = [0, 0, 0, 0];

  hc.round = 0;
  hc.inningsRound = 0;
};

// ─────────────────────────────────────────────
// XO WINNER
// ─────────────────────────────────────────────

const checkXoWinner = (board) => {
  for (const line of WIN_LINES) {
    const [a, b, c, d] = line;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c] &&
      board[a] === board[d]
    ) {
      return {
        winner: board[a],
        line,
      };
    }
  }

  if (board.every((cell) => cell !== null)) {
    return {
      winner: "draw",
      line: [],
    };
  }

  return null;
};

// ─────────────────────────────────────────────
// CREATE ROOM
// ─────────────────────────────────────────────

exports.createRoom = async (req, res) => {
  try {
    const { hostName } = req.body;

    if (!hostName || !String(hostName).trim()) {
      return res.status(400).json({
        error: "Host name is required",
      });
    }

    let code;
    let existingRoom;

    do {
      code = Room.generateRoomCode();

      existingRoom = await Room.findOne({ code });
    } while (existingRoom);

    const room = await Room.create({
      code,

      hostName: String(hostName).trim(),

      players: [
        {
          name: String(hostName).trim(),
          slot: 0,
          ready: false,
          connected: true,
        },
        null,
        null,
        null,
      ],

      status: "waiting",

      game: null,

      toss: {
        phase: "waiting",
        challenger: null,
        opponent: null,
        winner: null,
        choice: null,
        completed: false,
        result: null,
        call: null,
      },

      hc: {
        phase: "waiting",
        currentPlayer: 0,

        scores: [0, 0, 0, 0],

        totalRuns: [0, 0, 0, 0],

        inningsScores: [0, 0, 0, 0],

        isOut: [false, false, false, false],

        lastChoices: [null, null, null, null],

        pendingChoices: [null, null, null, null],

        message: "Waiting to start",

        round: 0,

        inningsRound: 0,

        maxRounds: 10,

        batting: null,

        bowling: null,

        innings: 1,

        target: null,

        firstInningsScore: 0,

        wickets: [0, 0, 0, 0],

        balls: [0, 0, 0, 0],

        winner: null,

        draw: false,
      },

      xo: {
        board: Array(16).fill(null),
        turn: 0,
        winner: null,
        winningLine: [],
      },
    });

    console.log("✅ Room created:", room.code);

    res.status(201).json(room);
  } catch (error) {
    console.error("Create room error:", error);

    res.status(500).json({
      error: "Failed to create room",
    });
  }
};

// ─────────────────────────────────────────────
// GET ROOM
// ─────────────────────────────────────────────

exports.getRoom = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    res.json(room);
  } catch (error) {
    console.error("Get room error:", error);

    res.status(500).json({
      error: "Failed to get room",
    });
  }
};

// ─────────────────────────────────────────────
// PICK SLOT
// ─────────────────────────────────────────────

exports.pickSlot = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name, slot } = req.body;

    const numericSlot = Number(slot);

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        error: "Player name is required",
      });
    }

    if (
      !Number.isInteger(numericSlot) ||
      numericSlot < 0 ||
      numericSlot > 3
    ) {
      return res.status(400).json({
        error: "Invalid slot number",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (
      room.status === "playing" ||
      room.status === "finished"
    ) {
      return res.status(400).json({
        error: "Game already started or finished",
      });
    }

    if (
      room.players[numericSlot] &&
      room.players[numericSlot].name !== name
    ) {
      return res.status(400).json({
        error: "Slot already taken",
      });
    }

    const existingSlot = room.players.findIndex(
      (player) => player && player.name === name
    );

    if (
      existingSlot !== -1 &&
      existingSlot !== numericSlot
    ) {
      room.players[existingSlot] = null;
    }

    room.players[numericSlot] = {
      name: String(name).trim(),
      slot: numericSlot,
      ready: false,
      connected: true,
      joinedAt: new Date(),
    };

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Pick slot error:", error);

    res.status(500).json({
      error: "Failed to pick slot",
    });
  }
};

// ─────────────────────────────────────────────
// TOGGLE READY
// ─────────────────────────────────────────────

exports.toggleReady = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name } = req.body;

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (
      room.status === "playing" ||
      room.status === "finished"
    ) {
      return res.status(400).json({
        error: "Game already started or finished",
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found in room",
      });
    }

    room.players[playerIndex].ready =
      !room.players[playerIndex].ready;

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Toggle ready error:", error);

    res.status(500).json({
      error: "Failed to toggle ready status",
    });
  }
};

// ─────────────────────────────────────────────
// START GAME
// ─────────────────────────────────────────────

exports.startGame = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { gameType } = req.body;

    if (!["handcricket", "xo"].includes(gameType)) {
      return res.status(400).json({
        error: "Invalid game type",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.status === "playing") {
      return res.status(400).json({
        error: "Game already started",
      });
    }

    const readyPlayers = getHandCricketPlayers(room);

    if (readyPlayers.length < 2) {
      return res.status(400).json({
        error: "At least 2 players must be ready",
      });
    }

    room.status = "playing";

    room.game = gameType;

    if (gameType === "handcricket") {
      const firstPlayer = readyPlayers[0];
      const secondPlayer = readyPlayers[1];

      room.hc = {
        phase: "toss",

        currentPlayer: firstPlayer.index,

        scores: [0, 0, 0, 0],

        totalRuns: [0, 0, 0, 0],

        inningsScores: [0, 0, 0, 0],

        isOut: [false, false, false, false],

        lastChoices: [null, null, null, null],

        pendingChoices: [null, null, null, null],

        message:
          "Toss time! Challenge your opponent to start the toss.",

        round: 0,

        inningsRound: 0,

        maxRounds: 10,

        batting: null,

        bowling: null,

        innings: 1,

        target: null,

        firstInningsScore: 0,

        wickets: [0, 0, 0, 0],

        balls: [0, 0, 0, 0],

        winner: null,

        draw: false,
      };

      room.toss = {
        phase: "toss",

        challenger: firstPlayer.index,

        opponent: secondPlayer.index,

        winner: null,

        choice: null,

        completed: false,

        result: null,

        call: null,
      };
    }

    if (gameType === "xo") {
      room.xo = {
        board: Array(16).fill(null),

        turn: readyPlayers[0]?.index ?? 0,

        winner: null,

        winningLine: [],
      };
    }

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Start game error:", error);

    res.status(500).json({
      error: "Failed to start game",
    });
  }
};

// ─────────────────────────────────────────────
// TOSS CHALLENGE
// ─────────────────────────────────────────────

exports.tossChallenge = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name } = req.body;

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "handcricket") {
      return res.status(400).json({
        error: "Not playing hand cricket",
      });
    }

    if (
      room.hc.phase !== "toss" ||
      room.toss.phase !== "toss"
    ) {
      return res.status(400).json({
        error: "Toss is not available",
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found",
      });
    }

    // Only the two actual game players can participate.
    if (
      playerIndex !== room.toss.challenger &&
      playerIndex !== room.toss.opponent
    ) {
      return res.status(400).json({
        error: "You are not part of this match",
      });
    }

    // If challenge is already established, don't overwrite it.
    if (
      room.toss.challenger !== null &&
      room.toss.opponent !== null
    ) {
      room.hc.message =
        `${room.players[room.toss.challenger].name} is challenging ` +
        `${room.players[room.toss.opponent].name} for toss!`;

      await room.save();

      return res.json(room);
    }

    const opponentIndex =
      playerIndex === room.toss.challenger
        ? room.toss.opponent
        : room.toss.challenger;

    if (
      opponentIndex === null ||
      opponentIndex === undefined ||
      !room.players[opponentIndex]
    ) {
      return res.status(400).json({
        error: "No opponent found",
      });
    }

    room.toss.challenger = playerIndex;
    room.toss.opponent = opponentIndex;

    room.toss.phase = "toss";

    room.hc.message =
      `${room.players[playerIndex].name} challenges ` +
      `${room.players[opponentIndex].name} for toss!`;

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Toss challenge error:", error);

    res.status(500).json({
      error: "Failed to challenge toss",
    });
  }
};

// ─────────────────────────────────────────────
// TOSS CALL
// ─────────────────────────────────────────────

exports.tossCall = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name, call } = req.body;

    if (!["heads", "tails"].includes(call)) {
      return res.status(400).json({
        error: "Invalid call. Must be heads or tails",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "handcricket") {
      return res.status(400).json({
        error: "Not playing hand cricket",
      });
    }

    if (
      room.hc.phase !== "toss" ||
      room.toss.phase !== "toss"
    ) {
      return res.status(400).json({
        error: "Toss is not available",
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found",
      });
    }

    if (
      playerIndex !== room.toss.challenger &&
      playerIndex !== room.toss.opponent
    ) {
      return res.status(400).json({
        error: "You are not part of this toss",
      });
    }

    // Only challenger makes the call.
    if (playerIndex !== room.toss.challenger) {
      return res.status(400).json({
        error: "Only the challenger can call heads or tails",
      });
    }

    const result =
      Math.random() < 0.5 ? "heads" : "tails";

    const isWinner = call === result;

    room.toss.result = result;

    room.toss.call = call;

    room.toss.phase = "decision";

    room.hc.phase = "decision";

    if (isWinner) {
      room.toss.winner = playerIndex;
    } else {
      room.toss.winner = room.toss.opponent;
    }

    const winnerName =
      room.players[room.toss.winner]?.name || "Player";

    room.hc.message =
      `${winnerName} won the toss! Choose bat or bowl.`;

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Toss call error:", error);

    res.status(500).json({
      error: "Failed to make toss call",
    });
  }
};

// ─────────────────────────────────────────────
// TOSS DECISION
// ─────────────────────────────────────────────

exports.tossDecision = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name, choice } = req.body;

    if (!["bat", "bowl"].includes(choice)) {
      return res.status(400).json({
        error: "Invalid choice. Must be bat or bowl",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "handcricket") {
      return res.status(400).json({
        error: "Not playing hand cricket",
      });
    }

    if (room.hc.phase !== "decision") {
      return res.status(400).json({
        error: `Invalid game phase: ${room.hc.phase}`,
      });
    }

    if (room.toss.phase !== "decision") {
      return res.status(400).json({
        error: `Invalid toss phase: ${room.toss.phase}`,
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found",
      });
    }

    if (room.toss.winner !== playerIndex) {
      return res.status(400).json({
        error: "Only toss winner can decide",
      });
    }

    const winner = room.toss.winner;

    const opponent =
      winner === room.toss.challenger
        ? room.toss.opponent
        : room.toss.challenger;

    room.toss.choice = choice;

    room.toss.phase = "completed";

    room.toss.completed = true;

    room.hc.phase = "playing";

    if (choice === "bat") {
      room.hc.batting = winner;

      room.hc.bowling = opponent;
    } else {
      room.hc.batting = opponent;

      room.hc.bowling = winner;
    }

    room.hc.currentPlayer = room.hc.batting;

    room.hc.message =
      `${room.players[room.hc.batting].name} is batting first. ` +
      `${room.players[room.hc.bowling].name} is bowling. ` +
      `Both players choose 1-6!`;

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Toss decision error:", error);

    res.status(500).json({
      error: "Failed to make toss decision",
    });
  }
};

// ─────────────────────────────────────────────
// GET TOSS STATUS
// ─────────────────────────────────────────────

exports.getTossStatus = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "handcricket") {
      return res.status(400).json({
        error: "Not playing hand cricket",
      });
    }

    const tossData = {
      phase: room.toss.phase,

      hcPhase: room.hc.phase,

      challenger:
        room.toss.challenger !== null
          ? {
              index: room.toss.challenger,
              name:
                room.players[room.toss.challenger]?.name ||
                "Unknown",
            }
          : null,

      opponent:
        room.toss.opponent !== null
          ? {
              index: room.toss.opponent,
              name:
                room.players[room.toss.opponent]?.name ||
                "Unknown",
            }
          : null,

      winner:
        room.toss.winner !== null
          ? {
              index: room.toss.winner,
              name:
                room.players[room.toss.winner]?.name ||
                "Unknown",
            }
          : null,

      result: room.toss.result || null,

      call: room.toss.call || null,

      choice: room.toss.choice || null,

      completed: room.toss.completed || false,

      message: room.hc.message || "",
    };

    res.json(tossData);
  } catch (error) {
    console.error("Get toss status error:", error);

    res.status(500).json({
      error: "Failed to get toss status",
    });
  }
};

// ─────────────────────────────────────────────
// HAND CRICKET
// ─────────────────────────────────────────────

exports.playHandCricket = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name } = req.body;

    const choice = Number(req.body.choice);

    // ─────────────────────────────────────────
    // Validate choice
    // ─────────────────────────────────────────

    if (
      !Number.isInteger(choice) ||
      choice < 1 ||
      choice > 6
    ) {
      return res.status(400).json({
        error: "Invalid choice. Must be a number between 1 and 6",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "handcricket") {
      return res.status(400).json({
        error: "Not playing hand cricket",
      });
    }

    if (room.status === "finished") {
      return res.status(400).json({
        error: "Game already finished",
      });
    }

    if (room.hc.phase !== "playing") {
      return res.status(400).json({
        error: `Game is currently in ${room.hc.phase} phase`,
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found",
      });
    }

    const batting = room.hc.batting;

    const bowling = room.hc.bowling;

    // Only these two can play.
    if (
      playerIndex !== batting &&
      playerIndex !== bowling
    ) {
      return res.status(400).json({
        error: "You are not part of this match",
      });
    }

    // ─────────────────────────────────────────
    // Prevent duplicate submission
    // ─────────────────────────────────────────

    if (
      room.hc.pendingChoices[playerIndex] !== null &&
      room.hc.pendingChoices[playerIndex] !== undefined
    ) {
      return res.status(400).json({
        error:
          "You already submitted your choice. Waiting for opponent.",
      });
    }

    // ─────────────────────────────────────────
    // Save player's choice
    // ─────────────────────────────────────────

    room.hc.pendingChoices[playerIndex] = choice;

    room.hc.lastChoices[playerIndex] = choice;

    // ─────────────────────────────────────────
    // Check whether both players submitted
    // ─────────────────────────────────────────

    const battingChoice =
      room.hc.pendingChoices[batting];

    const bowlingChoice =
      room.hc.pendingChoices[bowling];

    const bothSubmitted =
      battingChoice !== null &&
      battingChoice !== undefined &&
      bowlingChoice !== null &&
      bowlingChoice !== undefined;

    // ─────────────────────────────────────────
    // Only one player submitted
    // ─────────────────────────────────────────

    if (!bothSubmitted) {
      const currentPlayerName =
        room.players[playerIndex]?.name || "Player";

      room.hc.message =
        `${currentPlayerName} selected ${choice}. ` +
        `Waiting for ${
          room.players[
            playerIndex === batting ? bowling : batting
          ]?.name || "opponent"
        } to choose...`;

      await room.save();

      return res.json(room);
    }

    // ─────────────────────────────────────────
    // BOTH PLAYERS HAVE CHOSEN
    // Resolve round
    // ─────────────────────────────────────────

    const isOut =
      battingChoice === bowlingChoice;

    // Count one ball for batsman.
    room.hc.balls[batting] =
      (room.hc.balls[batting] || 0) + 1;

    room.hc.round =
      (room.hc.round || 0) + 1;

    room.hc.inningsRound =
      (room.hc.inningsRound || 0) + 1;

    // ─────────────────────────────────────────
    // OUT
    // ─────────────────────────────────────────

    if (isOut) {
      room.hc.wickets[batting] =
        (room.hc.wickets[batting] || 0) + 1;

      room.hc.isOut[batting] = true;

      room.hc.message =
        `OUT! ${room.players[batting].name} chose ${battingChoice}. ` +
        `${room.players[bowling].name} also chose ${bowlingChoice}.`;

      // First innings ends when batsman is out.
      if (room.hc.innings === 1) {
        const firstScore =
          room.hc.scores[batting] || 0;

        room.hc.firstInningsScore = firstScore;

        room.hc.target = firstScore + 1;

        // Switch roles.
        room.hc.batting = bowling;

        room.hc.bowling = batting;

        room.hc.currentPlayer = bowling;

        // New innings.
        room.hc.innings = 2;

        room.hc.phase = "playing";

        room.hc.scores = [0, 0, 0, 0];

        room.hc.inningsScores = [0, 0, 0, 0];

        room.hc.isOut = [false, false, false, false];

        room.hc.pendingChoices = [null, null, null, null];

        room.hc.lastChoices = [null, null, null, null];

        room.hc.inningsRound = 0;

        room.hc.message =
          `Innings 1 completed! ` +
          `${room.players[batting].name} scored ${firstScore} runs. ` +
          `Target: ${firstScore + 1}. ` +
          `${room.players[bowling].name} is now batting.`;
      } else {
        // ─────────────────────────────────────
        // Second innings batsman OUT
        // ─────────────────────────────────────

        const secondScore =
          room.hc.scores[batting] || 0;

        const target =
          room.hc.target || room.hc.firstInningsScore + 1;

        if (secondScore < target) {
          room.status = "finished";

          room.hc.phase = "finished";

          room.hc.winner = bowling;

          room.hc.draw = false;

          room.hc.message =
            `Game Over! ${room.players[batting].name} is OUT. ` +
            `${room.players[bowling].name} wins! ` +
            `Final score: ${secondScore}/${room.hc.wickets[batting]}.`;
        }
      }
    } else {
      // ─────────────────────────────────────────
      // NOT OUT → BATSMAN GETS RUNS
      // ─────────────────────────────────────────

      const runs = battingChoice;

      room.hc.scores[batting] =
        (room.hc.scores[batting] || 0) + runs;

      room.hc.inningsScores[batting] =
        (room.hc.inningsScores[batting] || 0) + runs;

      room.hc.totalRuns[batting] =
        (room.hc.totalRuns[batting] || 0) + runs;

      room.hc.message =
        `${room.players[batting].name} scored ${runs} run${
          runs === 1 ? "" : "s"
        }! ` +
        `${room.players[batting].name}: ${room.hc.scores[batting]}`;

      // ─────────────────────────────────────
      // SECOND INNINGS TARGET CHECK
      // ─────────────────────────────────────

      if (
        room.hc.innings === 2 &&
        room.hc.target !== null &&
        room.hc.scores[batting] >= room.hc.target
      ) {
        room.status = "finished";

        room.hc.phase = "finished";

        room.hc.winner = batting;

        room.hc.draw = false;

        room.hc.message =
          `🏆 ${room.players[batting].name} wins! ` +
          `Target of ${room.hc.target} reached! ` +
          `Final score: ${room.hc.scores[batting]} runs.`;
      }
    }

    // ─────────────────────────────────────────
    // MAX ROUNDS
    // ─────────────────────────────────────────

    if (
      room.status !== "finished" &&
      room.hc.inningsRound >= room.hc.maxRounds
    ) {
      if (room.hc.innings === 1) {
        // End first innings because max rounds reached.
        const firstScore =
          room.hc.scores[batting] || 0;

        room.hc.firstInningsScore = firstScore;

        room.hc.target = firstScore + 1;

        room.hc.batting = bowling;

        room.hc.bowling = batting;

        room.hc.currentPlayer = bowling;

        room.hc.innings = 2;

        room.hc.phase = "playing";

        room.hc.scores = [0, 0, 0, 0];

        room.hc.inningsScores = [0, 0, 0, 0];

        room.hc.isOut = [false, false, false, false];

        room.hc.pendingChoices = [null, null, null, null];

        room.hc.lastChoices = [null, null, null, null];

        room.hc.inningsRound = 0;

        room.hc.message =
          `Innings 1 completed after ${room.hc.maxRounds} rounds. ` +
          `Score: ${firstScore}. ` +
          `Target: ${firstScore + 1}. ` +
          `${room.players[bowling].name} is now batting.`;
      } else {
        // Second innings max rounds reached.
        const secondScore =
          room.hc.scores[batting] || 0;

        const firstScore =
          room.hc.firstInningsScore || 0;

        room.status = "finished";

        room.hc.phase = "finished";

        if (secondScore > firstScore) {
          room.hc.winner = batting;

          room.hc.draw = false;

          room.hc.message =
            `🏆 ${room.players[batting].name} wins! ` +
            `${secondScore} vs ${firstScore}.`;
        } else if (secondScore < firstScore) {
          room.hc.winner = bowling;

          room.hc.draw = false;

          room.hc.message =
            `🏆 ${room.players[bowling].name} wins! ` +
            `${firstScore} vs ${secondScore}.`;
        } else {
          room.hc.winner = null;

          room.hc.draw = true;

          room.hc.message =
            `🤝 Match Draw! Both players scored ${firstScore}.`;
        }
      }
    }

    // ─────────────────────────────────────────
    // Clear current round choices ONLY
    // if game is still playing.
    // ─────────────────────────────────────────

    if (room.status !== "finished") {
      room.hc.pendingChoices = [null, null, null, null];

      room.hc.lastChoices[batting] = battingChoice;

      room.hc.lastChoices[bowling] = bowlingChoice;
    }

    console.log("🏏 Hand Cricket Round:", {
      innings: room.hc.innings,

      batting: room.hc.batting,

      bowling: room.hc.bowling,

      battingChoice,

      bowlingChoice,

      isOut,

      scores: room.hc.scores,

      totalRuns: room.hc.totalRuns,

      target: room.hc.target,

      round: room.hc.round,

      inningsRound: room.hc.inningsRound,

      winner: room.hc.winner,
    });

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Play hand cricket error:", error);

    res.status(500).json({
      error: "Failed to play hand cricket",
    });
  }
};

// ─────────────────────────────────────────────
// PLAY XO
// ─────────────────────────────────────────────

exports.playXo = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name } = req.body;

    const idx = Number(req.body.idx);

    if (
      !Number.isInteger(idx) ||
      idx < 0 ||
      idx > 15
    ) {
      return res.status(400).json({
        error: "Invalid cell index",
      });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "xo") {
      return res.status(400).json({
        error: "Not playing XO",
      });
    }

    if (room.status === "finished") {
      return res.status(400).json({
        error: "Game already finished",
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex === -1) {
      return res.status(400).json({
        error: "Player not found",
      });
    }

    if (room.xo.turn !== playerIndex) {
      return res.status(400).json({
        error: "Not your turn",
      });
    }

    if (room.xo.board[idx] !== null) {
      return res.status(400).json({
        error: "Cell already taken",
      });
    }

    const symbol = XO_SYMBOLS[playerIndex];

    room.xo.board[idx] = symbol;

    const result = checkXoWinner(room.xo.board);

    if (result) {
      room.xo.winner = result.winner;

      room.xo.winningLine = result.line || [];

      room.status = "finished";
    } else {
      let nextTurn =
        (room.xo.turn + 1) % 4;

      let found = false;

      let tries = 0;

      while (tries < 4) {
        if (room.players[nextTurn] !== null) {
          found = true;
          break;
        }

        nextTurn =
          (nextTurn + 1) % 4;

        tries++;
      }

      room.xo.turn = found
        ? nextTurn
        : room.xo.turn;
    }

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Play XO error:", error);

    res.status(500).json({
      error: "Failed to play XO",
    });
  }
};

// ─────────────────────────────────────────────
// RESET XO
// ─────────────────────────────────────────────

exports.resetXo = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    if (room.game !== "xo") {
      return res.status(400).json({
        error: "Not playing XO",
      });
    }

    room.xo.board = Array(16).fill(null);

    room.xo.turn = 0;

    room.xo.winner = null;

    room.xo.winningLine = [];

    room.status = "playing";

    await room.save();

    res.json(room);
  } catch (error) {
    console.error("Reset XO error:", error);

    res.status(500).json({
      error: "Failed to reset XO game",
    });
  }
};

// ─────────────────────────────────────────────
// DISCONNECT PLAYER
// ─────────────────────────────────────────────

exports.disconnectPlayer = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const { name } = req.body;

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    const playerIndex = findPlayerIndex(room, name);

    if (playerIndex !== -1) {
      room.players[playerIndex].connected = false;

      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error("Disconnect player error:", error);

    res.status(500).json({
      error: "Failed to disconnect player",
    });
  }
};

// ─────────────────────────────────────────────
// DELETE ROOM
// ─────────────────────────────────────────────

exports.deleteRoom = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);

    const room = await Room.findOneAndDelete({
      code,
    });

    if (!room) {
      return res.status(404).json({
        error: "Room not found",
      });
    }

    res.json({
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete room error:", error);

    res.status(500).json({
      error: "Failed to delete room",
    });
  }
};