import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, Language } from '../contexts/LanguageContext';

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language: currentLanguage, t, changeLanguage } = useLanguage();

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === currentLanguage) {
      router.back();
      return;
    }

    try {
      await changeLanguage(newLanguage);
      
      Alert.alert(
        t.success,
        t.languageChanged,
        [
          {
            text: t.ok,
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t.error, 'Failed to change language');
    }
  };

  const languages = [
    {
      code: 'en' as Language,
      name: 'English',
      flag: '🇺🇸',
      direction: 'ltr' as const,
    },
    {
      code: 'he' as Language,
      name: 'עברית',
      flag: '🇮🇱', 
      direction: 'rtl' as const,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ 
              width: 40, height: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: 20, justifyContent: 'center', alignItems: 'center' 
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          
          <Text style={{ color: theme.text.inverse, fontSize: 20, fontWeight: 'bold' }}>
            {t.selectLanguage}
          </Text>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Language Options */}
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
        <View style={{ 
          backgroundColor: theme.background.card, borderRadius: 16, 
          shadowColor: theme.shadow.medium, shadowOffset: { width: 0, height: 2 }, 
          shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 
        }}>
          {languages.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...(index !== languages.length - 1 && { 
                  borderBottomWidth: 1, 
                  borderBottomColor: theme.border.light 
                }),
                minHeight: 72,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 32, marginRight: 16 }}>
                  {lang.flag}
                </Text>
                <Text style={{ 
                  color: theme.text.primary, 
                  fontSize: 18, 
                  fontWeight: '500',
                  textAlign: lang.direction === 'rtl' ? 'right' : 'left',
                }}>
                  {lang.name}
                </Text>
              </View>
              
              {currentLanguage === lang.code && (
                <View style={{ 
                  width: 24, height: 24, backgroundColor: theme.primary[500], 
                  borderRadius: 12, justifyContent: 'center', alignItems: 'center' 
                }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Info Text */}
        <View style={{ 
          marginTop: 24, padding: 16, backgroundColor: theme.primary[50], 
          borderRadius: 12, borderLeftWidth: 4, borderLeftColor: theme.primary[500] 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={20} color={theme.primary[600]} />
            <Text style={{ 
              color: theme.primary[700], fontSize: 16, fontWeight: '600', marginLeft: 8 
            }}>
              Note
            </Text>
          </View>
          <Text style={{ color: theme.primary[600], fontSize: 14, lineHeight: 20 }}>
            Changing the language will update the app interface. Some changes may require restarting the app to take full effect.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}