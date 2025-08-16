import React, { useState, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { visitsApi, gamificationApi, Visit, GamificationActivity } from '../services/api';

export default function ActivityScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [gamificationActivity, setGamificationActivity] = useState<GamificationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'visits' | 'activity'>('visits');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckout = async (visitId: string) => {
    try {
      setCheckingOut(true);
      
      const response = await visitsApi.checkout(visitId);
      if (response.success) {
        Alert.alert(
          isRTL ? 'הצלחה!' : 'Success!',
          isRTL ? 'יצאת מהפארק בהצלחה' : 'Successfully checked out from the park'
        );
        // Refresh the visits list to show updated status
        await loadData();
      } else {
        throw new Error(response.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה ביציאה מהפארק. אנא נסה שוב.' : 'Error checking out from the park. Please try again.'
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [visitsResponse, activityResponse] = await Promise.all([
        visitsApi.getMyVisits({ limit: 50 }),
        gamificationApi.getActivity()
      ]);

      if (visitsResponse.success) {
        // Handle nested format {visits: [...], total: number}
        const visitsData = visitsResponse.data?.visits || visitsResponse.data || [];
        if (Array.isArray(visitsData)) {
          // Clean up visits data - filter out null dogs
          const cleanedVisits = visitsData.map(visit => ({
            ...visit,
            dogs: Array.isArray(visit.dogs) ? visit.dogs.filter(dog => dog != null && typeof dog === 'object') : []
          }));
          setVisits(cleanedVisits);
        } else {
          console.warn('Visits data is not an array:', visitsData);
          setVisits([]);
        }
      } else {
        console.warn('Visits response failed:', visitsResponse);
        setVisits([]);
      }

      if (activityResponse.success) {
        // Handle nested format {activity: [...]}
        const activityData = activityResponse.data?.activity || activityResponse.data || [];
        if (Array.isArray(activityData)) {
          setGamificationActivity(activityData);
        } else {
          console.warn('Activity data is not an array:', activityData);
          setGamificationActivity([]);
        }
      } else {
        console.warn('Activity response failed:', activityResponse);
        setGamificationActivity([]);
      }
    } catch (error) {
      console.error('Error loading activity data:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בטעינת נתוני הפעילות' : 'Error loading activity data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return isRTL ? 'לא ידוע' : 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return isRTL ? `${hours} שעות ${mins} דקות` : `${hours}h ${mins}m`;
    }
    return isRTL ? `${mins} דקות` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return isRTL ? 'היום' : 'Today';
    } else if (diffDays === 1) {
      return isRTL ? 'אתמול' : 'Yesterday';
    } else if (diffDays < 7) {
      return isRTL ? `לפני ${diffDays} ימים` : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'active': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return theme.text.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return isRTL ? 'הושלם' : 'Completed';
      case 'active': return isRTL ? 'פעיל' : 'Active';
      case 'cancelled': return isRTL ? 'בוטל' : 'Cancelled';
      default: return status;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'badge_earned': return 'trophy';
      case 'achievement_completed': return 'star';
      case 'level_up': return 'trending-up';
      case 'streak_milestone': return 'flame';
      default: return 'checkmark-circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'badge_earned': return '#F59E0B';
      case 'achievement_completed': return '#8B5CF6';
      case 'level_up': return '#10B981';
      case 'streak_milestone': return '#EF4444';
      default: return theme.primary[500];
    }
  };

  const renderVisitItem = (visit: Visit, index?: number) => {
    if (!visit) return null;
    
    return (
      <View
        key={visit._id || `visit-${index || Math.random()}`}
        style={{
        backgroundColor: theme.background.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.shadow.medium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: theme.text.primary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {visit.garden && typeof visit.garden === 'object' && visit.garden.name ? visit.garden.name : (isRTL ? 'פארק כלבים' : 'Dog Park')}
          </Text>
          <Text style={{
            color: theme.text.secondary,
            fontSize: 14,
            marginTop: 2,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {formatDate(visit.checkInTime)}
          </Text>
        </View>
        <View style={{
          backgroundColor: getStatusColor(visit.status),
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: '500'
          }}>
            {getStatusText(visit.status)}
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        marginTop: 8,
      }}>
        <Ionicons name="time" size={16} color={theme.text.muted} />
        <Text style={{
          color: theme.text.muted,
          fontSize: 14,
          marginLeft: isRTL ? 0 : 6,
          marginRight: isRTL ? 6 : 0,
        }}>
          {formatDuration(visit.duration)}
        </Text>
        
        {(() => {
          // Filter out null dogs and count valid ones
          const validDogs = Array.isArray(visit.dogs) ? visit.dogs.filter(dog => dog != null && typeof dog === 'object') : [];
          return validDogs.length > 0 && (
            <>
              <View style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.text.muted,
                marginHorizontal: 8,
              }} />
              <Ionicons name="paw" size={16} color={theme.text.muted} />
              <Text style={{
                color: theme.text.muted,
                fontSize: 14,
                marginLeft: isRTL ? 0 : 6,
                marginRight: isRTL ? 6 : 0,
              }}>
                {validDogs.length} {isRTL ? 'כלבים' : 'dogs'}
              </Text>
            </>
          );
        })()}
      </View>

      {visit.notes && (
        <View style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: theme.background.primary,
          borderRadius: 8,
        }}>
          <Text style={{
            color: theme.text.secondary,
            fontSize: 14,
            textAlign: isRTL ? 'right' : 'left',
          }}>
            {visit.notes}
          </Text>
        </View>
      )}

      {/* Checkout Button for Active Visits */}
      {visit.status === 'active' && (
        <TouchableOpacity 
          onPress={() => handleCheckout(visit._id)}
          disabled={checkingOut}
          style={{
            marginTop: 12,
            backgroundColor: checkingOut ? theme.text.muted : theme.primary[500],
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checkingOut ? (
            <ActivityIndicator size="small" color={theme.text.inverse} />
          ) : (
            <>
              <Ionicons 
                name="log-out-outline" 
                size={18} 
                color={theme.text.inverse}
                style={{ 
                  marginRight: isRTL ? 0 : 8, 
                  marginLeft: isRTL ? 8 : 0 
                }} 
              />
              <Text style={{
                color: theme.text.inverse,
                fontSize: 16,
                fontWeight: '600',
              }}>
                {isRTL ? 'יציאה מהפארק' : 'Check Out'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
      </View>
    );
  };

  const renderActivityItem = (activity: GamificationActivity, index?: number) => {
    if (!activity) return null;
    
    return (
      <View
        key={activity._id || activity.id || `activity-${index || Math.random()}`}
        style={{
        backgroundColor: theme.background.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.shadow.medium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${getActivityColor(activity.type)}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: isRTL ? 0 : 12,
        marginLeft: isRTL ? 12 : 0,
      }}>
        <Ionicons
          name={getActivityIcon(activity.type) as any}
          size={24}
          color={getActivityColor(activity.type)}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          color: theme.text.primary,
          fontSize: 16,
          fontWeight: '600',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {activity.title}
        </Text>
        <Text style={{
          color: theme.text.secondary,
          fontSize: 14,
          marginTop: 2,
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {activity.description}
        </Text>
        <Text style={{
          color: theme.text.muted,
          fontSize: 12,
          marginTop: 4,
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {formatDate(activity.createdAt)}
        </Text>
      </View>

      {activity.points && (
        <View style={{
          backgroundColor: theme.primary[100],
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
        }}>
          <Text style={{
            color: theme.primary[600],
            fontSize: 12,
            fontWeight: '600'
          }}>
            +{activity.points} {isRTL ? 'נקודות' : 'pts'}
          </Text>
        </View>
      )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.background.primary, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <ActivityIndicator size="large" color={theme.primary[500]} />
        <Text style={{ color: theme.text.muted, marginTop: 16 }}>
          {isRTL ? 'טוען פעילות...' : 'Loading activity...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.primary }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        <View style={{ 
          flexDirection: isRTL ? 'row-reverse' : 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons 
              name={isRTL ? "chevron-forward" : "chevron-back"} 
              size={28} 
              color={theme.text.inverse} 
            />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: theme.text.inverse,
            textAlign: 'center',
            flex: 1
          }}>
            {isRTL ? 'פעילות' : 'Activity'}
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        backgroundColor: theme.background.card,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('visits')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: activeTab === 'visits' ? theme.primary[500] : 'transparent',
          }}
        >
          <Text style={{
            color: activeTab === 'visits' ? theme.text.inverse : theme.text.secondary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {isRTL ? 'ביקורים' : 'Visits'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('activity')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: activeTab === 'activity' ? theme.primary[500] : 'transparent',
          }}
        >
          <Text style={{
            color: activeTab === 'activity' ? theme.text.inverse : theme.text.secondary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {isRTL ? 'הישגים' : 'Achievements'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary[500]]}
            tintColor={theme.primary[500]}
          />
        }
      >
        {activeTab === 'visits' ? (
          visits.length > 0 ? (
            <>
              {visits.filter(v => v != null && typeof v === 'object').map((visit, index) => {
                try {
                  // Add extra validation
                  if (!visit._id) {
                    console.warn('Visit missing _id:', visit);
                    return null;
                  }
                  const rendered = renderVisitItem(visit, index);
                  if (!rendered) return null;
                  return rendered;
                } catch (error) {
                  console.error('Error rendering visit item:', error, visit);
                  return (
                    <View key={`error-visit-${index}`} style={{ padding: 10 }}>
                      <Text style={{ color: 'red' }}>Error rendering visit</Text>
                    </View>
                  );
                }
              })}
            </>
          ) : (
            <View style={{ 
              alignItems: 'center', 
              paddingVertical: 60 
            }}>
              <Ionicons name="book-outline" size={64} color={theme.text.muted} />
              <Text style={{ 
                color: theme.text.muted, 
                fontSize: 18, 
                fontWeight: '600', 
                marginTop: 16,
                textAlign: 'center'
              }}>
                {isRTL ? 'אין ביקורים עדיין' : 'No visits yet'}
              </Text>
              <Text style={{ 
                color: theme.text.muted, 
                fontSize: 14, 
                marginTop: 8,
                textAlign: 'center'
              }}>
                {isRTL ? 'בקר בפארק כלבים כדי לראות את הפעילות שלך כאן' : 'Visit a dog park to see your activity here'}
              </Text>
            </View>
          )
        ) : (
          gamificationActivity.length > 0 ? (
            <>
              {gamificationActivity.filter(a => a != null && typeof a === 'object').map((activity, index) => {
                try {
                  // Add extra validation
                  if (!activity.id && !activity._id) {
                    console.warn('Activity missing id:', activity);
                    return null;
                  }
                  const rendered = renderActivityItem(activity, index);
                  if (!rendered) return null;
                  return rendered;
                } catch (error) {
                  console.error('Error rendering activity item:', error, activity);
                  return (
                    <View key={`error-activity-${index}`} style={{ padding: 10 }}>
                      <Text style={{ color: 'red' }}>Error rendering activity</Text>
                    </View>
                  );
                }
              })}
            </>
          ) : (
            <View style={{ 
              alignItems: 'center', 
              paddingVertical: 60 
            }}>
              <Ionicons name="trophy-outline" size={64} color={theme.text.muted} />
              <Text style={{ 
                color: theme.text.muted, 
                fontSize: 18, 
                fontWeight: '600', 
                marginTop: 16,
                textAlign: 'center'
              }}>
                {isRTL ? 'אין הישגים עדיין' : 'No achievements yet'}
              </Text>
              <Text style={{ 
                color: theme.text.muted, 
                fontSize: 14, 
                marginTop: 8,
                textAlign: 'center'
              }}>
                {isRTL ? 'המשך להשתמש באפליקציה כדי לזכות בהישגים' : 'Keep using the app to earn achievements'}
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}