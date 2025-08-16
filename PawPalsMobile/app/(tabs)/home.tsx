import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NotificationModal from '../../components/common/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { useUserRealTimeData } from '../../hooks/useRealTimeData';
import { useRouter } from 'expo-router';
import { missionsApi, type MissionProgress } from '../../services/api';

// Import debug utilities for development
if (__DEV__) {
  import('../../utils/gamificationDebug');
}

export default function HomeScreen() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [missions, setMissions] = useState<MissionProgress[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  
  // Animation values for gamification updates
  const pointsAnimValue = useRef(new Animated.Value(1)).current;
  const levelAnimValue = useRef(new Animated.Value(1)).current;
  const streakAnimValue = useRef(new Animated.Value(1)).current;
  
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user, isLoggedIn, isGuest, loading, refreshing, refreshUserData, stats } = useUser();
  const { isConnected: isRealTimeConnected, connectionState } = useUserRealTimeData();

  // Track previous values for animations
  const prevPoints = useRef(user?.points || 0);
  const prevLevel = useRef(user?.level || 1);
  const prevStreak = useRef(user?.currentStreak || 0);

  // Animate stats updates
  const animateValue = (animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1.15,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Debug logging for gamification updates and animate changes
  useEffect(() => {
    if (user) {
      const currentPoints = user.points || 0;
      const currentLevel = user.level || 1;
      const currentStreak = user.currentStreak || 0;

      console.log('🏠 Home: User gamification data updated:', {
        points: currentPoints,
        level: currentLevel,
        streak: currentStreak,
        statsPoints: stats?.totalPoints,
        statsLevel: stats?.currentLevel,
        statsStreak: stats?.currentStreak
      });

      // Animate if values changed
      if (currentPoints !== prevPoints.current && prevPoints.current > 0) {
        console.log('🎯 Animating points change:', prevPoints.current, '->', currentPoints);
        animateValue(pointsAnimValue);
      }
      if (currentLevel !== prevLevel.current && prevLevel.current > 0) {
        console.log('🎯 Animating level change:', prevLevel.current, '->', currentLevel);
        animateValue(levelAnimValue);
      }
      if (currentStreak !== prevStreak.current && prevStreak.current >= 0) {
        console.log('🎯 Animating streak change:', prevStreak.current, '->', currentStreak);
        animateValue(streakAnimValue);
      }

      // Update previous values
      prevPoints.current = currentPoints;
      prevLevel.current = currentLevel;
      prevStreak.current = currentStreak;
    }
  }, [user?.points, user?.level, user?.currentStreak, stats?.totalPoints, stats?.currentLevel, stats?.currentStreak]);
  const router = useRouter();

  // Load daily missions
  const loadMissions = useCallback(async () => {
    if (isGuest || !isLoggedIn) return;
    
    setMissionsLoading(true);
    setMissionsError(null);
    
    try {
      const response = await missionsApi.getMissionProgressDetails();
      console.log('Missions API response:', response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const dailyMissions = response.data.filter(mission => mission.mission.type === 'daily');
        setMissions(dailyMissions);
      } else {
        console.log('No missions data or invalid format:', response);
        setMissions([]);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
      setMissionsError(error instanceof Error ? error.message : t.home.missions.error);
    } finally {
      setMissionsLoading(false);
    }
  }, [isGuest, isLoggedIn, t.home.missions.error]);

  // Load missions on mount and when user changes
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const onRefresh = React.useCallback(() => {
    refreshUserData();
    loadMissions();
  }, [refreshUserData, loadMissions]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{ color: theme.text.primary, marginTop: 16, fontSize: 16 }}>
            {t.common.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const GuestView = () => (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t.home.guestGreeting}</Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.home.guestSubtitle}</Text>
          </View>
          <View style={{ width: 48, height: 48, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Guest Content */}
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Sign Up Prompt */}
        <TouchableOpacity style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <LinearGradient
            colors={[theme.primary[500], theme.primary[600]]}
            style={{ padding: 20, borderRadius: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text.inverse, fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.home.signUpPrompt}</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                {t.home.signUpDescription}
              </Text>
            </View>
            <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.home.quickActions}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 20, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light }}>
              <View style={{ width: 48, height: 48, backgroundColor: theme.primary[100], borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="map" size={24} color={theme.primary[500]} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.home.actions.findParks}</Text>
              <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.home.guestSubtitle}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 20, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light }}>
              <View style={{ width: 48, height: 48, backgroundColor: theme.secondary[100], borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="information-circle" size={24} color={theme.secondary[500]} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>Park Info</Text>
              <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }}>Hours and facilities</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Parks */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>Popular Parks</Text>
          {[1, 2, 3].map((item) => (
            <TouchableOpacity 
              key={`park-${item}`} 
              style={{ 
                backgroundColor: theme.background.card, borderRadius: 12, padding: 16, marginBottom: 12, 
                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', 
                shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, 
                elevation: 2, borderWidth: 1, borderColor: theme.border.light 
              }}
            >
              <View style={{ 
                width: 48, height: 48, backgroundColor: theme.primary[100], borderRadius: 12, 
                justifyContent: 'center', alignItems: 'center', 
                marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 
              }}>
                <Ionicons name="leaf" size={24} color={theme.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, textAlign: isRTL ? 'right' : 'left' }}>Sample Dog Park {item}</Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#10B981', borderRadius: 4, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                  <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: isRTL ? 'right' : 'left' }}>Open now</Text>
                  <Text style={{ fontSize: 14, color: theme.text.muted, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, textAlign: isRTL ? 'right' : 'left' }}>• 2.5 km</Text>
                </View>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.text.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const UserView = () => (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {/* Header with user info */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>
                {t.home.greeting} {user?.firstName}! 👋
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.home.subtitle}</Text>
            </View>
            {/* Real-time connection indicator */}
            {isLoggedIn && !isGuest && (
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isRealTimeConnected ? '#10B981' : '#EF4444',
                marginLeft: isRTL ? 0 : 12,
                marginRight: isRTL ? 12 : 0,
                opacity: connectionState === 'connecting' ? 0.6 : 1.0
              }} />
            )}
          </View>
          <View style={{ width: 48, height: 48, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30 }}>
            <NotificationBell 
              size={24}
              color="white"
              showBadge={true}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginTop: -20, marginBottom: 24, gap: 18, marginLeft: 10, marginRight: 10 }}>
        {/* Points Card */}
        <Animated.View style={{ 
          flex: 1, 
          backgroundColor: theme.background.card, 
          borderRadius: 12, 
          padding: 16, 
          shadowColor: theme.shadow.medium, 
          shadowOffset: { width: 0, height: 1 }, 
          shadowOpacity: 0.1, 
          shadowRadius: 2, 
          elevation: 2, 
          borderWidth: 1, 
          borderColor: theme.border.light, 
          alignItems: 'center',
          transform: [{ scale: pointsAnimValue }]
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary[500], textAlign: 'center' }}>
            {user?.points || stats?.totalPoints || 0}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.home.stats.points}</Text>
        </Animated.View>
        
        {/* Level Card */}
        <Animated.View style={{ 
          flex: 1, 
          backgroundColor: theme.background.card, 
          borderRadius: 12, 
          padding: 16, 
          shadowColor: theme.shadow.medium, 
          shadowOffset: { width: 0, height: 1 }, 
          shadowOpacity: 0.1, 
          shadowRadius: 2, 
          elevation: 2, 
          borderWidth: 1, 
          borderColor: theme.border.light, 
          alignItems: 'center',
          transform: [{ scale: levelAnimValue }]
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.secondary[500], textAlign: 'center' }}>
            {user?.level || stats?.currentLevel || 1}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.home.stats.level}</Text>
        </Animated.View>
        
        {/* Streak Card */}
        <Animated.View style={{ 
          flex: 1, 
          backgroundColor: theme.background.card, 
          borderRadius: 12, 
          padding: 16, 
          shadowColor: theme.shadow.medium, 
          shadowOffset: { width: 0, height: 1 }, 
          shadowOpacity: 0.1, 
          shadowRadius: 2, 
          elevation: 2, 
          borderWidth: 1, 
          borderColor: theme.border.light, 
          alignItems: 'center',
          transform: [{ scale: streakAnimValue }]
        }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F97316', textAlign: 'center' }}>
            {user?.currentStreak || stats?.currentStreak || 0}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.home.stats.streak}</Text>
        </Animated.View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions - Moved here */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.home.quickActions}</Text>
          
          {/* Compact Quick Actions Row */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            gap: 8,
            paddingHorizontal: 4
          }}>
            {/* QR Scanner */}
            <TouchableOpacity 
              onPress={() => router.push('/qr-scanner')}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 12,
                minHeight: 80,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.primary[200],
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: theme.primary[500],
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6
              }}>
                <Ionicons name="qr-code-outline" size={18} color="white" />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: 'center',
                lineHeight: 14
              }}>{isRTL ? 'סריקה מהירה' : 'Quick Scan'}</Text>
            </TouchableOpacity>

            {/* Social */}
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/social')}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 12,
                minHeight: 80,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light,
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: theme.secondary[500],
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6
              }}>
                <Ionicons name="people" size={18} color="white" />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: 'center',
                lineHeight: 14
              }}>{isRTL ? 'חברתי' : 'Social'}</Text>
            </TouchableOpacity>

            {/* Parks */}
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/parks')}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 12,
                minHeight: 80,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light,
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#10B981',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6
              }}>
                <Ionicons name="map" size={18} color="white" />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: 'center',
                lineHeight: 14
              }}>{isRTL ? 'גנים קרובים' : 'Nearby Parks'}</Text>
            </TouchableOpacity>

            {/* Activity Diary */}
            <TouchableOpacity 
              onPress={() => router.push('/dog-diary')}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 12,
                minHeight: 80,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light,
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#8B5CF6',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6
              }}>
                <Ionicons name="book" size={18} color="white" />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: 'center',
                lineHeight: 14
              }}>{isRTL ? 'יומן פעילות' : 'Activity Diary'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Missions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.home.dailyMissions}</Text>
          
          {missionsLoading ? (
            // Loading skeleton
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 20,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120
            }}>
              <ActivityIndicator size="small" color={theme.primary[500]} />
              <Text style={{
                color: theme.text.secondary,
                fontSize: 14,
                marginTop: 8,
                textAlign: 'center'
              }}>{t.home.missions.loading}</Text>
            </View>
          ) : missionsError ? (
            // Error state
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 20,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              alignItems: 'center'
            }}>
              <Ionicons name="warning-outline" size={32} color={theme.text.muted} style={{ marginBottom: 8 }} />
              <Text style={{
                color: theme.text.secondary,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 12
              }}>{t.home.missions.error}</Text>
              <TouchableOpacity
                onPress={loadMissions}
                style={{
                  backgroundColor: theme.primary[500],
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 8
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600'
                }}>{t.home.missions.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : missions.length === 0 ? (
            // No missions state
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 20,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              alignItems: 'center'
            }}>
              <Ionicons name="checkmark-circle-outline" size={32} color={theme.primary[500]} style={{ marginBottom: 8 }} />
              <Text style={{
                color: theme.text.secondary,
                fontSize: 14,
                textAlign: 'center'
              }}>{t.home.missions.noMissions}</Text>
            </View>
          ) : (
            // Missions list
            <View style={{ gap: 12 }}>
              {missions.map((missionProgress, index) => {
                const { mission, userMission, progressPercentage } = missionProgress;
                const isCompleted = userMission?.isCompleted || false;
                const currentProgress = userMission?.currentProgress || 0;
                
                return (
                  <View
                    key={mission._id}
                    style={{
                      backgroundColor: theme.background.card,
                      borderRadius: 12,
                      padding: 20,
                      shadowColor: theme.shadow.medium,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: isCompleted ? theme.primary[200] : theme.border.light,
                      opacity: isCompleted ? 0.8 : 1
                    }}
                  >
                    <View style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16
                    }}>
                      <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                        {mission.icon && (
                          <Text style={{
                            fontSize: 20,
                            marginRight: isRTL ? 0 : 8,
                            marginLeft: isRTL ? 8 : 0
                          }}>{mission.icon}</Text>
                        )}
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: theme.text.primary,
                          textAlign: isRTL ? 'right' : 'left',
                          flex: 1
                        }}>{mission.title}</Text>
                      </View>
                      
                      <View style={{
                        backgroundColor: isCompleted ? theme.primary[500] : theme.primary[100],
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'center'
                      }}>
                        {isCompleted && (
                          <Ionicons 
                            name="checkmark" 
                            size={14} 
                            color="white" 
                            style={{ 
                              marginRight: isRTL ? 0 : 4,
                              marginLeft: isRTL ? 4 : 0
                            }} 
                          />
                        )}
                        <Text style={{
                          color: isCompleted ? 'white' : theme.primary[700],
                          fontSize: 14,
                          fontWeight: '600'
                        }}>
                          {isCompleted ? t.home.missions.completed : `+${mission.pointsReward} ${t.home.missions.points}`}
                        </Text>
                      </View>
                    </View>
                    
                    {mission.description && (
                      <Text style={{
                        fontSize: 14,
                        color: theme.text.secondary,
                        textAlign: isRTL ? 'right' : 'left',
                        marginBottom: 12
                      }}>{mission.description}</Text>
                    )}
                    
                    <View style={{
                      height: 8,
                      backgroundColor: theme.border.medium,
                      borderRadius: 4,
                      marginBottom: 12
                    }}>
                      <View style={{
                        height: 8,
                        backgroundColor: isCompleted ? theme.primary[500] : theme.primary[400],
                        borderRadius: 4,
                        width: `${Math.min(progressPercentage, 100)}%`
                      }} />
                    </View>
                    
                    <Text style={{
                      fontSize: 14,
                      color: theme.text.secondary,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {currentProgress}/{mission.targetValue} {t.home.missions.progress}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {isGuest ? <GuestView /> : <UserView />}
      
      {/* Notification Modal */}
      <NotificationModal 
        isVisible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}