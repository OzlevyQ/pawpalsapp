const Event = require('../models/Event');
const User = require('../models/User');
const Garden = require('../models/Garden');
const NotificationService = require('../utils/notificationService');
const { validationResult } = require('express-validator');
const { 
  sendEventRegistrationEmail, 
  sendParticipantStatusUpdateEmail,
  sendEventCancelledEmail 
} = require('../utils/emailService');

const getAllEvents = async (req, res) => {
  try {
    const { 
      gardenId, 
      eventType, 
      status = 'upcoming',
      limit = 20,
      skip = 0 
    } = req.query;

    let query = { isPublic: true };

    if (gardenId) {
      query.garden = gardenId;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (status) {
      query.status = status;
    }

    const events = await Event.find(query)
      .populate('garden', 'name location')
      .populate('organizer', 'firstName lastName')
      .sort('eventDate')
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Event.countDocuments(query);

    res.json({
      total,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('garden', 'name location manager')
      .populate('organizer', 'firstName lastName email')
      .populate('participants.user', 'firstName lastName email')
      .populate('participants.dogs', 'name breed')
      .populate('waitingList.user', 'firstName lastName email');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Convert to JSON to include virtuals
    const eventData = event.toJSON();
    
    res.json({
      message: 'Event fetched successfully',
      data: eventData
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Error fetching event' });
  }
};

const createEvent = async (req, res) => {
  try {
    console.log('=== CREATE EVENT DEBUG ===');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.userId:', req.userId);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { gardenId, ...eventData } = req.body;
    console.log('gardenId:', gardenId);
    console.log('eventData:', JSON.stringify(eventData, null, 2));

    // Check if garden exists
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check if user is authorized to create events
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Debug - req.userId:', req.userId);
    console.log('Debug - garden.manager:', garden.manager);
    console.log('Debug - user.eventPermissions:', user.eventPermissions);

    const isAdmin = user.role === 'admin';
    const isGardenManager = garden.manager && req.userId && 
                           garden.manager.toString() === req.userId.toString();
    const hasEventPermission = user.eventPermissions?.canCreateEvents || false;
    
    if (!isAdmin && !isGardenManager && !hasEventPermission) {
      return res.status(403).json({ 
        error: 'Unauthorized to create events. Contact admin for event creation permissions.' 
      });
    }
    
    // Additional check: if garden requires approval for events and user is not admin/manager
    if (garden.eventSettings?.requireApprovalForEvents && !isAdmin && !isGardenManager) {
      return res.status(403).json({
        error: 'This garden requires approval from the garden manager to create events.'
      });
    }

    const event = new Event({
      ...eventData,
      garden: gardenId,
      organizer: req.userId
    });

    await event.save();
    await event.populate(['garden', 'organizer']);

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creating event' });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { dogIds } = req.body;

    const event = await Event.findById(eventId)
      .populate('garden', 'name')
      .populate('organizer', 'firstName lastName email');
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is published and upcoming
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot register for past events' });
    }

    try {
      const result = event.registerParticipant(req.userId, dogIds || []);
      await event.save();
      
      // Send email notification (don't fail registration if email fails)
      try {
        const user = await User.findById(req.userId);
        await sendEventRegistrationEmail(user, event, result.status);
      } catch (emailError) {
        console.error('Failed to send registration email:', emailError);
        // Continue with registration even if email fails
      }

      // Create notification for event organizer
      try {
        await NotificationService.createEventRegistrationNotification(
          req.userId, 
          event.organizer._id, 
          event._id, 
          event.title
        );
      } catch (notificationError) {
        console.error('Failed to create event registration notification:', notificationError);
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Error registering for event' });
  }
};

const cancelEventRegistration = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Remove participant
    event.participants = event.participants.filter(
      p => !p.user.equals(req.userId)
    );

    await event.save();

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Error cancelling registration' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is authorized - תיקון: שימוש ב-req.user ו-req.userId
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'admin' && 
        event.organizer.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to update this event' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'organizer' && key !== 'participants' && 
          key !== 'garden' && key !== 'createdAt' && key !== 'updatedAt') {
        event[key] = req.body[key];
      }
    });

    await event.save();
    await event.populate(['garden', 'organizer']);

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Error updating event' });
  }
};

const cancelEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is authorized
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'admin' && 
        event.organizer.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to cancel this event' });
    }

    event.status = 'cancelled';
    await event.save();

    // Notify all participants about cancellation
    try {
      const eventWithParticipants = await Event.findById(event._id).populate('participants.user');
      for (const participant of eventWithParticipants.participants) {
        if (participant.user && participant.user._id.toString() !== req.userId.toString()) {
          await NotificationService.createEventCancellationNotification(
            participant.user._id,
            event._id,
            event.title
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to create event cancellation notifications:', notificationError);
    }

    res.json({ message: 'Event cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ error: 'Error cancelling event' });
  }
};

// Update participant status (approve/reject)
const updateParticipantStatus = async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    const { status, notes } = req.body;

    const event = await Event.findById(eventId)
      .populate('garden', 'name')
      .populate('organizer', 'firstName lastName');
      
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is authorized (organizer or admin)
    const user = await User.findById(req.userId);
    const isAuthorized = user.role === 'admin' || 
                        event.organizer._id.toString() === req.userId.toString() ||
                        user.eventPermissions.canManageAllEvents;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized to manage participants' });
    }

    try {
      const participant = event.updateParticipantStatus(participantId, status, notes);
      await event.save();

      // Send email notification to participant (don't fail if email fails)
      try {
        const participantUser = await User.findById(participant.user);
        await sendParticipantStatusUpdateEmail(participantUser, event, status, notes);
      } catch (emailError) {
        console.error('Failed to send participant status update email:', emailError);
        // Continue with status update even if email fails
      }

      // Create notification for participant
      try {
        await NotificationService.createEventStatusUpdateNotification(
          participant.user,
          event._id,
          event.title,
          status,
          notes
        );
      } catch (notificationError) {
        console.error('Failed to create event status update notification:', notificationError);
      }

      res.json({ 
        message: 'Participant status updated successfully',
        participant 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Error updating participant status' });
  }
};

// Get events organized by user
const getOrganizerEvents = async (req, res) => {
  try {
    console.log('=== GET ORGANIZER EVENTS DEBUG ===');
    console.log('req.userId:', req.userId);
    
    const events = await Event.find({ organizer: req.userId })
      .populate('garden', 'name location')
      .populate('organizer', 'firstName lastName email')
      .populate('participants.user', 'firstName lastName email')
      .populate('waitingList.user', 'firstName lastName email')
      .sort({ eventDate: -1 });

    console.log('Found events:', events.length);
    console.log('Events data:', events.map(e => ({ id: e._id, title: e.title, organizer: e.organizer })));

    res.json({
      message: 'Events fetched successfully',
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
};

// Grant event creation permission to user
const grantEventPermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { canCreateEvents, canManageAllEvents } = req.body;

    // Only admins can grant permissions
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can grant event permissions' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.eventPermissions = {
      canCreateEvents: canCreateEvents !== undefined ? canCreateEvents : user.eventPermissions.canCreateEvents,
      canManageAllEvents: canManageAllEvents !== undefined ? canManageAllEvents : user.eventPermissions.canManageAllEvents,
      approvedBy: req.userId,
      approvedAt: new Date()
    };

    await user.save();

    res.json({ 
      message: 'Event permissions updated successfully',
      permissions: user.eventPermissions 
    });
  } catch (error) {
    console.error('Error granting event permission:', error);
    res.status(500).json({ error: 'Error updating permissions' });
  }
};

module.exports = {
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
};
