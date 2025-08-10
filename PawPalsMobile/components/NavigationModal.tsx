import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  NavigationApp,
  NavigationOptions,
  getAvailableNavigationApps,
  openNavigationApp,
  openDefaultNavigation,
} from '../utils/navigationUtils';

const { width: screenWidth } = Dimensions.get('window');

interface NavigationModalProps {
  visible: boolean;
  onClose: () => void;
  options: NavigationOptions;
}

// App logos/icons
const APP_ICONS: Record<string, any> = {
  maps: require('../assets/navigation-icons/apple-maps.png'),
  googlemaps: require('../assets/navigation-icons/google-maps.png'),
  waze: require('../assets/navigation-icons/waze.png'),
  browser: require('../assets/navigation-icons/browser.png'),
};

const getAppImage = (identifier: string) => {
  try {
    return APP_ICONS[identifier] || null;
  } catch {
    return null;
  }
};

export default function NavigationModal({ visible, onClose, options }: NavigationModalProps) {
  console.log('NavigationModal rendered with visible:', visible);
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [availableApps, setAvailableApps] = useState<NavigationApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadAvailableApps();
    }
  }, [visible]);

  const loadAvailableApps = async () => {
    console.log('loadAvailableApps called');
    setLoading(true);
    try {
      const apps = await getAvailableNavigationApps();
      console.log('Available apps loaded:', apps);
      setAvailableApps(apps);
    } catch (error) {
      console.error('Error loading navigation apps:', error);
      // Fallback to basic apps
      setAvailableApps([
        {
          name: 'Google Maps',
          identifier: 'browser',
          scheme: 'https://',
          icon: 'globe',
          available: true,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAppSelect = async (app: NavigationApp) => {
    console.log('Selected app:', app.name);
    console.log('Navigation options:', options);
    setSelectedApp(app.identifier);
    
    try {
      const success = await openNavigationApp(app, options);
      
      if (success) {
        setTimeout(() => {
          onClose();
          setSelectedApp(null);
        }, 500);
      } else {
        console.log('Failed to open app, trying browser fallback');
        const browserSuccess = await openDefaultNavigation(options);
        if (browserSuccess) {
          setTimeout(() => {
            onClose();
            setSelectedApp(null);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error opening navigation app:', error);
      setSelectedApp(null);
    }
  };

  const getAppIcon = (app: NavigationApp) => {
    switch (app.identifier) {
      case 'maps':
        return '🗺️';
      case 'googlemaps':
        return '📍';
      case 'waze':
        return '🚗';
      case 'browser':
        return '🌐';
      default:
        return '📍';
    }
  };

  const getAppColor = (app: NavigationApp) => {
    switch (app.identifier) {
      case 'maps':
        return '#007AFF';
      case 'googlemaps':
        return '#4285F4';
      case 'waze':
        return '#33CCFF';
      case 'browser':
        return '#34A853';
      default:
        return '#10B981';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Backdrop */}
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Modal Content */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 40,
          }}
          activeOpacity={1}
          onPress={() => {}} // Prevent backdrop dismiss when tapping content
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
            marginBottom: 8,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1F2937',
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {t.selectNavigationApp}
              </Text>
              <Text style={{
                fontSize: 13,
                color: '#6B7280',
                textAlign: isRTL ? 'right' : 'left',
                marginTop: 2,
              }} numberOfLines={1}>
                {options.destinationName || 'Select navigation app'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
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

          {/* Apps Grid */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {loading ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 40,
              }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{
                  color: '#6B7280',
                  marginTop: 12,
                  fontSize: 14,
                }}>
                  Loading...
                </Text>
              </View>
            ) : (
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 20,
              }}>
                {availableApps.map((app) => {
                  const isSelected = selectedApp === app.identifier;
                  const appImage = getAppImage(app.identifier);
                  
                  return (
                    <TouchableOpacity
                      key={app.identifier}
                      onPress={() => handleAppSelect(app)}
                      disabled={selectedApp !== null}
                      style={{
                        alignItems: 'center',
                        opacity: selectedApp && !isSelected ? 0.3 : 1,
                      }}
                    >
                      {/* App Icon Container */}
                      <View style={{
                        width: 85,
                        height: 85,
                        borderRadius: 42.5, // Perfectly circular
                        backgroundColor: appImage ? '#FFFFFF' : `${getAppColor(app)}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: isSelected ? getAppColor(app) : 'transparent',
                        shadowColor: isSelected ? getAppColor(app) : '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isSelected ? 0.4 : 0.15,
                        shadowRadius: isSelected ? 8 : 6,
                        elevation: isSelected ? 8 : 4,
                      }}>
                        {appImage ? (
                          <Image 
                            source={appImage}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 30, // Circular image
                            }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={{ fontSize: 45 }}>
                            {getAppIcon(app)}
                          </Text>
                        )}
                        
                        {isSelected && (
                          <View style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: getAppColor(app),
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: getAppColor(app),
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.4,
                            shadowRadius: 4,
                            elevation: 5,
                          }}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </View>

                      {/* App Name */}
                      <Text style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '600' : '500',
                        color: isSelected ? getAppColor(app) : '#374151',
                        textAlign: 'center',
                        maxWidth: 80,
                      }} numberOfLines={2}>
                        {app.name}
                      </Text>

                      {isSelected && (
                        <ActivityIndicator 
                          size="small" 
                          color={getAppColor(app)} 
                          style={{ marginTop: 4 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}