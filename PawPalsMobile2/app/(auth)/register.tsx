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

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const handleRegister = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      Alert.alert(t.error, 'Please fill all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t.error, 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert(t.error, 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Here you'll integrate with your backend API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        // Save token and user data
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(data.user)));
        await SecureStore.deleteItemAsync('isGuest'); // Remove guest flag
        
        Alert.alert(t.success, 'Account created successfully!', [
          { text: t.ok, onPress: () => router.replace('/(tabs)/home') }
        ]);
      } else {
        Alert.alert('שגיאת הרשמה', data.message || 'אירעה שגיאה בהרשמה');
      }
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בהרשמה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.primary }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View className="flex-row items-center px-6 py-4">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6">
            
            {/* Title */}
            <View className="items-center mt-4 mb-8">
              <View className="w-20 h-20 bg-primary-500 rounded-full justify-center items-center mb-6">
                <Text className="text-3xl">🐕</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800 mb-2">
                יצירת חשבון חדש
              </Text>
              <Text className="text-gray-600 text-center">
                הצטרף לקהילת בעלי הכלבים שלנו
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              
              {/* Name Fields */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-gray-700 text-base font-medium mb-2">
                    שם פרטי *
                  </Text>
                  <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <TextInput
                      value={formData.firstName}
                      onChangeText={(value) => updateFormData('firstName', value)}
                      placeholder="שם פרטי"
                      className="text-base text-gray-800"
                      textAlign="right"
                    />
                  </View>
                </View>
                
                <View className="flex-1">
                  <Text className="text-gray-700 text-base font-medium mb-2">
                    שם משפחה *
                  </Text>
                  <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <TextInput
                      value={formData.lastName}
                      onChangeText={(value) => updateFormData('lastName', value)}
                      placeholder="שם משפחה"
                      className="text-base text-gray-800"
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>

              {/* Email Input */}
              <View>
                <Text className="text-gray-700 text-base font-medium mb-2">
                  כתובת אימייל *
                </Text>
                <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                  <TextInput
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    placeholder="הכנס כתובת אימייל"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="text-base text-gray-800"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-gray-700 text-base font-medium mb-2">
                  סיסמה *
                </Text>
                <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    className="ml-2"
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    placeholder="הכנס סיסמה (לפחות 6 תווים)"
                    secureTextEntry={!showPassword}
                    className="flex-1 text-base text-gray-800"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View>
                <Text className="text-gray-700 text-base font-medium mb-2">
                  אימות סיסמה *
                </Text>
                <View className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2"
                  >
                    <Ionicons 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                    placeholder="הכנס סיסמה שוב"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 text-base text-gray-800"
                    textAlign="right"
                  />
                </View>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              onPress={handleRegister}
              disabled={loading}
              className={`mt-6 rounded-xl py-4 ${
                loading ? 'bg-gray-300' : 'bg-primary-500'
              }`}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-semibold text-center">
                  צור חשבון
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-500 text-sm">או</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Google Sign Up */}
            <TouchableOpacity 
              className="bg-white border border-gray-200 rounded-xl py-4 flex-row items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text className="text-gray-700 text-base font-medium ml-3">
                הירשם עם Google
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6 mb-6">
              <Text className="text-gray-600">
                יש לך כבר חשבון?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-primary-600 font-semibold">
                  התחבר
                </Text>
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text className="text-gray-500 text-xs text-center mb-6">
              בהרשמה אתה מסכים לתנאי השימוש ולמדיניות הפרטיות שלנו
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}