# Gamification WebSocket Integration Examples

## Overview
This document shows how to send gamification updates from the backend server to the mobile app in real-time using WebSocket events.

## Event Types

### 1. Points Updated
```javascript
// Backend sends this when user earns/loses points
socket.emit('points_updated', {
  type: 'points_updated',
  data: {
    points: 150,          // New total points
    totalPoints: 150,     // Same as points (for consistency)
    reason: 'check_in'    // Why points were awarded
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

### 2. Level Up
```javascript
// Backend sends this when user reaches new level
socket.emit('level_up', {
  type: 'level_up',
  data: {
    level: 3,            // New level
    previousLevel: 2,    // Previous level
    points: 250,         // Current total points
    totalPoints: 250     // Same as points
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

### 3. Streak Updated
```javascript
// Backend sends this when daily streak changes
socket.emit('streak_updated', {
  type: 'streak_updated',
  data: {
    streak: 7,           // New streak count
    previousStreak: 6,   // Previous streak count
    reason: 'daily_visit' // Why streak was updated
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

### 4. Achievement Unlocked
```javascript
// Backend sends this when user unlocks new achievement
socket.emit('achievement_unlocked', {
  type: 'achievement_unlocked',
  data: {
    achievement: {
      _id: '64a7b8c9d1e2f3a4b5c6d7e9',
      name: 'Early Bird',
      description: 'Visit a park before 8 AM',
      icon: '🌅',
      pointsReward: 25
    },
    points: 175,         // New total points after reward
    totalPoints: 175
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

### 5. Mission Completed
```javascript
// Backend sends this when user completes a mission
socket.emit('mission_completed', {
  type: 'mission_completed',
  data: {
    mission: {
      _id: '64a7b8c9d1e2f3a4b5c6d7f0',
      title: 'Daily Visitor',
      description: 'Visit any park today',
      pointsReward: 10,
      icon: '🎯'
    },
    points: 160,         // New total points after reward
    totalPoints: 160
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

### 6. Generic Gamification Update (Fallback)
```javascript
// Backend can send this for any gamification update
socket.emit('gamification_update', {
  type: 'points_updated', // or any other type
  data: {
    points: 180,
    level: 2,
    streak: 5,
    totalPoints: 180,
    reason: 'photo_upload'
  },
  userId: '64a7b8c9d1e2f3a4b5c6d7e8',
  timestamp: '2025-01-15T10:30:00.000Z'
});
```

## Common Scenarios

### Check-in to Park
```javascript
// User checks into a park
// 1. Award points for check-in
socket.emit('points_updated', {
  type: 'points_updated',
  data: {
    points: userNewPoints,
    totalPoints: userNewPoints,
    reason: 'check_in'
  },
  userId: userId,
  timestamp: new Date().toISOString()
});

// 2. Update streak if it's a new day
if (streakUpdated) {
  socket.emit('streak_updated', {
    type: 'streak_updated',
    data: {
      streak: userNewStreak,
      previousStreak: userPreviousStreak,
      reason: 'daily_visit'
    },
    userId: userId,
    timestamp: new Date().toISOString()
  });
}

// 3. Check for level up
if (levelUp) {
  socket.emit('level_up', {
    type: 'level_up',
    data: {
      level: userNewLevel,
      previousLevel: userPreviousLevel,
      points: userNewPoints,
      totalPoints: userNewPoints
    },
    userId: userId,
    timestamp: new Date().toISOString()
  });
}

// 4. Check for completed missions
completedMissions.forEach(mission => {
  socket.emit('mission_completed', {
    type: 'mission_completed',
    data: {
      mission: {
        _id: mission._id,
        title: mission.title,
        description: mission.description,
        pointsReward: mission.pointsReward,
        icon: mission.icon
      },
      points: userFinalPoints,
      totalPoints: userFinalPoints
    },
    userId: userId,
    timestamp: new Date().toISOString()
  });
});
```

## Frontend Handling

The mobile app will automatically:

1. **Update UI immediately** - Points, level, and streak cards will update in real-time
2. **Animate changes** - Cards will have a subtle scale animation when values change
3. **Log events** - All gamification events are logged for debugging
4. **Refresh data** - For achievements and missions, the app will refresh full user data
5. **Persist changes** - Updated values are saved to secure storage

## Testing

To test the WebSocket integration:

1. **Start the mobile app** and ensure user is logged in
2. **Check WebSocket connection** - Look for green dot in home screen header
3. **Trigger backend events** - Use admin panel or API calls to award points
4. **Watch console logs** - Look for 🎮 gamification update messages
5. **Verify UI updates** - Check that points/level/streak cards update and animate

## Console Logs

You'll see these logs when everything works:

```
🎮 Points updated: { type: 'points_updated', data: { points: 150, reason: 'check_in' } }
🎮 Handling gamification update: points_updated
🔥 Points updated: 150 (reason: check_in)
🏠 Home: User gamification data updated: { points: 150, level: 1, streak: 1 }
🎯 Animating points change: 140 -> 150
```

## Error Handling

The app handles these edge cases:

- **No WebSocket connection** - Falls back to periodic refresh
- **Invalid event data** - Logs error and continues
- **User not logged in** - Ignores gamification events
- **Guest mode** - No WebSocket connection attempted

## Notes

- All events should include the `userId` to ensure they're processed for the correct user
- The `timestamp` field helps with debugging and ordering events
- The `reason` field in points/streak updates helps with analytics and debugging
- Achievement and mission completion events trigger full data refresh to ensure consistency