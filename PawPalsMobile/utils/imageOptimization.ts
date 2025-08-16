import { Platform, Image } from 'react-native';

/**
 * Image optimization utilities for PawPals Mobile
 * Provides caching strategies, preloading, and memory management
 */

export interface ImageOptimizationConfig {
  maxCacheSize?: number; // MB
  preloadBatchSize?: number;
  cacheStrategy?: 'aggressive' | 'balanced' | 'conservative';
}

const defaultConfig: ImageOptimizationConfig = {
  maxCacheSize: 100, // 100MB
  preloadBatchSize: 5,
  cacheStrategy: 'balanced',
};

class ImageOptimizationManager {
  private config: ImageOptimizationConfig;
  private preloadedImages = new Set<string>();

  constructor(config: ImageOptimizationConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Preload critical images with priority and batching
   */
  async preloadCriticalImages(imageUris: string[], priority: 'high' | 'normal' | 'low' = 'normal') {
    if (!imageUris.length) return;

    // Remove already preloaded images
    const newImages = imageUris.filter(uri => !this.preloadedImages.has(uri));
    if (!newImages.length) return;

    // Process in batches to avoid overwhelming the system
    const batchSize = this.config.preloadBatchSize!;
    for (let i = 0; i < newImages.length; i += batchSize) {
      const batch = newImages.slice(i, i + batchSize);
      
      try {
        // Use React Native Image.prefetch for basic caching
        await Promise.all(batch.map(uri => Image.prefetch(uri)));
        batch.forEach(uri => this.preloadedImages.add(uri));
        
        // Small delay between batches to prevent blocking
        if (i + batchSize < newImages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn('Failed to preload image batch:', error);
      }
    }
  }

  /**
   * Preload user-specific images for better UX
   */
  async preloadUserImages(user: any) {
    const imagesToPreload: string[] = [];
    
    // User profile image
    if (user?.profileImage || user?.image) {
      imagesToPreload.push(user.profileImage || user.image);
    }

    // User's dogs images
    if (user?.dogs && Array.isArray(user.dogs)) {
      user.dogs.forEach((dog: any) => {
        if (dog.image) imagesToPreload.push(dog.image);
        if (dog.images && Array.isArray(dog.images)) {
          imagesToPreload.push(...dog.images.slice(0, 3)); // Limit to first 3 per dog
        }
      });
    }

    await this.preloadCriticalImages(imagesToPreload, 'high');
  }

  /**
   * Preload garden images for nearby locations
   */
  async preloadGardenImages(gardens: any[]) {
    const imagesToPreload: string[] = [];
    
    gardens.forEach(garden => {
      if (garden.images && Array.isArray(garden.images)) {
        // Preload only the first image for each garden (hero image)
        imagesToPreload.push(garden.images[0]);
      }
    });

    await this.preloadCriticalImages(imagesToPreload, 'normal');
  }

  /**
   * Clear image cache (simplified for React Native Image)
   */
  async clearCache(strategy: 'memory' | 'disk' | 'all' = 'memory') {
    try {
      // React Native Image doesn't have direct cache control
      // Clear our internal tracking
      this.preloadedImages.clear();
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Generate cache key for image
   */
  generateCacheKey(identifier: string, uri: string): string {
    const hash = uri.split('/').pop() || uri.slice(-10);
    return `${identifier}-${hash}`;
  }

  /**
   * Check if image should be preloaded based on strategy
   */
  shouldPreload(distance?: number): boolean {
    if (!distance) return true;

    switch (this.config.cacheStrategy) {
      case 'aggressive':
        return distance < 10000; // 10km
      case 'balanced':
        return distance < 5000;  // 5km
      case 'conservative':
        return distance < 2000;  // 2km
      default:
        return distance < 5000;
    }
  }

  /**
   * Monitor cache performance (development only)
   */
  logCacheStats() {
    // Cache stats available for debugging if needed
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizationManager();

// Convenience functions
export const preloadUserImages = (user: any) => imageOptimizer.preloadUserImages(user);
export const preloadGardenImages = (gardens: any[]) => imageOptimizer.preloadGardenImages(gardens);
export const clearImageCache = (strategy?: 'memory' | 'disk' | 'all') => imageOptimizer.clearCache(strategy);

// Image format optimization utilities
export const getOptimalImageFormat = (uri: string): string => {
  // For web images, prefer WebP when supported
  if (Platform.OS === 'android' && uri.includes('http')) {
    return uri.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }
  return uri;
};

// Image size optimization for different screen densities
export const getOptimalImageSize = (width: number, height: number): { width: number; height: number } => {
  const { PixelRatio } = require('react-native');
  const scale = PixelRatio.get();
  return {
    width: Math.ceil(width * scale),
    height: Math.ceil(height * scale),
  };
};

// Memory management for large image lists
export const createImageListOptimizer = (batchSize: number = 10) => {
  return {
    getVisibleIndices: (scrollOffset: number, itemHeight: number, containerHeight: number) => {
      const startIndex = Math.floor(scrollOffset / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + batchSize,
        Number.MAX_SAFE_INTEGER
      );
      return { startIndex: Math.max(0, startIndex - batchSize), endIndex };
    },
  };
};