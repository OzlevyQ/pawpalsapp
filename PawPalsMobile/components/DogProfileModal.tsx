import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dog } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import OptimizedImage, { preloadImages } from './OptimizedImage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DogProfileModalProps {
  visible: boolean;
  onClose: () => void;
  dog: Dog | null;
  loading?: boolean;
  isOwner?: boolean;
  onEdit?: (dog: Dog) => void;
}

const DogProfileModal: React.FC<DogProfileModalProps> = ({ visible, onClose, dog, loading, isOwner = false, onEdit }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  // Aggregate images and manage selected image
  const images = useMemo(() => {
    const list: string[] = [];
    if (dog?.image) list.push(dog.image);
    if (dog && Array.isArray(dog.images)) list.push(...dog.images);
    if (dog && Array.isArray(dog.gallery)) list.push(...dog.gallery);
    return Array.from(new Set(list));
  }, [dog]);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(images[0]);

  // Preload dog images when modal becomes visible
  React.useEffect(() => {
    if (visible && images.length > 0) {
      preloadImages(images);
    }
  }, [visible, images]);

  if (!dog) return null;

  const getPopularityColor = (status: string) => {
    switch (status) {
      case 'community-favorite': return '#FFD700';
      case 'beloved': return '#FF69B4';
      case 'well-known': return '#9370DB';
      case 'popular': return '#87CEEB';
      default: return theme.text.secondary;
    }
  };

  const getSizeText = (size: string) => {
    switch (size) {
      case 'small': return isRTL ? 'קטן' : 'Small';
      case 'medium': return isRTL ? 'בינוני' : 'Medium';
      case 'large': return isRTL ? 'גדול' : 'Large';
      default: return size;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.background.primary} />
      <View style={{ flex: 1, backgroundColor: theme.background.primary }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary[500]} />
          </View>
        ) : (
          <>
            {/* Clean Header */}
            <View style={{ 
              paddingTop: 60, 
              paddingHorizontal: 24, 
              paddingBottom: 20,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.background.primary,
              borderBottomWidth: 1,
              borderBottomColor: theme.border.light,
            }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.background.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={theme.text.primary} />
              </TouchableOpacity>

              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: theme.text.primary,
                flex: 1,
                textAlign: 'center',
                marginHorizontal: 16
              }}>
                {dog.name}
              </Text>

              {isOwner && onEdit && (
                <TouchableOpacity
                  onPress={() => onEdit(dog)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.primary[500],
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="pencil" size={16} color={theme.text.inverse} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Hero Section */}
              <View style={{ 
                alignItems: 'center', 
                paddingVertical: 40,
                backgroundColor: theme.background.primary
              }}>
                {/* Profile Image */}
                <View style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: 60,
                  backgroundColor: theme.background.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 24,
                  shadowColor: theme.shadow.medium,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 8,
                }}>
                  {selectedImage ? (
                    <OptimizedImage
                      uri={selectedImage}
                      width={120}
                      height={120}
                      borderRadius={60}
                      priority="high"
                      cacheKey={`dog-profile-${dog._id}`}
                      fallbackIcon="paw"
                    />
                  ) : (
                    <Text style={{ fontSize: 48, textAlign: 'center' }}>🐕</Text>
                  )}
                </View>

                {/* Dog Details */}
                <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: '700', 
                    color: theme.text.primary,
                    marginBottom: 8,
                  }}>
                    {dog.name}
                  </Text>
                  
                  <Text style={{ 
                    fontSize: 16, 
                    color: theme.text.secondary,
                    marginBottom: 16,
                  }}>
                    {dog.breed} • {dog.age} {isRTL ? 'שנים' : 'years'}
                  </Text>

                  {/* Popularity Badge */}
                  {dog.popularity && (
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: 6, 
                      backgroundColor: getPopularityColor(dog.popularity.status) + '20',
                      paddingHorizontal: 12, 
                      paddingVertical: 6, 
                      borderRadius: 16,
                      marginBottom: 20
                    }}>
                      <Ionicons name="sparkles" size={14} color={getPopularityColor(dog.popularity.status)} />
                      <Text style={{ 
                        color: getPopularityColor(dog.popularity.status), 
                        fontWeight: '600', 
                        fontSize: 12 
                      }}>
                        {dog.popularity.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Stats Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-around', 
                    width: '100%',
                    paddingVertical: 20,
                    backgroundColor: theme.background.surface,
                    borderRadius: 16,
                    marginBottom: 20
                  }}>
                    <StatItem 
                      value={dog.totalVisits || 0} 
                      label={isRTL ? 'ביקורים' : 'Visits'} 
                      theme={theme} 
                    />
                    <View style={{ width: 1, backgroundColor: theme.border.light, height: 40 }} />
                    <StatItem 
                      value={dog.friendsCount || 0} 
                      label={isRTL ? 'חברים' : 'Friends'} 
                      theme={theme} 
                    />
                    <View style={{ width: 1, backgroundColor: theme.border.light, height: 40 }} />
                    <StatItem 
                      value={dog.photosCount || 0} 
                      label={isRTL ? 'תמונות' : 'Photos'} 
                      theme={theme} 
                    />
                  </View>
                </View>
              </View>

              {/* Image Gallery */}
              {images.length > 1 && (
                <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: '600', 
                    color: theme.text.primary,
                    marginBottom: 16,
                    textAlign: isRTL ? 'right' : 'left'
                  }}>
                    {isRTL ? 'תמונות' : 'Photos'}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                      {images.map((uri) => (
                        <TouchableOpacity key={uri} onPress={() => setSelectedImage(uri)}>
                          <View style={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 12, 
                            overflow: 'hidden',
                            borderWidth: selectedImage === uri ? 2 : 0,
                            borderColor: theme.primary[500],
                          }}>
                            <OptimizedImage
                              uri={uri}
                              width={80}
                              height={80}
                              borderRadius={12}
                              priority="normal"
                              cacheKey={`dog-thumb-${dog._id}`}
                              fallbackIcon="image"
                            />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Content Sections */}
              <View style={{ paddingHorizontal: 24, gap: 24 }}>

                {/* Basic Info */}
                <InfoSection title={isRTL ? 'מידע בסיסי' : 'About'} theme={theme} isRTL={isRTL}>
                  <View style={{ 
                    backgroundColor: theme.background.surface,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                  }}>
                    <InfoRow icon="paw" label={isRTL ? 'גזע' : 'Breed'} value={dog.breed || (isRTL ? 'לא צוין' : 'Not specified')} theme={theme} isRTL={isRTL} />
                    <InfoRow icon="calendar" label={isRTL ? 'גיל' : 'Age'} value={`${dog.age || 0} ${isRTL ? 'שנים' : 'years'}`} theme={theme} isRTL={isRTL} />
                    {dog.size && (
                      <InfoRow icon="resize" label={isRTL ? 'גודל' : 'Size'} value={getSizeText(dog.size)} theme={theme} isRTL={isRTL} />
                    )}
                    {dog.weight && (
                      <InfoRow icon="barbell" label={isRTL ? 'משקל' : 'Weight'} value={`${dog.weight} ${isRTL ? 'ק"ג' : 'kg'}`} theme={theme} isRTL={isRTL} />
                    )}
                    {dog.gender && (
                      <InfoRow icon={dog.gender === 'male' ? 'male' : 'female'} label={isRTL ? 'מין' : 'Gender'} value={dog.gender === 'male' ? (isRTL ? 'זכר' : 'Male') : (isRTL ? 'נקבה' : 'Female')} theme={theme} isRTL={isRTL} />
                    )}
                    <InfoRow icon="shield-checkmark" label={isRTL ? 'סטטוס' : 'Status'} value={dog.isActive ? (isRTL ? 'פעיל' : 'Active') : (isRTL ? 'לא פעיל' : 'Inactive')} theme={theme} isRTL={isRTL} />
                  </View>
                </InfoSection>

                {/* Description */}
                {dog.description && (
                  <InfoSection title={isRTL ? 'תיאור' : 'Description'} theme={theme} isRTL={isRTL}>
                    <Text style={{ 
                      fontSize: 15, 
                      color: theme.text.secondary, 
                      lineHeight: 22, 
                      textAlign: isRTL ? 'right' : 'left' 
                    }}>
                      {dog.description}
                    </Text>
                  </InfoSection>
                )}

                {/* Personality */}
                {dog.personality && (
                  <InfoSection title={isRTL ? 'אישיות' : 'Personality'} theme={theme} isRTL={isRTL}>
                    <View style={{ gap: 16 }}>
                      <PersonalityTrait label={isRTL ? 'חברותי' : 'Friendly'} value={dog.personality.friendly} color="#4ADE80" theme={theme} isRTL={isRTL} />
                      <PersonalityTrait label={isRTL ? 'אנרגטי' : 'Energetic'} value={dog.personality.energetic} color="#F59E0B" theme={theme} isRTL={isRTL} />
                      <PersonalityTrait label={isRTL ? 'חברתי' : 'Social'} value={dog.personality.social} color="#3B82F6" theme={theme} isRTL={isRTL} />
                      <PersonalityTrait label={isRTL ? 'תוקפני' : 'Aggressive'} value={dog.personality.aggressive} color="#EF4444" theme={theme} isRTL={isRTL} />
                    </View>
                  </InfoSection>
                )}

                {/* Ratings */}
                {dog.ratings && dog.ratings.count > 0 && (
                  <InfoSection title={isRTL ? 'דירוגים' : 'Ratings'} theme={theme} isRTL={isRTL}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <Text style={{ 
                        fontSize: 32, 
                        fontWeight: '700', 
                        color: theme.primary[500],
                        marginBottom: 8
                      }}>
                        {dog.ratings.average.toFixed(1)}
                      </Text>
                      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons 
                            key={star} 
                            name={star <= Math.round(dog.ratings.average) ? 'star' : 'star-outline'} 
                            size={20} 
                            color="#F59E0B" 
                          />
                        ))}
                      </View>
                      <Text style={{ 
                        fontSize: 14, 
                        color: theme.text.secondary 
                      }}>
                        {dog.ratings.count} {isRTL ? 'דירוגים' : 'ratings'}
                      </Text>
                    </View>
                    
                    <View style={{ gap: 12 }}>
                      <RatingBar label={isRTL ? 'ידידותיות' : 'Friendliness'} value={dog.ratings.breakdown.friendliness} theme={theme} isRTL={isRTL} />
                      <RatingBar label={isRTL ? 'משחקיות' : 'Playfulness'} value={dog.ratings.breakdown.playfulness} theme={theme} isRTL={isRTL} />
                      <RatingBar label={isRTL ? 'ציות' : 'Obedience'} value={dog.ratings.breakdown.obedience} theme={theme} isRTL={isRTL} />
                      <RatingBar label={isRTL ? 'אנרגיה' : 'Energy'} value={dog.ratings.breakdown.energy} theme={theme} isRTL={isRTL} />
                    </View>
                  </InfoSection>
                )}

                {/* Medical Info */}
                {dog.medicalInfo && (
                  <InfoSection title={isRTL ? 'מידע רפואי' : 'Medical Info'} theme={theme} isRTL={isRTL}>
                    <View style={{ 
                      flexDirection: isRTL ? 'row-reverse' : 'row', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: dog.medicalInfo.vaccinated ? theme.primary[50] : '#FEF2F2',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: dog.medicalInfo.vaccinated ? theme.primary[200] : '#FECACA'
                    }}>
                      <Ionicons 
                        name={dog.medicalInfo.vaccinated ? 'checkmark-circle' : 'close-circle'} 
                        size={24} 
                        color={dog.medicalInfo.vaccinated ? theme.primary[500] : '#EF4444'} 
                      />
                      <Text style={{ 
                        color: dog.medicalInfo.vaccinated ? theme.primary[700] : '#DC2626', 
                        fontSize: 16, 
                        fontWeight: '600' 
                      }}>
                        {dog.medicalInfo.vaccinated ? (isRTL ? 'מחוסן' : 'Vaccinated') : (isRTL ? 'לא מחוסן' : 'Not Vaccinated')}
                      </Text>
                    </View>

                    {Array.isArray(dog.medicalInfo.healthIssues) && dog.medicalInfo.healthIssues.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ 
                          color: theme.text.secondary, 
                          marginBottom: 8, 
                          fontWeight: '600',
                          fontSize: 14
                        }}>
                          {isRTL ? 'בעיות בריאות' : 'Health Issues'}
                        </Text>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                          {dog.medicalInfo.healthIssues.map((issue, idx) => (
                            <MedicalTag key={`issue-${idx}`} label={issue} type="warning" theme={theme} />
                          ))}
                        </View>
                      </View>
                    )}

                    {Array.isArray(dog.medicalInfo.medications) && dog.medicalInfo.medications.length > 0 && (
                      <View>
                        <Text style={{ 
                          color: theme.text.secondary, 
                          marginBottom: 8, 
                          fontWeight: '600',
                          fontSize: 14
                        }}>
                          {isRTL ? 'תרופות' : 'Medications'}
                        </Text>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                          {dog.medicalInfo.medications.map((med, idx) => (
                            <MedicalTag key={`med-${idx}`} label={med} type="medication" theme={theme} />
                          ))}
                        </View>
                      </View>
                    )}
                  </InfoSection>
                )}

              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

