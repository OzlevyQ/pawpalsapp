const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Friend request routes
router.post('/request', friendshipController.sendFriendRequest);
router.put('/accept/:friendshipId', friendshipController.acceptFriendRequest);
router.put('/decline/:friendshipId', friendshipController.declineFriendRequest);

// Friends management
router.get('/', friendshipController.getFriends);
router.delete('/:friendId', friendshipController.removeFriend);

// Friend requests
router.get('/requests/pending', friendshipController.getPendingRequests);
router.get('/requests/sent', friendshipController.getSentRequests);

// User actions
router.post('/block/:userId', friendshipController.blockUser);
router.get('/status/:userId', friendshipController.getFriendshipStatus);
router.get('/mutual/:userId', friendshipController.getMutualFriends);

// Search
router.get('/search', friendshipController.searchFriends);

module.exports = router;
