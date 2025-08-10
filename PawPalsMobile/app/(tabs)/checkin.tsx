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
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user, dogs } = useUser();
  const { width, height } = Dimensions.get('window');

  // Load active visit when component mounts
  useEffect(() => {
    if (!isGuest) {
      loadActiveVisit();
    } else {
      // Ensure activeVisit is null for guests
      setActiveVisit(null);
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
      }
    } catch (error) {
      console.error('Error loading gardens:', error);
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
        'יש כבר צ\'ק-אין פעיל',
        'עליך לסיים את הביקור הנוכחי לפני שתוכל לבצע צ\'ק-אין חדש',
        [
          { text: t.cancel, style: 'cancel' },
          { text: 'סיים ביקור', onPress: handleCheckOut },
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
    
    // Always show dog selection modal (even for single dog)
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
    if (selectedGarden) {
      performCheckIn(selectedGarden, selectedDogs);
      setDogSelectionModalVisible(false);
      setSelectedGarden(null);
    }
  };

  const handleGuestAction = () => {
    Alert.alert(
      t.registrationRequired || 'נדרשת הרשמה',
      t.signUpForCheckin || 'כדי לבצע צ\'ק-אין, אנא הירשם או התחבר לחשבון',
      [
        { text: t.cancel || 'ביטול', style: 'cancel' },
        { text: t.signUpNow || 'הירשם', onPress: () => router.push('/(auth)/register') },
        { text: t.login || 'התחברות', onPress: () => router.push('/(auth)/login') },
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
        {t.quickCheckin || 'צ\'ק-אין מהיר'}
      </Text>
      <Text style={{
        color: theme.text.secondary,
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 32,
        lineHeight: 24
      }}>
        {t.scanQrToCheckin || 'סרוק QR כדי לבצע צ\'ק-אין בגן כלבים'}
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
          {t.signUpForSocial || 'הירשם עכשיו'}
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
            {t.quickCheckin || 'צ\'ק-אין מהיר'}
          </Text>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 16,
            textAlign: 'center'
          }}>
            {t.scanOrSelectPark || 'סרוק QR או בחר גן ידנית'}
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
                    צ'ק-אין פעיל בגן
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
                    `כלבים: ${activeVisit.dogs.map(dog => typeof dog === 'object' ? dog.name : dog).join(', ')}` :
                    'עם הכלב שלך'
                  }
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#059669',
                  textAlign: isRTL ? 'right' : 'left',
                  marginTop: 4,
                }}>
                  החל: {new Date(activeVisit.checkInTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={handleCheckOut}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  alignSelf: 'center',
                  minWidth: 120,
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  סיים ביקור
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
              style={{
                backgroundColor: theme.primary[500],
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 32,
                minWidth: 200,
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
                  {t.scanQR || 'סרוק QR'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Manual Check-in */}
          <TouchableOpacity
            onPress={handleManualCheckin}
            style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 1,
              borderColor: theme.border.light,
              marginBottom: 32
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
                  {t.manualCheckin || 'צ\'ק-אין ידני'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.selectParkFromList || 'בחר גן מהרשימה'}
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
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.text.primary,
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {t.recentCheckins || 'צ\'ק-אינים אחרונים'}
            </Text>
            
            {[1, 2].map((item) => (
              <View key={item} style={{
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
                    גן כלבים מרכזי {item}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: theme.text.secondary,
                    marginTop: 2,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    לפני {item === 1 ? '2' : '5'} שעות
                  </Text>
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
                    +{item === 1 ? '10' : '5'} נק'
                  </Text>
                </View>
              </View>
            ))}
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
                  בחר גן לצ'ק-אין
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#6B7280',
                  textAlign: isRTL ? 'right' : 'left',
                  marginTop: 2,
                }}>
                  בחר את הגן שבו אתה נמצא
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
                      טוען גנים...
                    </Text>
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
        title="בחר כלבים לצ'ק-אין" 
        subtitle={`בחר את הכלבים שתרצה לבצע צ'ק-אין ב${selectedGarden?.name || 'גן'}`}
      />
    </View>
  );
}