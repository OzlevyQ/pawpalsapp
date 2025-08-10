const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEventById,
  createEvent,
  registerForEvent,
  cancelEventRegistration,
  updateEvent,
  cancelEvent,
  updateParticipantStatus,
  getOrganizerEvents,
  grantEventPermission
} = require('../controllers/eventController');
const { auth, authorize, canCreateEvents, canManageEvents } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation rules
const eventValidation = {
  create: [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('gardenId').isMongoId(),
    body('eventDate').isISO8601(),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  ],
  update: [
    param('id').isMongoId()
  ],
  register: [
    param('eventId').isMongoId(),
    body('dogIds').isArray(),
    body('dogIds.*').isMongoId()
  ]
};

// Public routes
router.get('/', getAllEvents);

// Protected routes
router.use(auth);

// Get organizer's events (must be before /:id route)
router.get('/organizer/my-events', getOrganizerEvents);

// Public routes that need to be after auth
router.get('/:id', getEventById);

// Create event (admin, garden managers, and users with permission)
router.post(
  '/',
  canCreateEvents,
  eventValidation.create,
  createEvent
);

// Register for event
router.post('/:eventId/register', eventValidation.register, registerForEvent);

// Cancel registration
router.delete('/:eventId/register', cancelEventRegistration);

// Update event
router.put('/:id', eventValidation.update, updateEvent);

// Cancel event
router.delete('/:id', cancelEvent);

// Update participant status (approve/reject)
router.patch('/:eventId/participants/:participantId', 
  [
    param('eventId').isMongoId(),
    param('participantId').isMongoId(),
    body('status').isIn(['pending', 'approved', 'rejected', 'attended', 'no-show']),
    body('notes').optional().isString()
  ],
  updateParticipantStatus
);

// Grant event permissions (admin only)
router.patch('/permissions/:userId',
  authorize('admin'),
  [
    param('userId').isMongoId(),
    body('canCreateEvents').optional().isBoolean(),
    body('canManageAllEvents').optional().isBoolean()
  ],
  grantEventPermission
);

module.exports = router;
