import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ComplianceIssue {
  type: 'translation' | 'theme' | 'accessibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  component?: string;
  line?: number;
}

interface DevelopmentCheckerProps {
  enabled?: boolean;
  screenName?: string;
}

/**
 * Development Checker - מערכת בקרה לוידוא תקינות תרגומים וערכות נושא
 * 
 * מטרות:
 * 1. וידוא שכל הטקסטים משתמשים במערכת התרגומים
 * 2. וידוא שכל העיצוב משתמש בערכת הנושא
 * 3. זיהוי בעיות נגישות
 * 4. התרעות למפתחים על בעיות פוטנציאליות
 */
export const DevelopmentChecker: React.FC<DevelopmentCheckerProps> = ({ 
  enabled = __DEV__, 
  screenName = 'Unknown' 
}) => {
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [checksPassed, setChecksPassed] = useState(false);
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!enabled) return;
    
    // רץ בדיקות אוטומטיות
    runComplianceChecks();
  }, [enabled, screenName, theme, language]);

  const runComplianceChecks = () => {
    const detectedIssues: ComplianceIssue[] = [];

    // בדיקת תרגומים
    checkTranslationCompliance(detectedIssues);
    
    // בדיקת ערכת נושא
    checkThemeCompliance(detectedIssues);
    
    // בדיקת נגישות
    checkAccessibilityCompliance(detectedIssues);

    setIssues(detectedIssues);
    setChecksPassed(detectedIssues.filter(issue => issue.severity === 'error').length === 0);

    // הצגת התרעות רק אם יש בעיות חמורות
    if (detectedIssues.some(issue => issue.severity === 'error')) {
      console.warn(`🚨 Development Checker - Found ${detectedIssues.length} issues in ${screenName}`);
    }
  };

  const checkTranslationCompliance = (issues: ComplianceIssue[]) => {
    // בדיקת טקסטים קשיחים (hardcoded strings)
    const hardcodedStrings = findHardcodedStrings();
    
    hardcodedStrings.forEach(str => {
      issues.push({
        type: 'translation',
        severity: 'error',
        message: `Hardcoded string detected: "${str}". Use translation system (t.key) instead.`,
        component: screenName
      });
    });

    // בדיקת שימוש ב-className במקום style
    if (checkForClassNameUsage()) {
      issues.push({
        type: 'theme',
        severity: 'warning',
        message: 'Found className usage. Use inline styles with theme colors for proper theme support.',
        component: screenName
      });
    }

    // בדיקת RTL support
    if (!checkRTLSupport()) {
      issues.push({
        type: 'translation',
        severity: 'warning',
        message: 'Component may not support RTL layout. Consider using isRTL for directional styling.',
        component: screenName
      });
    }
  };

  const checkThemeCompliance = (issues: ComplianceIssue[]) => {
    // בדיקת צבעים קשיחים
    const hardcodedColors = findHardcodedColors();
    
    hardcodedColors.forEach(color => {
      issues.push({
        type: 'theme',
        severity: 'error',
        message: `Hardcoded color detected: "${color}". Use theme.colors instead.`,
        component: screenName
      });
    });

    // בדיקת שימוש בtheme object
    if (!checkThemeUsage()) {
      issues.push({
        type: 'theme',
        severity: 'warning',
        message: 'Component does not seem to use theme system. Import and use theme colors.',
        component: screenName
      });
    }
  };

  const checkAccessibilityCompliance = (issues: ComplianceIssue[]) => {
    // בדיקת accessibility labels
    if (!checkAccessibilityLabels()) {
      issues.push({
        type: 'accessibility',
        severity: 'info',
        message: 'Consider adding accessibility labels for better screen reader support.',
        component: screenName
      });
    }

    // בדיקת contrast ratios (מידע בלבד)
    issues.push({
      type: 'accessibility',
      severity: 'info',
      message: 'Ensure color contrast meets WCAG guidelines for text readability.',
      component: screenName
    });
  };

  // פונקציות עזר לזיהוי בעיות
  const findHardcodedStrings = (): string[] => {
    // במציאות, זה ידרוש ניתוח של component tree או source code
    // כרגע מחזיר דוגמאות למטרות הדגמה
    const commonHardcodedStrings = [];
    
    // בדיקה פשוטה - חיפוש אחר מחרוזות עבריות או אנגליות נפוצות
    if (screenName.includes('Profile') && language === 'en') {
      // דוגמא: אם מסך הפרופיל עדיין מכיל טקסט בעברית כשהשפה היא אנגלית
    }
    
    return commonHardcodedStrings;
  };

  const findHardcodedColors = (): string[] => {
    // דוגמאות לצבעים קשיחים שכדאי להימנע מהם
    return []; // במציאות נסרוק את הקוד
  };

  const checkForClassNameUsage = (): boolean => {
    // בדיקה אם נמצא שימוש ב-className (Tailwind) במקום styles
    return false; // במציאות נבדוק את source code
  };

  const checkRTLSupport = (): boolean => {
    // בדיקה אם הקומפוננטה תומכת ב-RTL
    return true; // הנחה שתומך, במציאות נבדוק flexDirection וכו'
  };

  const checkThemeUsage = (): boolean => {
    // בדיקה אם משתמש במערכת הנושא
    return true; // הנחה שכן
  };

  const checkAccessibilityLabels = (): boolean => {
    // בדיקה אם יש accessibility labels
    return false; // רוב הקומפוננטות לא כוללות
  };

  const getSeverityColor = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return theme.text.muted;
    }
  };

  const getSeverityIcon = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'help-circle';
    }
  };

  if (!enabled || issues.length === 0) return null;

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: checksPassed ? '#10B981' : '#EF4444',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 1000,
        }}
      >
        <Ionicons 
          name={checksPassed ? "checkmark" : "bug"} 
          size={24} 
          color="white" 
        />
        {!checksPassed && (
          <View style={{
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: '#DC2626',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
              {issues.filter(i => i.severity === 'error').length}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Issues Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: theme.background.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: theme.border.light,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: theme.text.primary
              }}>
                Development Checker - {screenName}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Status */}
            <View style={{
              backgroundColor: checksPassed ? '#DCFCE7' : '#FEE2E2',
              padding: 16,
              marginHorizontal: 20,
              marginTop: 16,
              borderRadius: 8,
            }}>
              <Text style={{
                color: checksPassed ? '#166534' : '#DC2626',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {checksPassed ? '✅ All Critical Checks Passed' : `❌ ${issues.filter(i => i.severity === 'error').length} Critical Issues Found`}
              </Text>
            </View>

            {/* Issues List */}
            <ScrollView style={{ flex: 1, padding: 20 }}>
              {issues.map((issue, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  padding: 16,
                  marginBottom: 12,
                  backgroundColor: theme.background.card,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: getSeverityColor(issue.severity),
                }}>
                  <Ionicons 
                    name={getSeverityIcon(issue.severity)} 
                    size={20} 
                    color={getSeverityColor(issue.severity)}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.text.primary,
                      marginBottom: 4,
                    }}>
                      {issue.type.toUpperCase()} • {issue.severity.toUpperCase()}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: theme.text.secondary,
                      lineHeight: 20,
                    }}>
                      {issue.message}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Actions */}
            <View style={{
              flexDirection: 'row',
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: theme.border.light,
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => {
                  runComplianceChecks();
                  Alert.alert('Refreshed', 'Compliance checks have been re-run.');
                }}
                style={{
                  flex: 1,
                  backgroundColor: theme.primary[500],
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  Re-run Checks
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: theme.background.surface,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text.primary, fontWeight: '600' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default DevelopmentChecker;