import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleContinueAsGuest = async () => {
    try {
      console.log('Setting guest mode...');
      await SecureStore.setItemAsync('isGuest', 'true');
      console.log('Guest mode set, navigating to home...');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={['#10b981', '#059669', '#047857']}
        className="flex-1"
      >
        <View className="flex-1 justify-between px-6 py-12">
          
          {/* Top section with logo and title */}
          <View className="items-center mt-15">
            <View className="w-30 h-30 bg-white rounded-full justify-center items-center mb-8 shadow-lg">
              <Text className="text-6xl">🐕</Text>
            </View>
            
            <Text className="text-white text-3xl font-bold mb-4 text-center">
              ברוכים הבאים ל-PawPals
            </Text>
            
            <Text className="text-white/90 text-lg text-center leading-7 px-4">
              רשת חברתית לבעלי כלבים{'\n'}
              מצא גני כלבים, חבר לקהילה ותיצור חברויות חדשות
            </Text>
          </View>

          {/* Bottom section with buttons */}
          <View className="space-y-3">
            
            {/* Login Button */}
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/login')}
              className="bg-white rounded-2xl py-4 px-6 shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-primary-600 text-lg font-semibold text-center">
                התחבר לחשבון קיים
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/register')}
              className="bg-primary-800 border-2 border-white rounded-2xl py-4 px-6"
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold text-center">
                יצירת חשבון חדש
              </Text>
            </TouchableOpacity>

            {/* Guest Button - Prominent */}
            <TouchableOpacity 
              onPress={handleContinueAsGuest}
              className="bg-black/20 border border-white/30 rounded-2xl py-4 px-6 mt-8"
              activeOpacity={0.7}
            >
              <Text className="text-white text-base font-medium text-center">
                המשך כאורח 👤
              </Text>
              <Text className="text-white/80 text-sm text-center mt-1">
                צפה בגנים ללא הרשמה
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text className="text-white/70 text-xs text-center mt-6 px-4">
              המשך משמעותו הסכמה לתנאי השימוש ומדיניות הפרטיות
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}