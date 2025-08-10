# שידרוג 3: מערכת יצירת אירועים לבעלי גינות

## סקירה כללית
שידרוג זה יאפשר לבעלי גינות ליצור ולנהל אירועים בגינות שלהם, כולל:
- יצירת אירועים חדשים
- ניהול רישום משתתפים
- שליחת הודעות למשתתפים
- מעקב אחר נוכחות
- קבלת משוב על האירועים

## תכונות עיקריות

### 1. יצירת אירועים
- טופס יצירת אירוע מפורט
- בחירת תאריכים ושעות
- הגדרת מגבלות משתתפים
- הוספת תמונות ותיאורים

### 2. ניהול רישום
- מערכת רישום אוטומטית
- אישור/דחיית בקשות רישום
- רשימת המתנה
- הודעות אוטומטיות

### 3. תקשורת עם משתתפים
- שליחת הודעות email
- הודעות push
- עדכונים על שינויים באירוע

## שלבי הטמעה

### שלב 1: עדכון מודל הנתונים

#### 1.1 מודל אירוע חדש
```javascript
// backend/models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  garden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // תאריכים ושעות
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // פרטי רישום
  maxParticipants: {
    type: Number,
    default: null // null = ללא הגבלה
  },
  registrationDeadline: {
    type: Date,
    default: function() {
      return new Date(this.startDate.getTime() - 24 * 60 * 60 * 1000); // יום לפני
    }
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  
  // סטטוס האירוע
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  
  // רישום משתתפים
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'attended', 'no-show'],
      default: 'pending'
    },
    notes: String
  }],
  
  // רשימת המתנה
  waitingList: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // תמונות ומדיה
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // הגדרות נוספות
  isPublic: {
    type: Boolean,
    default: true
  },
  allowWaitingList: {
    type: Boolean,
    default: true
  },
  sendReminders: {
    type: Boolean,
    default: true
  },
  
  // מטאדטה
  tags: [String],
  category: {
    type: String,
    enum: ['workshop', 'social', 'maintenance', 'educational', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ garden: 1, startDate: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1, startDate: 1 });

// Virtual for participant count
eventSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'approved').length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxParticipants) return null;
  return this.maxParticipants - this.participantCount;
});

module.exports = mongoose.model('Event', eventSchema);
```

#### 1.2 עדכון מודל הגינה
```javascript
// backend/models/Garden.js - הוספה לסכמה הקיימת
const gardenSchema = new mongoose.Schema({
  // שדות קיימים...
  
  // הגדרות אירועים
  eventSettings: {
    allowEvents: {
      type: Boolean,
      default: true
    },
    requireApprovalForEvents: {
      type: Boolean,
      default: false
    },
    maxEventsPerMonth: {
      type: Number,
      default: 10
    },
    defaultEventDuration: {
      type: Number,
      default: 120 // דקות
    }
  }
});
```

### שלב 2: Backend API Controllers

