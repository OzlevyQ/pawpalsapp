const cron = require('node-cron');
const Event = require('../models/Event');
const Visit = require('../models/Visit');
const NotificationService = require('../utils/notificationService');

class SchedulerService {
  static isInitialized = false;

  // Initialize all scheduled tasks
  static initialize() {
    if (this.isInitialized) {
      console.log('SchedulerService already initialized');
      return;
    }

    console.log('Initializing SchedulerService...');

    // Event reminders - run every hour
    this.scheduleEventReminders();
    
    // Visit reminders - run every 30 minutes
    this.scheduleVisitReminders();

    this.isInitialized = true;
    console.log('SchedulerService initialized successfully');
  }

  // Schedule event reminders (24 hours before event)
  static scheduleEventReminders() {
    cron.schedule('0 */1 * * *', async () => {
      try {
        console.log('Checking for event reminders...');
        
        // Find events starting in 24 hours
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const upcomingEvents = await Event.find({
          startDate: {
            $gte: tomorrow,
            $lt: dayAfter
          },
          status: 'active',
          reminderSent: { $ne: true }
        }).populate('participants.user', '_id');

        console.log(`Found ${upcomingEvents.length} events for reminders`);

        for (const event of upcomingEvents) {
          // Send reminders to all approved participants
          const approvedParticipants = event.participants.filter(p => p.status === 'approved');
          
          for (const participant of approvedParticipants) {
            try {
              await NotificationService.createEventReminderNotification(
                participant.user._id,
                event._id,
                event.title,
                event.startDate
              );
            } catch (error) {
              console.error(`Failed to send event reminder to ${participant.user._id}:`, error);
            }
          }

          // Mark reminder as sent
          event.reminderSent = true;
          await event.save();
        }

        console.log(`Sent reminders for ${upcomingEvents.length} events`);
      } catch (error) {
        console.error('Error in event reminder scheduler:', error);
      }
    });
  }

  // Schedule visit reminders (after 2 hours of active visit)
  static scheduleVisitReminders() {
    cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('Checking for long active visits...');
        
        // Find visits that have been active for more than 2 hours
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const longVisits = await Visit.find({
          status: 'active',
          checkInTime: { $lte: twoHoursAgo },
          reminderSent: { $ne: true }
        }).populate('garden', 'name');

        console.log(`Found ${longVisits.length} long active visits`);

        for (const visit of longVisits) {
          try {
            await NotificationService.createVisitReminderNotification(
              visit.user,
              visit._id,
              visit.garden._id,
              visit.garden.name,
              new Date()
            );

            // Mark reminder as sent
            visit.reminderSent = true;
            await visit.save();
          } catch (error) {
            console.error(`Failed to send visit reminder to ${visit.user}:`, error);
          }
        }

        console.log(`Sent reminders for ${longVisits.length} long visits`);
      } catch (error) {
        console.error('Error in visit reminder scheduler:', error);
      }
    });
  }

  // Manual trigger for event reminders (for testing)
  static async triggerEventReminders() {
    try {
      console.log('Manually triggering event reminders...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const upcomingEvents = await Event.find({
        startDate: {
          $gte: tomorrow,
          $lt: dayAfter
        },
        status: 'active'
      }).populate('participants.user', '_id');

      for (const event of upcomingEvents) {
        const approvedParticipants = event.participants.filter(p => p.status === 'approved');
        
        for (const participant of approvedParticipants) {
          await NotificationService.createEventReminderNotification(
            participant.user._id,
            event._id,
            event.title,
            event.startDate
          );
        }
      }

      return { success: true, eventsProcessed: upcomingEvents.length };
    } catch (error) {
      console.error('Error in manual event reminder trigger:', error);
      throw error;
    }
  }

  // Manual trigger for visit reminders (for testing)
  static async triggerVisitReminders() {
    try {
      console.log('Manually triggering visit reminders...');
      
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const longVisits = await Visit.find({
        status: 'active',
        checkInTime: { $lte: twoHoursAgo }
      }).populate('garden', 'name');

      for (const visit of longVisits) {
        await NotificationService.createVisitReminderNotification(
          visit.user,
          visit._id,
          visit.garden._id,
          visit.garden.name,
          new Date()
        );
      }

      return { success: true, visitsProcessed: longVisits.length };
    } catch (error) {
      console.error('Error in manual visit reminder trigger:', error);
      throw error;
    }
  }

  // Stop all scheduled tasks
  static stop() {
    console.log('Stopping SchedulerService...');
    cron.getTasks().forEach((task, name) => {
      task.stop();
      console.log(`Stopped task: ${name}`);
    });
    this.isInitialized = false;
  }
}

module.exports = SchedulerService;