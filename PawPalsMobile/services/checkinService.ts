import { Alert } from 'react-native';
import { visitsApi, Garden, Dog, Visit } from './api';

export interface CheckinResult {
  success: boolean;
  visit?: Visit;
  error?: string;
}

export interface QRCodeData {
  gardenId: string;
  gardenName?: string;
  type?: string;
  timestamp?: number;
}

export class CheckinService {
  /**
   * Extract garden ID from various QR code formats
   */
  static extractGardenIdFromQR(qrData: string): string | null {
    console.log('🔍 Extracting garden ID from QR:', qrData);
    
    try {
      // Try to parse as JSON first (structured QR code)
      const parsed = JSON.parse(qrData);
      
      // Check for various possible field names
      if (parsed.gardenId) return parsed.gardenId;
      if (parsed.garden_id) return parsed.garden_id;
      if (parsed.id) return parsed.id;
      if (parsed.parkId) return parsed.parkId;
      if (parsed.park_id) return parsed.park_id;
      
      // Check for nested garden object
      if (parsed.garden && typeof parsed.garden === 'object') {
        if (parsed.garden._id) return parsed.garden._id;
        if (parsed.garden.id) return parsed.garden.id;
      }
      
    } catch {
      // Not JSON, try to extract from other formats
      
      // PawPals specific formats
      const pawpalsPatterns = [
        /pawpals[:\-_]garden[:\-_]([a-zA-Z0-9]+)/i,
        /pawpals[:\-_]park[:\-_]([a-zA-Z0-9]+)/i,
        /pawpals[:\-_]([a-zA-Z0-9]{24})/i, // MongoDB ObjectId after pawpals
      ];
      
      for (const pattern of pawpalsPatterns) {
        const match = qrData.match(pattern);
        if (match) return match[1];
      }
      
      // URL patterns - including PawPals specific URL
      const urlPatterns = [
        // PawPals specific URL: https://www.pawpals.yadbarzel.info/garden/ID
        /https?:\/\/(?:www\.)?pawpals\.yadbarzel\.info\/garden\/([a-f0-9]{24})/i,
        // Generic garden/park patterns
        /garden[s]?[\/=]([a-zA-Z0-9]+)/i,
        /park[s]?[\/=]([a-zA-Z0-9]+)/i,
        /id[=:]([a-zA-Z0-9]+)/i,
        /location[\/=]([a-zA-Z0-9]+)/i,
      ];
      
      for (const pattern of urlPatterns) {
        const match = qrData.match(pattern);
        if (match) {
          console.log('✅ Found garden ID using URL pattern:', match[1]);
          return match[1];
        }
      }
      
      // Check if it's just a MongoDB ObjectId (24 hex characters)
      const trimmedData = qrData.trim();
      if (/^[a-f\d]{24}$/i.test(trimmedData)) {
        return trimmedData;
      }
      
      // Check for UUID format
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(trimmedData)) {
        return trimmedData;
      }
    }
    
