import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface ActivityEntry {
  id: string;
  type: 'checkin' | 'photo' | 'meeting' | 'play' | 'training' | 'walk';
  title: string;
  description: string;
  duration?: number; // in minutes
  location?: string;
  timestamp: Date;
  points: number;
  dogName?: string;
}

// Demo data for activity entries
const getDemoActivities = (isRTL: boolean): ActivityEntry[] => [
  {
    id: '1',
    type: 'checkin',
    title: isRTL ? 'ביקור בגן הכלבים בדיזנגוף' : 'Visit to Dizengoff Dog Park',
    description: isRTL ? 'מקס נהנה לשחק עם כלבים אחרים' : 'Max enjoyed playing with other dogs',
    duration: 45,
    location: isRTL ? 'גן הכלבים דיזנגוף' : 'Dizengoff Dog Park',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    points: 10,
    dogName: isRTL ? 'מקס' : 'Max'
  },
  {
    id: '2',
    type: 'meeting',
    title: isRTL ? 'פגישה עם רוקי - כלב גולדן רטריבר' : 'Met Rocky - Golden Retriever',
    description: isRTL ? 'חברות חדשה! הכלבים שיחקו יחד בכדור' : 'New friendship! The dogs played fetch together',
    duration: 30,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    points: 5,
    dogName: isRTL ? 'מקס' : 'Max'
  },
  {
    id: '3',
    type: 'photo',
    title: isRTL ? 'צילום תמונות בגן' : 'Photo session at the park',
    description: isRTL ? 'תמונות יפות של לונה על הדשא' : 'Beautiful photos of Luna on the grass',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    points: 5,
    dogName: isRTL ? 'לונה' : 'Luna'
  },
  {
    id: '4',
    type: 'play',
    title: isRTL ? 'משחק עם כדור' : 'Playing with ball',
    description: isRTL ? 'אימון אחזור כדור בחצר האחורית' : 'Fetch training in the backyard',
    duration: 20,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    points: 3,
    dogName: isRTL ? 'מקס' : 'Max'
  },
  {
    id: '5',
    type: 'training',
    title: isRTL ? 'אימון ציות' : 'Obedience training',
    description: isRTL ? 'לימוד פקודות בסיסיות: ישב, שכב, בוא' : 'Learning basic commands: sit, down, come',
    duration: 15,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    points: 8,
    dogName: isRTL ? 'לונה' : 'Luna'
  },
  {
    id: '6',
    type: 'walk',
    title: isRTL ? 'הליכה בוקר' : 'Morning walk',
    description: isRTL ? 'הליכה רגועה בשכונה' : 'Relaxing walk around the neighborhood',
    duration: 25,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    points: 5,
    dogName: isRTL ? 'מקס' : 'Max'
  }
];

const getActivityIcon = (type: string): string => {
  switch (type) {
    case 'checkin': return 'location';
    case 'photo': return 'camera';
    case 'meeting': return 'people';
    case 'play': return 'basketball';
    case 'training': return 'school';
    case 'walk': return 'walk';
    default: return 'paw';
  }
};

const getActivityColor = (type: string, theme: any): string => {
  switch (type) {
    case 'checkin': return theme.primary[500];
    case 'photo': return theme.secondary[500];
    case 'meeting': return '#10B981'; // Green
    case 'play': return '#F59E0B'; // Yellow
    case 'training': return '#8B5CF6'; // Purple
    case 'walk': return '#06B6D4'; // Cyan
    default: return theme.primary[500];
  }
};

const formatTimeAgo = (timestamp: Date, isRTL: boolean): string => {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (isRTL) {
    if (diffInHours < 1) return 'לפני פחות משעה';
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    if (diffInDays === 1) return 'אתמול';
    return `לפני ${diffInDays} ימים`;
  } else {
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  }
};

