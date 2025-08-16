/**
 * Hybrid Notification Service
 * מערכת התראות היברידית שמבטיחה שההתראות יעבדו בכל מצב:
 * - התראות פוש למכשירים אמיתיים
 * - התראות מקומיות לסימולטור
 * - WebSocket להתראות בזמן אמת בתוך האפליקציה
 */

import { Alert } from 'react-native';
import { notificationService } from './notificationService';
import { notificationsApi } from './api';

export enum NotificationMethod {
  PUSH = 'push',
  LOCAL = 'local', 
  WEBSOCKET = 'websocket',
  IN_APP = 'in_app'
}

export interface NotificationCapability {
  canReceivePush: boolean;
  canReceiveLocal: boolean;
  hasWebSocket: boolean;
  preferredMethod: NotificationMethod;
  platform: string;
  isSimulator: boolean;
}

class HybridNotificationService {
  private capability: NotificationCapability | null = null;

  // אתחול והערכת יכולות המכשיר
  async initialize(): Promise<NotificationCapability> {
    // Only initialize if not already initialized
    if (this.capability) {
      return this.capability;
    }
    
    // Initialize notification service first
    await notificationService.initialize();
    
    const status = notificationService.getCapabilityStatus();
    
    this.capability = {
      canReceivePush: status.canReceivePush,
      canReceiveLocal: status.canReceiveLocal,
      hasWebSocket: true, // תמיד נסה WebSocket
      preferredMethod: this.getPreferredMethod(status),
      platform: status.platform,
      isSimulator: status.isSimulator
    };

    console.log('Hybrid Notification Service initialized:', this.capability);
    return this.capability;
  }

  private getPreferredMethod(status: any): NotificationMethod {
    if (status.canReceivePush) {
      return NotificationMethod.PUSH;
    } else if (status.canReceiveLocal) {
      return NotificationMethod.LOCAL;
    } else {
      return NotificationMethod.IN_APP;
    }
  }

  // שליחת התראת בדיקה עם כל השיטות הזמינות
  async sendTestNotification(message: string = 'התראת בדיקה'): Promise<{
    success: boolean;
    methods: string[];
    errors: string[];
  }> {
    if (!this.capability) {
      await this.initialize();
    }

    const results = {
      success: false,
      methods: [] as string[],
      errors: [] as string[]
    };

    // 1. נסה התראת פוש (למכשירים אמיתיים)
    if (this.capability!.canReceivePush) {
      try {
        const response = await notificationsApi.sendTestNotification(message);
        if (response.success) {
          results.methods.push('Push Notification');
          results.success = true;
        } else {
          results.errors.push(`Push failed: ${response.error}`);
        }
      } catch (error) {
        results.errors.push(`Push error: ${error}`);
      }
    }

    // 2. שלח התראה מקומית (לכולם, כולל סימולטור)
    if (this.capability!.canReceiveLocal) {
      try {
        await notificationService.sendImmediateLocalNotification(
          'בדיקת התראה מקומית',
          message,
          { type: 'system', test: true, hybrid: true }
        );
        results.methods.push('Local Notification');
        results.success = true;
      } catch (error) {
        results.errors.push(`Local notification error: ${error}`);
      }
    }

    // 3. הצג התראה בתוך האפליקציה (fallback)
    if (!results.success) {
      Alert.alert(
        'התראת בדיקה',
        message,
        [{ text: 'אישור', style: 'default' }]
      );
      results.methods.push('In-App Alert');
      results.success = true;
    }

    console.log('Test notification results:', results);
    return results;
  }

  // שליחת התראה חכמה - בוחרת את השיטה הטובה ביותר
  async sendSmartNotification(
    title: string, 
    body: string, 
    data?: any
  ): Promise<boolean> {
    if (!this.capability) {
      await this.initialize();
    }

    switch (this.capability!.preferredMethod) {
      case NotificationMethod.PUSH:
        try {
          const response = await notificationsApi.sendTestNotification(body);
          if (response.success) return true;
          // Fallback to local
          await notificationService.sendImmediateLocalNotification(title, body, data);
          return true;
        } catch (error) {
          console.error('Smart notification push failed:', error);
          return this.sendLocalNotification(title, body, data);
        }

      case NotificationMethod.LOCAL:
        return this.sendLocalNotification(title, body, data);

      default:
        // Fallback: show alert
        Alert.alert(title, body);
        return true;
    }
  }

  private async sendLocalNotification(title: string, body: string, data?: any): Promise<boolean> {
    try {
      await notificationService.sendImmediateLocalNotification(title, body, data);
      return true;
    } catch (error) {
      console.error('Local notification failed:', error);
      // Final fallback: alert
      Alert.alert(title, body);
      return true;
    }
  }

  // קבלת מידע על יכולות המכשיר
  getCapability(): NotificationCapability | null {
    return this.capability;
  }

  // יצירת התראות דמה באמצעות השיטה הטובה ביותר
  async createSampleNotifications(): Promise<void> {
    const samples = [
      { title: 'אירוע חדש בגן', body: 'מפגש כלבים קטנים מחר ב-10:00' },
      { title: 'חבר חדש', body: 'דני כהן רוצה להתחבר איתך' },
      { title: 'הישג חדש! 🏆', body: 'השגת רמה 3! קיבלת 50 נקודות בונוס' }
    ];

    for (const sample of samples) {
      await this.sendSmartNotification(sample.title, sample.body, { 
        type: 'sample', 
        method: this.capability?.preferredMethod 
      });
      // המתן קצת בין התראות
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // פונקציה לעיבוד התראות שמתקבלות מהשרת
  async processServerNotification(notification: any): Promise<void> {
    console.log('Processing server notification:', notification);
    
    try {
      // שלח כ-push notification מקומי במידה והמכשיר לא קיבל push notification אמיתי
      if (this.capability?.canReceiveLocal) {
        await this.sendLocalNotification(
          notification.title || 'התראה חדשה',
          notification.content || notification.body || '',
          {
            notificationId: notification._id,
            type: notification.type,
            ...notification.data
          }
        );
      }
    } catch (error) {
      console.error('Failed to process server notification:', error);
    }
  }

  // פונקציה שמתעדכנת כשמתקבלת התראה מהשרת דרך WebSocket או API
  async onServerNotificationReceived(notification: any): Promise<void> {
    console.log('Server notification received via WebSocket/API:', notification);
    
    // רק אם האפליקציה פעילה ברקע או בסימולטור
    const isAppInForeground = true; // TODO: check app state
    const isSimulator = !this.capability?.canReceivePush;
    
    if (isAppInForeground || isSimulator) {
      await this.processServerNotification(notification);
    }
  }
}

// יצירת instance יחיד
export const hybridNotificationService = new HybridNotificationService();
export default hybridNotificationService;