    return null;
  }

  /**
   * Parse QR code data and extract relevant information
   */
  static parseQRCode(qrData: string): QRCodeData | null {
    const gardenId = this.extractGardenIdFromQR(qrData);
    
    if (!gardenId) {
      return null;
    }

    try {
      // Try to parse as JSON to get additional data
      const parsed = JSON.parse(qrData);
      return {
        gardenId,
        gardenName: parsed.gardenName || parsed.garden_name || parsed.name,
        type: parsed.type || 'checkin',
        timestamp: parsed.timestamp || Date.now(),
      };
    } catch {
      // Simple format, just return the garden ID
      return {
        gardenId,
        type: 'checkin',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if user has an active visit
   */
  static async checkActiveVisit(): Promise<Visit | null> {
    try {
      const response = await visitsApi.getActiveVisit();
      return response.success && response.data ? response.data : null;
    } catch (error) {
      console.error('Error checking active visit:', error);
      return null;
    }
  }

  /**
   * Perform check-in for a garden with selected dogs
   */
  static async performCheckin(
    garden: Garden, 
    selectedDogs: Dog[],
    notes?: string
  ): Promise<CheckinResult> {
    try {
      if (!selectedDogs || selectedDogs.length === 0) {
        return {
          success: false,
          error: 'No dogs selected for check-in'
        };
      }

      const dogIds = selectedDogs.map(dog => dog._id);
      const result = await visitsApi.checkin(garden._id, dogIds, notes);
      
      if (result.success && result.data) {
        return {
          success: true,
          visit: result.data
        };
      } else {
        return {
          success: false,
          error: result.error || 'Check-in failed'
        };
      }
    } catch (error) {
      console.error('Check-in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during check-in'
      };
    }
  }

  /**
   * Validate QR code format and content
   */
  static validateQRCode(qrData: string): { valid: boolean; error?: string } {
    if (!qrData || qrData.trim().length === 0) {
      return {
        valid: false,
        error: 'Empty QR code'
      };
    }

    const gardenId = this.extractGardenIdFromQR(qrData);
    
    if (!gardenId) {
      return {
        valid: false,
        error: 'Invalid QR code format - no garden ID found'
      };
    }

    // Validate garden ID format
    if (gardenId.length < 6) {
      return {
        valid: false,
        error: 'Garden ID too short'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Generate a sample QR code data for testing (development only)
   */
  static generateSampleQRCode(gardenId: string, gardenName?: string): string {
    const qrData = {
      gardenId,
      gardenName: gardenName || 'Sample Garden',
      type: 'checkin',
      timestamp: Date.now(),
      version: '1.0'
    };

    return JSON.stringify(qrData);
  }

  /**
   * Handle different QR scanning error scenarios
   */
  static handleQRError(
    error: string, 
    isRTL: boolean,
    onRetry?: () => void,
    onManualCheckin?: () => void
  ) {
    const errorMessages = {
      invalid_format: {
        title: isRTL ? 'QR לא תקין' : 'Invalid QR Code',
        message: isRTL ? 
          'קוד ה-QR אינו תקין עבור גן כלבים. נסה לסרוק קוד אחר או בצע צ\'ק-אין ידני.' :
          'This QR code is not valid for a dog park. Try scanning another code or use manual check-in.'
      },
      garden_not_found: {
        title: isRTL ? 'גן לא נמצא' : 'Garden Not Found',
        message: isRTL ?
          'לא ניתן למצוא את הגן המבוקש. ייתכן שהקוד לא עדכני.' :
          'Could not find the requested garden. The code may be outdated.'
      },
      network_error: {
        title: isRTL ? 'שגיאת רשת' : 'Network Error',
        message: isRTL ?
          'אין חיבור לאינטרנט. בדוק את החיבור ונסה שוב.' :
          'No internet connection. Check your connection and try again.'
      },
      default: {
        title: isRTL ? 'שגיאה' : 'Error',
        message: isRTL ?
          'אירעה שגיאה בעיבוד הקוד. נסה שוב.' :
          'An error occurred processing the code. Please try again.'
      }
    };

    const errorType = error.toLowerCase().includes('network') ? 'network_error' :
                      error.toLowerCase().includes('not found') ? 'garden_not_found' :
                      error.toLowerCase().includes('invalid') ? 'invalid_format' :
                      'default';

    const errorData = errorMessages[errorType];
    
    const buttons = [
      {
        text: isRTL ? 'סרוק שוב' : 'Scan Again',
        onPress: onRetry
      }
    ];

    if (onManualCheckin) {
      buttons.unshift({
        text: isRTL ? 'צ\'ק-אין ידני' : 'Manual Check-in',
        onPress: onManualCheckin
      });
    }

    Alert.alert(errorData.title, errorData.message, buttons);
  }
}

export default CheckinService;