// Helper Components
const StatItem: React.FC<{ value: number | string; label: string; theme: any }> = ({ value, label, theme }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ 
      fontSize: 18, 
      fontWeight: '700', 
      color: theme.text.primary,
      marginBottom: 4
    }}>
      {value}
    </Text>
    <Text style={{ 
      fontSize: 12, 
      color: theme.text.secondary,
      fontWeight: '500'
    }}>
      {label}
    </Text>
  </View>
);

const InfoSection: React.FC<{ title: string; children: React.ReactNode; theme: any; isRTL: boolean }> = ({ title, children, theme, isRTL }) => (
  <View>
    <Text style={{ 
      fontSize: 18, 
      fontWeight: '600', 
      color: theme.text.primary,
      marginBottom: 16,
      textAlign: isRTL ? 'right' : 'left'
    }}>
      {title}
    </Text>
    {children}
  </View>
);

const InfoGrid: React.FC<{ children: React.ReactNode; theme: any; isRTL: boolean }> = ({ children, theme, isRTL }) => (
  <View style={{ 
    backgroundColor: theme.background.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12
  }}>
    {children}
  </View>
);

const InfoItem: React.FC<{ icon: string; label: string; value: string; theme: any }> = ({ icon, label, value, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View style={{
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Ionicons name={icon as any} size={16} color={theme.primary[600]} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: theme.text.primary, fontWeight: '500' }}>{value}</Text>
    </View>
  </View>
);

const InfoRow: React.FC<{ icon: string; label: string; value: string; theme: any; isRTL?: boolean }> = ({ icon, label, value, theme, isRTL }) => (
  <View style={{ 
    width: '48%',
    flexDirection: isRTL ? 'row-reverse' : 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    paddingVertical: 4
  }}>
    <View style={{
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isRTL ? 0 : 8,
      marginLeft: isRTL ? 8 : 0,
    }}>
      <Ionicons name={icon as any} size={11} color={theme.primary[600]} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ 
        fontSize: 10, 
        color: theme.text.secondary,
        textAlign: isRTL ? 'right' : 'left'
      }}>{label}</Text>
      <Text style={{ 
        fontSize: 12, 
        color: theme.text.primary, 
        fontWeight: '500',
        textAlign: isRTL ? 'right' : 'left'
      }}>{value}</Text>
    </View>
  </View>
);

