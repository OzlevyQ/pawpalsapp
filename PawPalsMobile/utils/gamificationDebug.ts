/**
 * Debug utilities for testing gamification WebSocket updates
 * Use these functions in development to simulate real-time gamification events
 */

import WebSocketService, { GamificationUpdateData } from '../services/websocket';

export const GamificationDebugUtils = {
  /**
   * Simulate receiving points update from server
   */
  simulatePointsUpdate: (points: number, reason: string = 'test') => {
    const data: GamificationUpdateData = {
      type: 'points_updated',
      data: {
        points,
        totalPoints: points,
        reason
      },
      userId: 'debug-user',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 DEBUG: Simulating points update:', data);
    WebSocketService.emit('points_updated', data);
  },

  /**
   * Simulate level up event
   */
  simulateLevelUp: (newLevel: number, previousLevel: number, points: number) => {
    const data: GamificationUpdateData = {
      type: 'level_up',
      data: {
        level: newLevel,
        previousLevel,
        points,
        totalPoints: points
      },
      userId: 'debug-user',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 DEBUG: Simulating level up:', data);
    WebSocketService.emit('level_up', data);
  },

  /**
   * Simulate streak update
   */
  simulateStreakUpdate: (newStreak: number, previousStreak: number, reason: string = 'daily_visit') => {
    const data: GamificationUpdateData = {
      type: 'streak_updated',
      data: {
        streak: newStreak,
        previousStreak,
        reason
      },
      userId: 'debug-user',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 DEBUG: Simulating streak update:', data);
    WebSocketService.emit('streak_updated', data);
  },

  /**
   * Simulate achievement unlock
   */
  simulateAchievementUnlock: (achievementName: string, description: string, pointsReward: number = 25) => {
    const data: GamificationUpdateData = {
      type: 'achievement_unlocked',
      data: {
        achievement: {
          _id: `debug-achievement-${Date.now()}`,
          name: achievementName,
          description,
          icon: '🏆',
          pointsReward
        }
      },
      userId: 'debug-user',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 DEBUG: Simulating achievement unlock:', data);
    WebSocketService.emit('achievement_unlocked', data);
  },

  /**
   * Simulate mission completion
   */
  simulateMissionCompletion: (missionTitle: string, description: string, pointsReward: number = 10) => {
    const data: GamificationUpdateData = {
      type: 'mission_completed',
      data: {
        mission: {
          _id: `debug-mission-${Date.now()}`,
          title: missionTitle,
          description,
          pointsReward,
          icon: '🎯'
        }
      },
      userId: 'debug-user',
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 DEBUG: Simulating mission completion:', data);
    WebSocketService.emit('mission_completed', data);
  },

  /**
   * Simulate a full check-in scenario with multiple updates
   */
  simulateCheckinScenario: () => {
    console.log('🧪 DEBUG: Starting check-in scenario simulation...');
    
    // Step 1: Award points for check-in (after 500ms)
    setTimeout(() => {
      GamificationDebugUtils.simulatePointsUpdate(10, 'check_in');
    }, 500);

    // Step 2: Update streak (after 1000ms)
    setTimeout(() => {
      GamificationDebugUtils.simulateStreakUpdate(3, 2, 'daily_visit');
    }, 1000);

    // Step 3: Complete a mission (after 1500ms)
    setTimeout(() => {
      GamificationDebugUtils.simulateMissionCompletion(
        'Daily Visitor',
        'Visit any park today',
        10
      );
    }, 1500);

    // Step 4: Maybe level up (after 2000ms)
    setTimeout(() => {
      GamificationDebugUtils.simulateLevelUp(3, 2, 125);
    }, 2000);

    // Step 5: Unlock achievement (after 2500ms) 
    setTimeout(() => {
      GamificationDebugUtils.simulateAchievementUnlock(
        'Park Regular',
        'Visit the same park 5 times',
        50
      );
    }, 2500);
  },

  /**
   * Run basic animation test - just update points repeatedly
   */
  runAnimationTest: () => {
    console.log('🧪 DEBUG: Running animation test...');
    let points = 100;
    
    const interval = setInterval(() => {
      points += 10;
      GamificationDebugUtils.simulatePointsUpdate(points, 'animation_test');
      
      if (points >= 200) {
        clearInterval(interval);
        console.log('🧪 DEBUG: Animation test completed');
      }
    }, 1000);
  }
};

// Add to global scope for easy debugging in dev tools
if (__DEV__) {
  // @ts-ignore
  global.GamificationDebug = GamificationDebugUtils;
  console.log('🧪 DEBUG: GamificationDebugUtils available as global.GamificationDebug');
}

export default GamificationDebugUtils;