# שידרוג 4: מערכת בקשות יצירת אירועים למשתמשים רגילים

## סקירה כללית
שידרוג זה יאפשר למשתמשים רגילים (שאינם בעלי גינות) לבקש הרשאה ליצור אירועים, כולל:
- טופס בקשה מפורט עם פרטים אישיים ותיאור
- מערכת אישור דרך אימייל לאדמין
- ניהול סטטוס בקשות
- מעקב אחר בקשות שהוגשו

## תכונות עיקריות

### 1. טופס בקשת הרשאה
- פרטים אישיים מורחבים
- תיאור הרקע והניסיון
- סיבות לבקשת ההרשאה
- דוגמאות לאירועים שהמשתמש רוצה ליצור

### 2. מערכת אישור אימייל
- שליחת בקשה לאימייל האדמין
- קישורי אישור/דחייה ישירים
- הודעות אוטומטיות למבקש

### 3. ניהול בקשות
- פאנל ניהול לאדמין
- מעקב אחר כל הבקשות
- אפשרות להוסיף הערות

## שלבי הטמעה

### שלב 1: עדכון מודל הנתונים

```javascript
// backend/models/EventPermissionRequest.js
const mongoose = require('mongoose');

const eventPermissionRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // פרטים אישיים מורחבים
  personalDetails: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      min: 16,
      max: 120
    },
    profession: String,
    experience: String // ניסיון קודם בארגון אירועים
  },
  
  // תיאור הבקשה
  requestDetails: {
    motivation: {
      type: String,
      required: true,
      maxlength: 1000
    },
    eventTypes: [{
      type: String,
      enum: ['workshop', 'social', 'educational', 'environmental', 'other']
    }],
    eventExamples: {
      type: String,
      maxlength: 500
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'occasionally', 'rarely'],
      required: true
    }
  },
  
  // סטטוס הבקשה
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending'
  },
  
  // הערות ומשוב
  adminNotes: String,
  rejectionReason: String,
  
  // תאריכים חשובים
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // טוקן לאישור מהיר דרך אימייל
  approvalToken: {
    type: String,
    unique: true,
    sparse: true
  },
  tokenExpiresAt: Date
}, {
  timestamps: true
});

// אינדקסים
eventPermissionRequestSchema.index({ user: 1, status: 1 });
eventPermissionRequestSchema.index({ status: 1, submittedAt: -1 });

module.exports = mongoose.model('EventPermissionRequest', eventPermissionRequestSchema);
```

### שלב 2: Backend Controllers

```javascript
// backend/controllers/eventPermissionController.js
const EventPermissionRequest = require('../models/EventPermissionRequest');
const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');

// יצירת בקשה חדשה
exports.createRequest = async (req, res) => {
  try {
    const {
      personalDetails,
      requestDetails
    } = req.body;

    // בדיקה שאין בקשה פעילה למשתמש
    const existingRequest = await EventPermissionRequest.findOne({
      user: req.user.id,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'יש לך כבר בקשה פעילה. אנא המתן לתשובה.' 
      });
    }

    // יצירת טוקן אישור
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // תוקף שבוע

    const request = new EventPermissionRequest({
      user: req.user.id,
      personalDetails,
      requestDetails,
      approvalToken,
      tokenExpiresAt
    });

    await request.save();
    await request.populate('user', 'username email');

    // שליחת אימייל לאדמין
    await sendAdminNotificationEmail(request);

    res.status(201).json({
      message: 'הבקשה נשלחה בהצלחה. תקבל עדכון באימייל בקרוב.',
      requestId: request._id
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// אישור בקשה דרך טוקן (מאימייל)
exports.approveByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    const request = await EventPermissionRequest.findOne({
      approvalToken: token,
      tokenExpiresAt: { $gt: new Date() },
      status: 'pending'
    }).populate('user');

    if (!request) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>קישור לא תקף</h2>
            <p>הקישור פג תוקף או שהבקשה כבר טופלה.</p>
          </body>
        </html>
      `);
    }

    // אישור הבקשה
    request.status = 'approved';
    request.reviewedAt = new Date();
    request.approvalToken = undefined;
    request.tokenExpiresAt = undefined;
    await request.save();

    // עדכון הרשאות המשתמש
    await User.findByIdAndUpdate(request.user._id, {
      canCreateEvents: true
    });

    // שליחת אימייל אישור למשתמש
    await sendUserApprovalEmail(request.user, true);

    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: green;">הבקשה אושרה בהצלחה! ✅</h2>
          <p>המשתמש ${request.user.username} יכול כעת ליצור אירועים.</p>
          <p>נשלחה הודעת אישור למשתמש באימייל.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>שגיאה</h2>
          <p>אירעה שגיאה בעיבוד הבקשה.</p>
        </body>
      </html>
    `);
  }
};

// דחיית בקשה דרך טוקן
exports.rejectByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.query;
    
    const request = await EventPermissionRequest.findOne({
      approvalToken: token,
      tokenExpiresAt: { $gt: new Date() },
      status: 'pending'
    }).populate('user');

    if (!request) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>קישור לא תקף</h2>
            <p>הקישור פג תוקף או שהבקשה כבר טופלה.</p>
          </body>
        </html>
      `);
    }

    // דחיית הבקשה
    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.rejectionReason = reason || 'לא צוין';
    request.approvalToken = undefined;
    request.tokenExpiresAt = undefined;
    await request.save();

    // שליחת אימייל דחייה למשתמש
    await sendUserApprovalEmail(request.user, false, reason);

    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: red;">הבקשה נדחתה</h2>
          <p>הבקשה של ${request.user.username} נדחתה.</p>
          <p>נשלחה הודעה למשתמש באימייל.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('שגיאה בעיבוד הבקשה');
  }
};

