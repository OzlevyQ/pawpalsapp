# 📊 Performance Optimization Guide - PawPals Mobile App

## 🔴 Critical Issues Identified

### 1. **MongoDB Query Performance**
- **Issue**: Missing indexes, excessive use of populate, no query projection
- **Impact**: Slow queries, N+1 problems, high memory usage
- **Solution**: Add strategic indexes, use projection, optimize aggregation pipeline

### 2. **Unoptimized Images**
- **Issue**: Large PNG images (22KB for icons), no lazy loading
- **Impact**: Long loading times, high memory consumption
- **Solution**: Convert to WebP, implement lazy loading, use react-native-fast-image

### 3. **API Response Caching**
- **Issue**: No caching mechanism for API responses
- **Impact**: Redundant network requests, slow data updates
- **Solution**: Implement React Query for intelligent caching

### 4. **List Rendering Performance**
- **Issue**: Missing FlatList optimizations
- **Impact**: Janky scrolling, high memory usage with large lists
- **Solution**: Implement getItemLayout, optimize batch rendering

## 🎯 Action Plan

### Phase 1: Quick Wins (1-2 days)

#### 1. Add MongoDB Indexes
```javascript
// backend/src/models/Visit.js
visitSchema.index({ user: 1, status: 1 });
visitSchema.index({ checkInTime: -1 });
visitSchema.index({ garden: 1, status: 1 });
visitSchema.index({ status: 1, checkOutTime: 1 });

// backend/src/models/Garden.js
gardenSchema.index({ 'location.coordinates': '2dsphere' });
gardenSchema.index({ type: 1, isActive: 1 });
gardenSchema.index({ averageRating: -1 });

// backend/src/models/User.js
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'preferences.language': 1 });

// backend/src/models/Dog.js
dogSchema.index({ owner: 1, isActive: 1 });
dogSchema.index({ breed: 1 });
```

#### 2. Optimize MongoDB Queries
```javascript
// Instead of:
const visits = await Visit.find({ user })
  .populate('garden')
  .populate('dogs')
  .populate('user');

// Use:
const visits = await Visit.find({ user })
  .select('checkInTime checkOutTime garden dogs status duration')
  .populate({ 
    path: 'garden', 
    select: 'name location.address image' 
  })
  .populate({ 
    path: 'dogs', 
    select: 'name breed image' 
  })
  .lean()
  .limit(20);
```

#### 3. FlatList Optimization
```javascript
// Add to all FlatList components
const ITEM_HEIGHT = 100; // Calculate your actual item height

<FlatList
  data={data}
  renderItem={renderItem}
  keyExtractor={(item) => item._id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index
  })}
  initialNumToRender={5}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews={true}
  onEndReachedThreshold={0.5}
/>
```

### Phase 2: Infrastructure Improvements (3-5 days)

#### 1. Install and Configure React Query
```bash
npm install @tanstack/react-query
```

```javascript
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Example usage in components
const { data: visits, isLoading } = useQuery({
  queryKey: ['visits', userId],
  queryFn: () => visitsApi.getMyVisits(),
  staleTime: 2 * 60 * 1000, // 2 minutes
});
```

#### 2. Image Optimization with Fast Image
```bash
npm install react-native-fast-image
```

```javascript
import FastImage from 'react-native-fast-image';

// Replace Image components
<FastImage
  style={styles.image}
  source={{
    uri: imageUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  resizeMode={FastImage.resizeMode.cover}
/>

// Preload critical images
FastImage.preload([
  { uri: 'https://example.com/image1.jpg' },
  { uri: 'https://example.com/image2.jpg' },
]);
```

#### 3. Component Memoization
```javascript
// Memoize expensive components
import React, { memo, useMemo, useCallback } from 'react';

const GardenCard = memo(({ garden, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {/* Component content */}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.garden._id === nextProps.garden._id;
});

// Use useMemo for expensive calculations
const sortedGardens = useMemo(() => {
  return gardens.sort((a, b) => b.averageRating - a.averageRating);
}, [gardens]);

// Use useCallback for functions
const handlePress = useCallback((gardenId) => {
  navigateToGarden(gardenId);
}, []);
```

### Phase 3: Advanced Optimizations (1 week)

#### 1. Implement Code Splitting
```javascript
// Lazy load heavy screens
import { lazy, Suspense } from 'react';

const MapScreen = lazy(() => import('./screens/MapScreen'));
const StatisticsScreen = lazy(() => import('./screens/StatisticsScreen'));

// Use with Suspense
<Suspense fallback={<LoadingScreen />}>
  <MapScreen />
</Suspense>
```

