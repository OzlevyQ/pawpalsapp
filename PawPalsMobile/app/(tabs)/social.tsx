import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SocialScreen() {
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    checkGuestMode();
  }, []);

  const checkGuestMode = async () => {
    try {
      const guestMode = await SecureStore.getItemAsync('isGuest');
      setIsGuest(guestMode === 'true');
    } catch (error) {
      console.error('Error checking guest mode:', error);
    }
  };

  const handleGuestAction = () => {
    Alert.alert(
      t.registrationRequired,
      t.signUpForSocialFeatures,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.signUpNow, onPress: () => router.push('/(auth)/register') },
        { text: t.login, onPress: () => router.push('/(auth)/login') },
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
        <Ionicons name="people-outline" size={64} color={theme.primary[500]} />
      </View>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text.primary,
        marginBottom: 16,
        textAlign: 'center'
      }}>
        {t.joinCommunity}
      </Text>
      <Text style={{
        color: theme.text.secondary,
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 32,
        lineHeight: 24
      }}>
        {t.connectWithDogOwners}
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
            {t.navigation.social}
          </Text>
          <TouchableOpacity>
            <Ionicons name="add-circle-outline" size={28} color={theme.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Friends Online */}
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
            {t.activeFriends}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={`friend-${item}`} style={{
                alignItems: 'center',
                marginRight: isRTL ? 0 : 16,
                marginLeft: isRTL ? 16 : 0
              }}>
                <View style={{
                  width: 64,
                  height: 64,
                  backgroundColor: theme.primary[500],
                  borderRadius: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <Text style={{ color: theme.text.inverse, fontSize: 20 }}>🐕</Text>
                  <View style={{
                    position: 'absolute',
                    bottom: -4,
                    right: isRTL ? undefined : -4,
                    left: isRTL ? -4 : undefined,
                    width: 20,
                    height: 20,
                    backgroundColor: '#10B981',
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: theme.background.primary
                  }} />
                </View>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  textAlign: 'center'
                }}>
                  {t.friend} {item}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Recent Chats */}
        <View style={{ backgroundColor: theme.background.primary }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text.primary,
            paddingHorizontal: 24,
            paddingVertical: 16,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {t.recentChats}
          </Text>
          {[1, 2, 3, 4].map((item) => (
            <TouchableOpacity 
              key={`chat-${item}`}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border.light
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: theme.secondary[500],
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Text style={{ color: theme.text.inverse, fontSize: 18 }}>🐕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: theme.text.primary,
                    fontWeight: '600',
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {t.dogOwner} {item}
                  </Text>
                  <Text style={{
                    color: theme.text.muted,
                    fontSize: 14
                  }}>
                    {item}{t.hours}
                  </Text>
                </View>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  marginTop: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.howIsYourDog}
                </Text>
              </View>
              {item === 1 && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: theme.primary[500],
                  borderRadius: 4,
                  marginLeft: isRTL ? 0 : 8,
                  marginRight: isRTL ? 8 : 0
                }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Features */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text.primary,
            marginBottom: 16,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            {t.community}
          </Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 16,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: theme.primary[100],
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name="camera" size={24} color={theme.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.text.primary,
                  fontWeight: '600',
                  marginBottom: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.sharePhoto}
                </Text>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.uploadDogPhoto}
                </Text>
              </View>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={16} 
                color={theme.text.muted} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 16,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: theme.secondary[100],
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name="star" size={24} color={theme.secondary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.text.primary,
                  fontWeight: '600',
                  marginBottom: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.rateDogs}
                </Text>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.rateDogsYouMet}
                </Text>
              </View>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={16} 
                color={theme.text.muted} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 16,
              shadowColor: theme.shadow.medium,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
              borderWidth: 1,
              borderColor: theme.border.light,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center'
            }}>
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: '#fed7aa',
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: isRTL ? 0 : 12,
                marginLeft: isRTL ? 12 : 0
              }}>
                <Ionicons name="book" size={24} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.text.primary,
                  fontWeight: '600',
                  marginBottom: 4,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.dogDiary}
                </Text>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t.recordMeetingsAndExperiences}
                </Text>
              </View>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={16} 
                color={theme.text.muted} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {isGuest ? <GuestView /> : <UserView />}
    </SafeAreaView>
  );
}