// קבלת בקשות המשתמש
exports.getUserRequests = async (req, res) => {
  try {
    const requests = await EventPermissionRequest.find({
      user: req.user.id
    }).sort({ submittedAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// פונקציות עזר לשליחת אימיילים
const sendAdminNotificationEmail = async (request) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const approveUrl = `${process.env.BACKEND_URL}/api/event-permissions/approve/${request.approvalToken}`;
  const rejectUrl = `${process.env.BACKEND_URL}/api/event-permissions/reject/${request.approvalToken}`;

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>בקשה חדשה ליצירת אירועים</h2>
      
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <h3>פרטי המבקש:</h3>
        <p><strong>שם:</strong> ${request.personalDetails.fullName}</p>
        <p><strong>משתמש:</strong> ${request.user.username}</p>
        <p><strong>אימייל:</strong> ${request.user.email}</p>
        <p><strong>טלפון:</strong> ${request.personalDetails.phone}</p>
        <p><strong>עיר:</strong> ${request.personalDetails.city}</p>
        <p><strong>גיל:</strong> ${request.personalDetails.age || 'לא צוין'}</p>
        <p><strong>מקצוע:</strong> ${request.personalDetails.profession || 'לא צוין'}</p>
      </div>

      <div style="background: #f0f8ff; padding: 20px; margin: 20px 0;">
        <h3>פרטי הבקשה:</h3>
        <p><strong>מוטיבציה:</strong></p>
        <p>${request.requestDetails.motivation}</p>
        
        <p><strong>סוגי אירועים:</strong> ${request.requestDetails.eventTypes.join(', ')}</p>
        <p><strong>תדירות:</strong> ${request.requestDetails.frequency}</p>
        
        ${request.requestDetails.eventExamples ? `
          <p><strong>דוגמאות לאירועים:</strong></p>
          <p>${request.requestDetails.eventExamples}</p>
        ` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" 
           style="background: #28a745; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 5px; margin: 10px;">
          ✅ אשר בקשה
        </a>
        
        <a href="${rejectUrl}" 
           style="background: #dc3545; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 5px; margin: 10px;">
          ❌ דחה בקשה
        </a>
      </div>

      <p style="color: #666; font-size: 12px;">
        הקישורים תקפים למשך 7 ימים מתאריך שליחת הבקשה.
      </p>
    </div>
  `;

  await sendEmail({
    to: adminEmail,
    subject: `בקשה חדשה ליצירת אירועים - ${request.personalDetails.fullName}`,
    html: emailContent
  });
};

const sendUserApprovalEmail = async (user, approved, reason = '') => {
  const subject = approved 
    ? 'בקשתך ליצירת אירועים אושרה! 🎉'
    : 'בקשתך ליצירת אירועים לא אושרה';

  let content;
  if (approved) {
    content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: green;">מזל טוב! בקשתך אושרה 🎉</h2>
        <p>שלום ${user.username},</p>
        <p>אנו שמחים להודיע לך שבקשתך ליצירת אירועים אושרה!</p>
        <p>כעת תוכל ליצור אירועים באפליקציה ולהזמין משתמשים אחרים להשתתף.</p>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>מה הלאה?</strong></p>
          <ul>
            <li>היכנס לאפליקציה</li>
            <li>לך לדף "האירועים שלי"</li>
            <li>לחץ על "צור אירוע חדש"</li>
            <li>מלא את הפרטים והפרסם את האירוע</li>
          </ul>
        </div>
        
        <p>בהצלחה עם האירועים שלך!</p>
        <p>צוות האפליקציה</p>
      </div>
    `;
  } else {
    content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>בקשתך לא אושרה</h2>
        <p>שלום ${user.username},</p>
        <p>תודה על הבקשה ליצירת אירועים. לצערנו, בקשתך לא אושרה הפעם.</p>
        
        ${reason ? `
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>סיבה:</strong> ${reason}</p>
          </div>
        ` : ''}
        
        <p>אתה מוזמן להגיש בקשה חדשה בעתיד עם פרטים נוספים.</p>
        <p>צוות האפליקציה</p>
      </div>
    `;
  }

  await sendEmail({
    to: user.email,
    subject,
    html: content
  });
};
```

### שלב 3: Frontend Components

```jsx
// src/components/EventPermission/RequestForm.jsx
import React, { useState } from 'react';
import { eventPermissionService } from '../../services/eventPermissionService';

const EventPermissionRequestForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    personalDetails: {
      fullName: '',
      phone: '',
      city: '',
      age: '',
      profession: '',
      experience: ''
    },
    requestDetails: {
      motivation: '',
      eventTypes: [],
      eventExamples: '',
      frequency: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventTypeOptions = [
    { value: 'workshop', label: 'סדנאות' },
    { value: 'social', label: 'אירועים חברתיים' },
    { value: 'educational', label: 'אירועים חינוכיים' },
    { value: 'environmental', label: 'אירועים סביבתיים' },
    { value: 'other', label: 'אחר' }
  ];

  const frequencyOptions = [
    { value: 'weekly', label: 'שבועי' },
    { value: 'monthly', label: 'חודשי' },
    { value: 'occasionally', label: 'מדי פעם' },
    { value: 'rarely', label: 'לעיתים רחוקות' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await eventPermissionService.createRequest(formData);
      onSuccess();
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('שגיאה בשליחת הבקשה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalDetailChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value
      }
    }));
  };

  const handleRequestDetailChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      requestDetails: {
        ...prev.requestDetails,
        [field]: value
      }
    }));
  };

  const handleEventTypeChange = (eventType, checked) => {
    setFormData(prev => ({
      ...prev,
      requestDetails: {
        ...prev.requestDetails,
        eventTypes: checked 
          ? [...prev.requestDetails.eventTypes, eventType]
          : prev.requestDetails.eventTypes.filter(type => type !== eventType)
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">בקשה ליצירת אירועים</h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          מלא את הטופס הבא כדי לבקש הרשאה ליצור אירועים באפליקציה. 
          הבקשה תישלח לצוות האפליקציה לבדיקה ותקבל תשובה באימייל תוך מספר ימים.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* פרטים אישיים */}
        <div>
          <h3 className="text-xl font-semibold mb-4">פרטים אישיים</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם מלא *</label>
              <input
                type="text"
                value={formData.personalDetails.fullName}
                onChange={(e) => handlePersonalDetailChange('fullName', e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">טלפון *</label>
              <input
                type="tel"
                value={formData.personalDetails.phone}
                onChange={(e) => handlePersonalDetailChange('phone', e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">עיר מגורים *</label>
              <input
                type="text"
                value={formData.personalDetails.city}
                onChange={(e) => handlePersonalDetailChange('city', e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">גיל</label>
              <input
                type="number"
                min="16"
                max="120"
                value={formData.personalDetails.age}
                onChange={(e) => handlePersonalDetailChange('age', e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">מקצוע</label>
              <input
                type="text"
                value={formData.personalDetails.profession}
                onChange={(e) => handlePersonalDetailChange('profession', e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">ניסיון קודם בארגון אירועים</label>
              <textarea
                value={formData.personalDetails.experience}
                onChange={(e) => handlePersonalDetailChange('experience', e.target.value)}
                rows={3}
                className="w-full p-3 border rounded-lg"
                placeholder="תאר את הניסיון שלך בארגון אירועים, פעילויות קהילתיות וכד'"
              />
            </div>
          </div>
        </div>

        {/* פרטי הבקשה */}
        <div>
          <h3 className="text-xl font-semibold mb-4">פרטי הבקשה</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">למה אתה רוצה ליצור אירועים? *</label>
              <textarea
                value={formData.requestDetails.motivation}
                onChange={(e) => handleRequestDetailChange('motivation', e.target.value)}
                rows={4}
                className="w-full p-3 border rounded-lg"
                placeholder="ספר לנו על המוטיבציה שלך, מה אתה מקווה להשיג ואיך זה יועיל לקהילה"
                required
                maxLength={1000}
              />
              <div className="text-sm text-gray-500 mt-1">
                {formData.requestDetails.motivation.length}/1000 תווים
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">סוגי אירועים שתרצה ליצור *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {eventTypeOptions.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requestDetails.eventTypes.includes(option.value)}
                      onChange={(e) => handleEventTypeChange(option.value, e.target.checked)}
                      className="mr-2"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">תדירות יצירת אירועים *</label>
              <select
                value={formData.requestDetails.frequency}
                onChange={(e) => handleRequestDetailChange('frequency', e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              >
                <option value="">בחר תדירות</option>
                {frequencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">דוגמאות לאירועים שתרצה ליצור</label>
              <textarea
                value={formData.requestDetails.eventExamples}
                onChange={(e) => handleRequestDetailChange('eventExamples', e.target.value)}
                rows={3}
                className="w-full p-3 border rounded-lg"
                placeholder="תן דוגמאות קונקרטיות לאירועים שתרצה ליצור"
                maxLength={500}
              />
              <div className="text-sm text-gray-500 mt-1">
                {formData.requestDetails.eventExamples.length}/500 תווים
              </div>
            </div>
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || formData.requestDetails.eventTypes.length === 0}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'שולח בקשה...' : 'שלח בקשה'}
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

export default EventPermissionRequestForm;
```

## תכונות נוספות

### 1. מעקב אחר בקשות
```jsx
// src/components/EventPermission/RequestStatus.jsx
const RequestStatus = ({ userId }) => {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    fetchUserRequests();
  }, []);

  const fetchUserRequests = async () => {
    try {
      const response = await eventPermissionService.getUserRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">הבקשות שלי</h3>
      
      {requests.length === 0 ? (
        <p className="text-gray-500">לא הגשת בקשות עדיין</p>
      ) : (
        requests.map(request => (
          <div key={request._id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">בקשה ליצירת אירועים</h4>
                <p className="text-sm text-gray-600">
                  הוגשה ב-{new Date(request.submittedAt).toLocaleDateString('he-IL')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                request.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.status === 'approved' ? 'אושרה' :
                 request.status === 'rejected' ? 'נדחתה' :
                 request.status === 'under_review' ? 'בבדיקה' : 'ממתינה'}
              </span>
            </div>
            
            {request.status === 'rejected' && request.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded">
                <p className="text-sm text-red-800">
                  <strong>סיבת הדחייה:</strong> {request.rejectionReason}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
```

### 2. פאנל ניהול לאדמין
```jsx
// src/components/Admin/EventPermissionManager.jsx
const EventPermissionManager = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');

  const handleManualApproval = async (requestId, approved, reason = '') => {
    try {
      await eventPermissionService.updateRequestStatus(requestId, {
        status: approved ? 'approved' : 'rejected',
        reason
      });
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">ניהול בקשות יצירת אירועים</h2>
      
      {/* פילטרים */}
      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="pending">ממתינות לטיפול</option>
          <option value="approved">מאושרות</option>
          <option value="rejected">נדחות</option>
          <option value="all">הכל</option>
        </select>
      </div>

      {/* רשימת בקשות */}
      <div className="space-y-4">
        {requests.map(request => (
          <RequestCard
            key={request._id}
            request={request}
            onApprove={(reason) => handleManualApproval(request._id, true, reason)}
            onReject={(reason) => handleManualApproval(request._id, false, reason)}
          />
        ))}
      </div>
    </div>
  );
};
```

## אבטחה ושיקולים נוספים

### 1. הגבלות ובקרה
- הגבלת בקשה אחת פעילה למשתמש
- תוקף מוגבל לטוקני אישור
- מניעת ספאם בקשות

### 2. פרטיות ואבטחה
- הצפנת טוקני אישור
- הגנה על פרטים אישיים
- לוגים של פעילות אדמין

### 3. ביצועים
- אינדקסים מותאמים למסד הנתונים
- pagination לרשימות ארוכות
- cache נתונים שנגישים בתדירות גבוהה

## לוח זמנים משוער

- **שבוע 1**: פיתוח Backend API ומודלים
- **שבוע 2**: מערכת אישור דרך אימייל
- **שבוע 3**: יצירת קומפוננטות React
- **שבוע 4**: פאנל ניהול לאדמין
- **שבוע 5**: בדיקות ואופטימיזציה
- **שבוע 6**: פריסה ומעקב

## סיכום

מערכת בקשות יצירת אירועים תפתח את הפלטפורמה למשתמשים נוספים ותעודד יותר פעילות קהילתית. המערכת תבטיח שרק משתמשים מתאימים יוכלו ליצור אירועים, תוך שמירה על איכות התוכן והפעילויות בפלטפורמה.

השילוב של אישור דרך אימייל ופאנל ניהול יאפשר תהליך יעיל ושקוף לכל הצדדים. 