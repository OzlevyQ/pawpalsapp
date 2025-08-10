const DogJournal = require('../models/DogJournal');
const Dog = require('../models/Dog');
const Garden = require('../models/Garden');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/dog-journal';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'journal-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all journal entries for the authenticated user
const getJournalEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, album, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const userId = req.user.id;

    // Build query
    const query = { owner: userId };
    
    if (album && album !== 'all') {
      if (album.startsWith('custom:')) {
        query.album = 'Custom';
        query.customAlbumName = album.replace('custom:', '');
      } else {
        query.album = album;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'metDog.name': { $regex: search, $options: 'i' } },
        { 'metDog.breed': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const entries = await DogJournal.find(query)
      .populate('ownerDog', 'name breed')
      .populate('location.garden', 'name address')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await DogJournal.countDocuments(query);

    res.json({
      success: true,
      entries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEntries: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
};

// Get a single journal entry
const getJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const entry = await DogJournal.findOne({ _id: id, owner: userId })
      .populate('ownerDog', 'name breed age size')
      .populate('location.garden', 'name address city');

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch journal entry' });
  }
};

// Create new journal entry
const createJournalEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const entryData = {
      ...req.body,
      owner: userId,
      images: []
    };

    // Parse JSON fields that were stringified in FormData
    try {
      if (entryData.metDog && typeof entryData.metDog === 'string') {
        entryData.metDog = JSON.parse(entryData.metDog);
      }
      if (entryData.location && typeof entryData.location === 'string') {
        entryData.location = JSON.parse(entryData.location);
      }
      if (entryData.interactionNotes && typeof entryData.interactionNotes === 'string') {
        entryData.interactionNotes = JSON.parse(entryData.interactionNotes);
      }
      if (entryData.tags && typeof entryData.tags === 'string') {
        entryData.tags = JSON.parse(entryData.tags);
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    // Handle tags array (they come as separate fields in FormData)
    if (req.body['tags[]']) {
      entryData.tags = Array.isArray(req.body['tags[]']) ? req.body['tags[]'] : [req.body['tags[]']];
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      entryData.images = req.files.map((file, index) => ({
        url: `/uploads/dog-journal/${file.filename}`,
        caption: req.body[`imageCaption${index}`] || '',
        isMainImage: index === 0 // First image is main by default
      }));
    }

    // Validate owner dog if provided
    if (entryData.ownerDog) {
      const dog = await Dog.findOne({ _id: entryData.ownerDog, owner: userId });
      if (!dog) {
        return res.status(400).json({ success: false, error: 'Owner dog not found or not owned by user' });
      }
    }

    // Validate garden if provided
    if (entryData.location && entryData.location.garden) {
      const garden = await Garden.findById(entryData.location.garden);
      if (!garden) {
        return res.status(400).json({ success: false, error: 'Garden not found' });
      }
    }

    const entry = new DogJournal(entryData);
    await entry.save();

    // Populate the entry before sending response
    await entry.populate('ownerDog', 'name breed');
    await entry.populate('location.garden', 'name address');

    res.status(201).json({ success: true, entry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    res.status(500).json({ success: false, error: 'Failed to create journal entry' });
  }
};

// Update journal entry
const updateJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = { ...req.body };

    // Remove owner from update data to prevent unauthorized changes
    delete updateData.owner;

    // Parse JSON fields that were stringified in FormData
    try {
      if (updateData.metDog && typeof updateData.metDog === 'string') {
        updateData.metDog = JSON.parse(updateData.metDog);
      }
      if (updateData.location && typeof updateData.location === 'string') {
        updateData.location = JSON.parse(updateData.location);
      }
      if (updateData.interactionNotes && typeof updateData.interactionNotes === 'string') {
        updateData.interactionNotes = JSON.parse(updateData.interactionNotes);
      }
      if (updateData.tags && typeof updateData.tags === 'string') {
        updateData.tags = JSON.parse(updateData.tags);
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields in update:', parseError);
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    // Handle tags array (they come as separate fields in FormData)
    if (req.body['tags[]']) {
      updateData.tags = Array.isArray(req.body['tags[]']) ? req.body['tags[]'] : [req.body['tags[]']];
    }

    const entry = await DogJournal.findOne({ _id: id, owner: userId });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/dog-journal/${file.filename}`,
        caption: req.body[`imageCaption${index}`] || '',
        isMainImage: false
      }));
      
      // Add new images to existing ones
      updateData.images = [...(entry.images || []), ...newImages];
    }

    Object.assign(entry, updateData);
    await entry.save();

    await entry.populate('ownerDog', 'name breed');
    await entry.populate('location.garden', 'name address');

    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to update journal entry' });
  }
};

// Delete journal entry
const deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const entry = await DogJournal.findOne({ _id: id, owner: userId });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    // Delete associated images from filesystem
    if (entry.images && entry.images.length > 0) {
      entry.images.forEach(image => {
        const imagePath = path.join(__dirname, '../../', image.url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await DogJournal.findByIdAndDelete(id);

    res.json({ success: true, message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to delete journal entry' });
  }
};

// Get user's albums with entry counts
const getUserAlbums = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Try to get albums with aggregation, fallback to default if no entries exist
    let albums = [];
    
    try {
      const aggregationResult = await DogJournal.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: {
              album: '$album',
              customAlbumName: '$customAlbumName'
            },
            count: { $sum: 1 },
            lastEntry: { $max: '$createdAt' }
          }
        },
        {
          $project: {
            name: {
              $cond: [
                { $eq: ['$_id.album', 'Custom'] },
                '$_id.customAlbumName',
                '$_id.album'
              ]
            },
            albumType: '$_id.album',
            count: 1,
            lastEntry: 1
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      albums = aggregationResult;
    } catch (aggregationError) {
      console.log('Aggregation failed, using empty albums array:', aggregationError.message);
      albums = [];
    }
    
    // Add default albums if they don't exist
    const defaultAlbums = ['Best Friends', 'Enemies', 'Acquaintances', 'Playmates'];
    const existingAlbumNames = albums.map(album => album.name);
    
    defaultAlbums.forEach(albumName => {
      if (!existingAlbumNames.includes(albumName)) {
        albums.push({
          name: albumName,
          albumType: albumName,
          count: 0,
          lastEntry: null
        });
      }
    });

    res.json({ success: true, albums });
  } catch (error) {
    console.error('Error fetching user albums:', error);
    
    // Return default albums on error
    const defaultAlbums = ['Best Friends', 'Enemies', 'Acquaintances', 'Playmates'];
    const albums = defaultAlbums.map(albumName => ({
      name: albumName,
      albumType: albumName,
      count: 0,
      lastEntry: null
    }));
    
    res.json({ success: true, albums });
  }
};

// Get entries by album
const getEntriesByAlbum = async (req, res) => {
  try {
    const { albumName } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const isCustom = albumName.startsWith('custom:');
    const actualAlbumName = isCustom ? albumName.replace('custom:', '') : albumName;

    // Build query for album entries
    const query = { owner: userId };
    
    if (isCustom) {
      query.album = 'Custom';
      query.customAlbumName = actualAlbumName;
    } else {
      query.album = actualAlbumName;
    }

    const entries = await DogJournal.find(query)
      .populate('ownerDog', 'name breed')
      .populate('location.garden', 'name address')
      .sort({ createdAt: -1 })
      .lean();
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedEntries = entries.slice(startIndex, endIndex);

    res.json({
      success: true,
      entries: paginatedEntries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(entries.length / limit),
        totalEntries: entries.length,
        hasNext: endIndex < entries.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching album entries:', error);
    res.json({
      success: true,
      entries: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 0,
        totalEntries: 0,
        hasNext: false,
        hasPrev: false
      }
    });
  }
};

// Delete image from journal entry
const deleteImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;
    const userId = req.user.id;

    const entry = await DogJournal.findOne({ _id: id, owner: userId });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    const imageIdx = parseInt(imageIndex);
    if (imageIdx < 0 || imageIdx >= entry.images.length) {
      return res.status(400).json({ success: false, error: 'Invalid image index' });
    }

    // Delete image file from filesystem
    const image = entry.images[imageIdx];
    const imagePath = path.join(__dirname, '../../', image.url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove image from array
    entry.images.splice(imageIdx, 1);
    
    // If this was the main image and there are other images, make the first one main
    if (image.isMainImage && entry.images.length > 0) {
      entry.images[0].isMainImage = true;
    }

    await entry.save();

    res.json({ success: true, message: 'Image deleted successfully', entry });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    let stats;
    
    try {
      const aggregationResult = await DogJournal.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalEntries: { $sum: 1 },
            totalFriends: {
              $sum: {
                $cond: [{ $eq: ['$album', 'Best Friends'] }, 1, 0]
              }
            },
            totalEnemies: {
              $sum: {
                $cond: [{ $eq: ['$album', 'Enemies'] }, 1, 0]
              }
            },
            averageRating: { $avg: '$relationshipRating' },
            recentEntries: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }, 1, 0] } }
          }
        }
      ]);

      stats = aggregationResult[0] || {
        totalEntries: 0,
        totalFriends: 0,
        totalEnemies: 0,
        averageRating: 0,
        recentEntries: 0
      };
    } catch (aggregationError) {
      console.log('Stats aggregation failed, returning default stats:', aggregationError.message);
      stats = {
        totalEntries: 0,
        totalFriends: 0,
        totalEnemies: 0,
        averageRating: 0,
        recentEntries: 0
      };
    }

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Return default stats on error
    const defaultStats = {
      totalEntries: 0,
      totalFriends: 0,
      totalEnemies: 0,
      averageRating: 0,
      recentEntries: 0
    };
    
    res.json({ success: true, stats: defaultStats });
  }
};

module.exports = {
  upload,
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getUserAlbums,
  getEntriesByAlbum,
  deleteImage,
  getDashboardStats
};