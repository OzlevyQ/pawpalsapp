import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Helper function to extract essential user data for storage (avoid SecureStore 2048 byte limit)
const getEssentialUserData = (userData: any) => ({
  _id: userData._id,
  email: userData.email,
  firstName: userData.firstName,
  lastName: userData.lastName,
  profileImage: userData.profileImage || userData.image,
  points: userData.points || 0,
  level: userData.level || 1,
  currentStreak: userData.currentStreak || 0,
  createdAt: userData.createdAt,
  updatedAt: userData.updatedAt
});
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t.error, 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Here you'll integrate with your backend API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        // Save token and user data
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(data.user)));
        await SecureStore.deleteItemAsync('isGuest'); // Remove guest flag
        
        // Navigate to main app
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Login Error', data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(t.error, 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.primary }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6">
            
            {/* Title */}
            <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 48 }}>
              <View style={{ width: 80, height: 80, backgroundColor: theme.primary[500], borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 28 }}>🐕</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text.primary, marginBottom: 8, textAlign: 'center' }}>
                {t.loginTitle}
              </Text>
              <Text style={{ color: theme.text.secondary, textAlign: 'center' }}>
                {t.welcomeBack}
              </Text>
            </View>

            {/* Form */}
            <View className="gap-6">
              
              {/* Email Input */}
              <View>
                <Text style={{ color: theme.text.secondary, fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                  {t.emailAddress}
                </Text>
                <View style={{ backgroundColor: theme.background.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: theme.border.medium }}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t.enterEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={{ fontSize: 16, color: theme.text.primary }}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor={theme.text.muted}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View>
                <Text style={{ color: theme.text.secondary, fontSize: 16, fontWeight: '500', marginBottom: 8 }}>
                  {t.password}
                </Text>
                <View style={{ backgroundColor: theme.background.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: theme.border.medium, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={theme.text.muted} 
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t.enterPassword}
                    secureTextEntry={!showPassword}
                    style={{ flex: 1, fontSize: 16, color: theme.text.primary }}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor={theme.text.muted}
                  />
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text style={{ color: theme.primary[600], fontSize: 14 }}>
                  {t.forgotPassword}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              onPress={handleLogin}
              disabled={loading}
              style={{
                marginTop: 32, borderRadius: 12, paddingVertical: 16,
                backgroundColor: loading ? theme.border.medium : theme.primary[500]
              }}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: theme.text.inverse, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                  {t.login}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 32 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border.medium }} />
              <Text style={{ marginHorizontal: 16, color: theme.text.muted, fontSize: 14 }}>{t.or}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border.medium }} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity 
              style={{ backgroundColor: theme.background.card, borderWidth: 1, borderColor: theme.border.medium, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={{ color: theme.text.secondary, fontSize: 16, fontWeight: '500', marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                {t.continueWithGoogle}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', marginTop: 32, marginBottom: 24 }}>
              <Text style={{ color: theme.text.secondary }}>
                {t.noAccount}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={{ color: theme.primary[600], fontWeight: '600' }}>
                  {t.signUpNow}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guest Option */}
            <TouchableOpacity 
              onPress={async () => {
                await SecureStore.setItemAsync('isGuest', 'true');
                router.replace('/(tabs)/home');
              }}
              style={{ backgroundColor: theme.background.surface, borderRadius: 12, paddingVertical: 12 }}
            >
              <Text style={{ color: theme.text.secondary, textAlign: 'center', fontWeight: '500' }}>
                {t.continueAsGuest}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}