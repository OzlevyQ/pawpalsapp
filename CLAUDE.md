# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Use Specialized Agents

**ALWAYS use the specialized agents (via Task tool) for their respective domains:**
- **mongodb-integration-expert**: For all MongoDB operations, schema changes, query optimization, and database-related tasks
- **backend-integration-engineer**: For API design, backend-frontend integration, middleware, and server-side logic
- **native-frontend-engineer**: For React Native UI/UX, NativeWind styling, mobile app features, and Expo-related work
- **git-repository-manager**: For Git operations, commits, branches, and version control tasks
- **general-purpose**: For complex multi-step tasks, code searches, and research across the codebase

Using these agents ensures expertise in each domain and better code quality.

## Project Overview

PawPals is a comprehensive social network application for dog owners, consisting of:
- **Mobile App** (PawPalsMobile/): React Native app using Expo SDK 53 with NativeWind for styling
- **Backend API** (backend/): Node.js/Express server with MongoDB database
- **Legacy Frontend** (frontend/): Capacitor-based mobile app (compiled React, currently inactive)

## Development Commands

### Mobile App (PawPalsMobile/)
```bash
# Install dependencies
npm install

# Development
npm start                # Start Expo development server
npm run android         # Run on Android
npm run ios            # Run on iOS  
npm run web            # Run on web

# No test scripts defined - add tests as needed
```

### Backend Server (backend/)
```bash
# Install dependencies
npm install

# Development
npm run dev            # Start with nodemon (hot reload)
npm start              # Start production server

# Database maintenance
npm run fix-garden-data  # Run garden data fix script

# Build frontend (legacy)
npm run build          # Build and copy frontend to backend
```

## Architecture & Key Patterns

### Mobile App Architecture
- **Navigation**: File-based routing with Expo Router v5
  - `(auth)/` - Authentication flow screens
  - `(tabs)/` - Main tab navigation screens
- **State Management**: Zustand stores in `store/`
  - `authStore.ts` - Authentication state and user data
  - `appStore.ts` - Global app state
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **API Communication**: 
  - REST API client in `services/api/`
  - WebSocket for real-time updates in `services/websocket.ts`
- **Multi-language**: i18n with Hebrew/English in `locales/`
- **Context Providers**: User, Theme, Language, Profile, Notifications

### Backend Architecture  
- **REST API**: Express routes in `src/routes/`
- **Models**: MongoDB/Mongoose schemas in `src/models/`
- **Controllers**: Business logic in `src/controllers/`
- **Authentication**: JWT with in-memory cache (5 min TTL)
- **Real-time**: Socket.IO WebSocket server
- **Services**:
  - Gamification (Points, Badges, Levels, Streaks)
  - Push notifications (Expo SDK)
  - Email service with HTML templates
  - Background scheduler for cron jobs

### Database Models
22 MongoDB models including:
- User (with roles: admin, garden_manager, dog_owner)
- Dog (profiles with ratings and health info)
- Garden (dog parks with occupancy management)
- Event (community events with registration)
- Visit (check-in/check-out tracking)
- Gamification models (Achievement, Badge, Mission, Guild, Leaderboard)

## API Integration

### Base URLs
- Development: `http://localhost:5000/api`
- WebSocket: `ws://localhost:5000`

### Key Endpoints
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/google`
- Gardens: `/api/gardens`, `/api/gardens/nearby`, `/api/gardens/search-dog-parks`
- Events: `/api/events`, `/api/events/:id/register`
- Visits: `/api/visits/checkin`, `/api/visits/checkout`
- Users: `/api/users/profile`, `/api/users/favorites`

### Authentication
- JWT tokens stored in SecureStore (mobile) or memory cache (backend)
- Google OAuth integration available
- Token expiry: 7 days

## Important Considerations

### Mobile Development
- Always test on both iOS and Android simulators
- Use Expo Go app for rapid development testing
- Clear Metro cache if encountering bundling issues: `expo start --clear`
- NativeWind v4 requires proper Tailwind config in `tailwind.config.js`

### Backend Development
- MongoDB connection required (MongoDB Atlas in production)
- Environment variables needed:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GOOGLE_API_KEY` (for Places API)
  - `NODE_ENV`
- Node.js 18+ required
- WebSocket server runs on same port as HTTP

### Security
- Never commit sensitive data or API keys
- JWT secrets must be strong and unique per environment
- Google API key has usage tracking and cost monitoring
- All passwords hashed with bcrypt

### Database Operations
- Geospatial indexes on location fields for nearby queries
- Compound indexes for complex queries
- Use lean() for read-only queries to improve performance
- Visit model tracks real-time garden occupancy

### Real-time Features
- WebSocket authentication via JWT
- Heartbeat mechanism for connection monitoring
- Max 1000 concurrent connections
- Auto-cleanup of stale connections

### Gamification System
- Points awarded for: visits (10), events (50), reviews (15), photos (5)
- Levels calculated from total points
- Badges with rarity tiers (common → legendary)
- Daily/weekly/monthly missions
- Streak tracking for consecutive daily visits

### Testing Approach
- No test suites currently defined
- Add unit tests for critical business logic
- Test authentication flows thoroughly
- Verify WebSocket connections and events
- Test multi-language support and RTL layout