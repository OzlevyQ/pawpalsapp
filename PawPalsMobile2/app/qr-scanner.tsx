import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Vibration,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import DogSelectionModal from '../components/DogSelectionModal';
import { visitsApi, Garden } from '../services/api';
import gardensService from '../services/api/gardens';
import { useNotificationContext } from '../contexts/NotificationContext';
import CheckinService from '../services/checkinService';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width * 0.7, 280);

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [dogSelectionModalVisible, setDogSelectionModalVisible] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null);
  const [processingQR, setProcessingQR] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { dogs, isGuest, user } = useUser();
  const { sendLocalNotification } = useNotificationContext();
  
  const cameraRef = useRef<CameraView | null>(null);

  // Show toast message
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Animate in
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [toastOpacity]);

  // Auto hide toast effect
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
          setToastMessage('');
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showToast, toastOpacity]);

  useEffect(() => {
    // Request camera permission when component mounts
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Use the centralized checkin service for QR parsing
  const extractGardenIdFromQR = CheckinService.extractGardenIdFromQR;

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned || processingQR) return;
    
    setScanned(true);
    setProcessingQR(true);
    Vibration.vibrate(100);

    try {
      // Extract garden ID from QR code
      console.log('🔍 Scanning QR code data:', data);
      const gardenId = extractGardenIdFromQR(data);
      console.log('🆔 Extracted garden ID:', gardenId);
      
      if (!gardenId) {
        console.log('❌ Could not extract garden ID from QR:', data);
        showToastMessage(isRTL ? 'קוד QR לא תקין - נסה שוב' : 'Invalid QR code - try again');
        setScanned(false);
        setProcessingQR(false);
        return;
      }

      // Fetch garden details
      try {
        console.log('🌳 Fetching garden details from API for ID:', gardenId);
        const gardenResponse = await gardensService.getGardenById(gardenId);
        console.log('📦 Garden API response:', gardenResponse);
        console.log('🔍 Checking gardenResponse.success:', gardenResponse.success);
        console.log('🔍 Checking gardenResponse.data:', !!gardenResponse.data);
        console.log('🔍 Response keys:', Object.keys(gardenResponse));
        
        // Check if this is a direct garden object or wrapped response
        if (gardenResponse._id) {
          // Direct garden object - use it directly
          console.log('✅ Found direct garden object');
          var garden = gardenResponse;
        } else if (gardenResponse.success && gardenResponse.data) {
          // Wrapped response
          console.log('✅ Found wrapped garden response');
          var garden = gardenResponse.data;
        } else if (gardenResponse.data && gardenResponse.data._id) {
          // Data wrapped without success flag
          console.log('✅ Found data-wrapped garden');
          var garden = gardenResponse.data;
        } else {
          console.log('❌ Garden not found for ID:', gardenId);
          showToastMessage(isRTL ? 'גן לא נמצא - נסה שוב' : 'Garden not found - try again');
          setScanned(false);
          setProcessingQR(false);
          return;
        }

        console.log('🎯 Using garden object:', garden);
        setSelectedGarden(garden);

        // Handle check-in based on user state
        if (isGuest) {
          Alert.alert(
            isRTL ? 'נדרשת הרשמה' : 'Registration Required',
            isRTL ? 'כדי לבצע צ\'ק-אין, אנא הירשם או התחבר לחשבון' : 'To check-in, please sign up or login to your account',
            [
              { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel', onPress: handleGoBack },
              { text: isRTL ? 'הירשם' : 'Sign Up', onPress: () => router.push('/(auth)/register') },
              { text: isRTL ? 'התחברות' : 'Login', onPress: () => router.push('/(auth)/login') },
            ]
          );
          return;
        }

        // Check if user has any dogs
        if (!dogs || dogs.length === 0) {
          Alert.alert(
            isRTL ? 'אין כלבים רשומים' : 'No Dogs Registered',
            isRTL ? 'כדי לבצע צ\'ק-אין, תחילה הוסף כלב בפרופיל שלך' : 'To check-in, first add a dog in your profile',
            [
              { text: isRTL ? 'ביטול' : 'Cancel', style: 'cancel', onPress: handleGoBack },
              { text: isRTL ? 'הוסף כלב' : 'Add Dog', onPress: () => router.push('/add-dog') },
            ]
          );
          return;
        }

        // Check for active visit
        try {
          const activeVisitResponse = await visitsApi.getActiveVisit();
          if (activeVisitResponse.success && activeVisitResponse.data && activeVisitResponse.data._id) {
            Alert.alert(
              isRTL ? 'יש כבר צ\'ק-אין פעיל' : 'Active Check-in Found',
              isRTL ? 'עליך לסיים את הביקור הנוכחי לפני שתוכל לבצע צ\'ק-אין חדש' : 'You need to end your current visit before checking in somewhere new',
              [
                { text: isRTL ? 'הבנתי' : 'OK', onPress: handleGoBack }
              ]
            );
            return;
          }
        } catch (error) {
          console.warn('Could not check for active visit:', error);
          // Continue with check-in process
        }

        // If user has only one dog, check-in automatically
        if (dogs.length === 1) {
          await performCheckIn(garden, [dogs[0]]);
        } else {
          // Show dog selection modal
          setDogSelectionModalVisible(true);
        }

      } catch (error) {
        console.error('Error fetching garden details:', error);
        Alert.alert(
          isRTL ? 'שגיאה' : 'Error',
          isRTL ? 'לא ניתן למצוא את הגן. נסה שוב.' : 'Could not find the garden. Please try again.',
          [
            { 
              text: isRTL ? 'סרוק שוב' : 'Scan Again',
              onPress: () => {
                setScanned(false);
                setProcessingQR(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'אירעה שגיאה בעיבוד הקוד. נסה שוב.' : 'An error occurred processing the code. Please try again.',
        [
          { 
            text: isRTL ? 'סרוק שוב' : 'Scan Again',
            onPress: () => {
              setScanned(false);
              setProcessingQR(false);
            }
          }
        ]
      );
    } finally {
      setProcessingQR(false);
    }
  };

  const performCheckIn = async (garden: Garden, selectedDogs: any[]) => {
    try {
      setLoading(true);
      const dogNames = selectedDogs.map(dog => dog.name).join(', ');
      const dogIds = selectedDogs.map(dog => dog._id);
      
      console.log(`Checking in ${dogNames} to ${garden.name}`);
      
      // Call the actual API to perform check-in
      const result = await visitsApi.checkin(garden._id, dogIds);
      
      if (result.success && result.data && result.data._id) {
        // Success! Show confirmation
        Alert.alert(
          `${t.checkinSuccessful} 🎉`,
          isRTL ? 
            `${dogNames} בוצע צ\'ק-אין בגן ${garden.name}` :
            `${dogNames} checked in at ${garden.name}`,
          [{ 
            text: isRTL ? 'מעולה' : 'Great!', 
            onPress: () => {
              // Send a success notification
              sendLocalNotification(
                isRTL ? 'צ\'ק-אין בוצע' : 'Check-in Completed',
                isRTL ? 
                  `${dogNames} נמצא עכשיו ב${garden.name}` :
                  `${dogNames} is now at ${garden.name}`,
                {
                  type: 'check_in_success',
                  gardenId: garden._id,
                  gardenName: garden.name,
                }
              );
              
              router.back();
            }
          }]
        );
      } else {
        throw new Error(result.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'אירעה שגיאה בביצוע הצ\'ק-אין. נסה שוב.' : 'An error occurred during check-in. Please try again.',
        [{ 
          text: isRTL ? 'הבנתי' : 'OK',
          onPress: () => {
            setScanned(false);
            setProcessingQR(false);
          }
        }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDogSelection = (selectedDogs: any[]) => {
    setDogSelectionModalVisible(false);
    if (selectedGarden) {
      performCheckIn(selectedGarden, selectedDogs);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  // Handle permission states
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.primary[500]} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[theme.primary[500], theme.primary[600]]}
          style={styles.permissionContainer}
        >
          <Ionicons name="camera-outline" size={80} color={theme.text.inverse} />
          <Text style={[styles.permissionTitle, { color: theme.text.inverse }]}>
            {isRTL ? 'נדרש אישור מצלמה' : 'Camera Permission Required'}
          </Text>
          <Text style={[styles.permissionText, { color: 'rgba(255,255,255,0.9)' }]}>
            {isRTL ? 'כדי לסרוק קוד QR, האפליקציה צריכה גישה למצלמה' : 'To scan QR codes, the app needs access to your camera'}
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: theme.text.inverse }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: theme.primary[500] }]}>
              {isRTL ? 'אפשר גישה' : 'Grant Permission'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Text style={[styles.backButtonText, { color: theme.text.inverse }]}>
              {isRTL ? 'חזור' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back'}
        enableTorch={flashEnabled}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
            <Ionicons 
              name={isRTL ? "chevron-forward" : "chevron-back"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
{isRTL ? 'סרוק QR' : 'Scan QR'}
          </Text>
          <TouchableOpacity onPress={toggleFlash} style={styles.headerButton}>
            <Ionicons 
              name={flashEnabled ? "flash" : "flash-off"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanning Area Overlay */}
        <View style={styles.scannerOverlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop} />
          
          {/* Middle section with scan area */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            
            {/* Scan Area */}
            <View style={styles.scanArea}>
              {/* Corner borders */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scanning animation */}
              {!scanned && !processingQR && (
                <View style={styles.scanLine} />
              )}
            </View>
            
            <View style={styles.overlaySide} />
          </View>
          
          {/* Bottom overlay with instructions */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.overlayBottom}
          >
            <View style={styles.instructionsContainer}>
              {processingQR ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.processingText}>
{isRTL ? 'מעבד...' : 'Processing...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={40} color="white" />
                  <Text style={styles.instructionTitle}>
                    {isRTL ? 'מקם את קוד ה-QR במסגרת' : 'Position QR code within frame'}
                  </Text>
                  <Text style={styles.instructionSubtitle}>
                    {isRTL ? 'הקוד ייסרק באופן אוטומטי' : 'The code will scan automatically'}
                  </Text>
                </>
              )}
            </View>
            
            {/* Manual entry button */}
            <TouchableOpacity 
              style={styles.manualButton}
              onPress={() => {
                router.push('/(tabs)/checkin');
              }}
            >
              <Text style={styles.manualButtonText}>
{isRTL ? 'צ\'ק-אין ידני' : 'Manual Check-in'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </CameraView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary[500]} />
            <Text style={[styles.loadingText, { color: theme.text.primary }]}>
              {isRTL ? 'מעבד...' : 'Processing...'}
            </Text>
          </View>
        </View>
      )}

      {/* Toast Message */}
      {showToast && (
        <Animated.View style={[
          styles.toastContainer,
          {
            opacity: toastOpacity,
            backgroundColor: theme.background.card,
            borderColor: theme.border.light,
          }
        ]}>
          <View style={styles.toastContent}>
            <Ionicons name="alert-circle" size={20} color="#FF6B35" />
            <Text style={[styles.toastText, { color: theme.text.primary }]}>
              {toastMessage}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Dog Selection Modal */}
      <DogSelectionModal
        visible={dogSelectionModalVisible}
        onClose={() => {
          setDogSelectionModalVisible(false);
          setSelectedGarden(null);
          setScanned(false);
          setProcessingQR(false);
        }}
        dogs={dogs || []}
        onSelectDog={handleDogSelection}
        title={isRTL ? 'בחר כלבים לצ\'ק-אין' : 'Select Dogs for Check-in'}
        subtitle={selectedGarden ? 
          (isRTL ? `בחר את הכלבים שתרצה לבצע צ'ק-אין ב${selectedGarden.name}` : 
                   `Select dogs to check-in at ${selectedGarden.name}`) :
          (isRTL ? 'בחר כלבים לצ\'ק-אין' : 'Select dogs for check-in')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scannerOverlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'white',
    top: '50%',
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 12,
  },
  manualButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 120,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
});