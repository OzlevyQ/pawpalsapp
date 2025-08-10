import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { useUserRealTimeData } from '../../hooks/useRealTimeData';
import { DevelopmentChecker } from '../../utils/developmentChecker';
import DogProfileModal from '../../components/DogProfileModal';
import { userApi } from '../../services/api';

const SettingsSwitch = memo(({ value, onValueChange, trackColor, thumbColor, ios_backgroundColor }) => {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={trackColor}
      thumbColor={thumbColor}
      ios_backgroundColor={ios_backgroundColor}
    />
  );
});

const SettingsRow = memo(({ icon, iconColor, iconBg, title, rightComponent, onPress, borderBottom = true, theme, isRTL }) => {
  const rowStyle = {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    ...(borderBottom && { borderBottomWidth: 1, borderBottomColor: theme.border.light })
  };

  const content = (
    <>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
        <View style={{ 
          width: 48, height: 48, backgroundColor: iconBg, 
          borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
          marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
        }}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{title}</Text>
      </View>
      {rightComponent}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={rowStyle} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={rowStyle}>
      {content}
    </View>
  );
});

// קומפוננטת Settings מבודדת עם אופטימיזציה מתקדמת
const SettingsSection = memo(({ isDark, notifications, onThemeToggle, onNotificationsToggle, onLanguagePress, theme, t, language, isRTL }) => {
  return (
    <View style={{ 
      backgroundColor: theme.background.card, borderRadius: 16, 
      shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, marginBottom: 24 
    }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border.light }}>
        <Text style={{ fontWeight: '600', color: theme.text.primary, fontSize: 18 }}>{t.settings}</Text>
      </View>
      
      <SettingsRow
        icon="moon"
        iconColor={theme.text.muted}
        iconBg={theme.background.surface}
        title={t.darkMode}
        theme={theme}
        isRTL={isRTL}
        rightComponent={
          <SettingsSwitch
            value={isDark}
            onValueChange={onThemeToggle}
            trackColor={{ false: theme.border.medium, true: theme.primary[500] }}
            thumbColor={isDark ? '#FFFFFF' : '#F9FAFB'}
            ios_backgroundColor={theme.border.medium}
          />
        }
      />
      
      <SettingsRow
        icon="notifications"
        iconColor="#3B82F6"
        iconBg="#dbeafe"
        title={t.notifications}
        theme={theme}
        isRTL={isRTL}
        rightComponent={
          <SettingsSwitch
            value={notifications}
            onValueChange={onNotificationsToggle}
            trackColor={{ false: theme.border.medium, true: theme.primary[500] }}
            thumbColor={notifications ? '#FFFFFF' : '#F9FAFB'}
            ios_backgroundColor={theme.border.medium}
          />
        }
      />
      
      <SettingsRow
        icon="language"
        iconColor="#8B5CF6"
        iconBg="#f3e8ff"
        title={t.language}
        theme={theme}
        onPress={onLanguagePress}
        isRTL={isRTL}
        rightComponent={
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <Text style={{ 
              color: theme.text.muted, fontSize: 14, 
              marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 
            }}>
              {language === 'he' ? t.hebrew : t.english}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
          </View>
        }
      />
      
      <SettingsRow
        icon="help-circle"
        iconColor={theme.primary[600]}
        iconBg={theme.primary[100]}
        title={t.helpAndSupport}
        theme={theme}
        borderBottom={false}
        isRTL={isRTL}
        rightComponent={<Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />}
      />
    </View>
  );
});

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [selectedDog, setSelectedDog] = useState(null);
  const [showDogProfile, setShowDogProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const router = useRouter();
  const { isDark, theme, toggleTheme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { 
    user, 
    isLoggedIn, 
    isGuest, 
    loading, 
    refreshing, 
    updating,
    refreshUserData, 
    logout,
    badges,
    dogs,
    stats 
  } = useUser();
  
  // Real-time data connection for live updates
  const { 
    isConnected: isRealTimeConnected, 
    connectionState, 
    lastUpdate 
  } = useUserRealTimeData();
  

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const notificationPref = await SecureStore.getItemAsync('notificationsEnabled');
      if (notificationPref !== null) {
        setNotifications(notificationPref === 'true');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      isRTL ? 'התנתק' : 'Logout',
      isRTL ? 'האם אתה בטוח שברצונך להתנתק?' : 'Are you sure you want to logout?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: isRTL ? 'התנתק' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/welcome');
            } catch (error) {
              console.error('Error logging out:', error);
              // Even if logout fails, redirect to welcome
              router.replace('/(auth)/welcome');
            }
          }
        }
      ]
    );
  };

  const handleLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    setNotifications(value);
    try {
      await SecureStore.setItemAsync('notificationsEnabled', value.toString());
      // TODO: Update user preferences on backend
      // await updatePreferences({ notifications: { push: value } });
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  }, []);

  const handleLanguagePress = useCallback(() => {
    router.push('/language-selection');
  }, [router]);

  const pickProfileImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'נדרשת הרשאה' : 'Permission Required',
          isRTL ? 'אנחנו צריכים הרשאה לגשת לגלריית התמונות שלך' : 'We need permission to access your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בבחירת התמונה' : 'Error picking image'
      );
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      const response = await userApi.uploadProfileImage(imageUri);
      if (response.success && response.data) {
        // Update user state directly with new data
        await refreshUserData();
        Alert.alert(
          isRTL ? 'הצלחה!' : 'Success!',
          isRTL ? 'תמונת הפרופיל עודכנה בהצלחה' : 'Profile image updated successfully'
        );
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בהעלאת התמונה. אנא נסה שוב.' : 'Error uploading image. Please try again.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const GuestView = () => (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ 
            width: 96, height: 96, backgroundColor: 'rgba(255, 255, 255, 0.3)', 
            borderRadius: 48, justifyContent: 'center', alignItems: 'center', 
            marginBottom: 24, shadowColor: theme.shadow.dark, shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 
          }}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            {t.welcome} 👋
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', fontSize: 16 }}>
            {isRTL ? 'הירשם כדי לשמור את ההתקדמות שלך' : 'Sign up to save your progress'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {/* Login Prompt */}
        <View style={{ width: '100%', maxWidth: 384, paddingHorizontal: 24, paddingVertical: 32 }}>
          <View style={{ 
            backgroundColor: theme.background.card, borderRadius: 24, padding: 24, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, marginBottom: 24 
          }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ 
                width: 64, height: 64, backgroundColor: theme.primary[100], 
                borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 
              }}>
                <Ionicons name="sparkles" size={28} color={theme.primary[500]} />
              </View>
              <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                {t.joinPawPalsCommunity}
              </Text>
            </View>
            <Text style={{ color: theme.text.secondary, marginBottom: 24, lineHeight: 24, textAlign: isRTL ? 'right' : 'left', fontSize: 14 }}>
              {isRTL ? (
                '• צבור נקודות והשג תגים מיוחדים\n• התחבר עם בעלי כלבים בסביבה\n• הירשם לאירועים מרתקים\n• שמור את הגנים המועדפים עליך'
              ) : (
                '• Earn points and get special badges\n• Connect with dog owners nearby\n• Sign up for exciting events\n• Save your favorite parks'
              )}
            </Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                onPress={handleLogin}
                style={{ borderRadius: 16, overflow: 'hidden', shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
              >
                <LinearGradient
                  colors={[theme.primary[500], theme.primary[600]]}
                  style={{ paddingVertical: 16 }}
                >
                  <Text style={{ color: theme.text.inverse, fontWeight: 'bold', textAlign: 'center', fontSize: 18 }}>
                    {t.loginToAccount}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/register')}
                style={{ backgroundColor: theme.background.surface, borderRadius: 16, paddingVertical: 16 }}
              >
                <Text style={{ color: theme.text.secondary, fontWeight: '600', textAlign: 'center' }}>
                  {t.createNewAccount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings */}
          <SettingsSection
            isDark={isDark}
            notifications={notifications}
            onThemeToggle={toggleTheme}
            onNotificationsToggle={handleNotificationsToggle}
            onLanguagePress={handleLanguagePress}
            theme={theme}
            t={t}
            language={language}
            isRTL={isRTL}
          />
        </View>
      </ScrollView>
    </View>
  );

  const UserView = () => (
    <View style={{ flex: 1 }}>
      {/* Fixed Header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <LinearGradient
          colors={[theme.primary[500], theme.primary[600]]}
          style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.text.inverse, fontSize: 20, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t.profile}</Text>
              {/* Real-time connection indicator */}
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isRealTimeConnected ? '#10B981' : '#EF4444',
                marginLeft: isRTL ? 0 : 12,
                marginRight: isRTL ? 12 : 0,
                opacity: connectionState === 'connecting' ? 0.6 : 1.0
              }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="settings-outline" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={{ width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="log-out-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={{ flex: 1, backgroundColor: theme.background.secondary }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 120, alignItems: 'center', paddingHorizontal: 20 }}
      >
        {/* User Profile Card */}
        <View style={{ width: '100%', maxWidth: 448, marginBottom: 24 }}>
          <View style={{ 
            backgroundColor: theme.background.card, borderRadius: 24, padding: 24, 
            shadowColor: theme.shadow.dark, shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 
          }}>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={pickProfileImage}
                disabled={uploadingImage}
                style={{ 
                  width: 96, height: 96, backgroundColor: theme.primary[100], 
                  borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 16, 
                  shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
                  shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 
                }}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="large" color={theme.primary[500]} />
                ) : (user?.profileImage || user?.image) ? (
                  <Image
                    source={{ uri: user.profileImage || user.image }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32 }}>🐕</Text>
                    <Text style={{ fontSize: 10, color: theme.text.muted, marginTop: 4, textAlign: 'center' }}>
                      {isRTL ? 'לחץ להוספת תמונה' : 'Tap to add photo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={{ color: theme.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={{ color: theme.text.muted, fontSize: 14, textAlign: 'center' }}>
                {user?.email}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Stats */}
        <View style={{ flexDirection: 'row', width: '100%', maxWidth: 448, marginBottom: 24, gap: 8 }}>
          <View style={{ 
            flex: 1, backgroundColor: theme.background.card, borderRadius: 16, padding: 16, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, alignItems: 'center' 
          }}>
            <View style={{ 
              width: 40, height: 40, backgroundColor: theme.primary[100], 
              borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 
            }}>
              <Ionicons name="diamond" size={18} color={theme.primary[600]} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary[500] }}>
              {user?.points || 0}
            </Text>
            <Text style={{ color: theme.text.muted, fontSize: 12 }}>{t.points}</Text>
          </View>
          <View style={{ 
            flex: 1, backgroundColor: theme.background.card, borderRadius: 16, padding: 16, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, alignItems: 'center' 
          }}>
            <View style={{ 
              width: 40, height: 40, backgroundColor: theme.secondary[100], 
              borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 
            }}>
              <Ionicons name="star" size={18} color={theme.secondary[600]} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.secondary[500] }}>
              {user?.level || 1}
            </Text>
            <Text style={{ color: theme.text.muted, fontSize: 12 }}>{t.level}</Text>
          </View>
          <View style={{ 
            flex: 1, backgroundColor: theme.background.card, borderRadius: 16, padding: 16, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, alignItems: 'center' 
          }}>
            <View style={{ 
              width: 40, height: 40, backgroundColor: '#fed7aa', 
              borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 
            }}>
              <Ionicons name="flame" size={18} color="#F97316" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#F97316' }}>
              {user?.currentStreak || 0}
            </Text>
            <Text style={{ color: theme.text.muted, fontSize: 12 }}>{t.streak}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={{ width: '100%', maxWidth: 448, gap: 16 }}>
          
          {/* Dogs Section */}
          <View style={{ 
            backgroundColor: theme.background.card, borderRadius: 16, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 
          }}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border.light }}>
              <Text style={{ fontWeight: '600', color: theme.text.primary, fontSize: 18 }}>{t.myDogs}</Text>
            </View>
            
            {/* Display user's dogs */}
            {dogs && dogs.length > 0 ? (
              dogs.map((dog, index) => (
                <TouchableOpacity 
                  key={dog._id || `dog-${index}`}
                  onPress={() => {
                    setSelectedDog(dog);
                    setShowDogProfile(true);
                  }}
                  style={{ 
                    flexDirection: isRTL ? 'row-reverse' : 'row', 
                    alignItems: 'center', 
                    paddingHorizontal: 24, 
                    paddingVertical: 20,
                    borderBottomWidth: index === dogs.length - 1 ? 0 : 1,
                    borderBottomColor: theme.border.light
                  }}
                >
                  <View style={{ 
                    width: 48, height: 48, backgroundColor: theme.secondary[100], 
                    borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                    marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                    overflow: 'hidden'
                  }}>
                    {dog.image ? (
                      <Image
                        source={{ uri: dog.image }}
                        style={{ width: 48, height: 48 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 24 }}>🐕</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{dog.name}</Text>
                    <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>
                      {dog.breed} • {dog.age} {isRTL ? 'שנים' : 'years old'}
                    </Text>
                  </View>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: theme.text.muted, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
                  {isRTL ? 'עדיין לא הוספת כלבים' : 'No dogs added yet'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              onPress={() => router.push('/add-dog')}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 }}
            >
              <View style={{ 
                width: 48, height: 48, backgroundColor: theme.primary[100], 
                borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
              }}>
                <Ionicons name="add" size={20} color={theme.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{t.addNewDog}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>{t.addYourFaithfulFriend}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Test Notifications Section (Development Only) */}
          {__DEV__ && (
            <View style={{ 
              backgroundColor: theme.background.card, borderRadius: 16, 
              shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, marginBottom: 16
            }}>
              <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border.light }}>
                <Text style={{ fontWeight: '600', color: theme.text.primary, fontSize: 18 }}>
                  🧪 {isRTL ? 'בדיקת התראות' : 'Test Notifications'}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    const { testMessageNotification } = await import('../../services/testNotificationAPI');
                    await testMessageNotification();
                    Alert.alert('✅', isRTL ? 'התראת הודעה נשלחה!' : 'Message notification sent!');
                  } catch (error) {
                    console.error('Message notification test error:', error);
                    Alert.alert('❌', isRTL ? 'שגיאה בשליחת התראת הודעה' : 'Error sending message notification');
                  }
                }}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row', 
                  alignItems: 'center', 
                  paddingHorizontal: 24, 
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border.light
                }}
              >
                <View style={{ 
                  width: 48, height: 48, backgroundColor: theme.primary[100], 
                  borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
                }}>
                  <Ionicons name="notifications" size={20} color={theme.primary[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>
                    {isRTL ? 'שלח התראת הודעה' : 'Send Message Notification'}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>
                    {isRTL ? 'בדיקת ניווט לצאט' : 'Test chat navigation'}
                  </Text>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={async () => {
                  try {
                    const { testAllBasicNotifications } = await import('../../services/testNotificationAPI');
                    await testAllBasicNotifications();
                    Alert.alert('✅', isRTL ? 'כל ההתראות נשלחו!' : 'All notifications sent!');
                  } catch (error) {
                    console.error('Comprehensive test error:', error);
                    Alert.alert('❌', isRTL ? 'שגיאה בשליחת התראות' : 'Error sending notifications');
                  }
                }}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row', 
                  alignItems: 'center', 
                  paddingHorizontal: 24, 
                  paddingVertical: 20
                }}
              >
                <View style={{ 
                  width: 48, height: 48, backgroundColor: '#FEF3C7', 
                  borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                  marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
                }}>
                  <Ionicons name="rocket" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>
                    {isRTL ? 'בדוק את כל הסוגים' : 'Test All Types'}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>
                    {isRTL ? 'שלח 4 סוגי התראות' : 'Send 4 notification types'}
                  </Text>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Activity Section */}
          <View style={{ 
            backgroundColor: theme.background.card, borderRadius: 16, 
            shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 
          }}>
            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border.light }}>
              <Text style={{ fontWeight: '600', color: theme.text.primary, fontSize: 18 }}>{t.activity}</Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => router.push('/badges')}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: theme.border.light }}
            >
              <View style={{ 
                width: 48, height: 48, backgroundColor: '#fef3c7', 
                borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
              }}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{t.myBadges}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>{t.badgesEarned}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => router.push('/statistics')}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: theme.border.light }}
            >
              <View style={{ 
                width: 48, height: 48, backgroundColor: '#dbeafe', 
                borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
              }}>
                <Ionicons name="bar-chart" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{t.myStatistics}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>{t.viewYourData}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => router.push('/activity')}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 }}
            >
              <View style={{ 
                width: 48, height: 48, backgroundColor: '#f3e8ff', 
                borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
              }}>
                <Ionicons name="book" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text.primary, fontWeight: '600', fontSize: 16 }}>{t.visitLog}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 14, marginTop: 4 }}>{t.visitHistory}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Settings Section */}
          <SettingsSection
            isDark={isDark}
            notifications={notifications}
            onThemeToggle={toggleTheme}
            onNotificationsToggle={handleNotificationsToggle}
            onLanguagePress={handleLanguagePress}
            theme={theme}
            t={t}
            language={language}
            isRTL={isRTL}
          />
        </View>
      </ScrollView>
    </View>
  );

  // Show loading state while initializing user data
  if (loading && !user && !isGuest) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.background.secondary,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.primary[500]} />
        <Text style={{ 
          color: theme.text.primary, 
          marginTop: 16, 
          fontSize: 16,
          textAlign: 'center'
        }}>
          {t.loading}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {isGuest ? <GuestView /> : <UserView />}
      <DevelopmentChecker screenName="Profile" />
      
      {/* Dog Profile Modal */}
      <DogProfileModal
        visible={showDogProfile}
        onClose={() => {
          setShowDogProfile(false);
          setSelectedDog(null);
        }}
        dog={selectedDog}
        loading={false}
        isOwner={true} // All dogs in profile are owned by the user
        onEdit={(dog) => {
          // Close modal first, then navigate
          setShowDogProfile(false);
          setSelectedDog(null);
          setTimeout(() => {
            router.push({
              pathname: '/edit-dog',
              params: { dogId: dog._id }
            });
          }, 100);
        }}
      />
    </View>
  );
}