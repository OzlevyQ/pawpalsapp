import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
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

export default function HomeScreen() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user, isLoggedIn, isGuest, loading, refreshing, refreshUserData } = useUser();
  const { isConnected: isRealTimeConnected, connectionState } = useUserRealTimeData();
  const router = useRouter();

  const onRefresh = React.useCallback(() => {
    refreshUserData();
  }, [refreshUserData]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{ color: theme.text.primary, marginTop: 16, fontSize: 16 }}>
            {t.loading}
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
            <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t.helloGuest}</Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.discoverParks}</Text>
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
              <Text style={{ color: theme.text.inverse, fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.signUpNow2}</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                {t.getAccessToAllFeatures}
              </Text>
            </View>
            <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.whatCanYouDo}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 20, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light }}>
              <View style={{ width: 48, height: 48, backgroundColor: theme.primary[100], borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="map" size={24} color={theme.primary[500]} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.findParks}</Text>
              <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.discoverDogParks}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 20, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light }}>
              <View style={{ width: 48, height: 48, backgroundColor: theme.secondary[100], borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="information-circle" size={24} color={theme.secondary[500]} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.parkInfo}</Text>
              <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.hoursAndFacilities}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Parks */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.popularParks}</Text>
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
                  <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: isRTL ? 'right' : 'left' }}>{t.openNow}</Text>
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
                {t.hello} {user?.firstName}! 👋
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.howCanWeHelpToday}</Text>
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
        <View style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 16, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary[500], textAlign: 'center' }}>{user?.points || 0}</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.points}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 16, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.secondary[500], textAlign: 'center' }}>{user?.level || 1}</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.level}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.background.card, borderRadius: 12, padding: 16, shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: theme.border.light, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#F97316', textAlign: 'center' }}>{user?.currentStreak || 0}</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 4, textAlign: 'center' }}>{t.streak}</Text>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Daily Missions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>{t.dailyMissions}</Text>
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
            borderColor: theme.border.light
          }}>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.visitDogPark}</Text>
              <View style={{
                backgroundColor: theme.primary[100],
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 4
              }}>
                <Text style={{
                  color: theme.primary[700],
                  fontSize: 14,
                  fontWeight: '600'
                }}>+10 נק׳</Text>
              </View>
            </View>
            <View style={{
              height: 8,
              backgroundColor: theme.border.medium,
              borderRadius: 4,
              marginBottom: 12
            }}>
              <View style={{
                height: 8,
                backgroundColor: theme.primary[500],
                borderRadius: 4,
                width: '33%'
              }} />
            </View>
            <Text style={{
              fontSize: 14,
              color: theme.text.secondary,
              textAlign: isRTL ? 'right' : 'left'
            }}>0/1 {t.completed}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.text.primary,
            marginBottom: 16,
            textAlign: isRTL ? 'right' : 'left'
          }}>{t.quickActions}</Text>
          
          {/* First row - QR Scanner (prominent) */}
          <TouchableOpacity 
            onPress={() => router.push('/qr-scanner')}
            style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 2,
              borderColor: theme.primary[200],
            }}
          >
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 8 }}>
                  <LinearGradient
                    colors={[theme.primary[500], theme.primary[600]]}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0,
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                  </LinearGradient>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.text.primary,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>{t.quickCheckin}</Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  lineHeight: 18,
                  textAlign: isRTL ? 'right' : 'left'
                }}>{t.scanQrInPark}</Text>
              </View>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={20} 
                color={theme.primary[500]} 
              />
            </View>
          </TouchableOpacity>

          {/* Second row - Other actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/social')}
              style={{
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
              borderColor: theme.border.light
            }}>
              <LinearGradient
                colors={[theme.primary[500], theme.primary[600]]}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10
                }}
              >
                <Ionicons name="people" size={20} color="white" />
              </LinearGradient>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 2,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.social}</Text>
              <Text style={{
                fontSize: 12,
                color: theme.text.secondary,
                lineHeight: 14,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.connectWithDogOwners}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/parks')}
              style={{
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
              borderColor: theme.border.light
            }}>
              <LinearGradient
                colors={[theme.secondary[500], theme.secondary[600]]}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10
                }}
              >
                <Ionicons name="map" size={20} color="white" />
              </LinearGradient>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 2,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.nearbyParks}</Text>
              <Text style={{
                fontSize: 12,
                color: theme.text.secondary,
                lineHeight: 14,
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.findParksNearby}</Text>
            </TouchableOpacity>
          </View>
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