import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Dog } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

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

  // Aggregate images and manage selected image (simple, on-brand)
  const images = useMemo(() => {
    const list: string[] = [];
    if (dog?.image) list.push(dog.image);
    if (dog && Array.isArray(dog.images)) list.push(...dog.images);
    if (dog && Array.isArray(dog.gallery)) list.push(...dog.gallery);
    return Array.from(new Set(list));
  }, [dog]);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(images[0]);

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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.background.primary }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary[500]} />
          </View>
        ) : (
          <>
            {/* Header */}
            <LinearGradient
              colors={[theme.primary[500], theme.primary[600]]}
              style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 }}
            >
              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text style={{ color: theme.text.inverse, fontSize: 24, fontWeight: 'bold', flex: 1 }}>
                  {dog.name}
                </Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
                  {isOwner && onEdit && (
                    <TouchableOpacity onPress={() => onEdit(dog)}>
                      <Ionicons name="pencil" size={24} color={theme.text.inverse} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={28} color={theme.text.inverse} />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dog Image */}
              <View style={{ alignItems: 'center', marginTop: -40 }}>
                <View style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: theme.background.card,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 4,
                  borderColor: theme.background.primary,
                  shadowColor: theme.shadow.dark,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 5,
                }}>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={{ width: 112, height: 112, borderRadius: 56 }} />
                  ) : (
                    <Text style={{ fontSize: 48 }}>🐕</Text>
                  )}
                </View>

                {/* Popularity Badge */}
                {dog.popularity && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: getPopularityColor(dog.popularity.status), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 }}>
                    <Ionicons name="sparkles" size={14} color="#fff" />
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                      {dog.popularity.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Thumbnails (subtle) */}
              {images.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
                    {images.map((uri) => (
                      <TouchableOpacity key={uri} onPress={() => setSelectedImage(uri)}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: selectedImage === uri ? 2 : 1, borderColor: selectedImage === uri ? theme.primary[500] : theme.border.light }}>
                          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Basic Info */}
              <SectionCard icon="information-circle" title={isRTL ? 'מידע בסיסי' : 'Basic Information'} theme={theme} isRTL={isRTL}>
                <View style={{ gap: 8 }}>
                  <InfoRow icon="paw" label={isRTL ? 'גזע' : 'Breed'} value={dog.breed} theme={theme} isRTL={isRTL} />
                  <InfoRow icon="calendar" label={isRTL ? 'גיל' : 'Age'} value={`${dog.age} ${isRTL ? 'שנים' : 'years'}`} theme={theme} isRTL={isRTL} />
                  <InfoRow icon="resize" label={isRTL ? 'גודל' : 'Size'} value={getSizeText(dog.size)} theme={theme} isRTL={isRTL} />
                  {dog.weight && (
                    <InfoRow icon="barbell" label={isRTL ? 'משקל' : 'Weight'} value={`${dog.weight} ${isRTL ? 'ק"ג' : 'kg'}`} theme={theme} isRTL={isRTL} />
                  )}
                  <InfoRow icon={dog.gender === 'male' ? 'male' : 'female'} label={isRTL ? 'מין' : 'Gender'} value={dog.gender === 'male' ? (isRTL ? 'זכר' : 'Male') : (isRTL ? 'נקבה' : 'Female')} theme={theme} isRTL={isRTL} />
                </View>
              </SectionCard>

              {/* Description */}
              {dog.description && (
                <SectionCard icon="document-text" title={isRTL ? 'תיאור' : 'Description'} theme={theme} isRTL={isRTL}>
                  <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                    {dog.description}
                  </Text>
                </SectionCard>
              )}

              {/* Personality Traits */}
              {dog.personality && (
                <SectionCard icon="happy" title={isRTL ? 'אישיות' : 'Personality'} theme={theme} isRTL={isRTL}>
                  <PersonalityTrait label={isRTL ? 'חברותי' : 'Friendly'} value={dog.personality.friendly} icon="heart" color="#FF6B6B" theme={theme} isRTL={isRTL} />
                  <PersonalityTrait label={isRTL ? 'אנרגטי' : 'Energetic'} value={dog.personality.energetic} icon="flash" color="#FFD93D" theme={theme} isRTL={isRTL} />
                  <PersonalityTrait label={isRTL ? 'חברתי' : 'Social'} value={dog.personality.social} icon="people" color="#6BCF7F" theme={theme} isRTL={isRTL} />
                  <PersonalityTrait label={isRTL ? 'תוקפני' : 'Aggressive'} value={dog.personality.aggressive} icon="warning" color="#FF4757" theme={theme} isRTL={isRTL} />
                </SectionCard>
              )}

              {/* Ratings */}
              {dog.ratings && dog.ratings.count > 0 && (
                <SectionCard icon="star" title={isRTL ? 'דירוגים' : 'Ratings'} theme={theme} isRTL={isRTL}>
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 36, fontWeight: 'bold', color: theme.primary[500] }}>
                      {dog.ratings.average.toFixed(1)}
                    </Text>
                    <View style={{ flexDirection: 'row', marginVertical: 4 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons key={star} name={star <= Math.round(dog.ratings.average) ? 'star' : 'star-outline'} size={20} color="#FFD700" />
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      {dog.ratings.count} {isRTL ? 'דירוגים' : 'ratings'}
                    </Text>
                  </View>

                  <View style={{ gap: 8 }}>
                    <RatingBar label={isRTL ? 'ידידותיות' : 'Friendliness'} value={dog.ratings.breakdown.friendliness} theme={theme} isRTL={isRTL} />
                    <RatingBar label={isRTL ? 'משחקיות' : 'Playfulness'} value={dog.ratings.breakdown.playfulness} theme={theme} isRTL={isRTL} />
                    <RatingBar label={isRTL ? 'ציות' : 'Obedience'} value={dog.ratings.breakdown.obedience} theme={theme} isRTL={isRTL} />
                    <RatingBar label={isRTL ? 'אנרגיה' : 'Energy'} value={dog.ratings.breakdown.energy} theme={theme} isRTL={isRTL} />
                  </View>
                </SectionCard>
              )}

              {/* Social Stats */}
              {dog.socialStats && (
                <SectionCard icon="stats-chart" title={isRTL ? 'סטטיסטיקות חברתיות' : 'Social Stats'} theme={theme} isRTL={isRTL}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <StatCard icon="calendar-outline" value={dog.totalVisits || dog.socialStats.totalMeetings} label={isRTL ? 'ביקורים' : 'Visits'} theme={theme} />
                    <StatCard icon="people-outline" value={dog.socialStats.totalPlaymates} label={isRTL ? 'חברים למשחק' : 'Playmates'} theme={theme} />
                    <StatCard icon="camera-outline" value={dog.photosCount || 0} label={isRTL ? 'תמונות' : 'Photos'} theme={theme} />
                  </View>
                </SectionCard>
              )}

              {/* Medical Info */}
              {dog.medicalInfo && (
                <SectionCard icon="medkit" title={isRTL ? 'מידע רפואי' : 'Medical Info'} theme={theme} isRTL={isRTL}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={dog.medicalInfo.vaccinated ? 'checkmark-circle' : 'close-circle'} size={24} color={dog.medicalInfo.vaccinated ? '#10B981' : '#EF4444'} />
                    <Text style={{ color: theme.text.primary }}>
                      {dog.medicalInfo.vaccinated ? (isRTL ? 'מחוסן' : 'Vaccinated') : (isRTL ? 'לא מחוסן' : 'Not Vaccinated')}
                    </Text>
                  </View>
                  {Array.isArray(dog.medicalInfo.healthIssues) && dog.medicalInfo.healthIssues.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: theme.text.secondary, marginBottom: 6, fontWeight: '600' }}>{isRTL ? 'בעיות בריאות' : 'Health Issues'}</Text>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                        {dog.medicalInfo.healthIssues.map((issue, idx) => (
                          <Tag key={`issue-${idx}`} icon="alert" label={issue} theme={theme} />
                        ))}
                      </View>
                    </View>
                  )}
                  {Array.isArray(dog.medicalInfo.medications) && dog.medicalInfo.medications.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ color: theme.text.secondary, marginBottom: 6, fontWeight: '600' }}>{isRTL ? 'תרופות' : 'Medications'}</Text>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                        {dog.medicalInfo.medications.map((med, idx) => (
                          <Tag key={`med-${idx}`} icon="medical" label={med} theme={theme} />
                        ))}
                      </View>
                    </View>
                  )}
                </SectionCard>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

