import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import gardensService, { Garden } from '../../services/api/gardens';
import { visitsApi, Visit } from '../../services/api';
import DogSelectionModal from '../../components/DogSelectionModal';

export default function CheckinScreen() {
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [gardensLoading, setGardensLoading] = useState(false);
  const [showGardenSelection, setShowGardenSelection] = useState(false);
  const [dogSelectionModalVisible, setDogSelectionModalVisible] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loadingActiveVisit, setLoadingActiveVisit] = useState(false);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loadingRecentVisits, setLoadingRecentVisits] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user, dogs } = useUser();
  const { width, height } = Dimensions.get('window');

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return days === 1 ? t.checkin?.timeAgo?.dayAgo || 'לפני יום' : (t.checkin?.timeAgo?.daysAgo?.replace('{count}', days.toString()) || `לפני ${days} ימים`);
    } else if (hours > 0) {
      return hours === 1 ? t.checkin?.timeAgo?.hourAgo || 'לפני שעה' : (t.checkin?.timeAgo?.hoursAgo?.replace('{count}', hours.toString()) || `לפני ${hours} שעות`);
    } else if (minutes > 0) {
      return minutes === 1 ? t.checkin?.timeAgo?.minuteAgo || 'לפני דקה' : (t.checkin?.timeAgo?.minutesAgo?.replace('{count}', minutes.toString()) || `לפני ${minutes} דקות`);
    } else {
      return t.checkin?.timeAgo?.justNow || 'הרגע';
    }
  };

  // Load active visit and recent visits when component mounts
  useEffect(() => {
    if (!isGuest) {
      loadActiveVisit();
      loadRecentVisits();
    } else {
      // Ensure activeVisit and recentVisits are null/empty for guests
      setActiveVisit(null);
      setRecentVisits([]);
    }
  }, [isGuest]);

  const loadActiveVisit = async () => {
    if (isGuest) return;
    
    try {
      setLoadingActiveVisit(true);
      const result = await visitsApi.getActiveVisit();
      
      // More robust checking for active visit data
      if (result.success && result.data && result.data._id) {
        console.log('Active visit found:', result.data);
        setActiveVisit(result.data);
      } else {
        console.log('No active visit found, result:', result);
        setActiveVisit(null);
      }
    } catch (error) {
      console.error('Error loading active visit:', error);
      setActiveVisit(null);
    } finally {
      setLoadingActiveVisit(false);
    }
  };

  const loadRecentVisits = async () => {
    if (isGuest) return;
    
    try {
      setLoadingRecentVisits(true);
      const result = await visitsApi.getMyVisits({ status: 'completed', limit: 5 });
      
      if (result.success && Array.isArray(result.data)) {
        // Sort by checkOutTime or checkInTime desc to get most recent first
        const sortedVisits = result.data.sort((a, b) => {
          const dateA = new Date(a.checkOutTime || a.checkInTime).getTime();
          const dateB = new Date(b.checkOutTime || b.checkInTime).getTime();
          return dateB - dateA;
        }).slice(0, 3); // Take only the 3 most recent
        
        setRecentVisits(sortedVisits);
      } else {
        console.log('No recent visits found or API error:', result);
        setRecentVisits([]);
      }
    } catch (error) {
      console.error('Error loading recent visits:', error);
      setRecentVisits([]);
    } finally {
      setLoadingRecentVisits(false);
    }
  };

  const refreshData = async () => {
    if (!isGuest) {
      await Promise.all([loadActiveVisit(), loadRecentVisits()]);
    }
  };

  const handleCheckOut = async () => {
    if (!activeVisit) return;

    Alert.alert(
      t.checkin?.alerts?.checkout || 'צ\'ק-אאוט',
      t.checkin?.alerts?.checkoutConfirm || 'האם אתה בטוח שברצונך לסיים את הביקור?',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: t.checkin?.endVisit || 'סיים ביקור', 
          onPress: async () => {
            try {
              setCheckoutLoading(true);
              console.log('Starting checkout process for visit:', activeVisit._id);
              const result = await visitsApi.checkout(activeVisit._id);
              
              if (result.success) {
                // Clear active visit immediately
                setActiveVisit(null);
                
                // Refresh both active visit and recent visits data
                await refreshData();
                
                Alert.alert(
                  t.checkin?.alerts?.checkoutSuccess || 'צ\'ק-אאוט הושלם! 👋',
                  t.checkin?.alerts?.checkoutSuccessMessage || 'הביקור הסתיים בהצלחה',
                  [{ text: t.ok }]
                );
                
                console.log('Checkout completed successfully');
              } else {
                console.error('Checkout failed with error:', result.error);
                throw new Error(result.error || 'Check-out failed');
              }
            } catch (error) {
              console.error('Check-out error:', error);
              
              // Try to reload data in case of error to ensure UI is in sync
              await refreshData();
              
              Alert.alert(
                t.checkin?.alerts?.checkoutError || 'שגיאה',
                (t.checkin?.alerts?.genericCheckoutError?.replace('{error}', error instanceof Error ? error.message : 'שגיאה לא ידועה') || `אירעה שגיאה בסיום הביקור: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}. נסה שוב.`),
                [{ text: t.ok }]
              );
            } finally {
              setCheckoutLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleQRScan = () => {
    if (isGuest) {
      handleGuestAction();
      return;
    }
    
    // Navigate to QR scanner page
    router.push('/qr-scanner');
  };

  const loadGardens = async () => {
    setGardensLoading(true);
    try {
      const result = await gardensService.getGardens({ limit: 20, page: 1 });
      if (Array.isArray(result)) {
        setGardens(result);
      } else {
        throw new Error('Failed to load gardens');
      }
    } catch (error) {
      console.error('Error loading gardens:', error);
      Alert.alert(
        t.checkin?.alerts?.errorLoadingGardens || 'שגיאה בטעינת גנים',
        t.checkin?.alerts?.errorLoadingGardensMessage || 'לא ניתן לטעון את רשימת הגנים. בדוק את החיבור לאינטרנט ונסה שוב.',
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.common?.retry || 'נסה שוב', onPress: loadGardens }
        ]
      );
    } finally {
      setGardensLoading(false);
    }
  };

  const handleManualCheckin = async () => {
    if (isGuest) {
      handleGuestAction();
      return;
    }
    
    await loadGardens();
    setShowGardenSelection(true);
  };

  const handleGardenSelect = (garden: Garden) => {
    setSelectedGarden(garden);
    setShowGardenSelection(false);
    
    // Check if user already has an active visit
    if (activeVisit) {
      Alert.alert(
        t.checkin?.alerts?.activeVisitExists || 'יש כבר צ\'ק-אין פעיל',
        t.checkin?.alerts?.activeVisitMessage || 'עליך לסיים את הביקור הנוכחי לפני שתוכל לבצע צ\'ק-אין חדש',
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.checkin?.endVisit || 'סיים ביקור', onPress: handleCheckOut },
        ]
      );
      return;
    }
    
    // Check if user has dogs
    if (!dogs || dogs.length === 0) {
      Alert.alert(
        t.checkin?.alerts?.noDogsRegistered || 'אין כלבים רשומים',
        t.checkin?.alerts?.noDogsMessage || 'כדי לבצע צ\'ק-אין, תחילה הוסף כלב בפרופיל שלך',
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.checkin?.alerts?.addDog || 'הוסף כלב', onPress: () => router.push('/add-dog') },
        ]
      );
      return;
    }
    
    // Always show dog selection modal (even for single dog)
    setDogSelectionModalVisible(true);
  };

  const performCheckIn = async (garden: Garden, selectedDogs: any[]) => {
    try {
      setCheckinLoading(true);
      const dogNames = selectedDogs.map(dog => dog.name).join(', ');
      const dogIds = selectedDogs.map(dog => dog._id);
      
      console.log(`Checking in ${dogNames} to ${garden.name}`);
      
      // Call the actual API to perform check-in
      const result = await visitsApi.checkin(garden._id, dogIds);
      
      if (result.success && result.data && result.data._id) {
        // Update active visit
        setActiveVisit(result.data);
        
        // Refresh recent visits to include any changes
        await loadRecentVisits();
        
        Alert.alert(
          t.checkin?.alerts?.checkinSuccess || 'צ\'ק-אין בוצע בהצלחה! 🎉',
          `${dogNames} ${t.checkin?.alerts?.checkinSuccess ? t.checkin.alerts.checkinSuccess.includes('בוצע') ? '' : `בוצע צ'ק-אין בגן ${garden.name}` : `בוצע צ\'ק-אין בגן ${garden.name}`}`,
          [{ text: t.ok }]
        );
      } else {
        throw new Error(result.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      
      // Show more detailed error message based on error type
      let errorMessage = t.checkin?.alerts?.genericCheckinError || 'אירעה שגיאה בביצוע הצ\'ק-אין. נסה שוב.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = t.checkin?.alerts?.networkError || 'בעיית חיבור לאינטרנט. בדוק את החיבור שלך ונסה שוב.';
        } else if (error.message.includes('already checked in') || error.message.includes('active visit')) {
          errorMessage = t.checkin?.alerts?.alreadyCheckedIn || 'יש כבר ביקור פעיל. נא לסיים את הביקור הנוכחי לפני ביצוע צ\'ק-אין חדש.';
        } else if (error.message.includes('not found')) {
          errorMessage = t.checkin?.alerts?.gardenNotFound || 'הגן המבוקש לא נמצא. נא לבחור גן אחר.';
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
          errorMessage = t.checkin?.alerts?.unauthorized || 'נדרשת התחברות מחדש. נא להתחבר שוב ולנסות.';
        }
      }
      
      Alert.alert(
        t.checkin?.alerts?.checkinError || 'שגיאה בצ\'ק-אין',
        errorMessage,
        [{ text: t.ok }]
      );
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleDogSelection = (selectedDogs: any[]) => {
    if (selectedGarden) {
      performCheckIn(selectedGarden, selectedDogs);
      setDogSelectionModalVisible(false);
      setSelectedGarden(null);
    }
  };

  const handleGuestAction = () => {
    Alert.alert(
      t.checkin?.registrationRequired || 'נדרשת הרשמה',
      t.checkin?.signUpForCheckin || 'כדי לבצע צ\'ק-אין, אנא הירשם או התחבר לחשבון',
      [
        { text: t.cancel || 'ביטול', style: 'cancel' },
        { text: t.auth?.registerNow || 'הירשם', onPress: () => router.push('/(auth)/register') },
        { text: t.auth?.loginNow || 'התחברות', onPress: () => router.push('/(auth)/login') },
      ]
    );
  };

  const GuestView = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24
    }}>
      <View style={{
        width: 128,
        height: 128,
        backgroundColor: theme.primary[100],
        borderRadius: 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <Ionicons name="qr-code-outline" size={64} color={theme.primary[500]} />
      </View>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text.primary,
        marginBottom: 16,
        textAlign: 'center'
      }}>
        {t.checkin?.quickCheckin || 'צ\'ק-אין מהיר'}
      </Text>
      <Text style={{
        color: theme.text.secondary,
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 32,
        lineHeight: 24
      }}>
        {t.checkin?.scanQrToCheckin || 'סרוק QR כדי לבצע צ\'ק-אין בגן כלבים'}
      </Text>
      <TouchableOpacity 
        onPress={handleGuestAction}
        style={{
          backgroundColor: theme.primary[500],
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 32
        }}
      >
        <Text style={{
          color: theme.text.inverse,
          fontSize: 18,
          fontWeight: '600'
        }}>
          {t.checkin?.signUpForSocial || 'הירשם עכשיו'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const UserView = () => (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{
            color: theme.text.inverse,
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 8,
            textAlign: 'center'
          }}>
            {t.checkin?.quickCheckin || 'צ\'ק-אין מהיר'}
          </Text>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 16,
            textAlign: 'center'
          }}>
            {t.checkin?.scanOrSelectPark || 'סרוק QR או בחר גן ידנית'}
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24 }}>
          {/* Active Visit Card */}
          {activeVisit && activeVisit._id && (
            <View style={{
              backgroundColor: '#F0FDF4',
              borderWidth: 2,
              borderColor: '#10B981',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#10B981',
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: isRTL ? 0 : 12,
                  marginLeft: isRTL ? 12 : 0,
                }}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#059669',
                    textAlign: isRTL ? 'right' : 'left',
                  }}>
                    {t.checkin?.activeCheckin || 'צ\'ק-אין פעיל בגן'}
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#065F46',
                    textAlign: isRTL ? 'right' : 'left',
                    fontWeight: '600',
                  }}>
                    {typeof activeVisit.garden === 'object' ? activeVisit.garden.name : 'גן כלבים'}
                  </Text>
                </View>
              </View>
              
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontSize: 14,
                  color: '#065F46',
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {activeVisit.dogs && Array.isArray(activeVisit.dogs) ? 
                    `${t.checkin?.dogs || 'כלבים'}: ${activeVisit.dogs.map(dog => typeof dog === 'object' ? dog.name : dog).join(', ')}` :
                    `${t.checkin?.with || 'עם'} ${t.checkin?.dogs || 'הכלב שלך'}`
                  }
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#059669',
                  textAlign: isRTL ? 'right' : 'left',
                  marginTop: 4,
                }}>
                  {t.checkin?.startedAt || 'החל'}: {new Date(activeVisit.checkInTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={handleCheckOut}
                disabled={checkoutLoading}
                style={{
                  backgroundColor: checkoutLoading ? '#9CA3AF' : '#EF4444',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  alignSelf: 'center',
                  minWidth: 120,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {checkoutLoading && (
                  <ActivityIndicator 
                    size="small" 
                    color="#FFFFFF" 
                    style={{ marginRight: 8 }} 
                  />
                )}
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {checkoutLoading ? (t.checkin?.endingVisit || 'מסיים ביקור...') : (t.checkin?.endVisit || 'סיים ביקור')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* QR Scanner Area */}
          <View style={{
            backgroundColor: theme.background.card,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            marginBottom: 32,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 6,
            borderWidth: 1,
            borderColor: theme.border.light
          }}>
            <View style={{
              width: Math.min(width * 0.6, 200),
              height: Math.min(width * 0.6, 200),
              borderWidth: 3,
              borderColor: theme.border.medium,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              backgroundColor: theme.background.surface
            }}>
              <Ionicons 
                name="qr-code" 
                size={80} 
                color={theme.text.muted} 
              />
            </View>

            <TouchableOpacity
              onPress={handleQRScan}
              disabled={checkinLoading}
              style={{
                backgroundColor: checkinLoading ? theme.primary[300] : theme.primary[500],
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 32,
                minWidth: 200,
                opacity: checkinLoading ? 0.6 : 1
              }}
            >
              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Ionicons 
                  name="scan" 
                  size={20} 
                  color={theme.text.inverse}
                  style={{ 
                    marginLeft: isRTL ? 0 : 8,
                    marginRight: isRTL ? 8 : 0
                  }}
                />
                <Text style={{
                  color: theme.text.inverse,
                  fontSize: 18,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  {t.checkin?.scanQR || 'סרוק QR'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Manual Check-in */}
          <TouchableOpacity
            onPress={handleManualCheckin}
            disabled={checkinLoading}
            style={{
              backgroundColor: checkinLoading ? theme.background.disabled : theme.background.card,
              borderRadius: 16,
              padding: 20,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: checkinLoading ? 0.05 : 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 1,
              borderColor: theme.border.light,
              marginBottom: 32,
              opacity: checkinLoading ? 0.6 : 1
            }}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: theme.secondary[100],
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <Ionicons name="location" size={24} color={theme.secondary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.text.primary,
                  marginBottom: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.checkin?.manualCheckin || 'צ\'ק-אין ידני'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.checkin?.selectParkFromList || 'בחר גן מהרשימה'}
                </Text>
              </View>
            </View>
            <Ionicons 
              name={isRTL ? "chevron-back" : "chevron-forward"} 
              size={20} 
              color={theme.text.muted} 
            />
          </TouchableOpacity>

          {/* Recent Check-ins */}
          <View>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.text.primary,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t.checkin?.recentCheckins || 'ביקורים אחרונים'}
              </Text>
              <TouchableOpacity
                onPress={refreshData}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: theme.primary[50]
                }}
              >
                <Ionicons 
                  name="refresh" 
                  size={16} 
                  color={theme.primary[500]} 
                />
              </TouchableOpacity>
            </View>
            
            {loadingRecentVisits ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: 32
              }}>
                <ActivityIndicator size="small" color={theme.primary[500]} />
                <Text style={{
                  color: theme.text.secondary,
                  marginTop: 8,
                  fontSize: 14
                }}>
                  {t.checkin?.loadingRecentVisits || 'טוען ביקורים אחרונים...'}
                </Text>
              </View>
            ) : recentVisits.length > 0 ? (
              recentVisits.map((visit) => {
                const gardenName = typeof visit.garden === 'object' && visit.garden ? visit.garden.name : 'גן כלבים';
                const visitDate = new Date(visit.checkOutTime || visit.checkInTime);
                const timeAgo = getTimeAgo(visitDate);
                const duration = visit.duration ? Math.round(visit.duration / 60) : null; // Convert seconds to minutes
                
                return (
                  <View key={visit._id} style={{
                    backgroundColor: theme.background.card,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.border.light
                  }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      backgroundColor: theme.primary[100],
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: isRTL ? 0 : 12,
                      marginLeft: isRTL ? 12 : 0
                    }}>
                      <Ionicons name="leaf" size={20} color={theme.primary[500]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: theme.text.primary,
                        textAlign: isRTL ? 'right' : 'left'
                      }}>
                        {gardenName}
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: theme.text.secondary,
                        marginTop: 2,
                        textAlign: isRTL ? 'right' : 'left'
                      }}>
                        {timeAgo}{duration ? ` • ${duration} ${isRTL ? 'דק\'' : 'min'}` : ''}
                      </Text>
                      {visit.dogs && Array.isArray(visit.dogs) && visit.dogs.length > 0 && (
                        <Text style={{
                          fontSize: 12,
                          color: theme.text.muted,
                          marginTop: 2,
                          textAlign: isRTL ? 'right' : 'left'
                        }}>
                          {t.checkin?.with || 'עם'}: {visit.dogs.map(dog => typeof dog === 'object' ? dog.name : dog).join(', ')}
                        </Text>
                      )}
                    </View>
                    <View style={{
                      backgroundColor: theme.primary[100],
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4
                    }}>
                      <Text style={{
                        color: theme.primary[700],
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        +10 {t.checkin?.points || 'נק\''}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{
                alignItems: 'center',
                paddingVertical: 32,
                backgroundColor: theme.background.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border.light
              }}>
                <Ionicons 
                  name="time-outline" 
                  size={32} 
                  color={theme.text.muted} 
                  style={{ marginBottom: 8 }}
                />
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 16,
                  fontWeight: '500',
                  marginBottom: 4
                }}>
                  {t.checkin?.noRecentVisits || 'אין ביקורים אחרונים'}
                </Text>
                <Text style={{
                  color: theme.text.muted,
                  fontSize: 14,
                  textAlign: 'center'
                }}>
                  {t.checkin?.firstCheckinPrompt || 'בצע את הצ\'ק-אין הראשון שלך כדי לראות כאן את ההיסטוריה'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {isGuest ? <GuestView /> : <UserView />}
      
      {/* Garden Selection Modal */}
      <Modal
        visible={showGardenSelection}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowGardenSelection(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowGardenSelection(false)}
        >
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Handle */}
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: '#E5E7EB',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20,
            }} />

            {/* Header */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 16,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {t.checkin?.selectGardenForCheckin || 'בחר גן לצ\'ק-אין'}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: isRTL ? 'right' : 'left',
                  marginTop: 2,
                }}>
                  {t.checkin?.selectCurrentGarden || 'בחר את הגן שבו אתה נמצא'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowGardenSelection(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 20 }}>
                {gardensLoading ? (
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 40,
                  }}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={{
                      color: '#6B7280',
                      marginTop: 12,
                      fontSize: 14,
                    }}>
                      {t.checkin?.loadingGardens || 'טוען גנים...'}
                    </Text>
                  </View>
                ) : gardens.length === 0 ? (
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 40,
                  }}>
                    <Ionicons name="leaf-outline" size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
                    <Text style={{
                      color: '#6B7280',
                      fontSize: 16,
                      fontWeight: '500',
                      marginBottom: 4
                    }}>
                      {t.checkin?.noGardensAvailable || 'אין גנים זמינים'}
                    </Text>
                    <Text style={{
                      color: '#9CA3AF',
                      fontSize: 14,
                      textAlign: 'center',
                      marginBottom: 16
                    }}>
                      {t.checkin?.noGardensInArea || 'לא ניתן למצוא גנים כלבים באזור'}
                    </Text>
                    <TouchableOpacity
                      onPress={loadGardens}
                      style={{
                        backgroundColor: theme.primary[100],
                        borderRadius: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 8
                      }}
                    >
                      <Text style={{
                        color: theme.primary[700],
                        fontSize: 14,
                        fontWeight: '600'
                      }}>
                        {t.common?.retry || 'נסה שוב'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {gardens.map((garden) => (
                      <TouchableOpacity
                        key={garden._id}
                        onPress={() => handleGardenSelect(garden)}
                        style={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: 16,
                          padding: 16,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                        }}
                      >
                        {/* Garden Icon */}
                        <View style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: theme.primary[100],
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: isRTL ? 0 : 16,
                          marginLeft: isRTL ? 16 : 0,
                        }}>
                          <Ionicons name="leaf" size={24} color={theme.primary[500]} />
                        </View>

                        {/* Garden Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: '#1F2937',
                            textAlign: isRTL ? 'right' : 'left',
                          }}>
                            {garden.name}
                          </Text>
                          {garden.location?.address && (
                            <Text style={{
                              fontSize: 14,
                              color: '#6B7280',
                              textAlign: isRTL ? 'right' : 'left',
                              marginTop: 2,
                            }}>
                              {garden.location.address}
                            </Text>
                          )}
                        </View>

                        {/* Arrow */}
                        <Ionicons 
                          name={isRTL ? "chevron-back" : "chevron-forward"} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Dog Selection Modal */}
      <DogSelectionModal
        visible={dogSelectionModalVisible}
        onClose={() => {
          setDogSelectionModalVisible(false);
          setSelectedGarden(null);
        }}
        dogs={dogs || []}
        onSelectDog={handleDogSelection}
        title={t.checkin?.selectDogsForCheckin || "בחר כלבים לצ'ק-אין"} 
        subtitle={`${t.checkin?.selectDogsAt || "בחר את הכלבים שתרצה לבצע צ'ק-אין ב"}${selectedGarden?.name || 'גן'}`}
      />
    </View>
  );
}