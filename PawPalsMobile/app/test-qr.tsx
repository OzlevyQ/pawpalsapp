import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import CheckinService from '../services/checkinService';

export default function TestQRScreen() {
  const [qrInput, setQrInput] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const router = useRouter();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const testQRFormats = [
    {
      name: 'JSON Format',
      data: '{"gardenId": "670f1234567890abcdef1234", "gardenName": "Central Dog Park", "type": "checkin"}'
    },
    {
      name: 'URL Format',
      data: 'https://pawpals.app/gardens/670f1234567890abcdef1234'
    },
    {
      name: 'PawPals Format',
      data: 'pawpals:garden:670f1234567890abcdef1234'
    },
    {
      name: 'Simple ID',
      data: '670f1234567890abcdef1234'
    },
    {
      name: 'Invalid Format',
      data: 'just some random text'
    }
  ];

  const testQRCode = (qrData: string) => {
    try {
      const validation = CheckinService.validateQRCode(qrData);
      const parsedData = CheckinService.parseQRCode(qrData);
      
      let result = `Testing: "${qrData}"\n`;
      result += `Valid: ${validation.valid ? '✅' : '❌'}\n`;
      
      if (validation.error) {
        result += `Error: ${validation.error}\n`;
      }
      
      if (parsedData) {
        result += `Garden ID: ${parsedData.gardenId}\n`;
        result += `Garden Name: ${parsedData.gardenName || 'Not specified'}\n`;
        result += `Type: ${parsedData.type}\n`;
      } else {
        result += `Could not parse QR data\n`;
      }
      
      result += '---';
      
      setTestResults(prev => [result, ...prev]);
      
    } catch (error) {
      const errorResult = `Testing: "${qrData}"\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n---`;
      setTestResults(prev => [errorResult, ...prev]);
    }
  };

  const testCustomQR = () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter QR code data to test');
      return;
    }
    testQRCode(qrInput);
    setQrInput('');
  };

  const generateSampleQR = () => {
    const sampleQR = CheckinService.generateSampleQRCode('670f1234567890abcdef1234', 'Test Garden');
    setQrInput(sampleQR);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.primary[500], theme.primary[600]]}
        style={{ paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        <View style={{ 
          flexDirection: isRTL ? 'row-reverse' : 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons 
              name={isRTL ? "chevron-forward" : "chevron-back"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center'
          }}>
            QR Code Tester
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Test Predefined Formats */}
        <View style={{ marginTop: 20, marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text.primary,
            marginBottom: 16,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            Test Predefined Formats
          </Text>
          
          {testQRFormats.map((format, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => testQRCode(format.data)}
              style={{
                backgroundColor: theme.background.card,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.border.light,
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 8,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {format.name}
              </Text>
              <Text style={{
                fontSize: 14,
                color: theme.text.secondary,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {format.data}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom QR Test */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text.primary,
            marginBottom: 16,
            textAlign: isRTL ? 'right' : 'left'
          }}>
            Test Custom QR Code
          </Text>
          
          <TextInput
            style={{
              backgroundColor: theme.background.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.border.light,
              color: theme.text.primary,
              fontSize: 14,
              textAlign: isRTL ? 'right' : 'left',
              minHeight: 80,
              textAlignVertical: 'top'
            }}
            placeholder="Enter QR code data here..."
            placeholderTextColor={theme.text.secondary}
            value={qrInput}
            onChangeText={setQrInput}
            multiline
          />
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={testCustomQR}
              style={{
                flex: 1,
                backgroundColor: theme.primary[500],
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Test QR
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={generateSampleQR}
              style={{
                flex: 1,
                backgroundColor: theme.secondary[500],
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Generate Sample
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {testResults.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 16 
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.text.primary,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                Test Results ({testResults.length})
              </Text>
              <TouchableOpacity onPress={clearResults}>
                <Text style={{
                  fontSize: 14,
                  color: theme.primary[500],
                  fontWeight: '600'
                }}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
            
            {testResults.map((result, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.background.card,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border.light,
                }}
              >
                <Text style={{
                  fontSize: 14,
                  color: theme.text.primary,
                  fontFamily: 'monospace',
                  lineHeight: 20,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {result}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ marginBottom: 40 }}>
          <TouchableOpacity
            onPress={() => router.push('/qr-scanner')}
            style={{
              backgroundColor: theme.primary[500],
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 24,
              marginBottom: 12,
            }}
          >
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Ionicons 
                name="camera" 
                size={20} 
                color="white" 
                style={{ 
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0 
                }} 
              />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '600'
              }}>
                Open QR Scanner
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/checkin')}
            style={{
              backgroundColor: theme.background.card,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: theme.border.light,
            }}
          >
            <View style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Ionicons 
                name="location" 
                size={20} 
                color={theme.primary[500]} 
                style={{ 
                  marginRight: isRTL ? 0 : 8,
                  marginLeft: isRTL ? 8 : 0 
                }} 
              />
              <Text style={{
                color: theme.text.primary,
                fontSize: 16,
                fontWeight: '600'
              }}>
                Manual Check-in
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}