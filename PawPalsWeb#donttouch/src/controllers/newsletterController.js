const GardenNewsletter = require('../models/GardenNewsletter');
const Garden = require('../models/Garden');
const User = require('../models/User');
const crypto = require('crypto');
const { sendNewsletterWelcomeEmail, sendNewsletterEmail, sendNewsletterUnsubscribeEmail } = require('../utils/emailService');
const NotificationService = require('../utils/notificationService');

// Subscribe to garden newsletter
exports.subscribeToNewsletter = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id
    const { preferences = {} } = req.body;
    const userId = req.user.id;

    // Check if garden exists
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check if newsletter is enabled for this garden
    if (!garden.newsletter?.enabled) {
      return res.status(400).json({ error: 'Newsletter not enabled for this garden' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's first dog name (optional)
    const dogName = user.dogs && user.dogs.length > 0 ? user.dogs[0].name : '';

    // Check if already subscribed
    let subscription = await GardenNewsletter.findOne({
      garden: gardenId,
      user: userId
    });

    if (subscription) {
      // Update existing subscription
      subscription.isActive = true;
      subscription.preferences = {
        events: preferences.events !== false,
        promotions: preferences.promotions !== false,
        announcements: preferences.announcements !== false,
        maintenance: preferences.maintenance !== false
      };
      subscription.userEmail = user.email;
      subscription.userName = `${user.firstName} ${user.lastName}`;
      subscription.ownerName = `${user.firstName} ${user.lastName}`;
      subscription.dogName = dogName;
      
      await subscription.save();
      
      // Send welcome email if reactivating
      if (subscription.isActive) {
        try {
          await sendNewsletterWelcomeEmail(user, garden);
          console.log('Welcome email sent for reactivated subscription');
        } catch (emailError) {
          console.error('Failed to send welcome email for reactivated subscription:', emailError);
        }
      }
      
      return res.json({
        message: 'Newsletter subscription updated successfully',
        subscription: subscription
      });
    }

    // Create new subscription
    subscription = new GardenNewsletter({
      garden: gardenId,
      user: userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      dogName: dogName,
      ownerName: `${user.firstName} ${user.lastName}`,
      preferences: {
        events: preferences.events !== false,
        promotions: preferences.promotions !== false,
        announcements: preferences.announcements !== false,
        maintenance: preferences.maintenance !== false
      }
    });

    // Generate unsubscribe token
    subscription.generateUnsubscribeToken();

    await subscription.save();

    // Send welcome email
    try {
      await sendNewsletterWelcomeEmail(user, garden);
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Send app notification
    try {
      await NotificationService.createNewsletterSubscriptionNotification(
        userId,
        gardenId,
        garden.name
      );
      console.log('Newsletter subscription notification sent');
    } catch (notificationError) {
      console.error('Failed to send newsletter subscription notification:', notificationError);
    }

    res.status(201).json({
      message: 'Successfully subscribed to newsletter',
      subscription: subscription
    });

  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    
    // Handle duplicate subscription error
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Already subscribed to this newsletter' });
    }
    
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
};

// Unsubscribe from garden newsletter
exports.unsubscribeFromNewsletter = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id
    const userId = req.user.id;

    const subscription = await GardenNewsletter.findOne({
      garden: gardenId,
      user: userId
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Mark as inactive instead of deleting
    subscription.isActive = false;
    await subscription.save();

    // Send unsubscribe email
    try {
      const garden = await Garden.findById(gardenId);
      if (garden) {
        await sendNewsletterUnsubscribeEmail(user, garden);
        console.log('Unsubscribe email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send unsubscribe email:', emailError);
    }

    res.json({ message: 'Successfully unsubscribed from newsletter' });

  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from newsletter' });
  }
};

// Get subscription status for a user and garden
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id
    const userId = req.user.id;

    // Check if garden exists
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.json({
        isSubscribed: false,
        preferences: null,
        subscriptionDate: null
      });
    }

    const subscription = await GardenNewsletter.findOne({
      garden: gardenId,
      user: userId
    });

    res.json({
      isSubscribed: subscription ? subscription.isActive : false,
      preferences: subscription ? subscription.preferences : null,
      subscriptionDate: subscription ? subscription.subscriptionDate : null
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

// Get all subscribers for a garden (admin/owner only)
exports.getSubscribers = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id
    const { page = 1, limit = 20, emailType } = req.query;

    // Check if garden exists and user has permission
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && garden.manager && garden.manager.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view subscribers' });
    }

    // Build query
    const query = { garden: gardenId, isActive: true };
    if (emailType) {
      query[`preferences.${emailType}`] = true;
    }

    // Get subscribers with pagination
    const subscribers = await GardenNewsletter.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ subscriptionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await GardenNewsletter.countDocuments(query);

    res.json({
      subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting subscribers:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
};

// Get newsletter statistics for a garden
exports.getNewsletterStats = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id

    // Check if garden exists and user has permission
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && garden.manager.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view statistics' });
    }

    // Get statistics
    const [
      totalSubscribers,
      activeSubscribers,
      eventsSubscribers,
      promotionsSubscribers,
      announcementsSubscribers,
      maintenanceSubscribers
    ] = await Promise.all([
      GardenNewsletter.countDocuments({ garden: gardenId }),
      GardenNewsletter.countDocuments({ garden: gardenId, isActive: true }),
      GardenNewsletter.countDocuments({ garden: gardenId, isActive: true, 'preferences.events': true }),
      GardenNewsletter.countDocuments({ garden: gardenId, isActive: true, 'preferences.promotions': true }),
      GardenNewsletter.countDocuments({ garden: gardenId, isActive: true, 'preferences.announcements': true }),
      GardenNewsletter.countDocuments({ garden: gardenId, isActive: true, 'preferences.maintenance': true })
    ]);

    // Get recent subscription activity
    const recentSubscriptions = await GardenNewsletter.find({
      garden: gardenId,
      isActive: true
    })
      .populate('user', 'firstName lastName')
      .sort({ subscriptionDate: -1 })
      .limit(5);

    res.json({
      totalSubscribers,
      activeSubscribers,
      preferenceBreakdown: {
        events: eventsSubscribers,
        promotions: promotionsSubscribers,
        announcements: announcementsSubscribers,
        maintenance: maintenanceSubscribers
      },
      recentSubscriptions
    });

  } catch (error) {
    console.error('Error getting newsletter statistics:', error);
    res.status(500).json({ error: 'Failed to get newsletter statistics' });
  }
};

// Send newsletter to subscribers (admin/owner only)
exports.sendNewsletter = async (req, res) => {
  try {
    const gardenId = req.params.id; // Changed from req.params.gardenId to req.params.id
    const { subject, content, emailType = 'announcements' } = req.body;

    // Check if garden exists and user has permission
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && garden.manager.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to send newsletter' });
    }

    // Validate required fields
    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }

    // Get active subscribers for this email type
    const subscribers = await GardenNewsletter.find({
      garden: gardenId,
      isActive: true,
      [`preferences.${emailType}`]: true
    }).populate('user', 'firstName lastName email');

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No active subscribers found for this email type' });
    }

    // Send emails and notifications to all subscribers
    let emailsSent = 0;
    let notificationsSent = 0;
    
    const sendPromises = subscribers.map(async (subscription) => {
      try {
        // Send email
        await sendNewsletterEmail(subscription.user, garden, subject, content, emailType);
        emailsSent++;
        
        // Send app notification
        await NotificationService.createNewsletterContentNotification(
          subscription.user._id,
          gardenId,
          garden.name,
          subject,
          content, // Send full content instead of preview
          emailType
        );
        notificationsSent++;
        
        // Update subscription statistics
        subscription.lastEmailSent = new Date();
        subscription.emailsSent = (subscription.emailsSent || 0) + 1;
        await subscription.save();
        
      } catch (error) {
        console.error(`Failed to send newsletter to ${subscription.user.email}:`, error);
      }
    });
    
    await Promise.all(sendPromises);

    console.log(`Newsletter sent: ${emailsSent} emails, ${notificationsSent} notifications`);

    res.json({
      message: 'Newsletter sent successfully',
      recipientCount: subscribers.length,
      emailsSent,
      notificationsSent,
      emailType,
      subject
    });

  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
};

// Unsubscribe via token (for email links)
exports.unsubscribeViaToken = async (req, res) => {
  try {
    const { token } = req.params;

    const subscription = await GardenNewsletter.findOne({
      unsubscribeToken: token
    }).populate('garden', 'name').populate('user', 'firstName lastName');

    if (!subscription) {
      return res.status(404).json({ error: 'Invalid unsubscribe token' });
    }

    // Mark as inactive
    subscription.isActive = false;
    await subscription.save();

    res.json({
      message: 'Successfully unsubscribed from newsletter',
      gardenName: subscription.garden.name,
      userName: subscription.userName
    });

  } catch (error) {
    console.error('Error unsubscribing via token:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};