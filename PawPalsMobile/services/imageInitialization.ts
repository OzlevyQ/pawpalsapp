import { imageOptimizer, preloadUserImages } from '../utils/imageOptimization';

/**
 * Image optimization initialization service
 * Handles preloading and cache management during app startup
 */

export class ImageInitializationService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize image optimization system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialization();
    await this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing image optimization system...');

      // Clear old cache on app start (optional, based on strategy)
      // Uncomment if you want to clear cache on each app start
      // await imageOptimizer.clearCache('memory');

      // Preload critical app assets
      await this.preloadAppAssets();

      this.initialized = true;
      console.log('✅ Image optimization system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize image optimization:', error);
      // Don't throw - app should continue working even if image optimization fails
    }
  }

  /**
   * Preload critical app assets (icons, placeholders, etc.)
   */
  private async preloadAppAssets(): Promise<void> {
    const criticalAssets = [
      // Add any critical app assets that need immediate loading
      // For example: placeholder images, icons, etc.
    ];

    if (criticalAssets.length > 0) {
      await imageOptimizer.preloadCriticalImages(criticalAssets, 'high');
    }
  }

  /**
   * Initialize user-specific images after login
   */
  async initializeUserImages(user: any): Promise<void> {
    if (!user) return;

    try {
      console.log(`🏃‍♂️ Preloading images for user: ${user.firstName}`);
      await preloadUserImages(user);
      console.log('✅ User images preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload user images:', error);
    }
  }

  /**
   * Initialize location-based images
   */
  async initializeLocationImages(gardens: any[]): Promise<void> {
    if (!gardens?.length) return;

    try {
      console.log(`🌍 Preloading images for ${gardens.length} nearby gardens`);
      
      // Sort by distance and preload closest ones first
      const sortedGardens = gardens
        .filter(garden => garden.distance !== undefined)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 10); // Limit to 10 closest gardens

      await imageOptimizer.preloadGardenImages(sortedGardens);
      console.log('✅ Location images preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload location images:', error);
    }
  }

  /**
   * Clean up resources and cache management
   */
  async cleanup(): Promise<void> {
    try {
      // Clear memory cache but keep disk cache for faster subsequent loads
      await imageOptimizer.clearCache('memory');
      console.log('🧹 Image cache cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup image cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): void {
    if (__DEV__) {
      imageOptimizer.logCacheStats();
    }
  }
}

// Export singleton instance
export const imageInitService = new ImageInitializationService();