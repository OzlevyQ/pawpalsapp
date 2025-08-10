import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useNotificationContext } from '../contexts/NotificationContext';
import { notificationsApi } from '../services/api';
import { hybridNotificationService } from '../services/hybridNotificationService';

interface BackendNotification {
  _id: string;
  type: string;
  title: string;
  content: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface DisplayNotification {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'social' | 'system' | 'achievement';
  timestamp: string;
  isRead: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullMessage?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { updateUnreadCount, decreaseUnreadCount } = useNotificationContext();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Convert backend notifications to display format
  const convertNotification = (backendNotification: BackendNotification): DisplayNotification => {
    const getDisplayType = (backendType: string): 'event' | 'social' | 'system' | 'achievement' => {
      switch (backendType) {
        case 'event_reminder':
        case 'event_registration':
        case 'event_status_update':
        case 'event_cancelled':
          return 'event';
        case 'friend_request':
        case 'friend_request_accepted':
        case 'friend_request_declined':
        case 'new_message':
          return 'social';
        case 'visit_reminder':
        case 'garden_update':
        case 'system':
        case 'newsletter_subscription':
        case 'newsletter_content':
        case 'permission_request':
          return 'system';
        default:
          return 'system';
      }
    };

    const getIcon = (backendType: string): keyof typeof Ionicons.glyphMap => {
      switch (backendType) {
        case 'event_reminder':
        case 'event_registration':
        case 'event_status_update':
        case 'event_cancelled':
          return 'calendar';
        case 'friend_request':
        case 'friend_request_accepted':
        case 'friend_request_declined':
          return 'person-add';
        case 'new_message':
          return 'chatbubble';
        case 'visit_reminder':
          return 'location';
        case 'garden_update':
          return 'leaf';
        case 'newsletter_subscription':
        case 'newsletter_content':
          return 'mail';
        case 'permission_request':
          return 'key';
        case 'check_in_alert':
          return 'log-in';
        default:
          return 'notifications';
      }
    };

    const getRelativeTime = (dateString: string): string => {
      const now = new Date();
      const notificationDate = new Date(dateString);
      const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'עכשיו';
      if (diffInMinutes < 60) return `${diffInMinutes} דקות`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} שעות`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} ימים`;
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks} שבועות`;
    };

    return {
      id: backendNotification._id,
      title: backendNotification.title,
      message: backendNotification.content,
      fullMessage: backendNotification.content, // Use content as full message
      type: getDisplayType(backendNotification.type),
      timestamp: getRelativeTime(backendNotification.createdAt),
      isRead: backendNotification.isRead,
      icon: getIcon(backendNotification.type),
    };
  };

  // Load notifications from backend
  const loadNotifications = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await notificationsApi.getNotifications({ limit: 50 });
      
      if (response.success && response.data) {
        const backendNotifications = response.data.notifications || [];
        const convertedNotifications = backendNotifications.map(convertNotification);
        setNotifications(convertedNotifications);
        const newUnreadCount = response.data.unreadCount || 0;
        setUnreadCount(newUnreadCount);
        updateUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון התראות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        updateUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('שגיאה', 'לא ניתן לסמן הכל כנקרא');
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await notificationsApi.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        decreaseUnreadCount(1);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    try {
      Alert.alert(
        'מחיקת כל ההתראות',
        'האם אתה בטוח שברצונך למחוק את כל ההתראות? פעולה זו לא ניתנת לביטול.',
        [
          {
            text: 'ביטול',
            style: 'cancel'
          },
          {
            text: 'מחק הכל',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await notificationsApi.deleteAllNotifications();
                if (response.success) {
                  setNotifications([]);
                  setUnreadCount(0);
                  updateUnreadCount(0);
                  Alert.alert('הצלחה', 'כל ההתראות נמחקו');
                }
              } catch (error) {
                console.error('Error deleting all notifications:', error);
                Alert.alert('שגיאה', 'לא ניתן למחוק את כל ההתראות');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in delete all dialog:', error);
    }
  };

  // Load notifications and initialize hybrid system on mount
  useEffect(() => {
    loadNotifications();
    
    // Initialize hybrid notification system
    hybridNotificationService.initialize().then(capability => {
      console.log('Notification capability detected:', capability);
    });
  }, []);

  // Handle refresh
  const onRefresh = () => {
    loadNotifications(true);
  };

  // Test push notification - now using hybrid system
  const testPushNotification = async () => {
    try {
      const result = await hybridNotificationService.sendTestNotification('בדיקת התראה היברידית! 🚀');
      
      if (result.success) {
        const methodsText = result.methods.join(', ');
        Alert.alert(
          'הצלחה! ✅', 
          `ההתראה נשלחה דרך: ${methodsText}\n\n${result.methods.includes('Push Notification') ? 'אם האפליקציה ברקע/סגורה - תראה התראה על המסך!' : 'בסימולטור - רק התראות מקומיות עובדות.'}`,
          [{ text: 'מעולה!', style: 'default' }]
        );
      } else {
        Alert.alert(
          'שגיאות',
          `שגיאות שאירעו:\n${result.errors.join('\n')}`,
          [{ text: 'אישור', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Hybrid notification test failed:', error);
      Alert.alert('שגיאה', 'המערכת ההיברידית נכשלה לחלוטין');
    }
  };

  // Test server push notification
  const testServerPushNotification = async () => {
    try {
      const response = await notificationsApi.createTestNotification();
      if (response.success) {
        Alert.alert(
          'הצלחה! 🎯',
          `התראה נוצרה בשרת!\n\nפרטי Push:\n- נשלח: ${response.pushResult?.sent || 0}\n- כשל: ${response.pushResult?.failed || 0}\n- טוקנים: ${response.userTokensFound || 0}`,
          [{ text: 'מעולה!', style: 'default' }]
        );
        
        // Reload notifications to see the new one
        await loadNotifications();
      } else {
        Alert.alert('שגיאה', response.error || 'שגיאה ביצירת התראת השרת');
      }
    } catch (error) {
      console.error('Server notification test failed:', error);
      Alert.alert('שגיאה', 'שגיאה בחיבור לשרת');
    }
  };

  // Check push token status
  const checkPushTokenStatus = async () => {
    try {
      const response = await notificationsApi.checkPushStatus();
      console.log('Push status response:', response);
      
      if (response.success && response.data?.status) {
        const status = response.data.status;
        Alert.alert(
          'מצב Push Tokens 📊',
          `טוקנים פעילים: ${status.activeTokensCount}\n` +
          `יכול לקבל Push: ${status.canReceivePush ? '✅' : '❌'}\n` +
          `טוקן סימולטור: ${status.hasSimulatorTokens ? '✅' : '❌'}\n\n` +
          `פרטי טוקנים פעילים:\n${status.activeTokens?.map(token => 
            `• ${token.platform} (${token.isSimulator ? 'סימולטור' : 'אמיתי'})`
          ).join('\n') || 'אין טוקנים'}`,
          [{ text: 'הבנתי', style: 'default' }]
        );
      } else if (response.success && response.status) {
        // Handle direct status response format
        const status = response.status;
        Alert.alert(
          'מצב Push Tokens 📊',
          `טוקנים פעילים: ${status.activeTokensCount}\n` +
          `יכול לקבל Push: ${status.canReceivePush ? '✅' : '❌'}\n` +
          `טוקן סימולטור: ${status.hasSimulatorTokens ? '✅' : '❌'}\n\n` +
          `פרטי טוקנים פעילים:\n${status.activeTokens?.map(token => 
            `• ${token.platform} (${token.isSimulator ? 'סימולטור' : 'אמיתי'})`
          ).join('\n') || 'אין טוקנים'}`,
          [{ text: 'הבנתי', style: 'default' }]
        );
      } else {
        Alert.alert('שגיאה', response.error || 'תגובה לא צפויה מהשרת');
      }
    } catch (error) {
      console.error('Push status check failed:', error);
      Alert.alert('שגיאה', `לא ניתן לבדוק מצב Push Tokens: ${error.message}`);
    }
  };

  // Use real notifications from backend
  const displayNotifications = notifications;
  const displayUnreadCount = unreadCount;

  const getNotificationColor = (type: DisplayNotification['type']) => {
    switch (type) {
      case 'event': return '#10b981';
      case 'social': return '#3b82f6';
      case 'achievement': return '#f59e0b';
      case 'system': return '#6b7280';
      default: return '#10b981';
    }
  };

  const getNotificationIcon = (notification: DisplayNotification) => {
    return notification.icon || 'notifications';
  };

  const FilterTab = ({ title, filter, isActive }: {
    title: string;
    filter: string;
    isActive: boolean;
  }) => (
    <TouchableOpacity 
      onPress={() => setActiveFilter(filter)}
      className={`px-4 py-2 rounded-full mr-3 ${
        isActive 
          ? 'bg-primary-500 shadow-primary-500/20' 
          : 'bg-gray-100'
      }`}
    >
      <Text className={`font-semibold ${
        isActive ? 'text-white' : 'text-gray-600'
      }`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderNotificationCard = (notification: DisplayNotification) => (
    <TouchableOpacity 
      key={notification.id}
      className={`bg-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100 ${
        !notification.isRead ? 'border-l-4 border-l-primary-500' : ''
      }`}
    >
      <View className="flex-row items-start">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
        >
          <Ionicons 
            name={getNotificationIcon(notification)} 
            size={20} 
            color={getNotificationColor(notification.type)} 
          />
        </View>
        
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-gray-800 font-bold text-lg flex-1">
              {notification.title}
            </Text>
            {!notification.isRead && (
              <View className="w-3 h-3 bg-primary-500 rounded-full ml-2 mt-1" />
            )}
          </View>
          
          <Text className="text-gray-600 text-base leading-6 mb-3">
            {notification.fullMessage || notification.message}
          </Text>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-500 text-sm">
              לפני {notification.timestamp}
            </Text>
            
            <View className="flex-row space-x-2 space-x-reverse">
              {!notification.isRead && (
                <TouchableOpacity 
                  className="bg-primary-100 rounded-lg px-3 py-1"
                  onPress={() => markAsRead(notification.id)}
                >
                  <Text className="text-primary-700 font-semibold text-xs">
                    סמן כנקרא
                  </Text>
                </TouchableOpacity>
              )}
              
              {notification.type === 'event' && (
                <TouchableOpacity className="bg-secondary-100 rounded-lg px-3 py-1">
                  <Text className="text-secondary-700 font-semibold text-xs">
                    צפה באירוע
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredNotifications = displayNotifications.filter(notification => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !notification.isRead;
    return notification.type === activeFilter;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Fixed Header */}
      <View className="absolute top-0 left-0 right-0 z-10">
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 py-8 pt-16"
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="bg-white/20 rounded-full p-2 mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold mb-1">
                התראות
              </Text>
              <Text className="text-primary-100 opacity-90">
                {displayUnreadCount} הודעות חדשות
              </Text>
            </View>
            
            <View className="flex-row gap-2">
              <TouchableOpacity 
                className="bg-white/20 rounded-full p-2"
                onPress={testPushNotification}
              >
                <Ionicons name="rocket" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white/20 rounded-full p-2"
                onPress={testServerPushNotification}
              >
                <Ionicons name="server" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white/20 rounded-full p-2"
                onPress={checkPushTokenStatus}
              >
                <Ionicons name="information-circle" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white/20 rounded-full p-2"
                onPress={async () => {
                  try {
                    await notificationsApi.createSamples();
                    await loadNotifications(); // Wait for reload to complete
                    Alert.alert('הצלחה!', 'נוצרו התראות דמה');
                  } catch (error) {
                    Alert.alert('שגיאה', 'לא ניתן ליצור התראות דמה');
                  }
                }}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 140, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {/* Stats Card */}
        <View className="mx-6 mb-6">
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-primary-500">
                  {displayUnreadCount}
                </Text>
                <Text className="text-gray-600 text-sm font-medium">
                  לא נקראו
                </Text>
              </View>
              
              <View className="w-px bg-gray-200 mx-4 h-8" />
              
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-secondary-500">
                  {displayNotifications.length}
                </Text>
                <Text className="text-gray-600 text-sm font-medium">
                  סה"כ השבוע
                </Text>
              </View>
              
              <View className="w-px bg-gray-200 mx-4 h-8" />
              
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-yellow-500">
                  {displayNotifications.filter(n => n.type === 'achievement').length}
                </Text>
                <Text className="text-gray-600 text-sm font-medium">
                  הישגים
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 mb-6">
          <View className="flex-row space-x-3 space-x-reverse">
            <TouchableOpacity 
              onPress={() => markAllAsRead()}
              className="flex-1 bg-primary-500 rounded-xl py-3 shadow-lg shadow-primary-500/20"
            >
              <View className="flex-row justify-center items-center">
                <Ionicons name="checkmark-done" size={18} color="white" style={{ marginLeft: 6 }} />
                <Text className="text-white font-bold">סמן הכל כנקרא</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-gray-100 border border-gray-200 rounded-xl py-3"
              onPress={deleteAllNotifications}
            >
              <View className="flex-row justify-center items-center">
                <Ionicons name="trash" size={18} color="#6b7280" style={{ marginLeft: 6 }} />
                <Text className="text-gray-600 font-bold">מחק הכל</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-3">סנן התראות</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
          >
            <FilterTab title="הכל" filter="all" isActive={activeFilter === 'all'} />
            <FilterTab title="לא נקראו" filter="unread" isActive={activeFilter === 'unread'} />
            <FilterTab title="אירועים" filter="event" isActive={activeFilter === 'event'} />
            <FilterTab title="חברתי" filter="social" isActive={activeFilter === 'social'} />
            <FilterTab title="הישגים" filter="achievement" isActive={activeFilter === 'achievement'} />
            <FilterTab title="מערכת" filter="system" isActive={activeFilter === 'system'} />
          </ScrollView>
        </View>

        {/* Notifications List */}
        <View className="px-6">
          {loading ? (
            <View className="bg-white rounded-xl p-16 items-center shadow-sm border border-gray-100">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-gray-500 text-lg font-semibold mt-4">
                טוען התראות...
              </Text>
            </View>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => renderNotificationCard(notification))
          ) : (
            <View className="bg-white rounded-xl p-16 items-center shadow-sm border border-gray-100">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="notifications-off" size={48} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-lg font-semibold mb-2">
                אין התראות
              </Text>
              <Text className="text-gray-400 text-center">
                לא נמצאו התראות עבור הסינון הנבחר
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}