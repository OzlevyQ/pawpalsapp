const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
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
} = require('../controllers/dogJournalController');

// All routes require authentication
router.use(auth);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Album management
router.get('/albums', getUserAlbums);
router.get('/albums/:albumName', getEntriesByAlbum);

// Journal entries CRUD
router.get('/', getJournalEntries);
router.get('/:id', getJournalEntry);

// Create with image upload (up to 5 images)
router.post('/', upload.array('images', 5), createJournalEntry);

// Update with optional image upload
router.put('/:id', upload.array('images', 5), updateJournalEntry);

// Delete entry
router.delete('/:id', deleteJournalEntry);

// Image management
router.delete('/:id/images/:imageIndex', deleteImage);

module.exports = router;