#### 2. Backend Response Compression
```javascript
// backend/server.js
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 0
}));
```

#### 3. Redis Caching (Backend)
```javascript
// backend/src/utils/cache.js
const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const getAsync = promisify(client.get).bind(client);
const setexAsync = promisify(client.setex).bind(client);

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await getAsync(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.error('Redis error:', err);
    }
    
    res.sendResponse = res.json;
    res.json = async (body) => {
      res.sendResponse(body);
      try {
        await setexAsync(key, duration, JSON.stringify(body));
      } catch (err) {
        console.error('Redis cache set error:', err);
      }
    };
    
    next();
  };
};

// Use in routes
router.get('/gardens', cacheMiddleware(600), gardensController.getAll);
```

## 📈 Expected Performance Improvements

| Optimization | Expected Improvement | Effort | Priority |
|-------------|---------------------|--------|----------|
| MongoDB Indexes | 30-40% | Low | Critical |
| Query Projection | 20-30% | Low | Critical |
| Image Optimization | 25-35% | Medium | High |
| React Query Caching | 40-50% | Medium | High |
| FlatList Optimization | 20-30% | Low | High |
| Component Memoization | 15-25% | Low | Medium |
| Code Splitting | 30-40% | High | Medium |
| Redis Caching | 50-60% | High | Low |
| Compression | 20-30% | Low | Medium |

**Total Expected Improvement: 150-200% (2-3x faster)**

## 🔧 Monitoring Tools

### Development Tools
```bash
# React DevTools
npm install -g react-devtools

# Flipper (download from https://fbflipper.com/)
# Enable Flipper in your React Native app

# MongoDB Profiler
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

### Performance Metrics
```javascript
// Measure component render time
import { Profiler } from 'react';

<Profiler id="CheckinScreen" onRender={onRenderCallback}>
  <CheckinScreen />
</Profiler>

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

// Measure API response time
const startTime = performance.now();
const response = await fetch(url);
const endTime = performance.now();
console.log(`API call took ${endTime - startTime}ms`);
```

## ⚠️ Important Considerations

### NativeWind Clarification
- **Keep NativeWind v2.0.11** - It's stable and performant
- **Don't upgrade to v4 yet** - Known performance issues
- NativeWind v2 provides good DX without significant performance cost
- Focus optimization efforts on database and caching instead

### Development vs Production
- Always test in **production mode** for accurate metrics
- Development mode is 2-3x slower by design
- Use `expo start --no-dev --minify` for production-like testing

### Gradual Implementation
1. Start with database indexes (immediate impact)
2. Add query projections (easy win)
3. Implement React Query (better UX)
4. Optimize images (reduce bandwidth)
5. Consider Redis only if needed

## 📝 Implementation Checklist

### Week 1
- [ ] Add all MongoDB indexes
- [ ] Implement query projections
- [ ] Optimize FlatList components
- [ ] Add basic memoization

### Week 2
- [ ] Install React Query
- [ ] Convert API calls to React Query
- [ ] Install react-native-fast-image
- [ ] Convert critical images

### Week 3
- [ ] Implement code splitting
- [ ] Add backend compression
- [ ] Set up performance monitoring
- [ ] Production testing

### Optional (Based on Metrics)
- [ ] Redis caching
- [ ] CDN for images
- [ ] GraphQL for efficient data fetching
- [ ] Service Worker for PWA

## 💡 Pro Tips

1. **Bundle Size**: Use `npx react-native-bundle-visualizer` to analyze
2. **Memory Leaks**: Always cleanup in useEffect return
3. **Console Logs**: Remove in production with babel plugin
4. **Animations**: Always use `useNativeDriver: true`
5. **WebSocket**: Already implemented - ensure proper usage
6. **Hermes**: Already enabled in Expo SDK 53 - good!

## 🚀 Quick Start Commands

```bash
# Install optimization packages
npm install @tanstack/react-query react-native-fast-image

# Backend packages
cd backend && npm install compression redis

# Analyze bundle size
npx react-native-bundle-visualizer

# Profile MongoDB
mongo > db.setProfilingLevel(2)
mongo > db.system.profile.find().pretty()
```

---

**Document Version**: 2.0.0  
**Last Updated**: 2025-08-12  
**Status**: Active Implementation

*Note: This document focuses on real performance bottlenecks. NativeWind v2 is not a performance issue.*