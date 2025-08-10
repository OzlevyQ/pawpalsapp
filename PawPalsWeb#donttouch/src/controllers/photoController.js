const Photo = require('../models/Photo');
const { validationResult } = require('express-validator');

const uploadPhoto = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      url,
      thumbnailUrl,
      caption,
      entityType,
      entityId,
      tags,
      location,
      metadata,
      privacy
    } = req.body;

    const photo = new Photo({
      uploadedBy: req.userId,
      url,
      thumbnailUrl,
      caption,
      entityType,
      entityId,
      tags,
      location,
      metadata,
      privacy
    });

    await photo.save();
    await photo.populate('uploadedBy', 'firstName lastName profileImage');

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Error uploading photo' });
  }
};

const getPhotos = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      userId,
      limit = 20,
      skip = 0
    } = req.query;

    let query = { isActive: true };

    if (entityType && entityId) {
      query.entityType = entityType;
      query.entityId = entityId;
    }

    if (userId) {
      query.uploadedBy = userId;
    }

    // Privacy filter
    if (!userId || userId !== req.userId) {
      query.$or = [
        { privacy: 'public' },
        { uploadedBy: req.userId }
      ];
      
      // Add friends' photos if friendship exists
      const Friendship = require('../models/Friendship');
      const friends = await Friendship.getFriends(req.userId);
      const friendIds = friends.map(f => f._id);
      
      if (friendIds.length > 0) {
        query.$or.push({
          uploadedBy: { $in: friendIds },
          privacy: { $in: ['public', 'friends'] }
        });
      }
    }

    const photos = await Photo.find(query)
      .populate('uploadedBy', 'firstName lastName profileImage')
      .populate('likes.user', 'firstName lastName')
      .populate('comments.user', 'firstName lastName profileImage')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Photo.countDocuments(query);

    res.json({
      total,
      photos
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Error fetching photos' });
  }
};

const getPhotoById = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName profileImage')
      .populate('likes.user', 'firstName lastName')
      .populate('comments.user', 'firstName lastName profileImage');

    if (!photo || !photo.isActive) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Check privacy
    if (photo.privacy === 'private' && photo.uploadedBy._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (photo.privacy === 'friends' && photo.uploadedBy._id.toString() !== req.userId) {
      const Friendship = require('../models/Friendship');
      const areFriends = await Friendship.areFriends(req.userId, photo.uploadedBy._id);
      
      if (!areFriends) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Error fetching photo' });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const photo = await Photo.findOne({
      _id: req.params.id,
      uploadedBy: req.userId
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const { caption, tags, privacy } = req.body;

    if (caption !== undefined) photo.caption = caption;
    if (tags !== undefined) photo.tags = tags;
    if (privacy !== undefined) photo.privacy = privacy;

    await photo.save();

    res.json({
      message: 'Photo updated successfully',
      photo
    });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'Error updating photo' });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findOne({
      _id: req.params.id,
      uploadedBy: req.userId
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    photo.isActive = false;
    await photo.save();

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Error deleting photo' });
  }
};

const toggleLike = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo || !photo.isActive) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    await photo.toggleLike(req.userId);

    res.json({
      message: 'Like toggled successfully',
      likeCount: photo.likeCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
};

const addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text } = req.body;
    const photo = await Photo.findById(req.params.id);

    if (!photo || !photo.isActive) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    await photo.addComment(req.userId, text);
    await photo.populate('comments.user', 'firstName lastName profileImage');

    res.json({
      message: 'Comment added successfully',
      comment: photo.comments[photo.comments.length - 1]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { photoId, commentId } = req.params;

    const photo = await Photo.findById(photoId);
    if (!photo || !photo.isActive) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const comment = photo.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the comment or the photo
    if (comment.user.toString() !== req.userId && 
        photo.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await photo.removeComment(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
};

const getNearbyPhotos = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const photos = await Photo.find({
      isActive: true,
      privacy: 'public',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance) * 1000 // Convert km to meters
        }
      }
    })
      .populate('uploadedBy', 'firstName lastName profileImage')
      .limit(20);

    res.json({
      count: photos.length,
      photos
    });
  } catch (error) {
    console.error('Error fetching nearby photos:', error);
    res.status(500).json({ error: 'Error fetching nearby photos' });
  }
};

module.exports = {
  uploadPhoto,
  getPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto,
  toggleLike,
  addComment,
  deleteComment,
  getNearbyPhotos
};
