const express = require('express');
const router = express.Router();
const {
  getChats,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  createChat
} = require('../controllers/chatController');
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');

// All routes require authentication
router.use(auth);

// Validation
const messageValidation = [
  body('message')
    .custom((value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (typeof value === 'object' && value.text) {
        return value.text.trim().length > 0;
      }
      throw new Error('Message must have text content');
    })
];

// Get all chats for current user
router.get('/', getChats);

// Create new chat
router.post('/', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  messageValidation[0]
], createChat);

// Get messages for a specific chat
router.get('/:chatId/messages', getMessages);

// Send message to chat
router.post('/:chatId/messages', messageValidation, sendMessage);

// Mark message as read
router.put('/messages/:id/read', markAsRead);

// Delete message
router.delete('/messages/:id', deleteMessage);

module.exports = router;
