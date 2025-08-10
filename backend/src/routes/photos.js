const express = require('express');
const router = express.Router();
const {
  uploadPhoto,
  getPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto,
  toggleLike,
  addComment,
  deleteComment,
  getNearbyPhotos
} = require('../controllers/photoController');
const { auth } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Photo validation
const photoValidation = {
  upload: [
    body('url').notEmpty().isURL(),
    body('entityType').isIn(['user', 'dog', 'garden', 'event', 'visit']),
    body('entityId').isMongoId(),
    body('caption').optional().isLength({ max: 500 }),
    body('privacy').optional().isIn(['public', 'friends', 'private'])
  ],
  update: [
    body('caption').optional().isLength({ max: 500 }),
    body('tags').optional().isArray(),
    body('privacy').optional().isIn(['public', 'friends', 'private'])
  ],
  comment: [
    body('text').notEmpty().isLength({ max: 500 })
  ]
};

// Public routes
router.get('/', getPhotos);
router.get('/nearby', getNearbyPhotos);
router.get('/:id', getPhotoById);

// Protected routes
router.use(auth);

// Upload photo
router.post('/', photoValidation.upload, uploadPhoto);

// Update photo
router.put('/:id', photoValidation.update, updatePhoto);

// Delete photo
router.delete('/:id', deletePhoto);

// Toggle like
router.post('/:id/like', toggleLike);

// Add comment
router.post('/:id/comments', photoValidation.comment, addComment);

// Delete comment
router.delete('/:photoId/comments/:commentId', deleteComment);

module.exports = router;
