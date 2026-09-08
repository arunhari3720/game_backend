const Room = require('../models/room');
const User = require('../models/usermodel');

// Game logic utilities
const WIN_LINES = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12],
];

const checkXoWinner = (board) => {
  for (const line of WIN_LINES) {
    const [a, b, c, d] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === board[d]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
};

// Create room
exports.createRoom = async (req, res) => {
  try {
    const { hostName } = req.body;

    if (!hostName) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    // Generate unique room code
    let code;
    let existingRoom;
    do {
      code = await Room.generateRoomCode();
      existingRoom = await Room.findOne({ code });
    } while (existingRoom);

    // Create room with host as player 0
    const room = await Room.create({
      code,
      hostName,
      players: [
        { name: hostName, slot: 0 },
        null,
        null,
        null
      ]
    });

    res.status(201).json(room);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

// Get room by code
exports.getRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
};

// Pick slot
exports.pickSlot = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, slot } = req.body;

    if (slot < 0 || slot > 3) {
      return res.status(400).json({ error: 'Invalid slot number' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === 'playing') {
      return res.status(400).json({ error: 'Game already started' });
    }

    // Check if slot is taken by someone else
    if (room.players[slot] && room.players[slot].name !== name) {
      return res.status(400).json({ error: 'Slot already taken' });
    }

    // Check if user already has a slot
    const existingSlot = room.players.findIndex(p => p && p.name === name);
    if (existingSlot !== -1 && existingSlot !== slot) {
      // Remove from old slot
      room.players[existingSlot] = null;
    }

    // Assign new slot
    room.players[slot] = { name, slot, ready: false };
    await room.save();

    res.json(room);
  } catch (error) {
    console.error('Pick slot error:', error);
    res.status(500).json({ error: 'Failed to pick slot' });
  }
};

// Toggle ready
exports.toggleReady = async (req, res) => {
  try {
    const { code } = req.params;
    const { name } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const playerIndex = room.players.findIndex(p => p && p.name === name);

    if (playerIndex === -1) {
      return res.status(400).json({ error: 'Player not found in room' });
    }

    room.players[playerIndex].ready = !room.players[playerIndex].ready;
    await room.save();

    res.json(room);
  } catch (error) {
    console.error('Toggle ready error:', error);
    res.status(500).json({ error: 'Failed to toggle ready status' });
  }
};

// Start game
exports.startGame = async (req, res) => {
  try {
    const { code } = req.params;
    const { gameType } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if at least 2 players are ready
    const readyPlayers = room.players.filter(p => p && p.ready);
    if (readyPlayers.length < 2) {
      return res.status(400).json({ error: 'At least 2 players must be ready' });
    }

    room.status = 'playing';
    room.game = gameType;

    if (gameType === 'handcricket') {
      room.hc = {
        phase: 'playing',
        currentPlayer: 0,
        scores: [0, 0, 0, 0],
        isOut: [false, false, false, false],
        lastChoices: [null, null, null, null],
        message: 'Game started! Player 1 turn',
        round: 1
      };
    } else if (gameType === 'xo') {
      room.xo = {
        board: Array(16).fill(null),
        turn: 0,
        winner: null,
        winningLine: []
      };
    }

    await room.save();
    res.json(room);
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
};

// Play Hand Cricket
exports.playHandCricket = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, choice } = req.body;

    if (!choice || choice < 1 || choice > 6) {
      return res.status(400).json({ error: 'Invalid choice. Must be between 1 and 6' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.game !== 'handcricket') {
      return res.status(400).json({ error: 'Not playing hand cricket' });
    }

    const playerIndex = room.players.findIndex(p => p && p.name === name);

    if (playerIndex === -1) {
      return res.status(400).json({ error: 'Player not found' });
    }

    if (room.hc.currentPlayer !== playerIndex) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    // Get next opponent choice (for now, random for demo)
    const opponentChoice = Math.floor(Math.random() * 6) + 1;
    const isOut = choice === opponentChoice;

    room.hc.scores[playerIndex] = isOut ? room.hc.scores[playerIndex] : room.hc.scores[playerIndex] + choice;
    room.hc.isOut[playerIndex] = isOut;
    room.hc.lastChoices[playerIndex] = choice;

    if (isOut) {
      room.hc.message = `${name} is OUT!`;
      room.hc.phase = 'result';
    } else {
      room.hc.message = `${name} scored ${choice} runs`;
      // Move to next player
      let nextPlayer = (playerIndex + 1) % 4;
      while (room.hc.isOut[nextPlayer] && nextPlayer !== playerIndex) {
        nextPlayer = (nextPlayer + 1) % 4;
      }
      room.hc.currentPlayer = nextPlayer;
      room.hc.round++;
    }

    await room.save();
    res.json(room);
  } catch (error) {
    console.error('Play hand cricket error:', error);
    res.status(500).json({ error: 'Failed to play hand cricket' });
  }
};

// Play XO
exports.playXo = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, idx } = req.body;

    if (idx < 0 || idx > 15) {
      return res.status(400).json({ error: 'Invalid cell index' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.game !== 'xo') {
      return res.status(400).json({ error: 'Not playing XO' });
    }

    const playerIndex = room.players.findIndex(p => p && p.name === name);

    if (playerIndex === -1) {
      return res.status(400).json({ error: 'Player not found' });
    }

    if (room.xo.turn !== playerIndex) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    if (room.xo.board[idx]) {
      return res.status(400).json({ error: 'Cell already taken' });
    }

    const symbols = ['❌', '⭕', '🔷', '🔶'];
    room.xo.board[idx] = symbols[playerIndex];

    const result = checkXoWinner(room.xo.board);
    if (result) {
      room.xo.winner = result.winner;
      room.xo.winningLine = result.line;
    } else {
      room.xo.turn = (room.xo.turn + 1) % 4;
    }

    await room.save();
    res.json(room);
  } catch (error) {
    console.error('Play XO error:', error);
    res.status(500).json({ error: 'Failed to play XO' });
  }
};

// Reset XO
exports.resetXo = async (req, res) => {
  try {
    const { code } = req.params;

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.game !== 'xo') {
      return res.status(400).json({ error: 'Not playing XO' });
    }

    room.xo = {
      board: Array(16).fill(null),
      turn: 0,
      winner: null,
      winningLine: []
    };

    await room.save();
    res.json(room);
  } catch (error) {
    console.error('Reset XO error:', error);
    res.status(500).json({ error: 'Failed to reset XO game' });
  }
};

// Disconnect player
exports.disconnectPlayer = async (req, res) => {
  try {
    const { code } = req.params;
    const { name } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const playerIndex = room.players.findIndex(p => p && p.name === name);
    if (playerIndex !== -1) {
      room.players[playerIndex].connected = false;
      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error('Disconnect player error:', error);
    res.status(500).json({ error: 'Failed to disconnect player' });
  }
};