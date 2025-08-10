import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { eventsApi, Event } from '../../services/api';
import { useUserRealTimeData } from '../../hooks/useRealTimeData';

// Remove local Event interface since we're importing it from api

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [viewType, setViewType] = useState<'cards' | 'list'>('cards');
  const [isChangingView, setIsChangingView] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    upcoming: 0,
    participants: 0,
    organized: 0
  });
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user } = useUser();
  const { isConnected: isRealTimeConnected } = useUserRealTimeData();

  useEffect(() => {
    loadEvents();
    if (!isGuest) {
      loadStatistics();
    }
  }, [activeFilter]);

  // Refresh data when real-time connection is established
  useEffect(() => {
    if (isRealTimeConnected) {
      loadEvents();
      if (!isGuest) {
        loadStatistics();
      }
    }
  }, [isRealTimeConnected]);


  // Check if user is registered for an event (approved)
  const isUserRegistered = (event: Event) => {
    if (!user || isGuest) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'approved'
    );
  };

  // Check if user registration is pending approval
  const isUserPendingApproval = (event: Event) => {
    if (!user || isGuest) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'pending'
    );
  };

  // Check if user registration was rejected
  const isUserRejected = (event: Event) => {
    if (!user || isGuest) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'rejected'
    );
  };

  // Check if user is on waiting list
  const isUserOnWaitingList = (event: Event) => {
    if (!user || isGuest) return false;
    return event.waitingList?.some(waitingUser => 
      typeof waitingUser.user === 'string' 
        ? waitingUser.user === user._id 
        : waitingUser.user?._id === user._id
    );
  };

  // Handle event registration
  const handleEventRegistration = async (event: Event) => {
    if (isGuest) {
      handleGuestAction();
      return;
    }

    const userRegistered = isUserRegistered(event);
    const userPending = isUserPendingApproval(event);
    const userRejected = isUserRejected(event);
    const userOnWaitingList = isUserOnWaitingList(event);

    if (userRegistered || userPending || userOnWaitingList) {
      // User is already registered in some form - show appropriate cancel option
      let alertTitle = isRTL ? 'ביטול הרשמה' : 'Cancel Registration';
      let alertMessage = isRTL ? 'האם אתה בטוח שברצונך לבטל את ההרשמה לאירוע?' : 'Are you sure you want to cancel your registration?';
      
      if (userPending) {
        alertTitle = isRTL ? 'ביטול בקשת הרשמה' : 'Cancel Registration Request';
        alertMessage = isRTL ? 'האם אתה בטוח שברצונך לבטל את בקשת ההרשמה? ההרשמה עדיין ממתינה לאישור המארגן.' : 'Are you sure you want to cancel your registration request? Your registration is still pending organizer approval.';
      } else if (userOnWaitingList) {
        alertTitle = isRTL ? 'יציאה מרשימת המתנה' : 'Leave Waiting List';
        alertMessage = isRTL ? 'האם אתה בטוח שברצונך לצאת מרשימת המתנה?' : 'Are you sure you want to leave the waiting list?';
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: isRTL ? 'בטל' : 'Cancel',
            style: 'destructive',
            onPress: () => cancelEventRegistration(event._id)
          }
        ]
      );
    } else if (userRejected) {
      // User was rejected - offer to register again
      Alert.alert(
        isRTL ? 'הרשמה מחדש' : 'Register Again',
        isRTL ? 'ההרשמה הקודמת שלך נדחתה. האם ברצונך לנסות להירשם שוב?' : 'Your previous registration was rejected. Would you like to try registering again?',
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: isRTL ? 'הירשם שוב' : 'Register Again',
            onPress: () => registerForEvent(event)
          }
        ]
      );
    } else {
      // User is not registered - show registration option
      if (event.isFull && !event.allowWaitingList) {
        Alert.alert(
          isRTL ? 'האירוע מלא' : 'Event Full',
          isRTL ? 'האירוע מלא ולא ניתן להירשם לרשימת המתנה' : 'The event is full and waiting list is not available',
          [{ text: t.ok }]
        );
        return;
      }

      registerForEvent(event);
    }
  };

  // Register for event (separate function for reuse)
  const registerForEvent = async (event: Event) => {
    try {
      setLoading(true);
      const response = await eventsApi.registerForEvent(event._id);
        
        if (response.success) {
          Alert.alert(
            isRTL ? 'הרשמה בוצעה' : 'Registration Successful',
            response.data?.message || (isRTL ? 'נרשמת בהצלחה לאירוع' : 'You have successfully registered for the event'),
            [{ text: t.ok }]
          );
          // Refresh events to show updated participant count
          loadEvents();
        } else {
          Alert.alert(
            isRTL ? 'שגיאה' : 'Error',
            response.error || (isRTL ? 'שגיאה בהרשמה לאירוע' : 'Error registering for event'),
            [{ text: t.ok }]
          );
        }
      } catch (error) {
        console.error('Registration error:', error);
        Alert.alert(
          isRTL ? 'שגיאה' : 'Error',
          isRTL ? 'שגיאה בחיבור לשרת' : 'Server connection error',
          [{ text: t.ok }]
        );
      } finally {
        setLoading(false);
      }
  };

  // Cancel event registration
  const cancelEventRegistration = async (eventId: string) => {
    try {
      setLoading(true);
      const response = await eventsApi.cancelEventRegistration(eventId);
      
      if (response.success) {
        Alert.alert(
          isRTL ? 'הרשמה בוטלה' : 'Registration Cancelled',
          response.data?.message || (isRTL ? 'ההרשמה לאירוע בוטלה בהצלחה' : 'Your registration has been cancelled'),
          [{ text: t.ok }]
        );
        // Refresh events to show updated participant count
        loadEvents();
      } else {
        Alert.alert(
          isRTL ? 'שגיאה' : 'Error',
          response.error || (isRTL ? 'שגיאה בביטול ההרשמה' : 'Error cancelling registration'),
          [{ text: t.ok }]
        );
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בחיבור לשרת' : 'Server connection error',
        [{ text: t.ok }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      loadEvents(true),
      !isGuest ? loadStatistics() : Promise.resolve()
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [activeFilter, isGuest]);

  const loadEvents = async (showLoadingIndicator = false) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }
      setError(null);
      
      let response;
      
      if (activeFilter === 'upcoming') {
        // Get all upcoming events
        const params = {
          status: 'upcoming',
          limit: 20,
          skip: 0
        };
        response = await eventsApi.getAllEvents(params);
      } else if (activeFilter === 'my-events') {
        // Get events user is registered for
        const allEventsResponse = await eventsApi.getAllEvents({ limit: 50 });
        if (allEventsResponse.success && allEventsResponse.data) {
          // Filter events where user is registered
          const userEvents = allEventsResponse.data.events.filter(event => 
            event.participants?.some(participant => 
              (typeof participant.user === 'string' 
                ? participant.user === user?._id 
                : participant.user?._id === user?._id) &&
              participant.status === 'approved'
            )
          );
          response = {
            success: true,
            data: {
              events: userEvents,
              total: userEvents.length
            }
          };
        } else {
          response = allEventsResponse;
        }
      } else if (activeFilter === 'organized') {
        // Get all events and filter by current user as organizer
        const allEventsResponse = await eventsApi.getAllEvents({ limit: 100 });
        if (allEventsResponse.success && allEventsResponse.data) {
          // Filter events where current user is the organizer
          const organizedEvents = allEventsResponse.data.events.filter(event => 
            event.organizer && 
            (event.organizer._id === user?._id || event.organizer._id === user?.id)
          );
          response = {
            success: true,
            data: {
              events: organizedEvents,
              total: organizedEvents.length
            }
          };
        } else {
          response = allEventsResponse;
        }
      } else {
        // Default: get all events
        const params = { limit: 20, skip: 0 };
        response = await eventsApi.getAllEvents(params);
      }
      
      if (response.success && response.data && Array.isArray(response.data.events)) {
        // Filter out any invalid events
        const validEvents = response.data.events.filter(event => 
          event && 
          event._id && 
          event.title && 
          event.description
        );
        setEvents(validEvents);
      } else {
        setError(response.error || 'שגיאה בטעינת האירועים');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('שגיאה בחיבור לשרת');
      setEvents([]);
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const loadStatistics = async () => {
    try {
      // Get all events to calculate statistics
      const allEventsResponse = await eventsApi.getAllEvents({ limit: 100 });
      
      if (allEventsResponse.success && allEventsResponse.data) {
        const allEvents = allEventsResponse.data.events;
        
        // Calculate upcoming events
        const upcomingEvents = allEvents.filter(event => 
          event.status === 'upcoming' || 
          new Date(event.eventDate) > new Date()
        );
        
        // Calculate total participants across all events user is registered for
        const userRegisteredEvents = allEvents.filter(event => 
          event.participants?.some(participant => 
            (typeof participant.user === 'string' 
              ? participant.user === user?._id 
              : participant.user?._id === user?._id) &&
            participant.status === 'approved'
          )
        );
        
        const totalParticipants = userRegisteredEvents.reduce((total, event) => 
          total + (event.participantCount || 0), 0
        );
        
        // Calculate organized events count (events where user is organizer)
        const organizedEvents = allEvents.filter(event => 
          event.organizer && 
          (event.organizer._id === user?._id || event.organizer._id === user?.id)
        );
        const organizedCount = organizedEvents.length;
        
        setStatistics({
          upcoming: upcomingEvents.length,
          participants: totalParticipants,
          organized: organizedCount
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleViewToggle = () => {
    if (isChangingView) return;
    
    setIsChangingView(true);
    setTimeout(() => {
      setViewType(viewType === 'cards' ? 'list' : 'cards');
      setIsChangingView(false);
    }, 300);
  };

  const handleGuestAction = () => {
    Alert.alert(
      t.registrationRequired,
      t.signUpForEvents,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.signUpNow, onPress: () => router.push('/(auth)/register') },
        { text: t.login, onPress: () => router.push('/(auth)/login') },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderEventCard = (event: Event) => {
    if (!event || !event._id) return null;
    
    const isEventFull = event.maxParticipants ? event.participantCount >= event.maxParticipants : false;
    const participationRate = event.maxParticipants ? (event.participantCount / event.maxParticipants) * 100 : 0;
    const userRegistered = isUserRegistered(event);
    const userPending = isUserPendingApproval(event);
    const userRejected = isUserRejected(event);
    const userOnWaitingList = isUserOnWaitingList(event);
    
    const getButtonText = () => {
      if (isGuest) return t.signUpToEvent;
      if (userRegistered) return isRTL ? 'בטל הרשמה' : 'Cancel Registration';
      if (userPending) return isRTL ? 'ממתין לאישור - בטל' : 'Pending Approval - Cancel';
      if (userRejected) return isRTL ? 'הרשמה נדחתה - נסה שוב' : 'Registration Rejected - Try Again';
      if (userOnWaitingList) return isRTL ? 'ברשימת המתנה - בטל' : 'On Waiting List - Cancel';
      if (isEventFull && event.allowWaitingList) return isRTL ? 'הצטרף לרשימת המתנה' : 'Join Waiting List';
      if (isEventFull) return t.eventIsFull;
      return event.requiresApproval ? (isRTL ? 'שלח בקשת הרשמה' : 'Send Registration Request') : t.joinNow;
    };

    const getButtonColor = () => {
      if (userRegistered) return '#EF4444'; // Red for cancel registration
      if (userPending) return '#F59E0B'; // Orange for pending
      if (userRejected) return '#EF4444'; // Red for rejected
      if (userOnWaitingList) return '#8B5CF6'; // Purple for waiting list
      if (isEventFull && !event.allowWaitingList) return theme.background.surface;
      return theme.primary[500];
    };
    
    return (
      <View key={event._id}>
        <TouchableOpacity 
          onPress={() => router.push(`/event-details?eventId=${event._id}`)}
          style={{
            backgroundColor: theme.background.card,
            borderRadius: 12,
            marginBottom: 12,
            marginHorizontal: 4,
            overflow: 'hidden',
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
            borderWidth: 1,
            borderColor: theme.border.light
          }}
        >
        {/* Card Header with Gradient */}
        <LinearGradient
          colors={[theme.primary[500], theme.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.text.inverse,
                fontSize: 17,
                fontWeight: 'bold',
                marginBottom: 2,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {event.title}
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 12,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {event.description}
              </Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              {/* Registration Status Badge */}
              {!isGuest && (() => {
                const userRegistered = isUserRegistered(event);
                const userPending = isUserPendingApproval(event);
                const userRejected = isUserRejected(event);
                const userOnWaitingList = isUserOnWaitingList(event);
                
                if (userRegistered || userPending || userRejected || userOnWaitingList) {
                  let backgroundColor, icon, text;
                  
                  if (userRegistered) {
                    backgroundColor = '#EF4444';
                    icon = '✓';
                    text = isRTL ? 'רשום' : 'Registered';
                  } else if (userPending) {
                    backgroundColor = '#F59E0B';
                    icon = '⏱';
                    text = isRTL ? 'ממתין' : 'Pending';
                  } else if (userRejected) {
                    backgroundColor = '#EF4444';
                    icon = '✗';
                    text = isRTL ? 'נדחה' : 'Rejected';
                  } else if (userOnWaitingList) {
                    backgroundColor = '#8B5CF6';
                    icon = '⏱';
                    text = isRTL ? 'רשימת המתנה' : 'Waiting';
                  }
                  
                  return (
                    <View style={{
                      backgroundColor,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginBottom: 6
                    }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 'bold'
                      }}>
                        {icon} {text}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
              
              {/* Participant Count */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}>
                <Text style={{
                  color: theme.text.inverse,
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  {event.participantCount}/{event.maxParticipants || '∞'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
          {/* Event Details Grid */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            marginBottom: 10
          }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <View style={{
                  backgroundColor: theme.primary[50],
                  borderRadius: 12,
                  padding: 6,
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0
                }}>
                  <Ionicons name="calendar" size={14} color={theme.primary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 10,
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t.date}
                  </Text>
                  <Text style={{
                    color: theme.text.primary,
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: 2
                  }} numberOfLines={2}>
                    {formatDate(event.eventDate)}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <View style={{
                  backgroundColor: theme.primary[50],
                  borderRadius: 12,
                  padding: 6,
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0
                }}>
                  <Ionicons name="location" size={14} color={theme.primary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 10,
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t.location}
                  </Text>
                  <Text style={{
                    color: theme.text.primary,
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: 2
                  }} numberOfLines={1}>
                    {event.garden?.name || 'גן לא ידוע'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <View style={{
                  backgroundColor: theme.primary[50],
                  borderRadius: 12,
                  padding: 6,
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0
                }}>
                  <Ionicons name="time" size={14} color={theme.primary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 10,
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t.time}
                  </Text>
                  <Text style={{
                    color: theme.text.primary,
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: 2
                  }}>
                    {event.startTime} - {event.endTime}
                  </Text>
                </View>
              </View>
              
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <View style={{
                  backgroundColor: theme.primary[50],
                  borderRadius: 12,
                  padding: 6,
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0
                }}>
                  <Ionicons name="person" size={14} color={theme.primary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 10,
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t.organizer}
                  </Text>
                  <Text style={{
                    color: theme.text.primary,
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: 2
                  }} numberOfLines={1}>
                    {event.organizer?.firstName || ''} {event.organizer?.lastName || ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Event Requirements & Status Badges */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10
          }}>
            {event.requiresApproval && (
              <View style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center'
              }}>
                <Ionicons 
                  name="shield-checkmark" 
                  size={12} 
                  color="#F59E0B" 
                  style={{ 
                    marginRight: isRTL ? 0 : 4,
                    marginLeft: isRTL ? 4 : 0
                  }}
                />
                <Text style={{
                  color: '#D97706',
                  fontSize: 10,
                  fontWeight: '600'
                }}>
                  {isRTL ? 'דרוש אישור' : 'Requires Approval'}
                </Text>
              </View>
            )}
            
            {event.requirements?.vaccinationRequired && (
              <View style={{
                backgroundColor: '#DBEAFE',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center'
              }}>
                <Ionicons 
                  name="medical" 
                  size={12} 
                  color="#3B82F6" 
                  style={{ 
                    marginRight: isRTL ? 0 : 4,
                    marginLeft: isRTL ? 4 : 0
                  }}
                />
                <Text style={{
                  color: '#1E40AF',
                  fontSize: 10,
                  fontWeight: '600'
                }}>
                  {isRTL ? 'חיסונים' : 'Vaccinations'}
                </Text>
              </View>
            )}
            
            {event.isFull && (
              <View style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center'
              }}>
                <Ionicons 
                  name="people" 
                  size={12} 
                  color="#DC2626" 
                  style={{ 
                    marginRight: isRTL ? 0 : 4,
                    marginLeft: isRTL ? 4 : 0
                  }}
                />
                <Text style={{
                  color: '#DC2626',
                  fontSize: 10,
                  fontWeight: '600'
                }}>
                  {isRTL ? 'מלא' : 'Full'}
                </Text>
              </View>
            )}
          </View>

          {/* Participation Progress Bar */}
          <View style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6
            }}>
              <Text style={{
                color: theme.text.secondary,
                fontSize: 12,
                fontWeight: '500',
                textAlign: isRTL ? 'right' : 'left'
              }}>{t.participationLevel}</Text>
              <Text style={{
                color: theme.text.primary,
                fontSize: 12,
                fontWeight: 'bold'
              }}>{Math.round(participationRate)}%</Text>
            </View>
            <View style={{
              backgroundColor: theme.border.medium,
              borderRadius: 4,
              height: 8,
              overflow: 'hidden'
            }}>
              <View 
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: participationRate >= 100 ? '#EF4444' : 
                    participationRate >= 75 ? '#F59E0B' : theme.primary[500],
                  width: `${Math.min(participationRate, 100)}%`
                }}
              />
            </View>
          </View>

          {/* Registration Button */}
          <TouchableOpacity 
            onPress={() => handleEventRegistration(event)}
            disabled={isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList}
            style={{
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 24,
              backgroundColor: getButtonColor(),
              borderWidth: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? 1 : 0,
              borderColor: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? theme.border.medium : 'transparent',
              shadowColor: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? 'transparent' : theme.shadow.medium,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? 0 : 0.2,
              shadowRadius: 4,
              elevation: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? 0 : 3
            }}
          >
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Ionicons 
                name={
                  userRegistered ? "close-circle" :
                  userPending ? "hourglass" :
                  userRejected ? "refresh-circle" :
                  userOnWaitingList ? "time" :
                  isEventFull && !event.allowWaitingList ? "close-circle" : 
                  event.requiresApproval ? "send" :
                  "checkmark-circle"
                } 
                size={20} 
                color={
                  (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) ? theme.text.muted : 
                  theme.text.inverse
                }
                style={{ 
                  marginLeft: isRTL ? 0 : 8,
                  marginRight: isRTL ? 8 : 0
                }}
              />
              <Text style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: 18,
                color: (isEventFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList) 
                  ? theme.text.muted 
                  : theme.text.inverse
              }}>
                {getButtonText()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEventListItem = (event: Event) => {
    if (!event || !event._id) return null;
    
    const isEventFull = event.maxParticipants ? event.participantCount >= event.maxParticipants : false;
    
    return (
      <TouchableOpacity 
        key={event._id}
        onPress={() => router.push(`/event-details?eventId=${event._id}`)}
        style={{
          backgroundColor: theme.background.card,
          borderRadius: 10,
          padding: 8,
          marginBottom: 6,
          marginHorizontal: 4,
          shadowColor: theme.shadow.medium,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
          elevation: 2,
          borderWidth: 1,
          borderColor: theme.border.light,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center'
        }}
      >
        <View style={{
          backgroundColor: theme.primary[100],
          borderRadius: 10,
          padding: 8,
          marginRight: isRTL ? 0 : 12,
          marginLeft: isRTL ? 12 : 0
        }}>
          <Ionicons name="calendar" size={20} color={theme.primary[500]} />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            color: theme.text.primary,
            fontWeight: 'bold',
            fontSize: 15,
            marginBottom: 3
          }}>
            {event.title}
          </Text>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            marginBottom: 4
          }}>
            <Ionicons 
              name="time" 
              size={14} 
              color={theme.text.muted}
              style={{ 
                marginLeft: isRTL ? 4 : 0,
                marginRight: isRTL ? 0 : 4
              }}
            />
            <Text style={{
              color: theme.text.secondary,
              fontSize: 13,
              marginRight: isRTL ? 0 : 8,
              marginLeft: isRTL ? 8 : 0
            }}>
              {event.startTime} - {event.endTime}
            </Text>
            <Ionicons 
              name="location" 
              size={14} 
              color={theme.text.muted}
              style={{ 
                marginLeft: isRTL ? 4 : 0,
                marginRight: isRTL ? 0 : 4
              }}
            />
            <Text style={{
              color: theme.text.secondary,
              fontSize: 13
            }}>
              {event.garden?.name || 'גן לא ידוע'}
            </Text>
          </View>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text style={{
              color: theme.text.muted,
              fontSize: 12
            }}>
              {event.participantCount}/{event.maxParticipants || '∞'} {t.participants}
            </Text>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 16,
              backgroundColor: isEventFull ? '#fee2e2' : '#dcfce7'
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: isEventFull ? '#dc2626' : '#166534'
              }}>
                {isEventFull ? t.full : t.available}
              </Text>
            </View>
          </View>
        </View>
        
        <Ionicons 
          name={isRTL ? "chevron-back" : "chevron-forward"} 
          size={16} 
          color={theme.text.muted} 
        />
      </TouchableOpacity>
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
        <Ionicons name="calendar-outline" size={64} color={theme.primary[500]} />
      </View>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text.primary,
        marginBottom: 16,
        textAlign: 'center'
      }}>
        {t.discoverExcitingEvents}
      </Text>
      <Text style={{
        color: theme.text.secondary,
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 32,
        lineHeight: 24
      }}>
        {t.joinEventsAndMeetOthers}
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
          {t.signUpForSocial}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const FilterTab = ({ title, isActive, onPress, icon }: {
    title: string;
    isActive: boolean;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginRight: isRTL ? 0 : 12,
        marginLeft: isRTL ? 12 : 0,
        shadowColor: theme.shadow.medium,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        backgroundColor: isActive 
          ? theme.primary[500] 
          : theme.background.card,
        borderWidth: isActive ? 0 : 1,
        borderColor: isActive ? 'transparent' : theme.border.light
      }}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={isActive ? theme.text.inverse : theme.text.muted}
        style={{ 
          marginLeft: isRTL ? 0 : 6,
          marginRight: isRTL ? 6 : 0
        }}
      />
      <Text style={{
        fontWeight: '600',
        color: isActive ? theme.text.inverse : theme.text.secondary
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const UserView = () => (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        backgroundColor: theme.background.primary,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.medium
      }}>
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text.primary,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {t.events}
          </Text>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 12
          }}>
            <TouchableOpacity 
              onPress={handleViewToggle}
              style={{ 
                opacity: isChangingView ? 0.5 : 1 
              }}
              disabled={isChangingView}
            >
              <Ionicons 
                name={viewType === 'cards' ? 'list' : 'grid'} 
                size={24} 
                color={theme.primary[500]} 
              />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="add-circle-outline" size={28} color={theme.primary[500]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary[500]]}
            tintColor={theme.primary[500]}
          />
        }
      >
        {/* Filter Tabs */}
        <View style={{
          backgroundColor: theme.background.primary,
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border.medium
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text.primary,
            marginBottom: 12,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {t.filterEvents}
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
          >
            <FilterTab 
              title={t.upcoming} 
              isActive={activeFilter === 'upcoming'} 
              onPress={() => setActiveFilter('upcoming')}
              icon="calendar"
            />
            <FilterTab 
              title={t.myEvents} 
              isActive={activeFilter === 'my-events'} 
              onPress={() => setActiveFilter('my-events')}
              icon="person"
            />
            <FilterTab 
              title={t.organized || 'Organized'} 
              isActive={activeFilter === 'organized'} 
              onPress={() => setActiveFilter('organized')}
              icon="ribbon"
            />
          </ScrollView>
        </View>

        {/* Compact Stats */}
        <View style={{
          backgroundColor: theme.background.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border.light
        }}>
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: theme.primary[100],
                borderRadius: 16,
                padding: 8,
                marginRight: isRTL ? 0 : 8,
                marginLeft: isRTL ? 8 : 0
              }}>
                <Ionicons name="calendar" size={14} color={theme.primary[500]} />
              </View>
              <View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: theme.text.primary
                }}>{statistics.upcoming}</Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.text.secondary
                }}>{t.upcoming}</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: theme.secondary[100],
                borderRadius: 16,
                padding: 8,
                marginRight: isRTL ? 0 : 8,
                marginLeft: isRTL ? 8 : 0
              }}>
                <Ionicons name="people" size={14} color={theme.secondary[500]} />
              </View>
              <View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: theme.text.primary
                }}>{statistics.participants}</Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.text.secondary
                }}>{t.participants}</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: '#fef3c7',
                borderRadius: 16,
                padding: 8,
                marginRight: isRTL ? 0 : 8,
                marginLeft: isRTL ? 8 : 0
              }}>
                <Ionicons name="trophy" size={14} color="#f59e0b" />
              </View>
              <View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: theme.text.primary
                }}>{statistics.organized}</Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.text.secondary
                }}>{t.organized || 'Organized'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Events List */}
        <View style={{ paddingHorizontal: 8, paddingVertical: 16 }}>
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
              {activeFilter === 'my-events' 
                ? (isRTL ? 'האירועים שלי' : 'My Events')
                : activeFilter === 'organized'
                ? (isRTL ? 'אירועים שארגנתי' : 'Events I Organized')
                : t.availableEvents
              }
            </Text>
            {loading && (
              <ActivityIndicator 
                size="small" 
                color={theme.primary[500]} 
                style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
              />
            )}
          </View>
          {events.length === 0 ? (
            <View style={{
              padding: 32,
              alignItems: 'center'
            }}>
              <Text style={{
                color: theme.text.secondary,
                fontSize: 16,
                textAlign: 'center'
              }}>
                {activeFilter === 'my-events' 
                  ? (isRTL ? 'אין אירועים שנרשמת אליהם' : 'No events you are registered for')
                  : activeFilter === 'organized'
                  ? (isRTL ? 'אין אירועים שארגנת' : 'No events you have organized')
                  : (isRTL ? 'אין אירועים זמינים' : 'No events available')
                }
              </Text>
            </View>
          ) : (
            viewType === 'cards' 
              ? events.filter(event => event && event._id).map((event) => renderEventCard(event))
              : events.filter(event => event && event._id).map((event) => renderEventListItem(event))
          )}
        </View>
      </ScrollView>
    </View>
  );

  // Main component return
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {isGuest ? <GuestView /> : <UserView />}
    </SafeAreaView>
  );
}