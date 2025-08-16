import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import gardensService, { Garden } from '../services/api/gardens';
import { visitsApi, Visit } from '../services/api';
import { useLocation, calculateDistance, formatDistance } from '../hooks/useLocation';
import NavigationModal from '../components/NavigationModal';
import DogSelectionModal from '../components/DogSelectionModal';

const { width: screenWidth } = Dimensions.get('window');

export default function GardenDetailsScreen() {
  const { gardenId } = useLocalSearchParams<{ gardenId: string }>();
  const [garden, setGarden] = useState<Garden | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [dogSelectionModalVisible, setDogSelectionModalVisible] = useState(false);
  const [checkinGarden, setCheckinGarden] = useState<Garden | null>(null);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loadingActiveVisit, setLoadingActiveVisit] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user, dogs } = useUser();
  const { location } = useLocation();
  
  // Memoize dogs array to prevent unnecessary re-renders
  const stableDogs = useMemo(() => dogs || [], [dogs?.length, dogs?.map(d => d._id).join(',') || '']);

  useEffect(() => {
    if (gardenId) {
      loadGardenDetails();
      loadGardenReviews();
      loadGardenVisitors();
      if (!isGuest) {
        loadActiveVisit();
      } else {
        // Ensure activeVisit is null for guests
        setActiveVisit(null);
      }
    }
  }, [gardenId, isGuest, loadGardenDetails, loadGardenReviews, loadGardenVisitors, loadActiveVisit]);

  const loadActiveVisit = useCallback(async () => {
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
  }, [isGuest]);

  const loadGardenDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const garden = await gardensService.getGardenById(gardenId!);
      setGarden(garden);
    } catch (error) {
      console.error('Error loading garden details:', error);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  }, [gardenId]);

  const loadGardenReviews = useCallback(async () => {
    try {
      // Reviews functionality would need to be implemented in gardensService
      // const reviews = await gardensService.getGardenReviews(gardenId!, { limit: 5 });
      // setReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }, [gardenId]);

  const loadGardenVisitors = useCallback(async () => {
    try {
      // Visitors functionality would need to be implemented in gardensService
      // const visitors = await gardensService.getGardenVisitors(gardenId!);
      // setVisitors(visitors);
    } catch (error) {
      console.error('Error loading visitors:', error);
    }
  }, [gardenId]);

  const handleCheckOut = async () => {
    if (!activeVisit) return;

    Alert.alert(
      'צ\'ק-אאוט',
      'האם אתה בטוח שברצונך לסיים את הביקור?',
      [
        { text: t.cancel, style: 'cancel' },
        { 
          text: 'סיים ביקור', 
          onPress: async () => {
            try {
              console.log('Starting checkout process for visit:', activeVisit._id);
              const result = await visitsApi.checkout(activeVisit._id);
              
              if (result.success) {
                // Clear active visit immediately
                setActiveVisit(null);
                
                // Also reload active visit to ensure backend state is synced
                await loadActiveVisit();
                
                Alert.alert(
                  'צ\'ק-אאוט הושלם! 👋',
                  'הביקור הסתיים בהצלחה',
                  [{ text: t.ok }]
                );
                
                console.log('Checkout completed successfully');
              } else {
                console.error('Checkout failed with error:', result.error);
                throw new Error(result.error || 'Check-out failed');
              }
            } catch (error) {
              console.error('Check-out error:', error);
              
              // Try to reload active visit in case of error to ensure UI is in sync
              await loadActiveVisit();
              
              Alert.alert(
                'שגיאה',
                `אירעה שגיאה בסיום הביקור: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}. נסה שוב.`,
                [{ text: t.ok }]
              );
            }
          }
        },
      ]
    );
  };

  const handleCheckIn = async () => {
    console.log('handleCheckIn called for garden:', garden?.name);
    
    // Check if user already has an active visit
    if (activeVisit) {
      Alert.alert(
        'יש כבר צ\'ק-אין פעיל',
        'עליך לסיים את הביקור הנוכחי לפני שתוכל לבצע צ\'ק-אין חדש',
        [
          { text: t.cancel, style: 'cancel' },
          { text: 'סיים ביקור', onPress: handleCheckOut },
        ]
      );
      return;
    }
    
    if (isGuest) {
      Alert.alert(
        t.registrationRequired,
        t.signUpForCheckinAndMore,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.signUpNow, onPress: () => router.push('/(auth)/register') },
          { text: t.login, onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    
    // Check if user has dogs
    if (!stableDogs || stableDogs.length === 0) {
      Alert.alert(
        'אין כלבים רשומים',
        'כדי לבצע צ\'ק-אין, תחילה הוסף כלב בפרופיל שלך',
        [
          { text: t.cancel, style: 'cancel' },
          { text: 'הוסף כלב', onPress: () => router.push('/add-dog') },
        ]
      );
      return;
    }
    
    if (!garden) {
      Alert.alert(
        'שגיאה',
        'לא ניתן לבצע צ\'ק-אין - פרטי הגן לא נטענו',
        [{ text: t.ok }]
      );
      return;
    }
    
    // Set the selected garden and show dog selection modal
    setCheckinGarden(garden);
    setDogSelectionModalVisible(true);
  };

  const performCheckIn = async (garden: Garden, selectedDogs: any[]) => {
    try {
      const dogNames = selectedDogs.map(dog => dog.name).join(', ');
      const dogIds = selectedDogs.map(dog => dog._id);
      
      console.log(`Checking in ${dogNames} to ${garden.name}`);
      
      // Call the actual API to perform check-in
      const result = await visitsApi.checkin(garden._id, dogIds);
      
      if (result.success && result.data && result.data._id) {
        // Update active visit
        setActiveVisit(result.data);
        
        Alert.alert(
          'צ\'ק-אין בוצע בהצלחה! 🎉',
          `${dogNames} בוצע צ\'ק-אין בגן ${garden.name}`,
          [{ text: t.ok }]
        );
      } else {
        throw new Error(result.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert(
        'שגיאה',
        'אירעה שגיאה בביצוע הצ\'ק-אין. נסה שוב.',
        [{ text: t.ok }]
      );
    }
  };

  const handleDogSelection = (selectedDogs: any[]) => {
    if (checkinGarden) {
      performCheckIn(checkinGarden, selectedDogs);
      setDogSelectionModalVisible(false);
      setCheckinGarden(null);
    }
  };

  const handleNavigate = () => {
    if (!garden || !garden.location?.coordinates?.coordinates || garden.location.coordinates.coordinates.length < 2) {
      Alert.alert(
        t.navigationNotAvailable,
        isRTL ? 'מיקום הגן לא זמין' : 'Garden location not available',
        [{ text: t.cancel }]
      );
      return;
    }
    
    setNavigationModalVisible(true);
  };

  const formatOpeningHours = (hours?: Garden['openingHours']) => {
    if (!hours) return t.hoursNotAvailable || 'Hours not available';
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today as keyof typeof hours];
    
    if (todayHours) {
      if (todayHours.closed) {
        return t.closedToday || 'Closed today';
      }
      return `${todayHours.open} - ${todayHours.close}`;
    }
    
    return t.hoursNotAvailable || 'Hours not available';
  };

  const getOpenStatus = (hours?: Garden['openingHours']) => {
    if (!hours) return { status: t.unknown || 'Unknown', isOpen: false };
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today as keyof typeof hours];
    
    if (todayHours) {
      if (todayHours.closed) {
        return {
          status: t.closedNowStatus || 'Closed',
          isOpen: false
        };
      }
      
      // Check if currently within opening hours
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      const isCurrentlyOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;
      
      return {
        status: isCurrentlyOpen ? (t.openNowStatus || 'Open') : (t.closedNowStatus || 'Closed'),
        isOpen: isCurrentlyOpen
      };
    }
    
    return { status: t.unknown || 'Unknown', isOpen: false };
  };

  const renderFacility = (key: string, value: boolean, icon: string, label: string) => {
    if (!value) return null;
    
    return (
      <View key={key} style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: theme.primary[50],
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.primary[100]
      }}>
        <Ionicons name={icon as any} size={18} color={theme.primary[500]} />
        <Text style={{
          color: theme.primary[700],
          fontSize: 13,
          fontWeight: '600',
          marginLeft: isRTL ? 0 : 8,
          marginRight: isRTL ? 8 : 0
        }}>
          {label}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{ 
            color: theme.text.secondary, 
            marginTop: 16, 
            fontSize: 16 
          }}>
            {isRTL ? 'טוען פרטי גן...' : 'Loading garden details...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !garden) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="alert-circle" size={64} color={theme.text.muted} />
          <Text style={{ 
            color: theme.text.primary, 
            fontSize: 18, 
            fontWeight: 'bold',
            marginTop: 16,
            textAlign: 'center'
          }}>
            {isRTL ? 'גן לא נמצא' : 'Garden Not Found'}
          </Text>
          <Text style={{ 
            color: theme.text.secondary, 
            fontSize: 16,
            marginTop: 8,
            textAlign: 'center'
          }}>
            {error || (isRTL ? 'לא ניתן לטעון את פרטי הגן' : 'Unable to load garden details')}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: theme.primary[500],
              borderRadius: 8,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 24
            }}
          >
            <Text style={{
              color: theme.text.inverse,
              fontSize: 16,
              fontWeight: '600'
            }}>
              {isRTL ? 'חזור' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const distance = location && garden.location?.coordinates?.coordinates?.length === 2 ? calculateDistance(
    location.latitude,
    location.longitude,
    garden.location.coordinates.coordinates[1], // latitude
    garden.location.coordinates.coordinates[0]  // longitude
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView style={{ flex: 1 }}>
        {/* Header Image */}
        <View style={{ height: 250, position: 'relative' }}>
          {garden.images && garden.images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setActiveImageIndex(index);
              }}
            >
              {garden.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={{ width: screenWidth, height: 250 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <LinearGradient
              colors={[theme.primary[400], theme.primary[600]]}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="leaf" size={64} color={theme.text.inverse} />
            </LinearGradient>
          )}
          
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: 50,
              left: isRTL ? undefined : 16,
              right: isRTL ? 16 : undefined,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
          </TouchableOpacity>

          {/* Image Indicator */}
          {garden.images && garden.images.length > 1 && (
            <View style={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {garden.images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === activeImageIndex ? 'white' : 'rgba(255,255,255,0.5)',
                    marginHorizontal: 4
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ padding: 20 }}>
          {/* Header Info */}
          <View style={{
            backgroundColor: theme.background.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4
          }}>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left',
                  marginBottom: 8
                }}>
                  {garden.name}
                </Text>
                
                {garden.description && (
                  <Text style={{
                    fontSize: 17,
                    color: theme.text.secondary,
                    textAlign: isRTL ? 'right' : 'left',
                    lineHeight: 24
                  }}>
                    {garden.description}
                  </Text>
                )}
              </View>
              
              <View style={{
                alignItems: isRTL ? 'flex-start' : 'flex-end',
                marginLeft: isRTL ? 0 : 12,
                marginRight: isRTL ? 12 : 0
              }}>
                {/* Status Indicator */}
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: (garden.currentOccupancy || 0) < (garden.maxDogs || 1) * 0.8 ? '#10B981' : '#F59E0B',
                  marginBottom: 8
                }} />
                
                {/* Type Badge */}
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 16,
                  backgroundColor: garden.type === 'public' ? '#dcfce7' : '#dbeafe'
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: garden.type === 'public' ? '#166534' : '#1e40af'
                  }}>
                    {garden.type === 'public' ? (isRTL ? 'ציבורי' : 'Public') : (isRTL ? 'פרטי' : 'Private')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: theme.border.light
            }}>
              {/* Rating */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={{
                  color: '#F59E0B',
                  fontWeight: '600',
                  fontSize: 16,
                  marginLeft: isRTL ? 0 : 4,
                  marginRight: isRTL ? 4 : 0
                }}>
                  {garden.averageRating ? garden.averageRating.toFixed(1) : '—'}
                </Text>
                <Text style={{
                  color: theme.text.muted,
                  fontSize: 14,
                  marginLeft: isRTL ? 0 : 4,
                  marginRight: isRTL ? 4 : 0
                }}>
                  ({garden.totalReviews || 0})
                </Text>
              </View>

              {/* Occupancy */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <Ionicons name="people" size={16} color={theme.text.muted} />
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 16,
                  fontWeight: '500',
                  marginLeft: isRTL ? 0 : 4,
                  marginRight: isRTL ? 4 : 0
                }}>
                  {garden.currentOccupancy || 0}/{garden.maxDogs || '—'}
                </Text>
              </View>

              {/* Distance */}
              {distance && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <Ionicons name="location" size={16} color={theme.text.muted} />
                  <Text style={{
                    color: theme.text.secondary,
                    fontSize: 16,
                    fontWeight: '500',
                    marginLeft: isRTL ? 0 : 4,
                    marginRight: isRTL ? 4 : 0
                  }}>
                    {formatDistance(distance)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Info */}
          <View style={{
            backgroundColor: theme.background.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: theme.text.primary,
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {t.details}
            </Text>

            {/* Address */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              marginBottom: 12
            }}>
              <View style={{
                backgroundColor: theme.primary[100],
                borderRadius: 8,
                padding: 8,
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name="location" size={20} color={theme.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {garden.location?.address || t.addressNotAvailable}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.address}
                </Text>
              </View>
            </View>

            {/* Hours */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              marginBottom: 12
            }}>
              <View style={{
                backgroundColor: theme.secondary[100],
                borderRadius: 8,
                padding: 8,
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name="time" size={20} color={theme.secondary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {formatOpeningHours(garden.openingHours)}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.hoursToday}
                </Text>
              </View>
            </View>
          </View>

          {/* Amenities */}
          {garden.amenities && garden.amenities.length > 0 && (
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 4
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: theme.text.primary,
                marginBottom: 16,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t.amenities || 'Amenities'}
              </Text>
              
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}>
                {garden.amenities.map((amenity, index) => (
                  <View key={index} style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    backgroundColor: theme.primary[50],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: theme.primary[100]
                  }}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary[500]} />
                    <Text style={{
                      color: theme.primary[700],
                      fontSize: 13,
                      fontWeight: '600',
                      marginLeft: isRTL ? 0 : 8,
                      marginRight: isRTL ? 8 : 0
                    }}>
                      {amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Current Visitors */}
          {visitors.length > 0 && (
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 12,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t.currentVisitors}
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: theme.text.secondary,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {visitors.length} {t.dogsCurrentlyActive}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 16,
            marginTop: 20
          }}>
            <TouchableOpacity
              onPress={handleCheckIn}
              disabled={checkingIn}
              style={{
                flex: 1,
                backgroundColor: theme.primary[500],
                borderRadius: 16,
                paddingVertical: 18,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: theme.primary[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6
              }}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color={theme.text.inverse} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={theme.text.inverse} />
                  <Text style={{
                    color: theme.text.inverse,
                    fontSize: 17,
                    fontWeight: '700',
                    marginLeft: isRTL ? 0 : 8,
                    marginRight: isRTL ? 8 : 0
                  }}>
                    {t.checkIn}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleNavigate}
              style={{
                flex: 1,
                backgroundColor: theme.background.surface,
                borderRadius: 16,
                paddingVertical: 18,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: theme.border.medium
              }}
            >
              <Ionicons name="navigate" size={20} color={theme.text.secondary} />
              <Text style={{
                color: theme.text.secondary,
                fontSize: 17,
                fontWeight: '600',
                marginLeft: isRTL ? 0 : 8,
                marginRight: isRTL ? 8 : 0
              }}>
                {t.navigate}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Navigation Modal */}
      <NavigationModal
        visible={navigationModalVisible && garden !== null}
        onClose={() => setNavigationModalVisible(false)}
        options={{
          latitude: garden?.location?.coordinates?.coordinates?.[1] || 0,
          longitude: garden?.location?.coordinates?.coordinates?.[0] || 0,
          destinationName: garden?.name || '',
          address: garden?.location?.address || '',
        }}
      />

      {/* Dog Selection Modal */}
      <DogSelectionModal
        visible={dogSelectionModalVisible}
        onClose={() => {
          setDogSelectionModalVisible(false);
          setCheckinGarden(null);
        }}
        dogs={stableDogs}
        onSelectDog={handleDogSelection}
        title="בחר כלבים לצ'ק-אין"
        subtitle={`בחר את הכלבים שתרצה לבצע צ'ק-אין ב${checkinGarden?.name || 'גן'}`}
      />
    </View>
  );
}