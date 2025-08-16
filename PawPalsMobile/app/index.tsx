import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import NotificationPermissionModal from '../components/common/NotificationPermissionModal';
import { notificationService } from '../services/notificationService';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function Index() {
  const router = useRouter();
  const { reinitializeWithPermissions, isInitialized } = useNotificationContext();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [shouldNavigateToMain, setShouldNavigateToMain] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // Debug function - force show modal for testing
  const forceShowNotificationModal = () => {
    console.log('🧪 FORCE SHOWING MODAL FOR DEBUG');
    setShowNotificationModal(true);
    setShouldNavigateToMain(true);
    setIsAppReady(true);
  };

  // Add to global scope for debugging in console
  // @ts-ignore
  global.forceShowNotificationModal = forceShowNotificationModal;

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting app initialization...');
      
      // First, check authentication status
      const authResult = await checkAuthStatus();
      setIsAuthChecked(true);
      
      if (authResult.isAuthenticated) {
        console.log('✅ User is authenticated, checking notification permissions...');
        
        // Give time for the NotificationContext to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Check if we need to show notification permission modal
          console.log('🔍 Calling shouldShowPermissionModal...');
          const shouldShowModal = await notificationService.shouldShowPermissionModal();
          console.log('📝 shouldShowPermissionModal result:', shouldShowModal);
          
          // Debug: Let's also check the current permission status
          const permissionStatus = await notificationService.getPermissionStatus();
          console.log('📱 Current permission status:', permissionStatus);
          
          const permissionPreference = await notificationService.getPermissionPreference();
          console.log('💾 Stored permission preference:', permissionPreference);
          
          if (shouldShowModal) {
            console.log('🔔 Showing notification permission modal');
            setShowNotificationModal(true);
            setShouldNavigateToMain(true);
            setIsAppReady(true);
            // Don't navigate yet, wait for user response
            return;
          } else {
            console.log('➡️ Not showing modal, going to main app');
            // Navigate directly to main app
            setIsAppReady(true);
            setTimeout(() => {
              router.replace('/(tabs)/home');
            }, 100);
          }
        } catch (permissionError) {
          console.error('❌ Error checking permissions, skipping modal:', permissionError);
          // Skip modal and continue to main app
          setIsAppReady(true);
          setTimeout(() => {
            router.replace('/(tabs)/home');
          }, 100);
        }
      } else {
        console.log('🔐 User not authenticated, going to welcome screen');
        setIsAppReady(true);
        // Navigate to auth screens
        setTimeout(() => {
          router.replace('/(auth)/welcome');
        }, 100);
      }
    } catch (error) {
      console.error('💥 Error initializing app:', error);
      setIsAuthChecked(true);
      setIsAppReady(true);
      setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 100);
    }
  };

  const checkAuthStatus = async (): Promise<{ isAuthenticated: boolean }> => {
    try {
      // Check if user has a valid token or is in guest mode
      const token = await SecureStore.getItemAsync('userToken');
      const isGuest = await SecureStore.getItemAsync('isGuest');
      
      console.log('Auth check - token:', !!token, 'isGuest:', isGuest);
      
      const isAuthenticated = !!(token || isGuest === 'true');
      return { isAuthenticated };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return { isAuthenticated: false };
    }
  };

  const handleNotificationAllow = async () => {
    try {
      console.log('User chose to allow notifications');
      
      // Request permissions from the system
      const granted = await notificationService.requestPermissions();
      
      if (granted) {
        await notificationService.storePermissionPreference('allowed');
        console.log('Notification permissions granted, reinitializing service...');
        
        // Reset and reinitialize the notification service with permissions
        try {
          notificationService.reset();
          await reinitializeWithPermissions();
          console.log('Notifications reinitialized with permissions successfully');
        } catch (reinitError) {
          console.error('Error reinitializing notifications:', reinitError);
        }
      } else {
        await notificationService.storePermissionPreference('denied');
        console.log('Notification permissions denied by user');
      }
      
      setShowNotificationModal(false);
      
      // Navigate to main app after handling permissions
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    } catch (error) {
      console.error('Error handling notification permission:', error);
      await notificationService.storePermissionPreference('denied');
      setShowNotificationModal(false);
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    }
  };

  const handleNotificationNotNow = async () => {
    try {
      console.log('User chose not now for notifications');
      // Store that user said "not now" - we can ask again later
      await notificationService.storePermissionPreference('denied');
      setShowNotificationModal(false);
      
      // Navigate to main app
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    } catch (error) {
      console.error('Error handling notification not now:', error);
      setShowNotificationModal(false);
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    }
  };

  const handleNotificationNeverAsk = async () => {
    try {
      console.log('User chose never ask for notifications');
      // Store that user never wants to be asked again
      await notificationService.storePermissionPreference('never_ask');
      setShowNotificationModal(false);
      
      // Navigate to main app
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    } catch (error) {
      console.error('Error handling notification never ask:', error);
      setShowNotificationModal(false);
      if (shouldNavigateToMain) {
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 100);
      }
    }
  };

  return (
    <>
      <View className="flex-1 justify-center items-center bg-primary-500">
        <View className="items-center">
          {/* App Logo/Icon would go here */}
          <View className="w-24 h-24 bg-white rounded-full mb-6 justify-center items-center">
            <Text className="text-primary-500 text-2xl font-bold">🐕</Text>
          </View>
          
          <Text className="text-white text-2xl font-bold mb-2">PawPals</Text>
          <Text className="text-primary-100 text-base mb-8">
            {showNotificationModal ? 'Setting up notifications...' : 
             !isAppReady ? 'Initializing...' : 'Loading...'}
          </Text>
          
          {!showNotificationModal && !isAppReady && (
            <ActivityIndicator size="large" color="#ffffff" />
          )}
        </View>
      </View>

      {/* Notification Permission Modal */}
      <NotificationPermissionModal
        isVisible={showNotificationModal}
        onAllow={handleNotificationAllow}
        onNotNow={handleNotificationNotNow}
        onNeverAsk={handleNotificationNeverAsk}
        onClose={() => setShowNotificationModal(false)}
      />
    </>
  );
}