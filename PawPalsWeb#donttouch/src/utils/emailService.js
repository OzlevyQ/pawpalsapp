const nodemailer = require('nodemailer');

// HTML Email Templates
const getEmailTemplate = (title, content, buttonText = '', buttonUrl = '') => {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                direction: rtl;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
                font-weight: 700;
            }
            .header .subtitle {
                font-size: 16px;
                opacity: 0.9;
            }
            .paw-icon {
                font-size: 48px;
                margin-bottom: 20px;
                display: block;
            }
            .content {
                padding: 40px 30px;
                line-height: 1.6;
                color: #333;
            }
            .content h2 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 24px;
                font-weight: 600;
            }
            .content p {
                margin-bottom: 15px;
                font-size: 16px;
            }
            .event-details {
                background: linear-gradient(135deg, #f8f9ff 0%, #f3f0ff 100%);
                border: 2px solid #e0e7ff;
                border-radius: 15px;
                padding: 25px;
                margin: 25px 0;
            }
            .event-details h3 {
                color: #667eea;
                margin-bottom: 15px;
                font-size: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .detail-item {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px 0;
                border-bottom: 1px solid #e0e7ff;
            }
            .detail-item:last-child {
                border-bottom: none;
            }
            .detail-item .icon {
                margin-left: 12px;
                font-size: 18px;
                width: 24px;
            }
            .detail-item .label {
                font-weight: 600;
                color: #667eea;
                margin-left: 8px;
            }
            .status-badge {
                display: inline-block;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                text-align: center;
            }
            .status-pending {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                color: #92400e;
                border: 2px solid #f59e0b;
            }
            .status-approved {
                background: linear-gradient(135deg, #d1fae5, #a7f3d0);
                color: #065f46;
                border: 2px solid #10b981;
            }
            .status-rejected {
                background: linear-gradient(135deg, #fee2e2, #fecaca);
                color: #991b1b;
                border: 2px solid #ef4444;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 50px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .button:hover {
                transform: translateY(-2px);
            }
            .footer {
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
            }
            .footer p {
                margin-bottom: 10px;
                font-size: 14px;
            }
            .social-links {
                margin-top: 20px;
            }
            .social-links a {
                display: inline-block;
                margin: 0 10px;
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }
            @media (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 15px;
                }
                .header, .content {
                    padding: 25px 20px;
                }
                .event-details {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <span class="paw-icon">🐾</span>
                <h1>PawPals App</h1>
                <div class="subtitle">הקהילה של בעלי הכלבים</div>
            </div>
            
            <div class="content">
                ${content}
                
                ${buttonText && buttonUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${buttonUrl}" class="button">${buttonText}</a>
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <p><strong>PawPals App</strong> - הקהילה של בעלי הכלבים בישראל</p>
                <p>איתנו תמצאו את הגנים הטובים ביותר לכלב שלכם</p>
                <div class="social-links">
                    <a href="#">אתר האינטרנט</a>
                    <a href="#">פייסבוק</a>
                    <a href="#">אינסטגרם</a>
                </div>
                <p style="font-size: 12px; margin-top: 20px; opacity: 0.7;">
                    מייל זה נשלח מתוך מערכת PawPals App. אם אינך מעוניין לקבל מיילים נוספים, 
                    <a href="#" style="color: #667eea;">בטל מנוי</a>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// הגדרת transporter (יש להתאים לפי ספק ה-email שלך)
const createTransporter = () => {
  // בסביבת פיתוח - נשתמש ב-ethereal email לבדיקות
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
  
  // בסביבת ייצור - להתאים לספק שלך (Gmail, SendGrid, etc.)
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// שליחת אימייל כללי
const sendEmail = async (options) => {
  try {
    // Skip email in development if no email configuration
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      console.log('Email skipped in development (no config):', options.subject);
      return { messageId: 'dev-skip' };
    }
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'PawPals App <noreply@pawpals.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// שליחת אימייל רישום לאירוע
const sendEventRegistrationEmail = async (user, event, status) => {
  const eventDate = new Date(event.eventDate).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = status === 'pending' 
    ? `רישום לאירוע "${event.title}" - ממתין לאישור 🐕`
    : `אישור רישום לאירוע "${event.title}" 🎉`;

  const statusBadge = status === 'pending' 
    ? '<div class="status-badge status-pending">⏳ ממתין לאישור המארגן</div>'
    : '<div class="status-badge status-approved">✅ רישום מאושר!</div>';

  // הודעה מהמארגן או הודעת ברירת מחדל
  const organizerMessage = event.organizerMessages?.registrationMessage || '';
  
  const message = status === 'pending'
    ? `<h2>רישום התקבל בהצלחה! 🎉</h2>
       <p>שלום <strong>${user.firstName}</strong>,</p>
       <p>נרשמת בהצלחה לאירוע "<strong>${event.title}</strong>".</p>
       ${statusBadge}
       <p>הרישום שלך נמצא כעת בתהליך בדיקה ואישור על ידי המארגן. נעדכן אותך ברגע שהרישום יאושר.</p>
       ${organizerMessage ? `
       <div style="background: #f8fafc; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
         <h4 style="color: #667eea; margin-bottom: 10px;">💬 הודעה מהמארגן:</h4>
         <p style="font-style: italic; color: #64748b;">"${organizerMessage}"</p>
       </div>
       ` : ''}`
    : `<h2>ברוך הבא לאירוע! 🎉</h2>
       <p>שלום <strong>${user.firstName}</strong>,</p>
       <p>נרשמת בהצלחה לאירוע "<strong>${event.title}</strong>"!</p>
       ${statusBadge}
       <p>אנו שמחים לבשר לך שרישומך אושר ואתה חלק מהאירוע.</p>
       ${organizerMessage ? `
       <div style="background: #f8fafc; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
         <h4 style="color: #667eea; margin-bottom: 10px;">💬 הודעה מהמארגן:</h4>
         <p style="font-style: italic; color: #64748b;">"${organizerMessage}"</p>
       </div>
       ` : ''}`;

  const eventDetails = `
    <div class="event-details">
      <h3>🎪 פרטי האירוע</h3>
      <div class="detail-item">
        <span class="icon">📅</span>
        <span class="label">תאריך:</span>
        ${eventDate}
      </div>
      <div class="detail-item">
        <span class="icon">🕐</span>
        <span class="label">שעה:</span>
        ${event.startTime} - ${event.endTime}
      </div>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">מקום:</span>
        ${event.garden?.name || 'לא צוין'}
      </div>
      <div class="detail-item">
        <span class="icon">👤</span>
        <span class="label">מארגן:</span>
        ${event.organizer?.firstName} ${event.organizer?.lastName}
      </div>
    </div>
  `;

  const content = message + eventDetails + 
    `<p style="margin-top: 25px;"><strong>טיפים לאירוע:</strong></p>
     <ul style="margin-right: 20px; color: #64748b;">
       <li>הביאו מים לכלב 💧</li>
       <li>ודאו שהכלב מחוסן 💉</li>
       <li>הביאו שקיות לניקוי 🧹</li>
       <li>הגיעו בזמן ונהנו! 🎉</li>
     </ul>`;

  const buttonText = status === 'approved' ? 'הוסף ליומן שלי' : 'צפה באירוע';
  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}`;

  const html = getEmailTemplate(subject, content, buttonText, buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `${subject}\n\nשלום ${user.firstName},\n\n${status === 'pending' ? 'רישומך ממתין לאישור' : 'רישומך אושר'}\n\nפרטי האירוע:\nתאריך: ${eventDate}\nשעה: ${event.startTime}\nמקום: ${event.garden?.name}${organizerMessage ? '\n\nהודעה מהמארגן: ' + organizerMessage : ''}`,
    html
  });
};

// שליחת עדכון סטטוס משתתף
const sendParticipantStatusUpdateEmail = async (user, event, status, notes = '') => {
  const eventDate = new Date(event.eventDate).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let subject, content, statusBadge;
  
  switch (status) {
    case 'approved':
      subject = `🎉 רישומך לאירוע "${event.title}" אושר!`;
      statusBadge = '<div class="status-badge status-approved">✅ רישום מאושר!</div>';
      
      // הודעה מותאמת אישית מהמארגן או הודעת ברירת מחדל
      const approvalMessage = event.organizerMessages?.approvalMessage || 
        'אנו שמחים לבשר לך שאתה כעת חלק רסמי מהאירוע. נתחיל להתכונן!';
      
      content = `
        <h2>מזל טוב! רישומך אושר 🎉</h2>
        <p>שלום <strong>${user.firstName}</strong>,</p>
        <p>יש לנו חדשות מעולות! רישומך לאירוע "<strong>${event.title}</strong>" אושר!</p>
        ${statusBadge}
        <div style="background: #f8fafc; border-right: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h4 style="color: #10b981; margin-bottom: 10px;">💬 הודעה מהמארגן:</h4>
          <p style="font-style: italic; color: #64748b;">"${approvalMessage}"</p>
        </div>
      `;
      break;
      
    case 'rejected':
      subject = `😔 רישומך לאירוע "${event.title}" לא אושר`;
      statusBadge = '<div class="status-badge status-rejected">❌ רישום לא אושר</div>';
      
      // הודעה מותאמת אישית מהמארגן או הודעת ברירת מחדל
      const rejectionMessage = event.organizerMessages?.rejectionMessage || 
        'מצטערים להודיע שרישומך לאירוע לא אושר הפעם. אל תדאג! יש הרבה אירועים נוספים מתוכננים. אנו מעודדים אותך להירשם לאירועים נוספים.';
      
      content = `
        <h2>מצטערים... 😔</h2>
        <p>שלום <strong>${user.firstName}</strong>,</p>
        <p>מצטערים להודיע שרישומך לאירוע "<strong>${event.title}</strong>" לא אושר הפעם.</p>
        ${statusBadge}
        <div style="background: #fef2f2; border-right: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h4 style="color: #ef4444; margin-bottom: 10px;">💬 הודעה מהמארגן:</h4>
          <p style="font-style: italic; color: #64748b;">"${rejectionMessage}"</p>
        </div>
      `;
      break;
      
    default:
      return;
  }

  const eventDetails = `
    <div class="event-details">
      <h3>🎪 פרטי האירוע</h3>
      <div class="detail-item">
        <span class="icon">📅</span>
        <span class="label">תאריך:</span>
        ${eventDate}
      </div>
      <div class="detail-item">
        <span class="icon">🕐</span>
        <span class="label">שעה:</span>
        ${event.startTime} - ${event.endTime}
      </div>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">מקום:</span>
        ${event.garden?.name || 'לא צוין'}
      </div>
    </div>
  `;

  let fullContent = content + eventDetails;

  if (notes) {
    fullContent += `
      <div style="background: #f8fafc; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h4 style="color: #667eea; margin-bottom: 10px;">📝 הערות נוספות:</h4>
        <p style="font-style: italic; color: #64748b;">"${notes}"</p>
      </div>
    `;
  }

  const buttonText = status === 'approved' ? 'הוסף ליומן שלי' : 'חפש אירועים נוספים';
  const buttonUrl = status === 'approved' 
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events`;

  const html = getEmailTemplate(subject, fullContent, buttonText, buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `${subject}\n\n${content.replace(/<[^>]*>/g, '')}\n\n${notes ? `הערות: ${notes}` : ''}`,
    html
  });
};

// שליחת תזכורת לאירוע
const sendEventReminderEmail = async (user, event) => {
  const eventDate = new Date(event.eventDate).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `🔔 תזכורת: אירוע "${event.title}" מתקרב!`;
  
  // הודעה מותאמת אישית מהמארגן או הודעת ברירת מחדל
  const reminderMessage = event.organizerMessages?.reminderMessage || 
    'רק רצינו להזכיר לך שהאירוע מתקרב! אנו מצפים לראותך שם.';
  
  const content = `
    <h2>תזכורת חשובה! 🔔</h2>
    <p>שלום <strong>${user.firstName}</strong>,</p>
    <p>רק רצינו להזכיר לך שהאירוע "<strong>${event.title}</strong>" מתקרב!</p>
    
    <div class="status-badge status-approved">⏰ האירוע מתחיל בקרוב</div>
    
    ${reminderMessage ? `
    <div style="background: #f8fafc; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h4 style="color: #667eea; margin-bottom: 10px;">💬 הודעה מהמארגן:</h4>
      <p style="font-style: italic; color: #64748b;">"${reminderMessage}"</p>
    </div>
    ` : ''}
    
    <div class="event-details">
      <h3>🎪 פרטי האירוע</h3>
      <div class="detail-item">
        <span class="icon">📅</span>
        <span class="label">תאריך:</span>
        ${eventDate}
      </div>
      <div class="detail-item">
        <span class="icon">🕐</span>
        <span class="label">שעה:</span>
        ${event.startTime} - ${event.endTime}
      </div>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">מקום:</span>
        ${event.garden?.name || 'לא צוין'}
      </div>
    </div>
    
    <p><strong>אל תשכחו:</strong></p>
    <ul style="margin-right: 20px; color: #64748b;">
      <li>להביא מים לכלב 💧</li>
      <li>לוודא שהכלב מחוסן 💉</li>
      <li>להביא שקיות לניקוי 🧹</li>
      <li>להגיע בזמן ולהנות! 🎉</li>
    </ul>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event._id}`;
  const html = getEmailTemplate(subject, content, 'צפה בפרטי האירוע', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `תזכורת: אירוע "${event.title}" מתקרב!\n\nתאריך: ${eventDate}\nשעה: ${event.startTime}\nמקום: ${event.garden?.name}${reminderMessage ? '\n\nהודעה מהמארגן: ' + reminderMessage : ''}`,
    html
  });
};

// שליחת הודעה על ביטול אירוע
const sendEventCancelledEmail = async (user, event) => {
  const eventDate = new Date(event.eventDate).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `😔 אירוע "${event.title}" בוטל`;
  
  const content = `
    <h2>הודעה חשובה 📢</h2>
    <p>שלום <strong>${user.firstName}</strong>,</p>
    <p>מצטערים להודיע שאירוע "<strong>${event.title}</strong>" שהיה אמור להתקיים ב-${eventDate} בוטל.</p>
    
    <div class="status-badge status-rejected">❌ האירוע בוטל</div>
    
    <div class="event-details">
      <h3>🎪 פרטי האירוע שבוטל</h3>
      <div class="detail-item">
        <span class="icon">📅</span>
        <span class="label">תאריך:</span>
        ${eventDate}
      </div>
      <div class="detail-item">
        <span class="icon">🕐</span>
        <span class="label">שעה:</span>
        ${event.startTime} - ${event.endTime}
      </div>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">מקום:</span>
        ${event.garden?.name || 'לא צוין'}
      </div>
    </div>
    
    <p>אנו מתנצלים על אי הנוחות ונודיע לך על אירועים חלופיים בהקדם.</p>
    <p>בינתיים, אתה מוזמן לעיין באירועים נוספים באפליקציה!</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events`;
  const html = getEmailTemplate(subject, content, 'חפש אירועים נוספים', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `אירוע "${event.title}" בוטל\n\nמצטערים להודיע שאירוע "${event.title}" שהיה אמור להתקיים ב-${eventDate} בוטל.`,
    html
  });
};

// Request related emails
const sendRequestSubmittedEmail = async (user, request) => {
  const requestTypeText = request.type === 'garden_manager' ? 'Garden Manager' : 'Event Organizer';
  
  const subject = `Request Submitted - ${requestTypeText} Application`;
  
  const content = `
    <h2>🎉 Request Submitted Successfully!</h2>
    <p>Hi <strong>${user.firstName}</strong>,</p>
    <p>Thank you for submitting your application to become a <strong>${requestTypeText}</strong> in our PawPals community!</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Application Details:</h3>
      <p><strong>Type:</strong> ${requestTypeText}</p>
      <p><strong>Submitted:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
      <p><strong>Status:</strong> Pending Review</p>
    </div>
    
    <p>Our team will review your application and get back to you within 3-5 business days. We'll notify you via email once a decision has been made.</p>
    <p>Thank you for your interest in contributing to our community!</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`;
  const html = getEmailTemplate(subject, content, 'View My Profile', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `${subject}\n\nThank you for submitting your ${requestTypeText} application. We'll review it and get back to you within 3-5 business days.`,
    html
  });
};

const sendNewRequestNotificationEmail = async (admin, request) => {
  const requestTypeText = request.type === 'garden_manager' ? 'Garden Manager' : 'Event Organizer';
  const user = request.user;
  
  const subject = `🔔 New ${requestTypeText} Application - Action Required`;
  
  const content = `
    <h2>🔔 New Application Received</h2>
    <p>Hi <strong>${admin.firstName}</strong>,</p>
    <p>A new <strong>${requestTypeText}</strong> application has been submitted and requires your review.</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>Application Details:</h3>
      <p><strong>Applicant:</strong> ${user.firstName} ${user.lastName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Type:</strong> ${requestTypeText}</p>
      <p><strong>Reason:</strong> ${request.details.reason}</p>
      <p><strong>Submitted:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
    </div>
    
    <p>Please review this application as soon as possible to maintain good community engagement.</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/requests`;
  const html = getEmailTemplate(subject, content, 'Review Application', buttonUrl);

  return await sendEmail({
    to: admin.email,
    subject,
    text: `New ${requestTypeText} application from ${user.firstName} ${user.lastName} requires review.`,
    html
  });
};

const sendRequestStatusUpdateEmail = async (user, request, status) => {
  const requestTypeText = request.type === 'garden_manager' ? 'Garden Manager' : 'Event Organizer';
  const isApproved = status === 'approved';
  
  const statusText = isApproved ? 'Approved ✅' : 'Not Approved ❌';
  const subject = `Application ${statusText} - ${requestTypeText}`;
  
  let content;
  
  if (isApproved) {
    content = `
      <h2>🎉 Congratulations!</h2>
      <p>Hi <strong>${user.firstName}</strong>,</p>
      <p>We have reviewed your <strong>${requestTypeText}</strong> application and we're pleased to inform you that it has been <strong>approved</strong>!</p>
      
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3>Decision: ${statusText}</h3>
        <p><strong>Application Type:</strong> ${requestTypeText}</p>
        <p><strong>Review Date:</strong> ${new Date(request.reviewedAt).toLocaleDateString()}</p>
        ${request.reviewNotes ? `<p><strong>Notes:</strong> ${request.reviewNotes}</p>` : ''}
      </div>
      
      <p>You now have ${requestTypeText.toLowerCase()} privileges in our system and can start ${request.type === 'garden_manager' ? 'managing gardens' : 'creating and organizing events'} in our community!</p>
    `;
  } else {
    content = `
      <h2>Application Update</h2>
      <p>Hi <strong>${user.firstName}</strong>,</p>
      <p>We have reviewed your <strong>${requestTypeText}</strong> application.</p>
      
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h3>Decision: ${statusText}</h3>
        <p><strong>Application Type:</strong> ${requestTypeText}</p>
        <p><strong>Review Date:</strong> ${new Date(request.reviewedAt).toLocaleDateString()}</p>
        ${request.reviewNotes ? `<p><strong>Notes:</strong> ${request.reviewNotes}</p>` : ''}
      </div>
      
      <p>Unfortunately, your application was not approved at this time. This decision is based on our current community needs and requirements.</p>
      <p>You're welcome to apply again in the future if your circumstances change or if you'd like to provide additional information.</p>
    `;
  }
  
  content += `<p>Thank you for your interest in contributing to our PawPals community!</p>`;

  const buttonText = isApproved ? 'Access Your Dashboard' : 'Back to Profile';
  const buttonUrl = isApproved 
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`;

  const html = getEmailTemplate(subject, content, buttonText, buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `${subject}\n\n${isApproved ? 'Congratulations! Your application has been approved.' : 'Your application was not approved at this time.'}${request.reviewNotes ? '\n\nNotes: ' + request.reviewNotes : ''}`,
    html
  });
};

// Newsletter related emails
const sendNewsletterWelcomeEmail = async (user, garden) => {
  const subject = `🎉 ברוכים הבאים לניוזלטר ${garden.name}!`;
  
  const content = `
    <h2>ברוכים הבאים לניוזלטר! 🎉</h2>
    <p>שלום <strong>${user.firstName}</strong>,</p>
    <p>תודה שנרשמתם לניוזלטר של גינת הכלבים "<strong>${garden.name}</strong>"!</p>
    
    <div class="status-badge status-approved">✅ רישום מאושר</div>
    
    <div class="event-details">
      <h3>🏞️ פרטי הגינה</h3>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">כתובת:</span>
        ${garden.location?.address || 'לא צוין'}
      </div>
      <div class="detail-item">
        <span class="icon">🕐</span>
        <span class="label">שעות פעילות:</span>
        ${garden.openingHours?.monday ? `${garden.openingHours.monday.open} - ${garden.openingHours.monday.close}` : 'לא צוין'}
      </div>
      <div class="detail-item">
        <span class="icon">🐕</span>
        <span class="label">קיבולת:</span>
        ${garden.capacity?.maxDogs || 'לא מוגבל'} כלבים
      </div>
      <div class="detail-item">
        <span class="icon">📞</span>
        <span class="label">טלפון:</span>
        ${garden.contact?.phone || 'לא צוין'}
      </div>
    </div>
    
    <p><strong>מה תקבלו בניוזלטר:</strong></p>
    <ul style="margin-right: 20px; color: #64748b;">
      <li>📢 הודעות חשובות על הגינה</li>
      <li>🎪 הודעות על אירועים מיוחדים</li>
      <li>🎁 הצעות והטבות למנויים</li>
      <li>🔧 עדכונים על תחזוקה וסגירות</li>
    </ul>
    
    <p>אנו מתחייבים לשלוח אליכם רק מידע רלוונטי וחשוב על הגינה.</p>
    <p>תודה שאתם חלק מקהילת בעלי הכלבים שלנו! 🐾</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gardens/${garden._id}`;
  const html = getEmailTemplate(subject, content, 'צפה בגינה', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `ברוכים הבאים לניוזלטר ${garden.name}!\n\nתודה שנרשמתם לניוזלטר של גינת הכלבים "${garden.name}". תקבלו עדכונים על אירועים, הודעות חשובות והטבות מיוחדות.`,
    html
  });
};

const sendNewsletterEmail = async (user, garden, subject, content, emailType = 'announcements') => {
  const emailSubject = `📢 ${garden.name} - ${subject}`;
  
  const emailContent = `
    <h2>${subject}</h2>
    <p>שלום <strong>${user.firstName}</strong>,</p>
    
    <div class="event-details">
      <h3>🏞️ ${garden.name}</h3>
      <div class="detail-item">
        <span class="icon">📍</span>
        <span class="label">כתובת:</span>
        ${garden.location?.address || 'לא צוין'}
      </div>
    </div>
    
    <div style="background: #f8fafc; border-right: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <div style="color: #333; line-height: 1.6;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    </div>
    
    <p style="margin-top: 25px;">תודה שאתם חלק מקהילת בעלי הכלבים שלנו! 🐾</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gardens/${garden._id}`;
  const html = getEmailTemplate(emailSubject, emailContent, 'צפה בגינה', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject: emailSubject,
    text: `${garden.name} - ${subject}\n\n${content}`,
    html
  });
};

const sendNewsletterUnsubscribeEmail = async (user, garden) => {
  const subject = `😔 ביטול מנוי לניוזלטר ${garden.name}`;
  
  const content = `
    <h2>ביטול מנוי בוצע בהצלחה 😔</h2>
    <p>שלום <strong>${user.firstName}</strong>,</p>
    <p>ביטלתם בהצלחה את המנוי לניוזלטר של גינת הכלבים "<strong>${garden.name}</strong>".</p>
    
    <div class="status-badge status-rejected">❌ המנוי בוטל</div>
    
    <p>לא תקבלו עוד הודעות מהגינה הזו.</p>
    <p>אם זה היה בטעות, אתם מוזמנים לחזור ולהירשם בכל עת דרך האפליקציה.</p>
    
    <p>תודה שהייתם חלק מקהילת בעלי הכלבים שלנו! 🐾</p>
  `;

  const buttonUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gardens/${garden._id}`;
  const html = getEmailTemplate(subject, content, 'חזור לגינה', buttonUrl);

  return await sendEmail({
    to: user.email,
    subject,
    text: `ביטול מנוי לניוזלטר ${garden.name}\n\nביטלתם בהצלחה את המנוי לניוזלטר של גינת הכלבים "${garden.name}". לא תקבלו עוד הודעות מהגינה הזו.`,
    html
  });
};

module.exports = {
  sendEmail,
  sendEventRegistrationEmail,
  sendParticipantStatusUpdateEmail,
  sendEventReminderEmail,
  sendEventCancelledEmail,
  sendRequestSubmittedEmail,
  sendNewRequestNotificationEmail,
  sendRequestStatusUpdateEmail,
  sendNewsletterWelcomeEmail,
  sendNewsletterEmail,
  sendNewsletterUnsubscribeEmail
}; 
 