import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  Alert,
  ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dog } from '../services/api';

interface DogSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  dogs: Dog[];
  onSelectDog: (dogs: Dog[]) => void;
  selectedDogIds?: string[];
  multiSelect?: boolean;
  title?: string;
  subtitle?: string;
}

export default function DogSelectionModal({ 
  visible, 
  onClose, 
  dogs, 
  onSelectDog, 
  selectedDogIds = [],
  multiSelect = false,
  title,
  subtitle 
}: DogSelectionModalProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  
  // Memoize selectedDogIds to prevent unnecessary re-renders
  const stableSelectedDogIds = useMemo(() => selectedDogIds, [selectedDogIds.join(',')]);
  
  const [localSelected, setLocalSelected] = useState<string[]>(stableSelectedDogIds);

  // Reset selection when modal opens or selectedDogIds changes
  useEffect(() => {
    if (visible) {
      setLocalSelected(stableSelectedDogIds);
    }
  }, [visible, stableSelectedDogIds]);

  const handleDogSelect = useCallback((dog: Dog) => {
    // Always work in multi-select mode now
    const newSelected = localSelected.includes(dog._id)
      ? localSelected.filter(id => id !== dog._id)
      : [...localSelected, dog._id];
    setLocalSelected(newSelected);
  }, [localSelected]);

  const handleConfirmMultiSelect = useCallback(() => {
    // Only proceed if at least one dog is selected
    if (localSelected.length === 0) {
      // Show alert to inform user they must select at least one dog
      Alert.alert(
        t.dogSelection?.required || 'Dog selection required',
        t.dogSelection?.selectAtLeastOne || 'Please select at least one dog for check-in',
        [{ text: t.common?.ok, style: 'default' }]
      );
      return;
    }
    
    // Return selected dogs as an array
    const selectedDogs = dogs.filter(dog => localSelected.includes(dog._id));
    onSelectDog(selectedDogs);
    onClose();
  }, [localSelected, dogs, onSelectDog, onClose, isRTL]);

  const getDogImage = useCallback((dog: Dog) => {
    if (dog.image) {
      return { uri: dog.image };
    }
    return null;
  }, []);

  const getDogIcon = useCallback((dog: Dog) => {
    // Return appropriate dog emoji based on size or breed if no image
    if (dog.size === 'large') return '🐕‍🦺';
    if (dog.size === 'small') return '🐶';
    return '🐕';
  }, []);

  // Dog item height estimation for FlatList optimization
  const DOG_ITEM_HEIGHT = 80; // Based on padding (16) + content (~48) + margin (16)

  // FlatList render item function
  const renderDogItem: ListRenderItem<Dog> = useCallback(({ item: dog }) => {
    const isSelected = localSelected.includes(dog._id);
    const dogImage = getDogImage(dog);
    
    return (
      <TouchableOpacity
        onPress={() => handleDogSelect(dog)}
        style={{
          backgroundColor: isSelected ? theme.primary[50] : theme.background.surface,
          borderRadius: 12,
          padding: 16,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.primary[500] : theme.border.light,
          marginBottom: 12,
        }}
      >
        {/* Dog Name with Icon */}
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: isSelected ? theme.primary[500] : theme.text.primary,
          textAlign: isRTL ? 'right' : 'left',
          flex: 1,
        }}>
          🐕 {dog.name}
        </Text>

        {/* Selection Indicator */}
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: isSelected ? theme.primary[500] : 'transparent',
          borderWidth: isSelected ? 0 : 2,
          borderColor: isSelected ? 'transparent' : theme.border.medium,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={theme.text.inverse} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [localSelected, theme, isRTL, handleDogSelect, getDogImage]);

  // FlatList key extractor
  const keyExtractor = useCallback((item: Dog) => item._id, []);

  // FlatList getItemLayout for performance
  const getItemLayout = useCallback(
    (data: Dog[] | null | undefined, index: number) => ({
      length: DOG_ITEM_HEIGHT,
      offset: DOG_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Backdrop */}
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Modal Content */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.background.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 40,
            height: 500,
          }}
          activeOpacity={1}
          onPress={() => {}} // Prevent backdrop dismiss when tapping content
        >
          {/* Handle */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: theme.border.medium,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 20,
          }} />

          {/* Header */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 16,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.text.primary,
                textAlign: isRTL ? 'right' : 'left',
              }}>
{title || t.dogSelection?.selectDogs || 'Select Dogs'}
              </Text>
              <Text style={{
                fontSize: 13,
                color: theme.text.secondary,
                textAlign: isRTL ? 'right' : 'left',
                marginTop: 2,
              }}>
{subtitle || t.dogSelection?.selectForCheckin || 'Select dogs for check-in'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: theme.background.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={dogs}
            renderItem={renderDogItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={10}
            removeClippedSubviews={true}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              __DEV__ ? (
                <Text style={{ color: theme.text.secondary, marginBottom: 10 }}>
                  Dogs count: {dogs.length}
                </Text>
              ) : null
            }
            ListFooterComponent={
              <TouchableOpacity
                onPress={handleConfirmMultiSelect}
                disabled={localSelected.length === 0}
                style={{
                  backgroundColor: localSelected.length > 0 ? theme.primary[500] : theme.text.muted,
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 20,
                  alignItems: 'center',
                  opacity: localSelected.length > 0 ? 1 : 0.6,
                }}
              >
                <Text style={{
                  color: theme.text.inverse,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
{localSelected.length > 0 
                    ? (t.dogSelection?.checkinWith?.replace('{count}', localSelected.length.toString()) || `Check-in with ${localSelected.length} dog${localSelected.length > 1 ? 's' : ''}`)
                    : (t.dogSelection?.selectDogs || 'Select dogs')
                  }
                </Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={{
                alignItems: 'center',
                paddingVertical: 40,
              }}>
                <Text style={{ fontSize: 50, marginBottom: 16 }}>🐕</Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: theme.text.primary,
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
{t.dogSelection?.noDogsRegistered || 'No dogs registered'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.text.secondary,
                  textAlign: 'center',
                }}>
{t.dogSelection?.addDogToProfile || 'Add a dog in your profile to check-in'}
                </Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}