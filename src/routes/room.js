// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require('../controller/room');

// Logging middleware for debugging
// router.use((req, res, next) => {
//   console.log(`[${req.method}] ${req.originalUrl}`);
//   next();
// });

// ============ ROOM MANAGEMENT ============

// Create a new room
router.post('/rooms', roomController.createRoom);

// Get room details
router.get('/rooms/:code', roomController.getRoom);

// Delete room (cleanup)
router.delete('/rooms/:code', roomController.deleteRoom);

// ============ PLAYER MANAGEMENT ============

// Pick a slot in the room
router.post('/rooms/:code/slot', roomController.pickSlot);

// Toggle player ready status
router.post('/rooms/:code/ready', roomController.toggleReady);

// Disconnect player
router.post('/rooms/:code/disconnect', roomController.disconnectPlayer);

// ============ GAME MANAGEMENT ============

// Start game (handcricket or xo)
router.post('/rooms/:code/start', roomController.startGame);

// ============ TOSS SYSTEM (Hand Cricket Only) ============

// Challenge opponent for toss
router.post('/rooms/:code/toss/challenge', roomController.tossChallenge);

// Make toss call (heads or tails)
router.post('/rooms/:code/toss/call', roomController.tossCall);

// Choose bat or bowl after winning toss
router.post('/rooms/:code/toss/decision', roomController.tossDecision);

// Get toss status (optional - can use getRoom)
router.get('/rooms/:code/toss/status', roomController.getTossStatus);

// ============ HAND CRICKET GAMEPLAY ============

// Play hand cricket (make a choice 1-6)
router.post('/rooms/:code/handcricket/play', roomController.playHandCricket);

// ============ XO GAMEPLAY ============

// Play XO (make a move)
router.post('/rooms/:code/xo/play', roomController.playXo);

// Reset XO board
router.post('/rooms/:code/xo/reset', roomController.resetXo);

// Catch-all route for debugging
router.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method 
  });
});

module.exports = router;