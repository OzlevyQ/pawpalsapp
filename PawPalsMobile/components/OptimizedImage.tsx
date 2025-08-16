import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Image, ImageProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptimizedImageProps extends ImageProps {
  uri?: string;
  priority?: 'low' | 'normal' | 'high';
  cacheKey?: string;
  showLoader?: boolean;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  borderRadius?: number;
  size?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  source,
  priority = 'normal',
  cacheKey,
  showLoader = true,
  placeholder,
  errorPlaceholder,
  fallbackIcon = 'image-outline',
  borderRadius = 0,
  size,
  width,
  height,
  backgroundColor = '#f0f0f0',
  style,
  onLoadStart,
  onLoad,
  onError,
  resizeMode = 'cover',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Validate and create optimized source object
  const imageSource = React.useMemo(() => {
    if (!uri) return source;
    
    // Check if it's a base64 image
    if (uri.startsWith('data:image/')) {
      // Validate base64 format
      if (!uri.includes(',')) {
        console.warn('⚠️ Invalid base64 image format (missing comma):', uri.substring(0, 50));
        return null;
      }
      
      const [header, data] = uri.split(',');
      if (!data || data.length < 10) {
        console.warn('⚠️ Invalid base64 image data (too short):', uri.substring(0, 50));
        return null;
      }
      
      return { uri };
    }
    
    // Regular URL
    return {
      uri: cacheKey ? `${uri}?cache=${cacheKey}` : uri,
    };
  }, [uri, cacheKey, source]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoad?.();
  };

  const handleError = (errorEvent?: any) => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  const finalWidth = width || size;
  const finalHeight = height || size;

  const containerStyle = [
    styles.container,
    {
      borderRadius,
      backgroundColor,
      width: finalWidth,
      height: finalHeight,
    },
    style,
  ];

  if (error || !imageSource) {
    return (
      <View style={containerStyle}>
        {errorPlaceholder || (
          <View style={styles.errorContainer}>
            <Ionicons name={fallbackIcon} size={finalWidth ? finalWidth * 0.4 : 24} color="#999" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={imageSource}
        style={[
          styles.image, 
          { 
            borderRadius,
            width: finalWidth || '100%',
            height: finalHeight || '100%',
          }
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {loading && showLoader && (
        <View style={styles.loadingContainer}>
          {placeholder || (
            <ActivityIndicator size="small" color="#666" />
          )}
        </View>
      )}
    </View>
  );
};

// Simple preloading (basic caching through Image prefetch)
export const preloadImages = async (imageUris: string[]) => {
  try {
    await Promise.all(imageUris.map(uri => Image.prefetch(uri)));
  } catch (error) {
    console.warn('Image preload failed:', error);
  }
};

// Clear cache functions (placeholders for compatibility)
export const clearImageCache = () => {
  // Image cache cleared (React Native Image)
};

export const getCacheInfo = () => {
  return { memoryCache: 0, diskCache: 0 };
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptimizedImage;