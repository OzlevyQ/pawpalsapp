import React, { useState, useEffect } from 'react';
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
import { badgesApi, UserBadge, BadgeDefinition, BadgeStats } from '../services/api';

const { width } = Dimensions.get('window');

export default function BadgesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'earned' | 'available'>('earned');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [userBadgesResponse, allBadgesResponse, statsResponse] = await Promise.all([
        badgesApi.getUserBadges(),
        badgesApi.getAllBadges(),
        badgesApi.getBadgeStats()
      ]);

      if (userBadgesResponse.success) {
        // Handle both direct array and nested object formats
        const badges = Array.isArray(userBadgesResponse.data) 
          ? userBadgesResponse.data 
          : userBadgesResponse.data?.badges || [];
        setUserBadges(badges);
      } else {
        console.warn('User badges response failed or invalid data:', userBadgesResponse);
        setUserBadges([]);
      }

      if (allBadgesResponse.success) {
        // Handle both direct array and nested object formats
        const badges = Array.isArray(allBadgesResponse.data) 
          ? allBadgesResponse.data 
          : allBadgesResponse.data?.badges || [];
        setAllBadges(badges);
      } else {
        console.warn('All badges response failed or invalid data:', allBadgesResponse);
        setAllBadges([]);
      }

      if (statsResponse.success && statsResponse.data) {
        setBadgeStats(statsResponse.data);
      } else {
        console.warn('Badge stats response failed or invalid data:', statsResponse);
        setBadgeStats(null);
      }
    } catch (error) {
      console.error('Error loading badges data:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בטעינת נתוני התגים' : 'Error loading badges data'
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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#6B7280';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return theme.text.muted;
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'common': return isRTL ? 'רגיל' : 'Common';
      case 'rare': return isRTL ? 'נדיר' : 'Rare';
      case 'epic': return isRTL ? 'אפי' : 'Epic';
      case 'legendary': return isRTL ? 'אגדי' : 'Legendary';
      default: return rarity;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'visits': return isRTL ? 'ביקורים' : 'Visits';
      case 'streaks': return isRTL ? 'רצפים' : 'Streaks';
      case 'social': return isRTL ? 'חברתי' : 'Social';
      case 'levels': return isRTL ? 'רמות' : 'Levels';
      case 'special': return isRTL ? 'מיוחד' : 'Special';
      case 'exploration': return isRTL ? 'חקירה' : 'Exploration';
      default: return category;
    }
  };

  const getBadgeIcon = (category: string, badgeId?: string) => {
    // Custom icons based on specific badges or category
    if (badgeId?.includes('first_visit')) return 'flag';
    if (badgeId?.includes('streak')) return 'flame';
    if (badgeId?.includes('social')) return 'people';
    if (badgeId?.includes('level')) return 'trending-up';
    if (badgeId?.includes('early_bird')) return 'sunny';
    if (badgeId?.includes('night_owl')) return 'moon';
    if (badgeId?.includes('explorer')) return 'compass';

    switch (category) {
      case 'visits': return 'location';
      case 'streaks': return 'flame';
      case 'social': return 'people';
      case 'levels': return 'trending-up';
      case 'special': return 'star';
      case 'exploration': return 'compass';
      default: return 'trophy';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderEarnedBadge = (badge: UserBadge, index: number) => (
    <View
      key={badge._id || `earned-badge-${index}`}
      style={{
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
        borderWidth: 2,
        borderColor: getRarityColor(badge.rarity),
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: `${getRarityColor(badge.rarity)}20`,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <Ionicons
            name={getBadgeIcon(badge.category, badge.badgeId) as any}
            size={32}
            color={getRarityColor(badge.rarity)}
          />
        </View>
        
        <View style={{
          backgroundColor: getRarityColor(badge.rarity),
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          marginBottom: 4,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 10,
            fontWeight: '600',
            textTransform: 'uppercase',
          }}>
            {getRarityText(badge.rarity)}
          </Text>
        </View>
      </View>

      <Text style={{
        color: theme.text.primary,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
      }}>
        {badge.name}
      </Text>
      
      <Text style={{
        color: theme.text.secondary,
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
      }}>
        {badge.description}
      </Text>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
      }}>
        <Text style={{
          color: theme.text.muted,
          fontSize: 10,
        }}>
          {getCategoryText(badge.category)}
        </Text>
        <Text style={{
          color: theme.text.muted,
          fontSize: 10,
        }}>
          {formatDate(badge.earnedAt)}
        </Text>
      </View>
    </View>
  );

  const renderAvailableBadge = (badge: BadgeDefinition, index: number) => {
    const isEarned = userBadges.some(ub => ub.badgeId === badge.badgeId);
    
    return (
      <View
        key={badge._id || `available-badge-${index}`}
        style={{
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
          opacity: isEarned ? 1 : 0.6,
          borderWidth: isEarned ? 2 : 1,
          borderColor: isEarned ? getRarityColor(badge.rarity) : theme.border.medium,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${getRarityColor(badge.rarity)}20`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <Ionicons
              name={getBadgeIcon(badge.category, badge.badgeId) as any}
              size={32}
              color={isEarned ? getRarityColor(badge.rarity) : theme.text.muted}
            />
          </View>
          
          <View style={{
            backgroundColor: getRarityColor(badge.rarity),
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            marginBottom: 4,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 10,
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              {getRarityText(badge.rarity)}
            </Text>
          </View>
          
          {isEarned && (
            <View style={{
              position: 'absolute',
              top: -8,
              right: -8,
              backgroundColor: '#10B981',
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          )}
        </View>

        <Text style={{
          color: theme.text.primary,
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          {badge.name}
        </Text>
        
        <Text style={{
          color: theme.text.secondary,
          fontSize: 12,
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {badge.description}
        </Text>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}>
          <Text style={{
            color: theme.text.muted,
            fontSize: 10,
          }}>
            {getCategoryText(badge.category)}
          </Text>
          <Text style={{
            color: theme.primary[500],
            fontSize: 10,
            fontWeight: '600',
          }}>
            +{badge.rewards?.points || 0} {isRTL ? 'נקודות' : 'pts'}
          </Text>
        </View>
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
          {isRTL ? 'טוען תגים...' : 'Loading badges...'}
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
            {isRTL ? 'התגים שלי' : 'My Badges'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Stats */}
        {badgeStats && (
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'center',
            marginTop: 16,
            gap: 20,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: theme.text.inverse,
                fontSize: 24,
                fontWeight: 'bold',
              }}>
                {userBadges.length}
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 12,
              }}>
                {isRTL ? 'נצברו' : 'Earned'}
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: theme.text.inverse,
                fontSize: 24,
                fontWeight: 'bold',
              }}>
                {allBadges.length}
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 12,
              }}>
                {isRTL ? 'זמינים' : 'Available'}
              </Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: theme.text.inverse,
                fontSize: 24,
                fontWeight: 'bold',
              }}>
                {allBadges.length > 0 ? Math.round((userBadges.length / allBadges.length) * 100) : 0}%
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 12,
              }}>
                {isRTL ? 'הושלם' : 'Complete'}
              </Text>
            </View>
          </View>
        )}
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
          onPress={() => setActiveTab('earned')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: activeTab === 'earned' ? theme.primary[500] : 'transparent',
          }}
        >
          <Text style={{
            color: activeTab === 'earned' ? theme.text.inverse : theme.text.secondary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {isRTL ? `נצברו (${userBadges.length})` : `Earned (${userBadges.length})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('available')}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: activeTab === 'available' ? theme.primary[500] : 'transparent',
          }}
        >
          <Text style={{
            color: activeTab === 'available' ? theme.text.inverse : theme.text.secondary,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {isRTL ? `כל התגים (${allBadges.length})` : `All Badges (${allBadges.length})`}
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
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          {activeTab === 'earned' ? (
            userBadges.length > 0 ? (
              userBadges.map((badge, index) => renderEarnedBadge(badge, index))
            ) : (
              <View style={{ 
                width: '100%',
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
                  {isRTL ? 'אין תגים עדיין' : 'No badges yet'}
                </Text>
                <Text style={{ 
                  color: theme.text.muted, 
                  fontSize: 14, 
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  {isRTL ? 'המשך להשתמש באפליקציה כדי לזכות בתגים' : 'Keep using the app to earn badges'}
                </Text>
              </View>
            )
          ) : (
            allBadges.map((badge, index) => renderAvailableBadge(badge, index))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}