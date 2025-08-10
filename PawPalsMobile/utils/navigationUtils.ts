import { Platform, Linking, Alert } from 'react-native';

export interface NavigationApp {
  name: string;
  identifier: string;
  scheme: string;
  icon: string;
  available: boolean;
}

export interface NavigationOptions {
  latitude: number;
  longitude: number;
  destinationName?: string;
  address?: string;
}

/**
 * Platform-specific navigation apps configuration
 */
const NAVIGATION_APPS = {
  ios: [
    {
      name: 'Apple Maps',
      identifier: 'maps',
      scheme: 'maps://',
      icon: 'map',
      available: true, // Always available on iOS
    },
    {
      name: 'Waze',
      identifier: 'waze',
      scheme: 'waze://',
      icon: 'car',
      available: false, // Will be checked dynamically
    },
    {
      name: 'Google Maps',
      identifier: 'googlemaps',
      scheme: 'comgooglemaps://',
      icon: 'navigate',
      available: false, // Will be checked dynamically
    },
  ],
  android: [
    {
      name: 'Google Maps',
      identifier: 'googlemaps',
      scheme: 'geo:',
      icon: 'navigate',
      available: true, // Usually available on Android
    },
    {
      name: 'Waze',
      identifier: 'waze',
      scheme: 'waze://',
      icon: 'car',
      available: false, // Will be checked dynamically
    },
  ],
};

/**
 * Check if a navigation app is installed on the device
 */
export const checkAppAvailability = async (scheme: string): Promise<boolean> => {
  try {
    const canOpen = await Linking.canOpenURL(scheme);
    return canOpen;
  } catch (error) {
    console.warn(`Error checking app availability for ${scheme}:`, error);
    return false;
  }
};

/**
 * Get available navigation apps for the current platform
 */
export const getAvailableNavigationApps = async (): Promise<NavigationApp[]> => {
  console.log('getAvailableNavigationApps called, Platform.OS:', Platform.OS);
  const platformApps = Platform.OS === 'ios' ? NAVIGATION_APPS.ios : NAVIGATION_APPS.android;
  console.log('platformApps:', platformApps);
  
  // Always include default browser navigation as fallback
  const browserApp: NavigationApp = {
    name: 'Google Maps',
    identifier: 'browser', 
    scheme: 'https://',
    icon: 'globe',
    available: true,
  };
  
  const appsWithAvailability = await Promise.all(
    platformApps.map(async (app) => {
      console.log(`Checking app: ${app.name}, already available: ${app.available}`);
      if (app.available === true) {
        // Already known to be available
        return { ...app, available: true };
      }
      
      // Check dynamically for third-party apps
      const available = await checkAppAvailability(app.scheme);
      console.log(`${app.name} availability check result: ${available}`);
      return { ...app, available };
    })
  );
  
  console.log('All apps with availability:', appsWithAvailability);
  
  // Filter available apps and always include browser option
  const availableApps = appsWithAvailability.filter(app => app.available);
  availableApps.push(browserApp); // Always add browser as fallback
  
  console.log('Final available apps (including browser):', availableApps);
  return availableApps;
};

/**
 * Generate navigation URL for specific app and coordinates
 */
export const generateNavigationURL = (
  app: NavigationApp, 
  options: NavigationOptions
): string => {
  const { latitude, longitude, destinationName, address } = options;
  
  console.log(`Generating navigation URL for ${app.name}:`, {
    latitude,
    longitude,
    destinationName,
    app: app.identifier
  });
  
  // Always prioritize coordinates for maximum accuracy
  switch (app.identifier) {
    case 'maps': // Apple Maps (iOS)
      // Use coordinates directly for most accurate navigation
      return `maps://?daddr=${latitude},${longitude}&dirflg=d`;
      
    case 'googlemaps':
      if (Platform.OS === 'ios') {
        // Google Maps iOS - use coordinates with optional label
        return `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
      } else {
        // Android Google Maps - use coordinates
        return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${destinationName || 'Dog Park'})`;
      }
      
    case 'waze':
      // Waze - use coordinates for most accurate navigation
      return `waze://?ll=${latitude},${longitude}&navigate=yes`;
      
    case 'browser':
      // Google Maps in browser - use coordinates with place marker  
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
      
    default:
      throw new Error(`Unsupported navigation app: ${app.identifier}`);
  }
};

