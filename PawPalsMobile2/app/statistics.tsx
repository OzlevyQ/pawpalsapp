import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { gamificationApi, UserStats, UserLevel, StreakInfo, LeaderboardEntry } from '../services/api';

const { width } = Dimensions.get('window');

export default function StatisticsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [statsResponse, levelResponse, streakResponse, leaderboardResponse] = await Promise.all([
        gamificationApi.getStats(),
        gamificationApi.getLevel(),
        gamificationApi.getStreak(),
        gamificationApi.getStreakLeaderboard()
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        console.warn('Stats response failed or invalid data:', statsResponse);
        setStats(null);
      }

      if (levelResponse.success && levelResponse.data) {
        setLevel(levelResponse.data);
      } else {
        console.warn('Level response failed or invalid data:', levelResponse);
        setLevel(null);
      }

      if (streakResponse.success && streakResponse.data) {
        setStreak(streakResponse.data);
      } else {
        console.warn('Streak response failed or invalid data:', streakResponse);
        setStreak(null);
      }

      if (leaderboardResponse.success) {
        // Handle both direct array and nested object formats
        const leaderboard = Array.isArray(leaderboardResponse.data) 
          ? leaderboardResponse.data 
          : leaderboardResponse.data?.leaderboard || [];
        setLeaderboard(leaderboard);
      } else {
        console.warn('Leaderboard response failed or invalid data:', leaderboardResponse);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בטעינת הסטטיסטיקות' : 'Error loading statistics'
      );
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatDuration = (minutes?: number) => {
    if (!minutes || isNaN(minutes)) {
      return isRTL ? '0 דקות' : '0m';
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return isRTL ? `${hours} שעות ${mins} דקות` : `${hours}h ${mins}m`;
    }
    return isRTL ? `${mins} דקות` : `${mins}m`;
  };

  const getStreakStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'at_risk': return '#F59E0B';
      case 'broken': return '#EF4444';
      case 'none': return theme.text.muted;
      default: return theme.text.muted;
    }
  };

  const getStreakStatusText = (status: string) => {
    switch (status) {
      case 'active': return isRTL ? 'פעיל' : 'Active';
      case 'at_risk': return isRTL ? 'בסיכון' : 'At Risk';
      case 'broken': return isRTL ? 'נשבר' : 'Broken';
      case 'none': return isRTL ? 'לא פעיל' : 'None';
      default: return status;
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = theme.primary[500] }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={{
      width: (width - 48) / 2,
      backgroundColor: theme.background.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.shadow.medium,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${color}20`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: isRTL ? 0 : 8,
          marginLeft: isRTL ? 8 : 0,
        }}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <Text style={{
          color: theme.text.secondary,
          fontSize: 12,
          flex: 1,
          textAlign: isRTL ? 'right' : 'left',
          numberOfLines: 1,
          adjustsFontSizeToFit: true
        }}>
          {title}
        </Text>
      </View>
      
      <Text style={{
        color: theme.text.primary,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: isRTL ? 'right' : 'left'
      }}>
        {value}
      </Text>
      
      {subtitle && (
        <Text style={{
          color: theme.text.muted,
          fontSize: 12,
          marginTop: 4,
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

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
          {isRTL ? 'טוען סטטיסטיקות...' : 'Loading statistics...'}
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
            {isRTL ? 'הסטטיסטיקות שלי' : 'My Statistics'}
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

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
        {/* Level Progress */}
        {level && (
          <View style={{
            backgroundColor: theme.background.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Text style={{
                color: theme.text.primary,
                fontSize: 18,
                fontWeight: 'bold',
              }}>
                {isRTL ? 'רמה נוכחית' : 'Current Level'}
              </Text>
              <View style={{
                backgroundColor: theme.primary[500],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}>
                <Text style={{
                  color: theme.text.inverse,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                  {isRTL ? `רמה ${level.currentLevel}` : `Level ${level.currentLevel}`}
                </Text>
              </View>
            </View>

            <Text style={{
              color: theme.text.secondary,
              fontSize: 16,
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {level.currentLevelTitle}
            </Text>

            <View style={{
              backgroundColor: theme.background.primary,
              height: 8,
              borderRadius: 4,
              marginBottom: 8,
              overflow: 'hidden',
            }}>
              <View style={{
                backgroundColor: theme.primary[500],
                height: '100%',
                width: `${level.progressToNext}%`,
                borderRadius: 4,
              }} />
            </View>

            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
            }}>
              <Text style={{
                color: theme.text.muted,
                fontSize: 12,
              }}>
                {level.pointsForCurrent} {isRTL ? 'נקודות' : 'pts'}
              </Text>
              <Text style={{
                color: theme.text.muted,
                fontSize: 12,
              }}>
                {level.pointsForNext} {isRTL ? 'נקודות' : 'pts'}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          {stats && (
            <>
              <StatCard
                title={isRTL ? 'סך נקודות' : 'Total Points'}
                value={(stats.points || 0).toLocaleString()}
                icon="diamond"
                color="#8B5CF6"
              />
              
              <StatCard
                title={isRTL ? 'ביקורים' : 'Visits'}
                value={stats.totalVisits || 0}
                subtitle={isRTL ? 'פעמים בפארק' : 'park visits'}
                icon="location"
                color="#10B981"
              />
              
              <StatCard
                title={isRTL ? 'זמן כולל' : 'Total Time'}
                value={formatDuration(stats.totalDuration)}
                subtitle={isRTL ? 'בפארקים' : 'in parks'}
                icon="time"
                color="#F59E0B"
              />
              
              <StatCard
                title={isRTL ? 'תגים' : 'Badges'}
                value={stats.badgesCount || 0}
                subtitle={isRTL ? 'נצברו' : 'earned'}
                icon="trophy"
                color="#EF4444"
              />
              
              <StatCard
                title={isRTL ? 'הישגים' : 'Achievements'}
                value={stats.achievementsCount || 0}
                subtitle={isRTL ? 'הושגו' : 'completed'}
                icon="star"
                color="#3B82F6"
              />
              
              <StatCard
                title={isRTL ? 'חברים' : 'Friends'}
                value={stats.friendsCount || 0}
                subtitle={isRTL ? 'חברים פעילים' : 'active friends'}
                icon="people"
                color="#10B981"
              />
            </>
          )}
        </View>

        {/* Streak Info */}
        {streak && (
          <View style={{
            backgroundColor: theme.background.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="flame" size={24} color="#EF4444" />
              <Text style={{
                color: theme.text.primary,
                fontSize: 18,
                fontWeight: 'bold',
                marginLeft: isRTL ? 0 : 8,
                marginRight: isRTL ? 8 : 0,
              }}>
                {isRTL ? 'רצף הביקורים' : 'Visit Streak'}
              </Text>
            </View>

            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <View>
                <Text style={{
                  color: theme.text.primary,
                  fontSize: 32,
                  fontWeight: 'bold',
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {streak.currentStreak}
                </Text>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {isRTL ? 'ימים נוכחיים' : 'current days'}
                </Text>
              </View>

              <View style={{
                backgroundColor: getStreakStatusColor(streak.status),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {getStreakStatusText(streak.status)}
                </Text>
              </View>
            </View>

            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border.light,
            }}>
              <View>
                <Text style={{
                  color: theme.text.muted,
                  fontSize: 12,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {isRTL ? 'הרצף הארוך ביותר' : 'Longest Streak'}
                </Text>
                <Text style={{
                  color: theme.text.primary,
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {streak.longestStreak} {isRTL ? 'ימים' : 'days'}
                </Text>
              </View>

              {streak.nextMilestone && (
                <View>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 12,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {isRTL ? 'יעד הבא' : 'Next Milestone'}
                  </Text>
                  <Text style={{
                    color: theme.primary[500],
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {typeof streak.nextMilestone === 'object' 
                      ? (streak.nextMilestone as any)?.target || (streak.nextMilestone as any)?.remaining || 'N/A'
                      : streak.nextMilestone} {isRTL ? 'ימים' : 'days'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={{
            backgroundColor: theme.background.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Text style={{
              color: theme.text.primary,
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {isRTL ? 'לוח תוצאות רצף' : 'Streak Leaderboard'}
            </Text>

            {leaderboard.slice(0, 10).map((entry, index) => (
              <View key={entry.user?._id || `leaderboard-${index}`} style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: index < 9 ? 1 : 0,
                borderBottomColor: theme.border.light,
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: index < 3 ? 
                    (index === 0 ? '#F59E0B' : index === 1 ? '#6B7280' : '#CD7C2F') : 
                    theme.primary[100],
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: isRTL ? 0 : 12,
                  marginLeft: isRTL ? 12 : 0,
                }}>
                  <Text style={{
                    color: index < 3 ? 'white' : theme.primary[600],
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>
                    {entry.rank}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.primary,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {entry.user.firstName} {entry.user.lastName}
                  </Text>
                </View>

                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  fontWeight: '600',
                }}>
                  {entry.value} {isRTL ? 'ימים' : 'days'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}