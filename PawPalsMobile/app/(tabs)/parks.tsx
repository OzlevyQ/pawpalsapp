import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ListRenderItem,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import gardensService, { Garden } from '../../services/api/gardens';
import { visitsApi, Visit } from '../../services/api';
import { useLocation, calculateDistance, formatDistance } from '../../hooks/useLocation';
import NavigationModal from '../../components/NavigationModal';
import DogSelectionModal from '../../components/DogSelectionModal';

type FilterType = 'all' | 'nearMe' | 'openNow' | 'highRating';

interface GardenWithDistance extends Garden {
  distance?: number;
}

export default function ParksScreen() {
  const [gardens, setGardens] = useState<GardenWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [dogSelectionModalVisible, setDogSelectionModalVisible] = useState(false);
  const [checkinGarden, setCheckinGarden] = useState<Garden | null>(null);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [loadingActiveVisit, setLoadingActiveVisit] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user, dogs } = useUser();
  const router = useRouter();
  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    permissionStatus,
    requestPermission
  } = useLocation();

  useEffect(() => {
    loadGardens();
    if (!isGuest) {
      loadActiveVisit();
    } else {
      // Ensure activeVisit is null for guests
      setActiveVisit(null);
    }
  }, [activeFilter, isGuest]);

  // Load gardens when location becomes available
  useEffect(() => {
    if (location && activeFilter === 'nearMe') {
      loadGardens();
    }
  }, [location]);

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

  const handleCheckOut = async () => {
    if (!activeVisit) return;

    Alert.alert(
      t.parks.checkout,
      t.parks.checkoutConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        { 
          text: t.parks.endVisit, 
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
                  t.parks.checkoutSuccess,
                  t.parks.checkoutSuccessMessage,
                  [{ text: t.common.ok }]
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
                t.parks.error,
                t.parks.checkoutError.replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                [{ text: t.common.ok }]
              );
            }
          }
        },
      ]
    );
  };


  const loadGardens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let gardensData;
      
      if (activeFilter === 'nearMe') {
        if (location) {
          try {
            gardensData = await gardensService.getNearbyGardens(
              location.latitude,
              location.longitude,
              10 // 10km radius
            );
          } catch (nearbyError) {
            // Fallback to all gardens if nearby fails
            gardensData = await gardensService.getGardens({ limit: 50, page: 1 });
          }
        } else {
          // Request location permission if not available
          const granted = await requestPermission();
          if (!granted) {
            setError(t.parks.locationPermissionRequired);
            setActiveFilter('all');
            return;
          }
          return; // Will reload when location becomes available
        }
      } else {
        const params: any = {
          limit: 50,
          page: 1
        };
        
        gardensData = await gardensService.getGardens(params);
      }
      
      
      // The service layer now handles format normalization
      if (!Array.isArray(gardensData)) {
        console.error('Expected array but got:', gardensData);
        setError(t.parks.dataFormatError);
        setGardens([]);
        return;
      }
      
      let gardensWithDistance = gardensData;
      
      
      // Calculate distances if user location is available
      if (location) {
        gardensWithDistance = gardensWithDistance.map((garden: Garden) => {
          return {
            ...garden,
            distance: garden.location?.coordinates?.coordinates ? calculateDistance(
              location.latitude,
              location.longitude,
              garden.location.coordinates.coordinates[1],
              garden.location.coordinates.coordinates[0]
            ) : undefined
          };
        });
        
        // Sort by distance if nearMe filter is active
        if (activeFilter === 'nearMe') {
          gardensWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
      }
      
      setGardens(gardensWithDistance);
    } catch (error) {
      console.error('Error loading gardens:', error);
      setError(t.parks.serverConnectionError);
      setGardens([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadGardens();
    setRefreshing(false);
  }, [activeFilter, location]);

  // Handle search and filtering
  const filteredGardens = useMemo(() => {
    if (!Array.isArray(gardens)) {
      return [];
    }
    
    let filtered = [...gardens];
    
    // Apply search filter
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(garden => 
        garden.name?.toLowerCase().includes(query) ||
        garden.description?.toLowerCase().includes(query) ||
        garden.location?.address?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [gardens, searchText]);

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const handleGardenPress = (garden: Garden) => {
    router.push(`/garden-details?gardenId=${garden._id}`);
  };

  const handleCheckIn = async (garden: Garden) => {
    console.log('handleCheckIn called for garden:', garden.name);
    
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
    if (!dogs || dogs.length === 0) {
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

  const handleNavigate = (garden: Garden) => {
    console.log('handleNavigate called for garden:', garden.name);
    if (!garden.location?.coordinates?.coordinates || garden.location.coordinates.coordinates.length < 2) {
      Alert.alert(
        t.navigationNotAvailable,
        isRTL ? 'מיקום הגן לא זמין' : 'Garden location not available',
        [{ text: t.cancel }]
      );
      return;
    }
    
    console.log('Setting selected garden and showing modal');
    setSelectedGarden(garden);
    setNavigationModalVisible(true);
  };

  // Garden card item height estimation for FlatList optimization
  const GARDEN_ITEM_HEIGHT = isGuest ? 190 : 250; // Different heights based on user type

  const renderGardenCard: ListRenderItem<GardenWithDistance> = useCallback(({ item: garden }) => (
    <TouchableOpacity 
      onPress={() => handleGardenPress(garden)} 
      style={{
        backgroundColor: theme.background.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        marginHorizontal: 16,
        shadowColor: theme.shadow.medium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.border.light
      }}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
        <View style={{
          width: 56,
          height: 56,
          backgroundColor: theme.primary[100],
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: isRTL ? 0 : 16,
          marginLeft: isRTL ? 16 : 0
        }}>
          <Ionicons name="leaf" size={28} color={theme.primary[500]} />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: theme.text.primary,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {garden.name}
            </Text>
            <View style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: (garden.currentOccupancy || 0) < ((garden.maxDogs || garden.capacity?.maxDogs || 1)) * 0.8 ? '#10B981' : '#F59E0B'
            }} />
          </View>
          
          {garden.description && (
            <Text style={{
              color: theme.text.secondary,
              fontSize: 15,
              marginBottom: 16,
              lineHeight: 22,
              textAlign: isRTL ? 'right' : 'left'
            }} numberOfLines={2}>
              {garden.description}
            </Text>
          )}
          
          {/* Stats */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
          }}>
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', 
              alignItems: 'center',
              backgroundColor: theme.background.surface,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20
            }}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={{
                color: '#F59E0B',
                fontWeight: '600',
                fontSize: 14,
                marginLeft: isRTL ? 0 : 4,
                marginRight: isRTL ? 4 : 0
              }}>
                {garden.averageRating ? garden.averageRating.toFixed(1) : '—'}
              </Text>
              <Text style={{
                color: theme.text.muted,
                fontSize: 13,
                marginLeft: isRTL ? 0 : 4,
                marginRight: isRTL ? 4 : 0
              }}>
                ({garden.totalReviews || 0})
              </Text>
            </View>
            
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', 
              alignItems: 'center',
              backgroundColor: theme.background.surface,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20
            }}>
              <Ionicons name="people" size={16} color={theme.text.muted} />
              <Text style={{
                color: theme.text.secondary,
                fontSize: 14,
                fontWeight: '500',
                marginLeft: isRTL ? 0 : 4,
                marginRight: isRTL ? 4 : 0
              }}>
                {garden.currentOccupancy || 0}/{garden.maxDogs || garden.capacity?.maxDogs || '—'}
              </Text>
            </View>
            
            {garden.distance && (
              <View style={{ 
                flexDirection: isRTL ? 'row-reverse' : 'row', 
                alignItems: 'center',
                backgroundColor: theme.background.surface,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20
              }}>
                <Ionicons name="location" size={16} color={theme.text.muted} />
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  fontWeight: '500',
                  marginLeft: isRTL ? 0 : 4,
                  marginRight: isRTL ? 4 : 0
                }}>
                  {formatDistance(garden.distance)}
                </Text>
              </View>
            )}
          </View>
          
          {/* Type Badge */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
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
                {garden.type === 'public' ? t.public : t.private}
              </Text>
            </View>
            
            {garden.location?.address && (
              <Text style={{
                fontSize: 12,
                color: theme.text.muted,
                textAlign: isRTL ? 'right' : 'left'
              }} numberOfLines={1}>
                {garden.location.address}
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {!isGuest && (
        <View style={{
          flexDirection: 'row',
          marginTop: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: theme.border.light,
          gap: 12
        }}>
          <TouchableOpacity 
            style={{
              flex: 1,
              backgroundColor: theme.primary[500],
              borderRadius: 12,
              paddingVertical: 14,
              shadowColor: theme.primary[500],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3
            }}
            onPress={() => handleCheckIn(garden)}
          >
            <Text style={{
              color: theme.text.inverse,
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 15
            }}>
              {t.checkIn}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{
              flex: 1,
              backgroundColor: theme.background.surface,
              borderRadius: 12,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: theme.border.medium
            }}
            onPress={() => handleNavigate(garden)}
          >
            <Text style={{
              color: theme.text.secondary,
              textAlign: 'center',
              fontWeight: '600',
              fontSize: 15
            }}>
              {t.navigate}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  ), [theme, isRTL, t, isGuest, handleGardenPress, handleCheckIn, handleNavigate, formatDistance]);

  // FlatList key extractor
  const keyExtractor = useCallback((item: GardenWithDistance) => item._id, []);

  // FlatList getItemLayout for performance
  const getItemLayout = useCallback(
    (data: GardenWithDistance[] | null | undefined, index: number) => ({
      length: GARDEN_ITEM_HEIGHT,
      offset: GARDEN_ITEM_HEIGHT * index,
      index,
    }),
    [GARDEN_ITEM_HEIGHT]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {/* Header */}
      <View style={{
        backgroundColor: theme.background.primary,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.medium
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: theme.text.primary,
          marginBottom: 16,
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {t.dogParks}
        </Text>
        
        {/* Search Bar */}
        <View style={{
          backgroundColor: theme.background.surface,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center'
        }}>
          <Ionicons name="search" size={20} color={theme.text.muted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t.searchParks}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text.primary,
              marginLeft: isRTL ? 0 : 12,
              marginRight: isRTL ? 12 : 0
            }}
            textAlign={isRTL ? 'right' : 'left'}
            placeholderTextColor={theme.text.muted}
          />
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={{
        backgroundColor: theme.background.primary,
        paddingHorizontal: 16,
        paddingVertical: 12
      }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ flexDirection: 'row' }}
        >
          {/* All Filter */}
          <TouchableOpacity 
            style={{
              backgroundColor: activeFilter === 'all' ? theme.primary[500] : theme.background.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8
            }}
            onPress={() => handleFilterPress('all')}
          >
            <Text style={{ 
              color: activeFilter === 'all' ? theme.text.inverse : theme.text.secondary, 
              fontWeight: '600', 
              fontSize: 14 
            }}>
              {t.all}
            </Text>
          </TouchableOpacity>
          
          {/* Near Me Filter */}
          <TouchableOpacity 
            style={{
              backgroundColor: activeFilter === 'nearMe' ? theme.primary[500] : theme.background.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}
            onPress={() => handleFilterPress('nearMe')}
          >
            {locationLoading && activeFilter === 'nearMe' && (
              <ActivityIndicator 
                size="small" 
                color={activeFilter === 'nearMe' ? theme.text.inverse : theme.text.secondary}
                style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
              />
            )}
            <Text style={{ 
              color: activeFilter === 'nearMe' ? theme.text.inverse : theme.text.secondary, 
              fontWeight: '600', 
              fontSize: 14 
            }}>
              {t.nearMe}
            </Text>
          </TouchableOpacity>
          
          {/* Open Now Filter */}
          <TouchableOpacity 
            style={{
              backgroundColor: activeFilter === 'openNow' ? theme.primary[500] : theme.background.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8
            }}
            onPress={() => handleFilterPress('openNow')}
          >
            <Text style={{ 
              color: activeFilter === 'openNow' ? theme.text.inverse : theme.text.secondary, 
              fontWeight: '600', 
              fontSize: 14 
            }}>
              {t.openNow}
            </Text>
          </TouchableOpacity>
          
          {/* High Rating Filter */}
          <TouchableOpacity 
            style={{
              backgroundColor: activeFilter === 'highRating' ? theme.primary[500] : theme.background.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8
            }}
            onPress={() => handleFilterPress('highRating')}
          >
            <Text style={{ 
              color: activeFilter === 'highRating' ? theme.text.inverse : theme.text.secondary, 
              fontWeight: '600', 
              fontSize: 14 
            }}>
              {t.highRating}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Gardens List */}
      {loading ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 80
        }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{
            color: theme.text.secondary,
            marginTop: 12,
            fontSize: 16
          }}>{t.loadingParks}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGardens || []}
          renderItem={renderGardenCard}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          style={{ flex: 1, backgroundColor: theme.background.secondary }}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary[500]]}
              tintColor={theme.primary[500]}
            />
          }
          // Performance optimizations
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          windowSize={10}
          removeClippedSubviews={true}
          onEndReachedThreshold={0.5}
          // Header components for active visit and guest info
          ListHeaderComponent={
            <View>
              {/* Active Visit Card */}
              {activeVisit && activeVisit._id && !isGuest && (
                <View style={{
                  backgroundColor: '#F0FDF4',
                  borderWidth: 2,
                  borderColor: '#10B981',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  marginHorizontal: 16,
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
                        צ'ק-אין פעיל
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#065F46',
                        textAlign: isRTL ? 'right' : 'left',
                      }}>
                        {typeof activeVisit.garden === 'object' ? activeVisit.garden.name : 'גן כלבים'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{
                      fontSize: 14,
                      color: '#065F46',
                      textAlign: isRTL ? 'right' : 'left',
                      flex: 1,
                    }}>
                      {activeVisit.dogs && Array.isArray(activeVisit.dogs) ? 
                        `כלבים: ${activeVisit.dogs.map(dog => typeof dog === 'object' ? dog.name : dog).join(', ')}` :
                        'עם הכלב שלך'
                      }
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={handleCheckOut}
                    style={{
                      backgroundColor: '#EF4444',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      alignSelf: isRTL ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: '600',
                    }}>
                      סיים ביקור
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {isGuest && (
                <View style={{
                  backgroundColor: theme.primary[50],
                  borderWidth: 1,
                  borderColor: theme.primary[200],
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  marginHorizontal: 16
                }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <Ionicons name="information-circle" size={20} color={theme.primary[500]} />
                    <Text style={{
                      color: theme.primary[800],
                      fontWeight: '500',
                      marginLeft: isRTL ? 0 : 8,
                      marginRight: isRTL ? 8 : 0,
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {t.signUpForCheckinAndMore}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Error State */}
              {error && (
                <View style={{
                  backgroundColor: theme.background.card,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  marginHorizontal: 16,
                  borderWidth: 1,
                  borderColor: '#FCA5A5'
                }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={{
                      color: '#EF4444',
                      fontWeight: '500',
                      marginLeft: isRTL ? 0 : 8,
                      marginRight: isRTL ? 8 : 0,
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {error}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={!error ? (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 80
            }}>
              <Ionicons name="leaf-outline" size={64} color={theme.text.muted} />
              <Text style={{
                color: theme.text.secondary,
                textAlign: 'center',
                fontSize: 16,
                marginTop: 16
              }}>
                {searchText ? 
                  (isRTL ? 'לא נמצאו גנים עם החיפוש' : 'No parks found matching your search') :
                  (isRTL ? 'אין גנים זמינים' : 'No parks available')
                }
              </Text>
            </View>
          ) : null}
        />
      )}
      
      {/* Navigation Modal */}
      <NavigationModal
        visible={navigationModalVisible && selectedGarden !== null}
        onClose={() => {
          setNavigationModalVisible(false);
          setSelectedGarden(null);
        }}
        options={{
          latitude: selectedGarden?.location?.coordinates?.coordinates?.[1] || 0,
          longitude: selectedGarden?.location?.coordinates?.coordinates?.[0] || 0,
          destinationName: selectedGarden?.name || '',
          address: selectedGarden?.location?.address || '',
        }}
      />

      {/* Dog Selection Modal */}
      <DogSelectionModal
        visible={dogSelectionModalVisible}
        onClose={() => {
          setDogSelectionModalVisible(false);
          setCheckinGarden(null);
        }}
        dogs={dogs || []}
        onSelectDog={handleDogSelection}
        title="בחר כלבים לצ'ק-אין"
        subtitle={`בחר את הכלבים שתרצה לבצע צ'ק-אין ב${checkinGarden?.name || 'גן'}`}
      />
    </SafeAreaView>
  );
}