import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { dogsApi, Dog } from '../services/api';
import OptimizedImage from '../components/OptimizedImage';

export default function EditDogScreen() {
  const router = useRouter();
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { reloadDogs } = useUser();

  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dogData, setDogData] = useState({
    name: '',
    breed: '',
    age: '',
    gender: 'male',
    size: 'medium',
    weight: '',
    description: '',
    vaccinated: false,
    personality: {
      friendly: 3,
      energetic: 3,
      social: 3,
      aggressive: 1,
    },
  });

  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadDog();
  }, [dogId]);

  const loadDog = async () => {
    if (!dogId) return;
    
    try {
      setLoading(true);
      const response = await dogsApi.getDogById(dogId);
      
      if (response.success && response.data) {
        const dogInfo = response.data;
        setDog(dogInfo);
        setDogData({
          name: dogInfo.name,
          breed: dogInfo.breed,
          age: dogInfo.age.toString(),
          gender: dogInfo.gender,
          size: dogInfo.size,
          weight: dogInfo.weight?.toString() || '',
          description: dogInfo.description || '',
          vaccinated: dogInfo.medicalInfo?.vaccinated || false,
          personality: {
            friendly: dogInfo.personality?.friendly || 3,
            energetic: dogInfo.personality?.energetic || 3,
            social: dogInfo.personality?.social || 3,
            aggressive: dogInfo.personality?.aggressive || 1,
          },
        });
        if (dogInfo.image) {
          setImage(dogInfo.image);
        }
      }
    } catch (error) {
      console.error('Error loading dog:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'שגיאה בטעינת פרטי הכלב' : 'Error loading dog details'
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!dogData.name.trim()) {
      newErrors.name = isRTL ? 'שם הכלב חובה' : 'Dog name is required';
    }
    
    if (!dogData.breed.trim()) {
      newErrors.breed = isRTL ? 'גזע הכלב חובה' : 'Dog breed is required';
    }
    
    if (!dogData.age || dogData.age < 0 || dogData.age > 30) {
      newErrors.age = isRTL ? 'גיל לא תקין (0-30)' : 'Invalid age (0-30)';
    }
    
    if (dogData.weight && (dogData.weight < 0 || dogData.weight > 100)) {
      newErrors.weight = isRTL ? 'משקל לא תקין (0-100)' : 'Invalid weight (0-100)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    // הצגת אפשרויות למשתמש
    Alert.alert(
      isRTL ? 'בחר תמונה' : 'Select Photo',
      isRTL ? 'איך תרצה להוסיף תמונה?' : 'How would you like to add a photo?',
      [
        {
          text: isRTL ? 'מצלמה' : 'Camera',
          onPress: () => takePhoto(),
        },
        {
          text: isRTL ? 'גלריה' : 'Gallery',
          onPress: () => pickFromGallery(),
        },
        {
          text: isRTL ? 'ביטול' : 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      // בדיקת הרשאות מצלמה
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.granted === false) {
        Alert.alert(
          isRTL ? 'הרשאה נדרשת' : 'Permission Required',
          isRTL ? 'כדי לצלם תמונה, אנא אפשר גישה למצלמה בהגדרות המכשיר' : 'To take a photo, please allow camera access in device settings',
          [{ text: isRTL ? 'אישור' : 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        console.log('Photo taken:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'אירעה שגיאה בצילום התמונה. נסה שוב.' : 'Error taking photo. Please try again.',
        [{ text: isRTL ? 'אישור' : 'OK' }]
      );
    }
  };

  const pickFromGallery = async () => {
    try {
      // בדיקת הרשאות לפני גישה לגלריה
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          isRTL ? 'הרשאה נדרשת' : 'Permission Required',
          isRTL ? 'כדי להוסיף תמונה, אנא אפשר גישה לגלריה בהגדרות המכשיר' : 'To add a photo, please allow access to your photo library in device settings',
          [{ text: isRTL ? 'אישור' : 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'אירעה שגיאה בבחירת התמונה. נסה שוב.' : 'Error selecting image. Please try again.',
        [{ text: isRTL ? 'אישור' : 'OK' }]
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateForm() || !dogId) {
      return;
    }

    setSubmitting(true);
    
    try {
      const updates: Partial<Dog> = {
        name: dogData.name.trim(),
        breed: dogData.breed.trim(),
        age: parseInt(dogData.age),
        gender: dogData.gender as 'male' | 'female',
        size: dogData.size as 'small' | 'medium' | 'large',
        weight: dogData.weight ? parseFloat(dogData.weight) : undefined,
        description: dogData.description.trim(),
        medicalInfo: {
          vaccinated: dogData.vaccinated,
        },
        personality: dogData.personality,
      };

      let response;
      
      // If there's a new image (different from original), upload it with the update
      if (image && image !== dog?.image) {
        console.log('Uploading new image for dog:', dogId);
        try {
          response = await dogsApi.uploadDogImage(dogId, image);
          if (response.success) {
            console.log('Image uploaded successfully');
            // Also update other fields
            const secondResponse = await dogsApi.updateDog(dogId, updates);
            if (!secondResponse.success) {
              console.warn('Failed to update other dog details:', secondResponse.error);
              // Show warning but don't block the flow
              Alert.alert(
                isRTL ? 'אזהרה' : 'Warning',
                isRTL ? 'התמונה עודכנה בהצלחה אך חלק מהפרטים לא נשמרו. נסה שוב.' : 'Image updated successfully but some details failed to save. Please try again.',
                [{ text: isRTL ? 'אישור' : 'OK' }]
              );
            }
          } else {
            console.warn('Failed to upload dog image:', response.error);
            // Try to update other fields anyway
            response = await dogsApi.updateDog(dogId, updates);
            if (response.success) {
              Alert.alert(
                isRTL ? 'אזהרה' : 'Warning',
                isRTL ? 'פרטי הכלב עודכנו בהצלחה אך התמונה לא עלתה. תוכל לנסות להעלות תמונה שוב.' : 'Dog details updated successfully but image failed to upload. You can try uploading the image again.',
                [{ text: isRTL ? 'אישור' : 'OK' }]
              );
            }
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // Try to update other fields anyway
          response = await dogsApi.updateDog(dogId, updates);
          if (response.success) {
            Alert.alert(
              isRTL ? 'אזהרה' : 'Warning',
              isRTL ? 'פרטי הכלב עודכנו בהצלחה אך התמונה לא עלתה. תוכל לנסות להעלות תמונה שוב.' : 'Dog details updated successfully but image failed to upload. You can try uploading the image again.',
              [{ text: isRTL ? 'אישור' : 'OK' }]
            );
          }
        }
      } else {
        // Just update the other fields without image
        response = await dogsApi.updateDog(dogId, updates);
      }
      
      if (response.success) {
        
        // Refresh user data to get the updated dog
        await reloadDogs();
        
        Alert.alert(
          isRTL ? 'הצלחה!' : 'Success!',
          isRTL ? 'פרטי הכלב עודכנו בהצלחה' : 'Dog updated successfully',
          [
            {
              text: isRTL ? 'אישור' : 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.error || 'Failed to update dog');
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'שגיאה' : 'Error',
        isRTL ? 'לא הצלחנו לעדכן את הכלב' : 'Failed to update dog',
        [{ text: isRTL ? 'אישור' : 'OK' }]
      );
      console.error('Error updating dog:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const PersonalitySlider = ({ trait, label, icon, color }) => (
    <View style={{ marginBottom: 20 }}>
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: color + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <Text style={{ color: theme.text.primary, fontSize: 14 }}>{label}</Text>
        </View>
        <Text style={{
          color: theme.text.secondary,
          fontSize: 14,
          fontWeight: '600',
        }}>
          {dogData.personality[trait]}/5
        </Text>
      </View>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
      }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setDogData({
              ...dogData,
              personality: { ...dogData.personality, [trait]: level }
            })}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: level <= dogData.personality[trait] ? color : theme.border.light,
            }}
          />
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.background.primary, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <ActivityIndicator size="large" color={theme.primary[500]} />
        <Text style={{ color: theme.text.muted, marginTop: 16 }}>
          {isRTL ? 'טוען פרטי כלב...' : 'Loading dog details...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.primary[500], theme.primary[600]]}
          style={{
            paddingTop: Platform.OS === 'ios' ? 20 : 40,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons 
                name={isRTL ? "arrow-forward" : "arrow-back"} 
                size={28} 
                color={theme.text.inverse} 
              />
            </TouchableOpacity>
            <Text style={{
              color: theme.text.inverse,
              fontSize: 20,
              fontWeight: 'bold',
            }}>
              {isRTL ? 'עריכת כלב' : 'Edit Dog'}
            </Text>
            <View style={{ width: 28 }} />
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Image Picker */}
          <TouchableOpacity
            onPress={pickImage}
            onLongPress={() => {
              if (image) {
                Alert.alert(
                  isRTL ? 'הסר תמונה' : 'Remove Photo',
                  isRTL ? 'האם אתה בטוח שברצונך להסיר את התמונה?' : 'Are you sure you want to remove the photo?',
                  [
                    {
                      text: isRTL ? 'ביטול' : 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: isRTL ? 'הסר' : 'Remove',
                      style: 'destructive',
                      onPress: () => setImage(null),
                    },
                  ]
                );
              }
            }}
            style={{
              alignItems: 'center',
              paddingVertical: 32,
            }}
          >
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: theme.background.card,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: theme.primary[300],
              borderStyle: 'dashed',
            }}>
              {image ? (
                <OptimizedImage
                  uri={image}
                  width={114}
                  height={114}
                  borderRadius={57}
                  priority="high"
                  cacheKey={`dog-edit-${dogId}`}
                  fallbackIcon="camera"
                />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color={theme.primary[500]} />
                  <Text style={{
                    color: theme.primary[500],
                    fontSize: 12,
                    marginTop: 4,
                  }}>
                    {isRTL ? 'הוסף תמונה' : 'Add Photo'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Help text */}
          <Text style={{
            textAlign: 'center',
            color: theme.text.muted,
            fontSize: 12,
            marginBottom: 20,
            paddingHorizontal: 20,
          }}>
            {image 
              ? (isRTL ? 'לחץ ארוך להסרת התמונה' : 'Long press to remove photo')
              : (isRTL ? 'לחץ להוספת תמונה מהמצלמה או הגלריה' : 'Tap to add photo from camera or gallery')
            }
          </Text>

          <View style={{ paddingHorizontal: 20 }}>
            {/* Basic Information */}
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                marginBottom: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {isRTL ? 'מידע בסיסי' : 'Basic Information'}
              </Text>

              {/* Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  marginBottom: 8,
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {isRTL ? 'שם הכלב *' : 'Dog Name *'}
                </Text>
                <TextInput
                  value={dogData.name}
                  onChangeText={(text) => setDogData({ ...dogData, name: text })}
                  placeholder={isRTL ? 'לדוגמה: מקס' : 'e.g. Max'}
                  placeholderTextColor={theme.text.muted}
                  style={{
                    backgroundColor: theme.background.surface,
                    borderRadius: 12,
                    padding: 12,
                    color: theme.text.primary,
                    fontSize: 16,
                    textAlign: isRTL ? 'right' : 'left',
                    borderWidth: errors.name ? 1 : 0,
                    borderColor: '#EF4444',
                  }}
                />
                {errors.name && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.name}
                  </Text>
                )}
              </View>

              {/* Breed */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  marginBottom: 8,
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {isRTL ? 'גזע *' : 'Breed *'}
                </Text>
                <TextInput
                  value={dogData.breed}
                  onChangeText={(text) => setDogData({ ...dogData, breed: text })}
                  placeholder={isRTL ? 'לדוגמה: גולדן רטריבר' : 'e.g. Golden Retriever'}
                  placeholderTextColor={theme.text.muted}
                  style={{
                    backgroundColor: theme.background.surface,
                    borderRadius: 12,
                    padding: 12,
                    color: theme.text.primary,
                    fontSize: 16,
                    textAlign: isRTL ? 'right' : 'left',
                    borderWidth: errors.breed ? 1 : 0,
                    borderColor: '#EF4444',
                  }}
                />
                {errors.breed && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.breed}
                  </Text>
                )}
              </View>

              {/* Age and Weight */}
              <View style={{
                flexDirection: 'row',
                gap: 12,
              }}>
                {/* Age */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.secondary,
                    fontSize: 14,
                    marginBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  }}>
                    {isRTL ? 'גיל (שנים) *' : 'Age (years) *'}
                  </Text>
                  <TextInput
                    value={dogData.age}
                    onChangeText={(text) => setDogData({ ...dogData, age: text })}
                    placeholder="0-30"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: theme.background.surface,
                      borderRadius: 12,
                      padding: 12,
                      color: theme.text.primary,
                      fontSize: 16,
                      textAlign: isRTL ? 'right' : 'left',
                      borderWidth: errors.age ? 1 : 0,
                      borderColor: '#EF4444',
                    }}
                  />
                  {errors.age && (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                      {errors.age}
                    </Text>
                  )}
                </View>

                {/* Weight */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text.secondary,
                    fontSize: 14,
                    marginBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  }}>
                    {isRTL ? 'משקל (ק"ג)' : 'Weight (kg)'}
                  </Text>
                  <TextInput
                    value={dogData.weight}
                    onChangeText={(text) => setDogData({ ...dogData, weight: text })}
                    placeholder="0-100"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: theme.background.surface,
                      borderRadius: 12,
                      padding: 12,
                      color: theme.text.primary,
                      fontSize: 16,
                      textAlign: isRTL ? 'right' : 'left',
                      borderWidth: errors.weight ? 1 : 0,
                      borderColor: '#EF4444',
                    }}
                  />
                  {errors.weight && (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                      {errors.weight}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Gender and Size */}
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                marginBottom: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {isRTL ? 'מאפיינים' : 'Characteristics'}
              </Text>

              {/* Gender */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  marginBottom: 12,
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {isRTL ? 'מין' : 'Gender'}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  gap: 12,
                }}>
                  <TouchableOpacity
                    onPress={() => setDogData({ ...dogData, gender: 'male' })}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: dogData.gender === 'male' ? theme.primary[100] : theme.background.surface,
                      borderWidth: dogData.gender === 'male' ? 2 : 0,
                      borderColor: theme.primary[500],
                    }}
                  >
                    <Ionicons 
                      name="male" 
                      size={20} 
                      color={dogData.gender === 'male' ? theme.primary[600] : theme.text.muted} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      color: dogData.gender === 'male' ? theme.primary[600] : theme.text.secondary,
                      fontWeight: dogData.gender === 'male' ? '600' : '400',
                    }}>
                      {isRTL ? 'זכר' : 'Male'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDogData({ ...dogData, gender: 'female' })}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: dogData.gender === 'female' ? theme.primary[100] : theme.background.surface,
                      borderWidth: dogData.gender === 'female' ? 2 : 0,
                      borderColor: theme.primary[500],
                    }}
                  >
                    <Ionicons 
                      name="female" 
                      size={20} 
                      color={dogData.gender === 'female' ? theme.primary[600] : theme.text.muted} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      color: dogData.gender === 'female' ? theme.primary[600] : theme.text.secondary,
                      fontWeight: dogData.gender === 'female' ? '600' : '400',
                    }}>
                      {isRTL ? 'נקבה' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Size */}
              <View>
                <Text style={{
                  color: theme.text.secondary,
                  fontSize: 14,
                  marginBottom: 12,
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {isRTL ? 'גודל' : 'Size'}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  gap: 8,
                }}>
                  {['small', 'medium', 'large'].map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => setDogData({ ...dogData, size })}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: dogData.size === size ? theme.primary[100] : theme.background.surface,
                        borderWidth: dogData.size === size ? 2 : 0,
                        borderColor: theme.primary[500],
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons 
                        name="paw" 
                        size={size === 'small' ? 16 : size === 'medium' ? 20 : 24} 
                        color={dogData.size === size ? theme.primary[600] : theme.text.muted} 
                      />
                      <Text style={{
                        marginTop: 4,
                        color: dogData.size === size ? theme.primary[600] : theme.text.secondary,
                        fontWeight: dogData.size === size ? '600' : '400',
                        fontSize: 12,
                      }}>
                        {size === 'small' ? (isRTL ? 'קטן' : 'Small') :
                         size === 'medium' ? (isRTL ? 'בינוני' : 'Medium') :
                         (isRTL ? 'גדול' : 'Large')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Personality */}
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                marginBottom: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {isRTL ? 'אישיות' : 'Personality'}
              </Text>

              <PersonalitySlider
                trait="friendly"
                label={isRTL ? 'חברותי' : 'Friendly'}
                icon="heart"
                color="#FF6B6B"
              />
              <PersonalitySlider
                trait="energetic"
                label={isRTL ? 'אנרגטי' : 'Energetic'}
                icon="flash"
                color="#FFD93D"
              />
              <PersonalitySlider
                trait="social"
                label={isRTL ? 'חברתי' : 'Social'}
                icon="people"
                color="#6BCF7F"
              />
              <PersonalitySlider
                trait="aggressive"
                label={isRTL ? 'תוקפני' : 'Aggressive'}
                icon="warning"
                color="#FF4757"
              />
            </View>

            {/* Description */}
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                marginBottom: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {isRTL ? 'תיאור' : 'Description'}
              </Text>

              <TextInput
                value={dogData.description}
                onChangeText={(text) => setDogData({ ...dogData, description: text })}
                placeholder={isRTL ? 'ספר לנו על הכלב שלך...' : 'Tell us about your dog...'}
                placeholderTextColor={theme.text.muted}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: theme.background.surface,
                  borderRadius: 12,
                  padding: 12,
                  color: theme.text.primary,
                  fontSize: 16,
                  textAlign: isRTL ? 'right' : 'left',
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Medical Info */}
            <View style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                marginBottom: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {isRTL ? 'מידע רפואי' : 'Medical Information'}
              </Text>

              <TouchableOpacity
                onPress={() => setDogData({ ...dogData, vaccinated: !dogData.vaccinated })}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  backgroundColor: theme.background.surface,
                  borderRadius: 12,
                }}
              >
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <Ionicons
                    name="medical"
                    size={24}
                    color={dogData.vaccinated ? '#10B981' : theme.text.muted}
                  />
                  <Text style={{ color: theme.text.primary, fontSize: 16 }}>
                    {isRTL ? 'מחוסן' : 'Vaccinated'}
                  </Text>
                </View>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: dogData.vaccinated ? '#10B981' : theme.border.medium,
                  backgroundColor: dogData.vaccinated ? '#10B981' : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {dogData.vaccinated && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          backgroundColor: theme.background.primary,
          borderTopWidth: 1,
          borderTopColor: theme.border.light,
        }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[theme.primary[500], theme.primary[600]]}
              style={{
                padding: 16,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{
                  color: theme.text.inverse,
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  {isRTL ? 'שמור שינויים' : 'Save Changes'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}