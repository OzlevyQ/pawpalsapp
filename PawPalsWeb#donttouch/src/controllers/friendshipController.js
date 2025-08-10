const Friendship = require('../models/Friendship');
const User = require('../models/User');
const NotificationService = require('../utils/notificationService');

// Send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const requesterId = req.userId;

    // Check if users are the same
    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends' });
      }
      if (existingFriendship.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existingFriendship.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request' });
      }
      
      // If friendship was declined, update it instead of creating new one
      if (existingFriendship.status === 'declined') {
        existingFriendship.status = 'pending';
        existingFriendship.requester = requesterId;
        existingFriendship.recipient = recipientId;
        existingFriendship.message = message;
        existingFriendship.declinedAt = undefined;
        existingFriendship.createdAt = new Date();
        
        await existingFriendship.save();
        
        // Manually fetch the requester's data to ensure it's available
        const requesterUser = await User.findById(requesterId).select('firstName lastName');
        if (!requesterUser) {
          return res.status(404).json({ error: 'Requester user not found' });
        }

        // Create notification for recipient
        await NotificationService.createFriendRequestNotification(requesterId, recipientId, existingFriendship._id);

        return res.status(201).json({
          success: true,
          message: 'Friend request sent successfully',
          friendship: existingFriendship
        });
      }
    }

    // Create new friendship request
    const friendship = new Friendship({
      requester: requesterId,
      recipient: recipientId,
      message
    });

    await friendship.save();

    // Manually fetch the requester's data to ensure it's available
    const requesterUser = await User.findById(requesterId).select('firstName lastName');
    if (!requesterUser) {
      // This should technically not happen if auth middleware is working
      return res.status(404).json({ error: 'Requester user not found' });
    }

    // Create notification for recipient
    await NotificationService.createFriendRequestNotification(requesterId, recipientId, friendship._id);

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      friendship
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.userId;

    const friendship = await Friendship.findById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Check if user is the recipient - convert both to strings for comparison
    if (friendship.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }

    // Accept the request
    await friendship.accept();

    // Get the requester's info for notification
    const requester = await User.findById(friendship.requester).select('firstName lastName');
    if (requester) {
      // Create notification for requester
      await NotificationService.createFriendRequestResponseNotification(userId, friendship.requester, friendship._id, 'accepted');
    }

    res.json({
      success: true,
      message: 'Friend request accepted successfully'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

// Decline friend request
exports.declineFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.userId;

    const friendship = await Friendship.findById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Check if user is the recipient - convert both to strings for comparison
    if (friendship.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to decline this request' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }

    // Decline the request
    await friendship.decline();

    res.json({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
};

// Get friends list
exports.getFriends = async (req, res) => {
  try {
    const userId = req.userId;
    const friends = await Friendship.getFriends(userId);

    res.json({
      success: true,
      count: friends.length,
      friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
};

// Get pending friend requests
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const pendingRequests = await Friendship.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'firstName lastName profileImage username');

    res.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
};

// Get sent friend requests
exports.getSentRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const sentRequests = await Friendship.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'firstName lastName profileImage username');

    res.json({
      success: true,
      count: sentRequests.length,
      requests: sentRequests
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
};

// Remove friend
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    await friendship.deleteOne();

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    const userId = req.userId;

    // Find existing friendship or create new one
    let friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: blockedUserId },
        { requester: blockedUserId, recipient: userId }
      ]
    });

    if (friendship) {
      await friendship.block();
    } else {
      friendship = new Friendship({
        requester: userId,
        recipient: blockedUserId,
        status: 'blocked'
      });
      await friendship.save();
    }

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

// Get friendship status
exports.getFriendshipStatus = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const userId = req.userId;

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: otherUserId },
        { requester: otherUserId, recipient: userId }
      ]
    });

    if (!friendship) {
      return res.json({
        status: 'none',
        canSendRequest: true
      });
    }

    // Convert both to strings for proper comparison
    const isRequester = friendship.requester.toString() === userId.toString();

    res.json({
      status: friendship.status,
      isRequester: isRequester,
      friendship
    });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({ error: 'Failed to get friendship status' });
  }
};

// Get mutual friends
exports.getMutualFriends = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const userId = req.userId;

    // Get friends of both users
    const userFriends = await Friendship.getFriends(userId);
    const otherUserFriends = await Friendship.getFriends(otherUserId);

    // Find mutual friends
    const userFriendIds = userFriends.map(f => f._id.toString());
    const mutualFriends = otherUserFriends.filter(f => 
      userFriendIds.includes(f._id.toString())
    );

    res.json({
      success: true,
      count: mutualFriends.length,
      mutualFriends
    });
  } catch (error) {
    console.error('Get mutual friends error:', error);
    res.status(500).json({ error: 'Failed to get mutual friends' });
  }
};

// Search friends
exports.searchFriends = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Get user's friends
    const friends = await Friendship.getFriends(userId);
    
    // Filter friends based on search query
    const searchResults = friends.filter(friend => {
      const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
      const username = friend.username?.toLowerCase() || '';
      const searchQuery = query.toLowerCase();
      
      return fullName.includes(searchQuery) || username.includes(searchQuery);
    });

    res.json({
      success: true,
      count: searchResults.length,
      friends: searchResults
    });
  } catch (error) {
    console.error('Search friends error:', error);
    res.status(500).json({ error: 'Failed to search friends' });
  }
};