#### 2.1 Event Controller
```javascript
// backend/controllers/eventController.js
const Event = require('../models/Event');
const Garden = require('../models/Garden');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

// יצירת אירוע חדש
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      gardenId,
      startDate,
      endDate,
      maxParticipants,
      requiresApproval,
      category,
      tags
    } = req.body;

    // בדיקה שהמשתמש הוא בעל הגינה
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ message: 'Garden not found' });
    }

    if (garden.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only garden owner can create events' });
    }

    // בדיקת תאריכים
    if (new Date(startDate) < new Date()) {
      return res.status(400).json({ message: 'Event cannot be in the past' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const event = new Event({
      title,
      description,
      garden: gardenId,
      organizer: req.user.id,
      startDate,
      endDate,
      maxParticipants,
      requiresApproval,
      category,
      tags: tags || []
    });

    await event.save();
    await event.populate(['garden', 'organizer']);

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// קבלת אירועים של גינה
exports.getGardenEvents = async (req, res) => {
  try {
    const { gardenId } = req.params;
    const { status = 'published', upcoming = true } = req.query;

    const query = { garden: gardenId, status };
    
    if (upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }

    const events = await Event.find(query)
      .populate('organizer', 'username email')
      .sort({ startDate: 1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// רישום לאירוע
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // בדיקה שהאירוע פתוח לרישום
    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event is not open for registration' });
    }

    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // בדיקה שהמשתמש לא רשום כבר
    const existingParticipant = event.participants.find(
      p => p.user.toString() === userId
    );
    if (existingParticipant) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // בדיקת מגבלת משתתפים
    const approvedCount = event.participants.filter(p => p.status === 'approved').length;
    
    if (event.maxParticipants && approvedCount >= event.maxParticipants) {
      // הוספה לרשימת המתנה
      if (event.allowWaitingList) {
        event.waitingList.push({ user: userId });
        await event.save();
        return res.json({ 
          message: 'Added to waiting list',
          status: 'waiting'
        });
      } else {
        return res.status(400).json({ message: 'Event is full' });
      }
    }

    // רישום לאירוע
    const participantStatus = event.requiresApproval ? 'pending' : 'approved';
    event.participants.push({
      user: userId,
      status: participantStatus
    });

    await event.save();

    // שליחת אימייל אישור
    const user = await User.findById(userId);
    await sendEventRegistrationEmail(user, event, participantStatus);

    res.json({
      message: participantStatus === 'pending' 
        ? 'Registration pending approval' 
        : 'Successfully registered',
      status: participantStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// אישור/דחיית משתתף
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    const { status, notes } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // בדיקה שהמשתמש הוא מארגן האירוע
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only event organizer can update participant status' });
    }

    const participant = event.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    participant.status = status;
    if (notes) participant.notes = notes;

    await event.save();

    // שליחת הודעה למשתתף
    const user = await User.findById(participant.user);
    await sendParticipantStatusUpdateEmail(user, event, status, notes);

    // אם אושר משתתף ויש רשימת המתנה, העבר את הראשון ברשימה
    if (status === 'approved' && event.waitingList.length > 0) {
      const nextInLine = event.waitingList.shift();
      event.participants.push({
        user: nextInLine.user,
        status: event.requiresApproval ? 'pending' : 'approved'
      });
      await event.save();
    }

    res.json({ message: 'Participant status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// קבלת אירועים של מארגן
exports.getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .populate('garden', 'name')
      .populate('participants.user', 'username email')
      .sort({ startDate: -1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// פונקציות עזר לשליחת אימיילים
const sendEventRegistrationEmail = async (user, event, status) => {
  const subject = status === 'pending' 
    ? `רישום לאירוע "${event.title}" - ממתין לאישור`
    : `אישור רישום לאירוע "${event.title}"`;
    
  const message = status === 'pending'
    ? `נרשמת בהצלחה לאירוע "${event.title}". הרישום שלך ממתין לאישור המארגן.`
    : `נרשמת בהצלחה לאירוע "${event.title}". נתראה באירוע!`;

  await sendEmail({
    to: user.email,
    subject,
    text: message
  });
};

const sendParticipantStatusUpdateEmail = async (user, event, status, notes) => {
  let subject, message;
  
  switch (status) {
    case 'approved':
      subject = `אושר רישומך לאירוע "${event.title}"`;
      message = `רישומך לאירוע "${event.title}" אושר! נתראה באירוע.`;
      break;
    case 'rejected':
      subject = `רישומך לאירוע "${event.title}" לא אושר`;
      message = `מצטערים, רישומך לאירוע "${event.title}" לא אושר.`;
      break;
    default:
      return;
  }
  
  if (notes) {
    message += `\n\nהערות: ${notes}`;
  }

  await sendEmail({
    to: user.email,
    subject,
    text: message
  });
};
```

### שלב 3: Frontend Components

