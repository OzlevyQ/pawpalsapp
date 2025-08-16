import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationPermissionModalProps {
  isVisible: boolean;
  onAllow: () => void;
  onNotNow: () => void;
  onNeverAsk: () => void;
  onClose?: () => void;
}

export default function NotificationPermissionModal({
  isVisible,
  onAllow,
  onNotNow,
  onNeverAsk,
  onClose,
}: NotificationPermissionModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const getPermissionFeatures = () => [
    {
      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
      title: isRTL ? 'התראות מיידיות' : 'Instant Updates',
      description: isRTL 
        ? 'קבל התראות על אירועים חדשים ופעילויות בפארק' 
        : 'Get notified about new events and park activities',
    },
    {
      icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
      title: isRTL ? 'חיבורים חברתיים' : 'Social Connections',
      description: isRTL 
        ? 'דע כשחברים חדשים רוצים להתחבר איתך' 
        : 'Know when new friends want to connect with you',
    },
    {
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      title: isRTL ? 'תזכורות חכמות' : 'Smart Reminders',
      description: isRTL 
        ? 'תזכורות לבדיקות וטרינר ותחזוקת הכלב' 
        : 'Reminders for vet checkups and dog care',
    },
    {
      icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      title: isRTL ? 'הישגים ותגמולים' : 'Achievements & Rewards',
      description: isRTL 
        ? 'קבל עדכונים על הישגים חדשים ונקודות בונוס' 
        : 'Get updates about new achievements and bonus points',
    },
  ];

  const handleAllow = () => {
    onAllow();
  };

  const handleNotNow = () => {
    onNotNow();
  };

  const handleNeverAsk = () => {
    onNeverAsk();
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          opacity: fadeAnim,
        }}
      >
        <TouchableWithoutFeedback>
          <Animated.View
            style={{
              backgroundColor: theme.background.card,
              borderRadius: 24,
              maxWidth: SCREEN_WIDTH - 40,
              width: '100%',
              height: SCREEN_HEIGHT * 0.85,
              transform: [{ scale: scaleAnim }],
              overflow: 'hidden',
            }}
          >
            {/* Close button */}
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: isRTL ? undefined : 16,
                  left: isRTL ? 16 : undefined,
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            )}

            {/* Header with gradient - Fixed */}
            <LinearGradient
              colors={[theme.primary[500], theme.primary[600]]}
              style={{
                paddingHorizontal: 24,
                paddingTop: 32,
                paddingBottom: 24,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="notifications" size={40} color="white" />
              </View>
            
            <Text
              style={{
                color: 'white',
                fontSize: 24,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {isRTL ? 'הפעל התראות' : 'Enable Notifications'}
            </Text>
            
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {isRTL 
                ? 'קבל את החוויה המלאה של PawPals עם התראות מותאמות אישית'
                : 'Get the full PawPals experience with personalized notifications'
              }
            </Text>
          </LinearGradient>

          {/* Scrollable white content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Features list */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
              <Text
                style={{
                  color: theme.text.primary,
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 20,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {isRTL ? 'מה תקבל:' : "Here's what you'll get:"}
              </Text>

              {getPermissionFeatures().map((feature, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.primary[50],
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0,
                    }}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={20}
                      color={theme.primary[500]}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.text.primary,
                        fontSize: 16,
                        fontWeight: '600',
                        marginBottom: 4,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={{
                        color: theme.text.secondary,
                        fontSize: 14,
                        lineHeight: 20,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Privacy note */}
              <View
                style={{
                  backgroundColor: theme.background.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 24,
                }}
              >
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={theme.primary[500]}
                    style={{
                      marginRight: isRTL ? 0 : 8,
                      marginLeft: isRTL ? 8 : 0,
                      marginTop: 2,
                    }}
                  />
                  <Text
                    style={{
                      color: theme.text.secondary,
                      fontSize: 13,
                      lineHeight: 18,
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {isRTL
                      ? 'נשמור על פרטיותך. תוכל לשנות הגדרות אלו בכל עת בהגדרות האפליקציה.'
                      : "We'll respect your privacy. You can change these settings anytime in the app settings."
                    }
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={{ gap: 12 }}>
                {/* Primary button - Allow */}
                <TouchableOpacity
                  onPress={handleAllow}
                  style={{
                    backgroundColor: theme.primary[500],
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    shadowColor: theme.primary[500],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="white"
                      style={{
                        marginRight: isRTL ? 0 : 8,
                        marginLeft: isRTL ? 8 : 0,
                      }}
                    />
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 18,
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {isRTL ? 'אפשר התראות' : 'Allow Notifications'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Secondary button - Not Now */}
                <TouchableOpacity
                  onPress={handleNotNow}
                  style={{
                    backgroundColor: theme.background.surface,
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderWidth: 1,
                    borderColor: theme.border.medium,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text.secondary,
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    {isRTL ? 'לא עכשיו' : 'Not Now'}
                  </Text>
                </TouchableOpacity>

                {/* Tertiary button - Never ask */}
                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    onPress={handleNeverAsk}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text.muted,
                        fontSize: 14,
                        textAlign: 'center',
                      }}
                    >
                      {isRTL ? 'אל תשאל שוב' : "Don't ask again"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}