/**
 * Open navigation app with the specified options
 */
export const openNavigationApp = async (
  app: NavigationApp, 
  options: NavigationOptions
): Promise<boolean> => {
  try {
    const url = generateNavigationURL(app, options);
    console.log(`Opening navigation app ${app.name} with URL: ${url}`);
    
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error(`Cannot open ${app.name}. App may not be installed.`);
    }
    
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error(`Error opening ${app.name}:`, error);
    return false;
  }
};

/**
 * Open device's default navigation app (fallback)
 */
export const openDefaultNavigation = async (options: NavigationOptions): Promise<boolean> => {
  try {
    const { latitude, longitude, destinationName } = options;
    
    // Use Google Maps web as fallback (works on all platforms)
    const query = destinationName || `${latitude},${longitude}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&center=${latitude},${longitude}&zoom=15`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error opening default navigation:', error);
    return false;
  }
};

/**
 * Show native navigation options based on platform
 */
export const showNavigationOptions = async (
  options: NavigationOptions,
  translations: {
    selectNavigationApp: string;
    openWith: string;
    cancel: string;
    navigationNotAvailable: string;
    errorOpeningNavigation: string;
  }
): Promise<void> => {
  try {
    const availableApps = await getAvailableNavigationApps();
    
    if (availableApps.length === 0) {
      Alert.alert(
        translations.navigationNotAvailable,
        translations.errorOpeningNavigation,
        [{ text: translations.cancel }]
      );
      return;
    }
    
    if (availableApps.length === 1) {
      // Only one app available, open it directly
      const success = await openNavigationApp(availableApps[0], options);
      if (!success) {
        // Fallback to default navigation
        await openDefaultNavigation(options);
      }
      return;
    }
    
    // Multiple apps available, show selection
    const buttons = availableApps.map(app => ({
      text: app.name,
      onPress: async () => {
        const success = await openNavigationApp(app, options);
        if (!success) {
          Alert.alert(
            translations.errorOpeningNavigation,
            `Failed to open ${app.name}`,
            [{ text: translations.cancel }]
          );
        }
      },
    }));
    
    buttons.push({
      text: translations.cancel,
      style: 'cancel' as const,
      onPress: () => {},
    });
    
    Alert.alert(
      translations.selectNavigationApp,
      translations.openWith,
      buttons
    );
    
  } catch (error) {
    console.error('Error showing navigation options:', error);
    
    // Fallback to default navigation
    const success = await openDefaultNavigation(options);
    if (!success) {
      Alert.alert(
        translations.navigationNotAvailable,
        translations.errorOpeningNavigation,
        [{ text: translations.cancel }]
      );
    }
  }
};

/**
 * Quick navigation function - opens the best available navigation app
 */
export const quickNavigate = async (options: NavigationOptions): Promise<boolean> => {
  try {
    const availableApps = await getAvailableNavigationApps();
    
    if (availableApps.length === 0) {
      return await openDefaultNavigation(options);
    }
    
    // Priority: Apple Maps (iOS) > Google Maps > Waze > Default
    let priorityApp = availableApps.find(app => 
      Platform.OS === 'ios' ? app.identifier === 'maps' : app.identifier === 'googlemaps'
    );
    
    if (!priorityApp) {
      priorityApp = availableApps[0];
    }
    
    const success = await openNavigationApp(priorityApp, options);
    
    if (!success) {
      return await openDefaultNavigation(options);
    }
    
    return true;
  } catch (error) {
    console.error('Error in quick navigation:', error);
    return await openDefaultNavigation(options);
  }
};

/**
 * Get navigation app recommendations based on platform
 */
export const getNavigationAppRecommendations = () => {
  if (Platform.OS === 'ios') {
    return {
      primary: 'Apple Maps',
      alternatives: ['Waze', 'Google Maps'],
      downloadLinks: {
        waze: 'https://apps.apple.com/app/waze-navigation-live-traffic/id323229106',
        googlemaps: 'https://apps.apple.com/app/google-maps/id585027354',
      },
    };
  } else {
    return {
      primary: 'Google Maps',
      alternatives: ['Waze'],
      downloadLinks: {
        waze: 'https://play.google.com/store/apps/details?id=com.waze',
      },
    };
  }
};