#### 3.1 קומפוננט יצירת אירוע
```jsx
// src/components/Events/CreateEventForm.jsx
import React, { useState } from 'react';
import { eventService } from '../../services/eventService';

const CreateEventForm = ({ garden, onEventCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    maxParticipants: '',
    requiresApproval: false,
    category: 'other',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const eventData = {
        ...formData,
        gardenId: garden._id,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null
      };

      const newEvent = await eventService.createEvent(eventData);
      onEventCreated(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('שגיאה ביצירת האירוע');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">יצירת אירוע חדש</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* כותרת האירוע */}
        <div>
          <label className="block text-sm font-medium mb-2">כותרת האירוע</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
            maxLength={100}
          />
        </div>

        {/* תיאור */}
        <div>
          <label className="block text-sm font-medium mb-2">תיאור האירוע</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full p-3 border rounded-lg"
            required
            maxLength={1000}
          />
        </div>

        {/* תאריכים */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">תאריך ושעת התחלה</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">תאריך ושעת סיום</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              required
            />
          </div>
        </div>

        {/* הגדרות רישום */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">מספר משתתפים מקסימלי</label>
            <input
              type="number"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
              min="1"
              placeholder="ללא הגבלה"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">קטגוריה</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg"
            >
              <option value="workshop">סדנה</option>
              <option value="social">אירוע חברתי</option>
              <option value="maintenance">תחזוקה</option>
              <option value="educational">חינוכי</option>
              <option value="other">אחר</option>
            </select>
          </div>
        </div>

        {/* תגיות */}
        <div>
          <label className="block text-sm font-medium mb-2">תגיות (מופרדות בפסיקים)</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            placeholder="גינון, סדנה, ילדים"
          />
        </div>

        {/* אישור נדרש */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="requiresApproval"
            checked={formData.requiresApproval}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="text-sm">נדרש אישור מראש לרישום</label>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'יוצר אירוע...' : 'צור אירוע'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventForm;
```

#### 3.2 קומפוננט ניהול אירועים
```jsx
// src/components/Events/EventManager.jsx
import React, { useState, useEffect } from 'react';
import { eventService } from '../../services/eventService';

const EventManager = ({ garden }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [garden._id]);

  const fetchEvents = async () => {
    try {
      const response = await eventService.getOrganizerEvents();
      setEvents(response.data.filter(event => event.garden._id === garden._id));
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantAction = async (eventId, participantId, action, notes = '') => {
    try {
      await eventService.updateParticipantStatus(eventId, participantId, action, notes);
      fetchEvents(); // רענון הנתונים
    } catch (error) {
      console.error('Error updating participant:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">טוען אירועים...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ניהול אירועים</h2>
      
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          אין אירועים עדיין
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map(event => (
            <EventCard
              key={event._id}
              event={event}
              onParticipantAction={handleParticipantAction}
              onEventSelect={setSelectedEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EventCard = ({ event, onParticipantAction, onEventSelect }) => {
  const [showParticipants, setShowParticipants] = useState(false);
  
  const approvedCount = event.participants.filter(p => p.status === 'approved').length;
  const pendingCount = event.participants.filter(p => p.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* כותרת האירוע */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold">{event.title}</h3>
          <p className="text-gray-600">
            {new Date(event.startDate).toLocaleString('he-IL')}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          event.status === 'published' ? 'bg-green-100 text-green-800' :
          event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {event.status === 'published' ? 'פורסם' :
           event.status === 'draft' ? 'טיוטה' : 'בוטל'}
        </span>
      </div>

      {/* סטטיסטיקות */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          <div className="text-sm text-gray-600">משתתפים</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-sm text-gray-600">ממתינים לאישור</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{event.waitingList.length}</div>
          <div className="text-sm text-gray-600">רשימת המתנה</div>
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showParticipants ? 'הסתר' : 'הצג'} משתתפים
        </button>
        
        <button
          onClick={() => onEventSelect(event)}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ערוך אירוע
        </button>
      </div>

      {/* רשימת משתתפים */}
      {showParticipants && (
        <ParticipantsList
          participants={event.participants}
          waitingList={event.waitingList}
          onParticipantAction={(participantId, action, notes) =>
            onParticipantAction(event._id, participantId, action, notes)
          }
        />
      )}
    </div>
  );
};

const ParticipantsList = ({ participants, waitingList, onParticipantAction }) => {
  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-3">רשימת משתתפים</h4>
      
      {/* משתתפים רשומים */}
      <div className="space-y-2">
        {participants.map(participant => (
          <div key={participant._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{participant.user.username}</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                participant.status === 'approved' ? 'bg-green-100 text-green-800' :
                participant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {participant.status === 'approved' ? 'אושר' :
                 participant.status === 'pending' ? 'ממתין' : 'נדחה'}
              </span>
            </div>
            
            {participant.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onParticipantAction(participant._id, 'approved')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  אשר
                </button>
                <button
                  onClick={() => onParticipantAction(participant._id, 'rejected')}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  דחה
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* רשימת המתנה */}
      {waitingList.length > 0 && (
        <div className="mt-4">
          <h5 className="font-medium mb-2">רשימת המתנה</h5>
          <div className="space-y-1">
            {waitingList.map((waiting, index) => (
              <div key={waiting._id} className="flex items-center p-2 bg-blue-50 rounded">
                <span className="text-sm text-blue-800">
                  {index + 1}. {waiting.user.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager;
```