// Helper Components
interface SectionCardProps { icon?: any; title: string; children: React.ReactNode; theme: any; isRTL: boolean }
const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children, theme, isRTL }) => (
  <View style={{ backgroundColor: theme.background.card, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 14 }}>
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
      {icon && (
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.background.surface, justifyContent: 'center', alignItems: 'center', marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
          <Ionicons name={icon} size={16} color={theme.text.muted} />
        </View>
      )}
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text.primary, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>
        {title}
      </Text>
    </View>
    {children}
  </View>
);

interface InfoRowProps { icon: any; label: string; value: string | number; theme: any; isRTL: boolean }
const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, theme, isRTL }) => (
  <View style={{
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
  }}>
    <Ionicons name={icon} size={20} color={theme.text.muted} />
    <Text style={{ color: theme.text.secondary, flex: 1 }}>{label}:</Text>
    <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{value}</Text>
  </View>
);

interface PersonalityTraitProps { label: string; value: number; icon: any; color: string; theme: any; isRTL: boolean }
const PersonalityTrait: React.FC<PersonalityTraitProps> = ({ label, value, icon, color, theme, isRTL }) => (
  <View style={{
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 12,
  }}>
    <View style={{
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: color + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    }}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={{
      flex: 1,
      color: theme.text.primary,
      fontSize: 14,
    }}>
      {label}
    </Text>
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((level) => (
        <View
          key={level}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: level <= value ? color : theme.border.light,
            marginHorizontal: 2,
          }}
        />
      ))}
    </View>
  </View>
);

interface RatingBarProps { label: string; value: number; theme: any; isRTL: boolean }
const RatingBar: React.FC<RatingBarProps> = ({ label, value, theme, isRTL }) => (
  <View>
    <View style={{
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    }}>
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{label}</Text>
      <Text style={{ fontSize: 12, color: theme.text.primary, fontWeight: '600' }}>
        {value.toFixed(1)}
      </Text>
    </View>
    <View style={{
      height: 8,
      backgroundColor: theme.border.light,
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      <View style={{
        width: `${(value / 5) * 100}%`,
        height: '100%',
        backgroundColor: theme.primary[500],
      }} />
    </View>
  </View>
);

interface StatCardProps { icon: any; value: number | string; label: string; theme: any }
const StatCard: React.FC<StatCardProps> = ({ icon, value, label, theme }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    }}>
      <Ionicons name={icon} size={24} color={theme.primary[600]} />
    </View>
    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary }}>
      {value}
    </Text>
    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
      {label}
    </Text>
  </View>
);

export default DogProfileModal;