export default function DogDiaryScreen() {
  const [selectedTab, setSelectedTab] = useState<'recent' | 'calendar' | 'stats'>('recent');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user, dogs, isGuest } = useUser();
  const router = useRouter();

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Simulate loading and animate in
    setTimeout(() => {
      setActivities(getDemoActivities(isRTL));
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 500);
  }, [isRTL]);

  // Calculate today's stats
  const todayStats = {
    totalActivities: activities.filter(a => 
      new Date(a.timestamp).toDateString() === new Date().toDateString()
    ).length,
    totalMinutes: activities
      .filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString())
      .reduce((sum, a) => sum + (a.duration || 0), 0),
    totalPoints: activities
      .filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString())
      .reduce((sum, a) => sum + a.points, 0),
  };

  const weeklyStats = {
    activeDays: 3,
    totalActivities: activities.length,
    averageDaily: Math.round(activities.length / 7),
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{ color: theme.text.primary, marginTop: 16, fontSize: 16 }}>
            {isRTL ? 'טוען יומן פעילות...' : 'Loading activity diary...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const AuthRequiredView = () => (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ 
              width: 40, 
              height: 40, 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, 
              justifyContent: 'center', 
              alignItems: 'center',
              marginRight: isRTL ? 0 : 16,
              marginLeft: isRTL ? 16 : 0
            }}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            {t.diary?.title || (isRTL ? 'יומן פעילות' : 'Activity Diary')}
          </Text>
        </View>
      </LinearGradient>

      {/* Auth Required Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
          {/* Sign Up Prompt */}
          <TouchableOpacity 
            onPress={() => router.push('/(auth)/login')}
            style={{ marginBottom: 24 }}
          >
            <LinearGradient
              colors={[theme.primary[500], theme.primary[600]]}
              style={{ 
                padding: 20, 
                borderRadius: 12, 
                alignItems: 'center',
                shadowColor: theme.shadow.medium, 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 4, 
                elevation: 2 
              }}
            >
              <View style={{ width: 60, height: 60, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="book" size={32} color="white" />
              </View>
              <Text style={{ color: theme.text.inverse, fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                {isRTL ? 'הירשם לגישה ליומן הפעילות' : 'Sign up to access Activity Diary'}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
                {isRTL ? 'תעד פעילויות, עקוב אחר התקדמות וצבור נקודות' : 'Track activities, monitor progress and earn points'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Preview Features */}
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>
            {isRTL ? 'מה כלול ביומן הפעילות?' : 'What\'s included in Activity Diary?'}
          </Text>
          
          {[
            { icon: 'location', title: isRTL ? 'מעקב ביקורים' : 'Visit Tracking', desc: isRTL ? 'רישום אוטומטי של ביקורים בגנים' : 'Automatic logging of park visits' },
            { icon: 'camera', title: isRTL ? 'אלבום תמונות' : 'Photo Album', desc: isRTL ? 'שמירת תמונות מיוחדות' : 'Save special moments' },
            { icon: 'people', title: isRTL ? 'פגישות חברתיות' : 'Social Meetings', desc: isRTL ? 'מעקב אחר חברים חדשים' : 'Track new friendships' },
            { icon: 'stats-chart', title: isRTL ? 'סטטיסטיקות' : 'Statistics', desc: isRTL ? 'ניתוח פעילות שבועית וחודשית' : 'Weekly and monthly analysis' }
          ].map((feature, index) => (
            <View 
              key={index}
              style={{
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light
              }}
            >
              <View style={{ 
                width: 48, 
                height: 48, 
                backgroundColor: theme.primary[100], 
                borderRadius: 24, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name={feature.icon as any} size={24} color={theme.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
                  {feature.title}
                </Text>
                <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }}>
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (isGuest) {
    return <AuthRequiredView />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ 
              width: 40, 
              height: 40, 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
            {t.diary?.title || (isRTL ? 'יומן פעילות' : 'Activity Diary')}
          </Text>
          <TouchableOpacity
            style={{ 
              width: 40, 
              height: 40, 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Today's Stats */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginBottom: 4 }}>
              {t.diary?.todaysActivities || (isRTL ? 'פעילויות היום' : 'Today\'s Activities')}
            </Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{todayStats.totalActivities}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginBottom: 4 }}>
              {t.diary?.activeMinutes || (isRTL ? 'דקות פעילות' : 'Active Minutes')}
            </Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{todayStats.totalMinutes}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginBottom: 4 }}>
              {t.diary?.pointsToday || (isRTL ? 'נקודות היום' : 'Points Today')}
            </Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{todayStats.totalPoints}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={{ 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        paddingHorizontal: 24, 
        paddingVertical: 16, 
        backgroundColor: theme.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.light
      }}>
        {[
          { key: 'recent', label: t.diary?.recent || (isRTL ? 'פעילויות אחרונות' : 'Recent'), icon: 'time' },
          { key: 'calendar', label: t.diary?.calendar || (isRTL ? 'לוח שנה' : 'Calendar'), icon: 'calendar' },
          { key: 'stats', label: t.diary?.stats || (isRTL ? 'סטטיסטיקות' : 'Stats'), icon: 'stats-chart' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setSelectedTab(tab.key as any)}
            style={{
              flex: 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginHorizontal: 4,
              borderRadius: 8,
              backgroundColor: selectedTab === tab.key ? theme.primary[100] : 'transparent'
            }}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={selectedTab === tab.key ? theme.primary[500] : theme.text.secondary}
              style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}
            />
            <Text style={{
              fontSize: 14,
              fontWeight: selectedTab === tab.key ? '600' : '400',
              color: selectedTab === tab.key ? theme.primary[500] : theme.text.secondary
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {selectedTab === 'recent' && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              {activities.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={{
                    backgroundColor: theme.background.card,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: theme.shadow.medium,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: theme.border.light
                  }}
                >
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      backgroundColor: `${getActivityColor(activity.type, theme)}20`,
                      borderRadius: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0
                    }}>
                      <Ionicons name={getActivityIcon(activity.type) as any} size={24} color={getActivityColor(activity.type, theme)} />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, textAlign: isRTL ? 'right' : 'left' }}>
                          {activity.title}
                        </Text>
                        <View style={{
                          backgroundColor: theme.primary[100],
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8
                        }}>
                          <Text style={{ fontSize: 12, color: theme.primary[700], fontWeight: '600' }}>
                            +{activity.points} {isRTL ? 'נק׳' : 'pts'}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={{ fontSize: 14, color: theme.text.secondary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
                        {activity.description}
                      </Text>
                      
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: theme.text.muted, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
                            {formatTimeAgo(activity.timestamp, isRTL)}
                          </Text>
                          {activity.duration && (
                            <Text style={{ fontSize: 12, color: theme.text.muted }}>
                              • {activity.duration} {isRTL ? 'דק׳' : 'min'}
                            </Text>
                          )}
                        </View>
                        
                        {activity.dogName && (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                            <Ionicons name="paw" size={12} color={theme.text.muted} style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }} />
                            <Text style={{ fontSize: 12, color: theme.text.muted }}>
                              {activity.dogName}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {selectedTab === 'calendar' && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <Ionicons name="calendar" size={64} color={theme.text.muted} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary, marginBottom: 8, textAlign: 'center' }}>
              {isRTL ? 'לוח שנה בפיתוח' : 'Calendar View Coming Soon'}
            </Text>
            <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: 'center', lineHeight: 20 }}>
              {isRTL ? 'נוכל לראות פעילויות לפי תאריכים ולתכנן את השבוע' : 'View activities by date and plan your week'}
            </Text>
          </View>
        )}

        {selectedTab === 'stats' && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
              {/* Weekly Summary */}
              <View style={{
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>
                  {isRTL ? 'סיכום שבועי' : 'Weekly Summary'}
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary[500] }}>{weeklyStats.activeDays}</Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center', marginTop: 4 }}>
                      {isRTL ? 'ימים פעילים' : 'Active Days'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.secondary[500] }}>{weeklyStats.totalActivities}</Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center', marginTop: 4 }}>
                      {isRTL ? 'סה״כ פעילויות' : 'Total Activities'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F59E0B' }}>{weeklyStats.averageDaily}</Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center', marginTop: 4 }}>
                      {isRTL ? 'ממוצע יומי' : 'Daily Average'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Activity Types Breakdown */}
              <View style={{
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
                shadowColor: theme.shadow.medium,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                borderWidth: 1,
                borderColor: theme.border.light
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>
                  {isRTL ? 'סוגי פעילויות' : 'Activity Types'}
                </Text>
                
                {[
                  { type: 'checkin', count: 2, label: isRTL ? 'ביקורים בגן' : 'Park Visits' },
                  { type: 'play', count: 1, label: isRTL ? 'משחקים' : 'Play Time' },
                  { type: 'training', count: 1, label: isRTL ? 'אימונים' : 'Training' },
                  { type: 'meeting', count: 1, label: isRTL ? 'פגישות חברתיות' : 'Social Meetings' },
                  { type: 'photo', count: 1, label: isRTL ? 'צילומים' : 'Photo Sessions' }
                ].map((item, index) => (
                  <View key={index} style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: index < 4 ? 1 : 0,
                    borderBottomColor: theme.border.light
                  }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        backgroundColor: `${getActivityColor(item.type, theme)}20`,
                        borderRadius: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: isRTL ? 0 : 12,
                        marginLeft: isRTL ? 12 : 0
                      }}>
                        <Ionicons name={getActivityIcon(item.type) as any} size={16} color={getActivityColor(item.type, theme)} />
                      </View>
                      <Text style={{ fontSize: 14, color: theme.text.primary, textAlign: isRTL ? 'right' : 'left' }}>
                        {item.label}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
                      {item.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}