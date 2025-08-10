const Message = require('../models/Message');
const User = require('../models/User');
const NotificationService = require('../utils/notificationService');
const { validationResult } = require('express-validator');

const getChats = async (req, res) => {
  try {
    // Find all unique conversations for the user
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.userId },
            { recipients: req.userId }
          ],
          isDeleted: false
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$chatId',
          lastMessage: { $first: '$content.text' },
          lastMessageTime: { $first: '$createdAt' },
          participants: { $first: '$recipients' },
          sender: { $first: '$sender' }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    // Get unique participants
    const participantIds = [];
    messages.forEach(msg => {
      if (msg.sender && msg.sender.toString() !== req.userId.toString()) {
        participantIds.push(msg.sender);
      }
      msg.participants.forEach(p => {
        if (p.toString() !== req.userId.toString()) {
          participantIds.push(p);
        }
      });
    });

    // Get participant details
    const participants = await User.find({
      _id: { $in: participantIds }
    }).select('firstName lastName profileImage');

    // Format chats
    const chats = messages.map(msg => {
      const otherParticipants = participants.filter(p => 
        msg.participants.includes(p._id) || p._id.equals(msg.sender)
      );

      return {
        _id: msg._id,
        lastMessage: msg.lastMessage,
        lastMessageTime: msg.lastMessageTime,
        participants: otherParticipants
      };
    });

    res.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Error fetching chats' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const messages = await Message.find({
      chatId,
      isDeleted: false
    })
      .populate('sender', 'firstName lastName profileImage')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { chatId } = req.params;
    const { message } = req.body;

    // Get existing chat to find recipients
    const existingMessages = await Message.findOne({ chatId }).populate('recipients');
    let recipients = [];
    
    if (existingMessages) {
      // Use existing recipients
      recipients = existingMessages.recipients.map(r => r._id || r);
      // Add sender to recipients if not already there
      if (!recipients.some(r => r.toString() === req.userId.toString())) {
        recipients = recipients.filter(r => r.toString() !== req.userId.toString());
      }
    } else if (message.recipientId) {
      recipients = [message.recipientId];
    } else {
      // Extract recipients from chatId format: userId1-userId2
      const userIds = chatId.split('-');
      recipients = userIds.filter(id => id !== req.userId.toString());
    }

    const newMessage = new Message({
      chatId,
      sender: req.userId,
      recipients,
      content: {
        type: message.type || 'text',
        text: message.text,
        mediaUrl: message.mediaUrl,
        location: message.location
      }
    });

    await newMessage.save();
    await newMessage.populate('sender', 'firstName lastName profileImage');

    // Create notifications for recipients
    try {
      for (const recipientId of recipients) {
        if (recipientId.toString() !== req.userId.toString()) {
          await NotificationService.createMessageNotification(req.userId, recipientId, chatId, message.text);
        }
      }
    } catch (notificationError) {
      console.error('Failed to create message notification:', notificationError);
      // Continue even if notification fails
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is a recipient
    if (!message.recipients.includes(req.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Add to readBy if not already there
    const alreadyRead = message.readBy.some(r => r.user.equals(req.userId));
    if (!alreadyRead) {
      message.readBy.push({
        user: req.userId,
        readAt: new Date()
      });
      await message.save();
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Error marking message as read' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (!message.sender.equals(req.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
};

const createChat = async (req, res) => {
  try {
    const { userId, message } = req.body;

    // Check if user exists
    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create initial message
    const chatId = [req.userId, userId].sort().join('-');
    
    const newMessage = new Message({
      chatId,
      sender: req.userId,
      recipients: [userId],
      content: {
        type: message.type || 'text',
        text: message.text || message,
        mediaUrl: message.mediaUrl,
        location: message.location
      }
    });

    await newMessage.save();
    await newMessage.populate('sender', 'firstName lastName profileImage');

    res.status(201).json({ 
      chat: {
        _id: chatId,
        participants: [recipient],
        lastMessage: message.text || message
      },
      message: newMessage 
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Error creating chat' });
  }
};

module.exports = {
  getChats,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  createChat
};
