const express = require('express');
const router = express.Router();
const {
  submitRequest,
  getUserRequests,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getRequestById,
  getRequestStats
} = require('../controllers/requestController');
const { auth, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation rules
const requestValidation = {
  submit: [
    body('type').isIn(['garden_manager', 'event_organizer']).withMessage('Invalid request type'),
    body('details.reason').notEmpty().trim().isLength({ max: 1000 }).withMessage('Reason is required and must be under 1000 characters'),
    body('details.experience').optional().isLength({ max: 1000 }).withMessage('Experience must be under 1000 characters'),
    body('details.contactPhone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('details.contactEmail').optional().isEmail().withMessage('Invalid email address'),
    
    // Garden manager specific validations
    body('details.managementExperience').optional().isLength({ max: 500 }),
    body('details.availability').optional().isLength({ max: 200 }),
    body('details.preferredGardens').optional().isArray(),
    body('details.preferredGardens.*').optional().isMongoId(),
    
    // Event organizer specific validations
    body('details.eventTypes').optional().isArray(),
    body('details.organizationExperience').optional().isLength({ max: 500 }),
    body('details.plannedEvents').optional().isLength({ max: 500 })
  ],
  review: [
    param('requestId').isMongoId().withMessage('Invalid request ID'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be under 500 characters')
  ]
};

// All routes require authentication
router.use(auth);

// Submit a new request
router.post('/', requestValidation.submit, submitRequest);

// Get user's own requests
router.get('/my-requests', getUserRequests);

// Get specific request by ID
router.get('/:requestId', param('requestId').isMongoId(), getRequestById);

// Admin only routes
router.get('/admin/pending', authorize('admin'), getPendingRequests);
router.get('/admin/stats', authorize('admin'), getRequestStats);
router.patch('/admin/:requestId/approve', authorize('admin'), requestValidation.review, approveRequest);
router.patch('/admin/:requestId/reject', authorize('admin'), requestValidation.review, rejectRequest);

module.exports = router; 