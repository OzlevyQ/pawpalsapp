const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PointsService = require('../services/PointsService');
const BadgeService = require('../services/BadgeService');
const LevelService = require('../services/LevelService');
const StreakService = require('../services/StreakService');

// Get user's gamification stats
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await PointsService.getUserGamificationStats(req.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ error: 'Error fetching gamification stats' });
  }
});

// Get user's badges
router.get('/badges', auth, async (req, res) => {
  try {
    const badges = await BadgeService.getUserBadges(req.userId);
    res.json({ badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Error fetching badges' });
  }
});

// Get all available badges
router.get('/badges/all', auth, async (req, res) => {
  try {
    const badges = await BadgeService.getAllBadges();
    res.json({ badges });
  } catch (error) {
    console.error('Error fetching all badges:', error);
    res.status(500).json({ error: 'Error fetching all badges' });
  }
});

// Get badge stats
router.get('/badges/stats', auth, async (req, res) => {
  try {
    const stats = await BadgeService.getBadgeStats(req.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching badge stats:', error);
    res.status(500).json({ error: 'Error fetching badge stats' });
  }
});

// Get user's level information
router.get('/level', auth, async (req, res) => {
  try {
    const levelStats = await LevelService.getUserLevelStats(req.userId);
    res.json(levelStats);
  } catch (error) {
    console.error('Error fetching level stats:', error);
    res.status(500).json({ error: 'Error fetching level stats' });
  }
});

// Get all levels
router.get('/levels', auth, async (req, res) => {
  try {
    const levels = LevelService.getAllLevels();
    res.json({ levels });
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Error fetching levels' });
  }
});

// Get user's streak information
router.get('/streak', auth, async (req, res) => {
  try {
    const streakStats = await StreakService.getStreakStats(req.userId);
    res.json(streakStats);
  } catch (error) {
    console.error('Error fetching streak stats:', error);
    res.status(500).json({ error: 'Error fetching streak stats' });
  }
});

// Get streak leaderboard
router.get('/leaderboard/streak', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await StreakService.getStreakLeaderboard(parseInt(limit));
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching streak leaderboard:', error);
    res.status(500).json({ error: 'Error fetching streak leaderboard' });
  }
});

// Get longest streak leaderboard
router.get('/leaderboard/longest-streak', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await StreakService.getLongestStreakLeaderboard(parseInt(limit));
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching longest streak leaderboard:', error);
    res.status(500).json({ error: 'Error fetching longest streak leaderboard' });
  }
});

// Award points manually (admin only)
router.post('/points/award', auth, async (req, res) => {
  try {
    const { pointType, amount, targetUserId } = req.body;
    
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await PointsService.awardPoints(targetUserId, pointType, amount);
    res.json({ message: 'Points awarded successfully', result });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: 'Error awarding points' });
  }
});

// Award badge manually (admin only)
router.post('/badges/award', auth, async (req, res) => {
  try {
    const { badgeId, targetUserId } = req.body;
    
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await BadgeService.awardBadge(targetUserId, badgeId);
    res.json({ message: 'Badge awarded successfully', result });
  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: 'Error awarding badge' });
  }
});

// Get user's achievements
router.get('/achievements', auth, async (req, res) => {
  try {
    // Fetch user's completed achievements
    const User = require('../models/User');
    const Achievement = require('../models/Achievement');
    
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all achievements and mark which ones are completed
    const allAchievements = await Achievement.find({}).lean();
    const userAchievements = user.gamification?.achievements || [];
    
    const achievements = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId?.toString() === achievement._id.toString());
      return {
        id: achievement._id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        type: achievement.type,
        isCompleted: !!userAchievement,
        completedAt: userAchievement?.earnedAt || null,
        progress: {
          current: userAchievement?.progress || 0,
          target: achievement.target || 1
        }
      };
    });
    
    res.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Error fetching achievements' });
  }
});

// Get user's recent activity
router.get('/activity', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const User = require('../models/User');
    
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent gamification activity
    const recentActivity = [];
    
    // Add recent achievements
    if (user.gamification?.achievements) {
      const recentAchievements = user.gamification.achievements
        .filter(a => a.earnedAt)
        .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
        .slice(0, 5)
        .map(achievement => ({
          id: achievement._id,
          type: 'achievement',
          title: 'Achievement Unlocked!',
          description: achievement.name || 'Achievement earned',
          icon: '🏆',
          points: achievement.points || 0,
          createdAt: achievement.earnedAt,
          timeAgo: getTimeAgo(achievement.earnedAt)
        }));
      
      recentActivity.push(...recentAchievements);
    }
    
    // Add recent badges
    if (user.gamification?.badges) {
      const recentBadges = user.gamification.badges
        .filter(b => b.earnedAt)
        .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
        .slice(0, 3)
        .map(badge => ({
          id: badge._id,
          type: 'badge',
          title: 'Badge Earned!',
          description: badge.name || 'Badge earned',
          icon: badge.icon || '🎖️',
          points: badge.points || 0,
          createdAt: badge.earnedAt,
          timeAgo: getTimeAgo(badge.earnedAt)
        }));
      
      recentActivity.push(...recentBadges);
    }
    
    // Sort all activity by date and limit
    const sortedActivity = recentActivity
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));
    
    res.json({ activity: sortedActivity });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Error fetching recent activity' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return past.toLocaleDateString();
}

// Reset user's streak (admin only)
router.post('/streak/reset', auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await StreakService.resetStreak(targetUserId);
    res.json({ message: 'Streak reset successfully', result });
  } catch (error) {
    console.error('Error resetting streak:', error);
    res.status(500).json({ error: 'Error resetting streak' });
  }
});

module.exports = router;