const PersonalityTrait: React.FC<{ label: string; value: number; color: string; theme: any; isRTL?: boolean }> = ({ label, value, color, theme, isRTL }) => (
  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text style={{ fontSize: 15, color: theme.text.primary, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: level <= value ? color : theme.border.light,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 13, color: theme.text.secondary, fontWeight: '500', minWidth: 24, textAlign: isRTL ? 'right' : 'left' }}>
        {value}/5
      </Text>
    </View>
  </View>
);

const RatingBar: React.FC<{ label: string; value: number; theme: any; isRTL?: boolean }> = ({ label, value, theme, isRTL }) => (
  <View>
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 14, color: theme.text.primary, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary, textAlign: isRTL ? 'left' : 'right' }}>{value.toFixed(1)}</Text>
    </View>
    <View style={{
      height: 6,
      backgroundColor: theme.border.light,
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      <View style={{
        width: `${(value / 5) * 100}%`,
        height: '100%',
        backgroundColor: '#F59E0B',
        borderRadius: 3,
      }} />
    </View>
  </View>
);

const MedicalTag: React.FC<{ label: string; type: 'warning' | 'medication'; theme: any }> = ({ label, type, theme }) => (
  <View style={{
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: type === 'warning' ? '#FEF3C7' : '#DBEAFE',
    borderWidth: 1,
    borderColor: type === 'warning' ? '#F59E0B' : '#3B82F6',
  }}>
    <Text style={{ 
      fontSize: 12, 
      color: type === 'warning' ? '#92400E' : '#1E40AF',
      fontWeight: '500'
    }}>
      {label}
    </Text>
  </View>
);

export default DogProfileModal;