### שלב 4: Services

#### 4.1 Event Service
```javascript
// src/services/eventService.js
import api from './api';

export const eventService = {
  // יצירת אירוע חדש
  createEvent: (eventData) => {
    return api.post('/events', eventData);
  },

  // קבלת אירועים של גינה
  getGardenEvents: (gardenId, params = {}) => {
    return api.get(`/events/garden/${gardenId}`, { params });
  },

  // קבלת אירועים של מארגן
  getOrganizerEvents: () => {
    return api.get('/events/organizer');
  },

  // רישום לאירוע
  registerForEvent: (eventId) => {
    return api.post(`/events/${eventId}/register`);
  },

  // עדכון סטטוס משתתף
  updateParticipantStatus: (eventId, participantId, status, notes = '') => {
    return api.patch(`/events/${eventId}/participants/${participantId}`, {
      status,
      notes
    });
  },

  // עדכון אירוע
  updateEvent: (eventId, eventData) => {
    return api.patch(`/events/${eventId}`, eventData);
  },

  // מחיקת אירוע
  deleteEvent: (eventId) => {
    return api.delete(`/events/${eventId}`);
  }
};
```

### שלב 5: אינטגרציה בעמודי הגינה

#### 5.1 עדכון עמוד ניהול גינה
```jsx
// src/pages/GardenManager.jsx - הוספה לקומפוננט הקיים
import CreateEventForm from '../components/Events/CreateEventForm';
import EventManager from '../components/Events/EventManager';

const GardenManager = () => {
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  
  return (
    <div>
      {/* תוכן קיים... */}
      
      {/* Events Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">אירועים</h2>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            צור אירוע חדש
          </button>
        </div>
        
        {showCreateEvent ? (
          <CreateEventForm
            garden={garden}
            onEventCreated={(event) => {
              setShowCreateEvent(false);
              // רענון רשימת האירועים
            }}
            onCancel={() => setShowCreateEvent(false)}
          />
        ) : (
          <EventManager garden={garden} />
        )}
      </div>
    </div>
  );
};
```

## תכונות מתקדמות

### 1. התראות ותזכורות
- תזכורות אוטומטיות למשתתפים
- הודעות על שינויים באירוע
- התראות push לאפליקציה

### 2. מערכת משוב
- שאלונים לאחר האירוע
- דירוגים וביקורות
- המלצות לשיפור

### 3. אינטגרציה עם לוח השנה
- ייצוא לגוגל קלנדר
- סנכרון עם יומנים אישיים
- תזכורות במכשיר

## אבטחה ושיקולים נוספים

### 1. הגבלות והרשאות
- רק בעלי גינות יכולים ליצור אירועים
- הגבלת מספר אירועים לחודש
- מניעת ספאם ואירועים לא רלוונטיים

### 2. פרטיות
- הגנה על פרטי המשתתפים
- אפשרות לאירועים פרטיים
- שליטה במי יכול לראות את האירוע

### 3. ביצועים
- pagination לרשימות אירועים ארוכות
- cache נתונים שנגישים בתדירות גבוהה
- אופטימיזציה של שאילתות מסד נתונים

## לוח זמנים משוער

- **שבוע 1-2**: פיתוח Backend API ומודלים
- **שבוע 3-4**: יצירת קומפוננטות React
- **שבוע 5**: אינטגרציה ומערכת הודעות
- **שבוע 6**: בדיקות ואופטימיזציה
- **שבוע 7**: פריסה ומעקב

## סיכום

מערכת יצירת אירועים לבעלי גינות תעשיר משמעותית את הפלטפורמה ותעודד יותר פעילות קהילתית. היא תאפשר לבעלי גינות לבנות קהילה פעילה סביב הגינות שלהם ותספק ערך מוסף למשתמשים.

המערכת תתמוך בגידול הפלטפורמה ותיצור הזדמנויות חדשות לאינטראקציה בין המשתמשים. 