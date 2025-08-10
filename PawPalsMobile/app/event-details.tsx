import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { eventsApi, Event } from '../services/api';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { isGuest, user } = useUser();

  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsApi.getEventById(eventId!);
      
      if (response.success && response.data) {
        setEvent(response.data.data);
      } else {
        setError(response.error || 'שגיאה בטעינת פרטי האירוע');
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is registered for the event (approved status)
  const isUserRegistered = () => {
    if (!user || isGuest || !event) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'approved'
    );
  };

  // Check if user is pending approval
  const isUserPendingApproval = () => {
    if (!user || isGuest || !event) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'pending'
    );
  };

  // Check if user registration was rejected
  const isUserRejected = () => {
    if (!user || isGuest || !event) return false;
    return event.participants?.some(participant => 
      (typeof participant.user === 'string' 
        ? participant.user === user._id 
        : participant.user?._id === user._id) &&
      participant.status === 'rejected'
    );
  };

  // Check if user is on waiting list
  const isUserOnWaitingList = () => {
    if (!user || isGuest || !event) return false;
    return event.waitingList?.some(waitingUser => 
      typeof waitingUser.user === 'string' 
        ? waitingUser.user === user._id 
        : waitingUser.user?._id === user._id
    );
  };

  // Handle event registration
  const handleEventRegistration = async () => {
    if (!event || isGuest) {
      handleGuestAction();
      return;
    }

    const userRegistered = isUserRegistered();
    const userPending = isUserPendingApproval();
    const userRejected = isUserRejected();
    const userOnWaitingList = isUserOnWaitingList();

    if (userRegistered || userPending || userOnWaitingList) {
      // User is already registered/pending - show cancel option
      const statusText = userRegistered 
        ? (isRTL ? 'מאושר' : 'approved')
        : userPending 
        ? (isRTL ? 'ממתין לאישור' : 'pending approval')
        : (isRTL ? 'ברשימת המתנה' : 'on waiting list');
        
      Alert.alert(
        isRTL ? 'ביטול הרשמה' : 'Cancel Registration',
        isRTL 
          ? `סטטוס נוכחי: ${statusText}\nהאם אתה בטוח שברצונך לבטל את ההרשמה לאירוע?`
          : `Current status: ${statusText}\nAre you sure you want to cancel your registration?`,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: isRTL ? 'בטל הרשמה' : 'Cancel Registration',
            style: 'destructive',
            onPress: () => cancelEventRegistration()
          }
        ]
      );
    } else if (userRejected) {
      // User was rejected - allow re-registration
      Alert.alert(
        isRTL ? 'הרשמה חוזרת' : 'Re-register',
        isRTL 
          ? 'ההרשמה הקודמת שלך נדחתה. האם תרצה להגיש בקשה חדשה?'
          : 'Your previous registration was rejected. Would you like to submit a new request?',
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: isRTL ? 'הגש שוב' : 'Re-register',
            onPress: () => registerForEvent()
          }
        ]
      );
    } else {
      // User is not registered - show registration option
      registerForEvent();
    }
  };

  const registerForEvent = async () => {
    if (!event) return;
    
    if (event.isFull && !event.allowWaitingList) {
      Alert.alert(
        isRTL ? 'האירוע מלא' : 'Event Full',
        isRTL ? 'האירוע מלא ולא ניתן להירשם לרשימת המתנה' : 'The event is full and waiting list is not available',
        [{ text: t.ok }]
      );
      return;
    }

    try {
      setRegistrationLoading(true);
      const response = await eventsApi.registerForEvent(event._id);
      
      if (response.success) {
        const successTitle = isRTL ? 'הרשמה בוצעה' : 'Registration Successful';
        let successMessage;
        
        if (event.requiresApproval) {
          successMessage = isRTL 
            ? 'ההרשמה שלך הוגשה בהצלחה וממתינה לאישור המארגן. תקבל התראה כאשר הבקשה תטופל.'
            : 'Your registration has been submitted and is awaiting organizer approval. You will be notified when your request is processed.';
        } else {
          successMessage = response.data?.message || (isRTL ? 'נרשמת בהצלחה לאירוע' : 'You have successfully registered for the event');
        }
        
        Alert.alert(successTitle, successMessage, [{ text: t.ok }]);
        // Refresh event details to show updated participant count
        loadEventDetails();
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
      setRegistrationLoading(false);
    }
  };

  // Cancel event registration
  const cancelEventRegistration = async () => {
    if (!event) return;

    try {
      setRegistrationLoading(true);
      const response = await eventsApi.cancelEventRegistration(event._id);
      
      if (response.success) {
        Alert.alert(
          isRTL ? 'הרשמה בוטלה' : 'Registration Cancelled',
          response.data?.message || (isRTL ? 'ההרשמה לאירוע בוטלה בהצלחה' : 'Your registration has been cancelled'),
          [{ text: t.ok }]
        );
        // Refresh event details to show updated participant count
        loadEventDetails();
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
      setRegistrationLoading(false);
    }
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

  const getButtonText = () => {
    if (!event) return '';
    if (isGuest) return t.signUpToEvent;
    
    const userRegistered = isUserRegistered();
    const userPending = isUserPendingApproval();
    const userRejected = isUserRejected();
    const userOnWaitingList = isUserOnWaitingList();
    
    if (userRegistered) return isRTL ? 'בטל הרשמה' : 'Cancel Registration';
    if (userPending) return isRTL ? 'ממתין לאישור - בטל' : 'Pending Approval - Cancel';
    if (userRejected) return isRTL ? 'הגש בקשה שוב' : 'Apply Again';
    if (userOnWaitingList) return isRTL ? 'ברשימת המתנה - בטל' : 'On Waiting List - Cancel';
    if (event.isFull && event.allowWaitingList) return isRTL ? 'הצטרף לרשימת המתנה' : 'Join Waiting List';
    if (event.isFull) return t.eventIsFull;
    return t.joinNow;
  };

  const getButtonColor = () => {
    if (!event) return theme.primary[500];
    
    const userRegistered = isUserRegistered();
    const userPending = isUserPendingApproval();
    const userRejected = isUserRejected();
    const userOnWaitingList = isUserOnWaitingList();
    
    if (userRegistered) return '#EF4444'; // Red for cancel registration
    if (userPending) return '#F59E0B'; // Orange for pending
    if (userRejected) return '#EF4444'; // Red for rejected
    if (userOnWaitingList) return '#F59E0B'; // Orange for waiting list
    if (event.isFull && !event.allowWaitingList) return theme.background.surface;
    return theme.primary[500];
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary[500]} />
          <Text style={{ 
            color: theme.text.primary, 
            marginTop: 16, 
            fontSize: 16,
            textAlign: 'center'
          }}>
            {t.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
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
            {isRTL ? 'אירוע לא נמצא' : 'Event Not Found'}
          </Text>
          <Text style={{ 
            color: theme.text.secondary, 
            fontSize: 16,
            marginTop: 8,
            textAlign: 'center'
          }}>
            {error || (isRTL ? 'האירוע שחיפשת לא קיים' : 'The event you are looking for does not exist')}
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              backgroundColor: theme.primary[500],
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
              marginTop: 24
            }}
          >
            <Text style={{ color: theme.text.inverse, fontSize: 16, fontWeight: '600' }}>
              {isRTL ? 'חזור' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userRegistered = isUserRegistered();
  const userPending = isUserPendingApproval();
  const userRejected = isUserRejected();
  const userOnWaitingList = isUserOnWaitingList();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: isRTL ? 0 : 16,
              marginLeft: isRTL ? 16 : 0
            }}
          >
            <Ionicons 
              name={isRTL ? "chevron-forward" : "chevron-back"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: theme.text.inverse,
              fontSize: 24,
              fontWeight: 'bold',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {event.title}
            </Text>
            <Text style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 16,
              marginTop: 4,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {isRTL ? 'פרטי האירוע' : 'Event Details'}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        {(() => {
          const userRegistered = isUserRegistered();
          const userPending = isUserPendingApproval();
          const userRejected = isUserRejected();
          const userOnWaitingList = isUserOnWaitingList();
          
          if (userRegistered || userPending || userRejected || userOnWaitingList) {
            let backgroundColor, icon, text;
            
            if (userRegistered) {
              backgroundColor = '#10B981';
              icon = '✓';
              text = isRTL ? 'רשום לאירוע' : 'Registered';
            } else if (userPending) {
              backgroundColor = '#F59E0B';
              icon = '⏱';
              text = isRTL ? 'ממתין לאישור' : 'Pending Approval';
            } else if (userRejected) {
              backgroundColor = '#EF4444';
              icon = '✗';
              text = isRTL ? 'נדחה' : 'Rejected';
            } else if (userOnWaitingList) {
              backgroundColor = '#8B5CF6';
              icon = '⏱';
              text = isRTL ? 'ברשימת המתנה' : 'On Waiting List';
            }
            
            return (
              <View style={{
                backgroundColor,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                alignSelf: isRTL ? 'flex-end' : 'flex-start'
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  {icon} {text}
                </Text>
              </View>
            );
          }
          return null;
        })()}
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.text.primary,
              marginBottom: 12,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {isRTL ? 'תיאור האירוע' : 'Event Description'}
            </Text>
            <Text style={{
              fontSize: 16,
              color: theme.text.secondary,
              lineHeight: 24,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {event.description}
            </Text>
          </View>

          {/* Event Details Grid */}
          <View style={{
            backgroundColor: theme.background.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            shadowColor: theme.shadow.medium,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.text.primary,
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {isRTL ? 'פרטי האירוע' : 'Event Information'}
            </Text>

            {/* Date */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: theme.primary[100],
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <Ionicons name="calendar" size={20} color={theme.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {formatDate(event.eventDate)}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.startTime} - {event.endTime}
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: theme.secondary[100],
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <Ionicons name="location" size={20} color={theme.secondary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.garden?.name || 'גן לא ידוע'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.garden?.location?.address || (isRTL ? 'כתובת לא זמינה' : 'Address not available')}
                </Text>
              </View>
            </View>

            {/* Organizer */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#fef3c7',
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <Ionicons name="person" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.organizer?.firstName || ''} {event.organizer?.lastName || ''}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {isRTL ? 'מארגן האירוע' : 'Event Organizer'}
                </Text>
              </View>
            </View>

            {/* Participants */}
            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#dcfce7',
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <Ionicons name="people" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.participantCount}/{event.maxParticipants || '∞'} {isRTL ? 'משתתפים' : 'Participants'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {event.availableSpots !== null ? (
                    isRTL ? `${event.availableSpots} מקומות פנויים` : `${event.availableSpots} spots available`
                  ) : (
                    isRTL ? 'מקומות ללא הגבלה' : 'Unlimited spots'
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Requirements */}
          {event.requirements && (
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 16,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {isRTL ? 'דרישות להשתתפות' : 'Requirements'}
              </Text>

              {event.requirements.vaccinationRequired && (
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color="#10B981" 
                    style={{
                      marginRight: isRTL ? 0 : 8,
                      marginLeft: isRTL ? 8 : 0
                    }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: theme.text.primary,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {isRTL ? 'חיסונים עדכניים נדרשים' : 'Up-to-date vaccinations required'}
                  </Text>
                </View>
              )}

              {event.requirements.sizeRestrictions && event.requirements.sizeRestrictions.length > 0 && (
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <Ionicons 
                    name="resize" 
                    size={20} 
                    color="#F59E0B" 
                    style={{
                      marginRight: isRTL ? 0 : 8,
                      marginLeft: isRTL ? 8 : 0
                    }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: theme.text.primary,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {isRTL ? 'הגבלות גודל: ' : 'Size restrictions: '}{event.requirements.sizeRestrictions.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Registration Button */}
      <View style={{
        padding: 24,
        backgroundColor: theme.background.primary,
        borderTopWidth: 1,
        borderTopColor: theme.border.light
      }}>
        <TouchableOpacity
          onPress={handleEventRegistration}
          disabled={registrationLoading || (event.isFull && !event.allowWaitingList && !userRegistered && !userPending && !userOnWaitingList && !userRejected)}
          style={{
            backgroundColor: getButtonColor(),
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 24,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: registrationLoading ? 0.7 : 1
          }}
        >
          {registrationLoading ? (
            <ActivityIndicator size="small" color={theme.text.inverse} />
          ) : (
            <>
              <Ionicons 
                name={(() => {
                  const userRegistered = isUserRegistered();
                  const userPending = isUserPendingApproval();
                  const userRejected = isUserRejected();
                  const userOnWaitingList = isUserOnWaitingList();
                  
                  if (userRegistered) return "close-circle";
                  if (userPending) return "hourglass";
                  if (userRejected) return "refresh";
                  if (userOnWaitingList) return "time";
                  if (event.isFull && !event.allowWaitingList) return "close-circle";
                  return "checkmark-circle";
                })()} 
                size={24} 
                color={theme.text.inverse}
                style={{ 
                  marginLeft: isRTL ? 0 : 12,
                  marginRight: isRTL ? 12 : 0
                }}
              />
              <Text style={{
                color: theme.text.inverse,
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                {getButtonText()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}