import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'social' | 'system' | 'achievement';
  timestamp: string;
  isRead: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface NotificationModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function NotificationModal({ isVisible, onClose }: NotificationModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: t.newEvent,
      message: isRTL ? 'מפגש כלבים קטנים מחר ב-10:00 בגן כלבים מרכז' : 'Small dogs meetup tomorrow at 10:00 in Central Dog Park',
      type: 'event',
      timestamp: '5',
      isRead: false,
      icon: 'calendar'
    },
    {
      id: '2',
      title: t.newFriend,
      message: isRTL ? 'דני כהן רוצה להתחבר איתך' : 'Danny Cohen wants to connect with you',
      type: 'social',
      timestamp: '30',
      isRead: false,
      icon: 'person-add'
    },
    {
      id: '3',
      title: t.newAchievement,
      message: isRTL ? 'השגת רמה 3! קיבלת 50 נקודות בונוס' : 'You reached level 3! Got 50 bonus points',
      type: 'achievement',
      timestamp: '2',
      isRead: true,
      icon: 'trophy'
    },
    {
      id: '4',
      title: t.reminder,
      message: isRTL ? 'זכור לקבוע תור לבדיקה שנתית של מקס' : 'Remember to schedule Max\'s annual checkup',
      type: 'system',
      timestamp: '1',
      isRead: true,
      icon: 'medical'
    }
  ];

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'event': return theme.primary[500];
      case 'social': return theme.secondary[500];
      case 'achievement': return '#f59e0b';
      case 'system': return theme.text.muted;
      default: return theme.primary[500];
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    return notification.icon || 'notifications';
  };

  const handleViewAllNotifications = () => {
    onClose();
    router.push('/notifications');
  };

  const renderNotificationItem = (notification: Notification) => (
    <TouchableOpacity 
      key={notification.id}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.light,
        backgroundColor: !notification.isRead ? theme.primary[50] : 'transparent'
      }}
    >
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'flex-start'
      }}>
        <View 
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
            backgroundColor: `${getNotificationColor(notification.type)}20`
          }}
        >
          <Ionicons 
            name={getNotificationIcon(notification)} 
            size={18} 
            color={getNotificationColor(notification)} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 4
          }}>
            <Text style={{
              color: theme.text.primary,
              fontWeight: '600',
              fontSize: 16,
              flex: 1,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {notification.title}
            </Text>
            {!notification.isRead && (
              <View style={{
                width: 8,
                height: 8,
                backgroundColor: theme.primary[500],
                borderRadius: 4,
                marginLeft: isRTL ? 0 : 8,
                marginRight: isRTL ? 8 : 0,
                marginTop: 4
              }} />
            )}
          </View>
          
          <Text style={{
            color: theme.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 8,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {notification.message}
          </Text>
          
          <Text style={{
            color: theme.text.muted,
            fontSize: 12,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {t.ago} {notification.timestamp} {isRTL ? 'דקות' : 'minutes'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }],
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.background.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '85%'
              }}
            >
              {/* Header */}
              <LinearGradient
                colors={[theme.primary[500], theme.primary[600]]}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 24,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24
                }}
              >
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <View style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center'
                  }}>
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 20,
                      padding: 8,
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0
                    }}>
                      <Ionicons name="notifications" size={24} color="white" />
                    </View>
                    <View>
                      <Text style={{
                        color: theme.text.inverse,
                        fontSize: 20,
                        fontWeight: 'bold',
                        textAlign: isRTL ? 'right' : 'left'
                      }}>
                        {t.notifications}
                      </Text>
                      <Text style={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: 14,
                        opacity: 0.9,
                        textAlign: isRTL ? 'right' : 'left'
                      }}>
                        {mockNotifications.filter(n => !n.isRead).length} {t.newMessages}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={onClose}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 20,
                      padding: 8
                    }}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Quick Actions */}
              <View style={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border.light
              }}>
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  gap: 12
                }}>
                  <TouchableOpacity style={{
                    flex: 1,
                    backgroundColor: theme.primary[50],
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center'
                  }}>
                    <Ionicons name="checkmark-done" size={20} color={theme.primary[500]} />
                    <Text style={{
                      color: theme.primary[700],
                      fontWeight: '600',
                      fontSize: 14,
                      marginTop: 4,
                      textAlign: 'center'
                    }}>
                      {t.markAllAsRead}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleViewAllNotifications}
                    style={{
                      flex: 1,
                      backgroundColor: theme.background.surface,
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center'
                    }}
                  >
                    <Ionicons name="list" size={20} color={theme.text.muted} />
                    <Text style={{
                      color: theme.text.secondary,
                      fontWeight: '600',
                      fontSize: 14,
                      marginTop: 4,
                      textAlign: 'center'
                    }}>
                      {t.viewAll}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications List */}
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                {mockNotifications.length > 0 ? (
                  mockNotifications.map(renderNotificationItem)
                ) : (
                  <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 64
                  }}>
                    <View style={{
                      backgroundColor: theme.background.surface,
                      borderRadius: 32,
                      padding: 24,
                      marginBottom: 16
                    }}>
                      <Ionicons name="notifications-off" size={48} color={theme.text.muted} />
                    </View>
                    <Text style={{
                      color: theme.text.secondary,
                      fontSize: 18,
                      fontWeight: '600',
                      marginBottom: 8,
                      textAlign: 'center'
                    }}>
                      {t.noNotifications}
                    </Text>
                    <Text style={{
                      color: theme.text.muted,
                      textAlign: 'center',
                      fontSize: 14
                    }}>
                      {t.allNotificationsWillAppearHere}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Action */}
              <View style={{
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: theme.border.light
              }}>
                <TouchableOpacity 
                  onPress={handleViewAllNotifications}
                  style={{
                    backgroundColor: theme.primary[500],
                    borderRadius: 12,
                    paddingVertical: 16,
                    shadowColor: theme.shadow.medium,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4
                  }}
                >
                  <View style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons 
                      name="open" 
                      size={20} 
                      color="white" 
                      style={{ 
                        marginLeft: isRTL ? 0 : 8,
                        marginRight: isRTL ? 8 : 0
                      }} 
                    />
                    <Text style={{
                      color: theme.text.inverse,
                      fontWeight: 'bold',
                      fontSize: 18,
                      textAlign: 'center'
                    }}>
                      {t.goToFullNotificationsPage}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}