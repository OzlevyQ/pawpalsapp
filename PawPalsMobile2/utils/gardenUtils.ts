import { Garden } from '../services/api/gardens';

export interface OpeningStatus {
  isOpen: boolean;
  status: string;
  todayHours: string;
  nextChange?: string;
}

/**
 * Get the current opening status of a garden
 */
export const getGardenOpeningStatus = (garden: Garden): OpeningStatus => {
  const now = new Date();
  const currentDay = getDayOfWeek(now.getDay());
  const currentTime = formatTime(now);
  
  const todaySchedule = garden.openingHours?.[currentDay];
  
  if (!todaySchedule) {
    return {
      isOpen: false,
      status: 'Hours unavailable',
      todayHours: 'Hours unavailable'
    };
  }
  
  if (todaySchedule.closed) {
    return {
      isOpen: false,
      status: 'Closed today',
      todayHours: 'Closed today'
    };
  }
  
  const openTime = todaySchedule.open;
  const closeTime = todaySchedule.close;
  const isCurrentlyOpen = isTimeInRange(currentTime, openTime, closeTime);
  
  const todayHours = `${formatDisplayTime(openTime)} - ${formatDisplayTime(closeTime)}`;
  
  if (isCurrentlyOpen) {
    return {
      isOpen: true,
      status: `Open until ${formatDisplayTime(closeTime)}`,
      todayHours,
      nextChange: `Closes at ${formatDisplayTime(closeTime)}`
    };
  } else {
    // Check if we're before opening or after closing
    const currentMinutes = timeToMinutes(currentTime);
    const openMinutes = timeToMinutes(openTime);
    
    if (currentMinutes < openMinutes) {
      // Before opening today
      return {
        isOpen: false,
        status: `Opens at ${formatDisplayTime(openTime)}`,
        todayHours,
        nextChange: `Opens at ${formatDisplayTime(openTime)}`
      };
    } else {
      // After closing, find next opening day
      const nextOpening = getNextOpeningDay(garden, now);
      return {
        isOpen: false,
        status: nextOpening ? `Opens ${nextOpening}` : 'Closed',
        todayHours
      };
    }
  }
};

/**
 * Get all opening hours for display
 */
export const getFormattedOpeningHours = (garden: Garden): Array<{day: string, hours: string, isToday: boolean}> => {
  const today = new Date().getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return days.map((day, index) => {
    const schedule = garden.openingHours?.[day];
    const isToday = index === today;
    
    let hours = 'Closed';
    if (schedule && !schedule.closed) {
      hours = `${formatDisplayTime(schedule.open)} - ${formatDisplayTime(schedule.close)}`;
    }
    
    return {
      day: dayNames[index],
      hours,
      isToday
    };
  });
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistanceToGarden = (
  userLat: number,
  userLng: number,
  garden: Garden
): number | null => {
  const coords = garden.location?.coordinates?.coordinates;
  if (!coords || coords.length < 2) return null;
  
  const [gardenLng, gardenLat] = coords;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(gardenLat - userLat);
  const dLng = toRadians(gardenLng - userLng);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRadians(userLat)) * Math.cos(toRadians(gardenLat)) *
           Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

/**
 * Get amenities with proper translation support
 */
export const getFormattedAmenities = (amenities: string[]): string[] => {
  const amenityMap: Record<string, string> = {
    'water': '💧 Water',
    'shade': '🌳 Shade',
    'toys': '🎾 Toys',
    'parking': '🚗 Parking',
    'lighting': '💡 Lighting',
    'benches': '🪑 Benches',
    'waste_bags': '🛍️ Waste Bags',
    'agility': '🏃 Agility Equipment',
    
    // Hebrew amenities
    'מים': '💧 Water',
    'צל': '🌳 Shade',
    'צעצועים': '🎾 Toys',
    'חניה': '🚗 Parking',
    'תאורה': '💡 Lighting',
    'ספסלים': '🪑 Benches',
    'שקיות פסולת': '🛍️ Waste Bags'
  };
  
  return amenities.map(amenity => amenityMap[amenity] || amenity);
};

// Helper functions
const getDayOfWeek = (dayNumber: number): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayNumber];
};

const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5); // HH:MM format
};

const formatDisplayTime = (time: string): string => {
  // Convert 24-hour format to 12-hour format for display
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isTimeInRange = (currentTime: string, openTime: string, closeTime: string): boolean => {
  const current = timeToMinutes(currentTime);
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  
  // Handle cases where closing time is after midnight
  if (close < open) {
    return current >= open || current <= close;
  }
  
  return current >= open && current <= close;
};

const getNextOpeningDay = (garden: Garden, currentDate: Date): string | null => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + i);
    const dayIndex = nextDate.getDay();
    const dayKey = days[dayIndex];
    const schedule = garden.openingHours?.[dayKey];
    
    if (schedule && !schedule.closed) {
      const dayName = dayNames[dayIndex];
      const time = formatDisplayTime(schedule.open);
      
      if (i === 1) {
        return `tomorrow at ${time}`;
      } else {
        return `${dayName} at ${time}`;
      }
    }
  }
  
  return null;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Get current visitors count display
 */
export const getCurrentVisitorsDisplay = (garden: Garden): string => {
  const current = garden.currentOccupancy || 0;
  const max = garden.maxDogs || garden.capacity?.maxDogs || 0;
  
  if (max === 0) return `${current} visitors`;
  
  const percentage = (current / max) * 100;
  
  if (percentage === 0) return 'Empty';
  if (percentage < 25) return 'Light';
  if (percentage < 50) return 'Moderate';
  if (percentage < 75) return 'Busy';
  if (percentage < 90) return 'Very Busy';
  return 'Full';
};

/**
 * Get capacity status color
 */
export const getCapacityStatusColor = (garden: Garden): string => {
  const current = garden.currentOccupancy || 0;
  const max = garden.maxDogs || garden.capacity?.maxDogs || 1;
  const percentage = (current / max) * 100;
  
  if (percentage < 50) return '#10B981'; // Green
  if (percentage < 75) return '#F59E0B'; // Yellow
  return '#EF4444'; // Red
};