const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Mission, UserMission } = require('../models/Mission');
const User = require('../models/User');
const PointsService = require('../services/PointsService');
const BadgeService = require('../services/BadgeService');

// GET /api/missions/daily - Get available daily missions for the user
router.get('/daily', auth, async (req, res) => {
  try {
    console.log(`[MISSIONS] Fetching daily missions for user: ${req.userId}`);
    
    // Get available daily missions for the user
    const availableMissions = await Mission.getAvailableMissions(req.userId, 'daily');
    
    console.log(`[MISSIONS] Found ${availableMissions.length} available daily missions`);
    
    // Get user's progress for these missions
    const missionIds = availableMissions.map(m => m._id);
    const userMissions = await UserMission.find({
      user: req.userId,
      mission: { $in: missionIds },
      status: { $in: ['active', 'completed'] }
    }).lean();
    
    // Combine mission data with user progress
    const missionsWithProgress = availableMissions.map(mission => {
      const userMission = userMissions.find(um => um.mission.toString() === mission._id.toString());
      
      return {
        id: mission._id,
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        category: mission.category,
        difficulty: mission.difficulty,
        requirements: mission.requirements,
        rewards: mission.rewards,
        isActive: mission.isCurrentlyActive(),
        userProgress: userMission ? {
          status: userMission.status,
          progress: userMission.progress,
          completionPercentage: userMission.getCompletionPercentage ? userMission.getCompletionPercentage() : 0,
          completedAt: userMission.completedAt,
          rewardsClaimed: userMission.rewardsClaimed
        } : null,
        startDate: mission.startDate,
        endDate: mission.endDate
      };
    });
    
    console.log(`[MISSIONS] Returning ${missionsWithProgress.length} missions with progress data`);
    
    res.json({
      success: true,
      missions: missionsWithProgress,
      count: missionsWithProgress.length
    });
    
  } catch (error) {
    console.error('[MISSIONS] Error fetching daily missions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch daily missions' 
    });
  }
});

// GET /api/missions/my-progress - Get user's mission progress
router.get('/my-progress', auth, async (req, res) => {
  try {
    console.log(`[MISSIONS] Fetching mission progress for user: ${req.userId}`);
    
    const { status = 'active', type } = req.query;
    
    // Build query for user missions
    let query = { user: req.userId };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    // Get user missions with populated mission data
    let userMissionsQuery = UserMission.find(query)
      .populate({
        path: 'mission',
        match: type ? { type } : {},
        select: 'missionId title description type category difficulty requirements rewards startDate endDate isActive'
      })
      .sort({ updatedAt: -1 });
    
    const userMissions = await userMissionsQuery.lean();
    
    // Filter out missions that didn't match the type filter
    const filteredUserMissions = userMissions.filter(um => um.mission);
    
    console.log(`[MISSIONS] Found ${filteredUserMissions.length} user missions`);
    
    // Format the response
    const progressData = filteredUserMissions.map(userMission => {
      const mission = userMission.mission;
      
      return {
        id: userMission._id,
        mission: {
          id: mission._id,
          missionId: mission.missionId,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          category: mission.category,
          difficulty: mission.difficulty,
          requirements: mission.requirements,
          rewards: mission.rewards,
          startDate: mission.startDate,
          endDate: mission.endDate,
          isActive: mission.isActive
        },
        progress: userMission.progress,
        status: userMission.status,
        completionPercentage: getCompletionPercentage(userMission.progress),
        completedAt: userMission.completedAt,
        rewardsClaimed: userMission.rewardsClaimed,
        startedAt: userMission.startedAt,
        updatedAt: userMission.updatedAt
      };
    });
    
    // Group by status for easier frontend consumption
    const groupedProgress = {
      active: progressData.filter(p => p.status === 'active'),
      completed: progressData.filter(p => p.status === 'completed'),
      failed: progressData.filter(p => p.status === 'failed'),
      expired: progressData.filter(p => p.status === 'expired')
    };
    
    console.log(`[MISSIONS] Returning grouped progress: active(${groupedProgress.active.length}), completed(${groupedProgress.completed.length}), failed(${groupedProgress.failed.length}), expired(${groupedProgress.expired.length})`);
    
    res.json({
      success: true,
      progress: status === 'all' ? groupedProgress : progressData,
      totalCount: progressData.length
    });
    
  } catch (error) {
    console.error('[MISSIONS] Error fetching mission progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch mission progress' 
    });
  }
});

// POST /api/missions/:id/progress - Update mission progress
router.post('/:id/progress', auth, async (req, res) => {
  try {
    const { id: missionId } = req.params;
    const { requirementIndex, incrementBy = 1 } = req.body;
    
    console.log(`[MISSIONS] Updating progress for mission ${missionId}, requirement ${requirementIndex}, increment: ${incrementBy}`);
    
    // Validate inputs
    if (typeof requirementIndex !== 'number' || requirementIndex < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requirement index'
      });
    }
    
    if (typeof incrementBy !== 'number' || incrementBy < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid increment value'
      });
    }
    
    // Find the mission first
    const mission = await Mission.findById(missionId);
    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found'
      });
    }
    
    // Check if mission is currently active
    if (!mission.isCurrentlyActive()) {
      return res.status(400).json({
        success: false,
        error: 'Mission is not currently active'
      });
    }
    
    // Find or create user mission
    let userMission = await UserMission.findOne({
      user: req.userId,
      mission: missionId
    });
    
    if (!userMission) {
      // Create new user mission with initial progress
      const initialProgress = mission.requirements.map((req, index) => ({
        requirementIndex: index,
        current: 0,
        target: req.target,
        completed: false,
        completedAt: null
      }));
      
      userMission = new UserMission({
        user: req.userId,
        mission: missionId,
        progress: initialProgress,
        status: 'active'
      });
    }
    
    // Check if mission is already completed
    if (userMission.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Mission already completed'
      });
    }
    
    // Validate requirement index
    if (requirementIndex >= userMission.progress.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requirement index for this mission'
      });
    }
    
    // Update progress
    const progressItem = userMission.progress[requirementIndex];
    const previousCurrent = progressItem.current;
    
    progressItem.current = Math.min(progressItem.current + incrementBy, progressItem.target);
    
    // Mark requirement as completed if target reached
    if (progressItem.current >= progressItem.target && !progressItem.completed) {
      progressItem.completed = true;
      progressItem.completedAt = new Date();
      console.log(`[MISSIONS] Requirement ${requirementIndex} completed for mission ${missionId}`);
    }
    
    // Check if all requirements are completed
    const allCompleted = userMission.progress.every(p => p.completed);
    if (allCompleted && userMission.status === 'active') {
      userMission.status = 'completed';
      userMission.completedAt = new Date();
      console.log(`[MISSIONS] Mission ${missionId} completed by user ${req.userId}`);
    }
    
    // Save the user mission
    await userMission.save();
    
    // Populate mission data for response
    await userMission.populate('mission');
    
    console.log(`[MISSIONS] Progress updated: ${previousCurrent} -> ${progressItem.current}/${progressItem.target}`);
    
    res.json({
      success: true,
      message: 'Mission progress updated successfully',
      userMission: {
        id: userMission._id,
        mission: {
          id: userMission.mission._id,
          title: userMission.mission.title,
          description: userMission.mission.description
        },
        progress: userMission.progress,
        status: userMission.status,
        completionPercentage: getCompletionPercentage(userMission.progress),
        completedAt: userMission.completedAt,
        rewardsClaimed: userMission.rewardsClaimed
      },
      updated: {
        requirementIndex,
        previousValue: previousCurrent,
        currentValue: progressItem.current,
        target: progressItem.target,
        completed: progressItem.completed
      }
    });
    
  } catch (error) {
    console.error('[MISSIONS] Error updating mission progress:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update mission progress' 
    });
  }
});

// POST /api/missions/:id/complete - Complete mission and claim rewards
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { id: missionId } = req.params;
    
    console.log(`[MISSIONS] Processing mission completion for mission ${missionId}, user ${req.userId}`);
    
    // Find the user mission
    const userMission = await UserMission.findOne({
      user: req.userId,
      mission: missionId
    }).populate('mission');
    
    if (!userMission) {
      return res.status(404).json({
        success: false,
        error: 'User mission not found'
      });
    }
    
    // Check if mission is completed
    if (userMission.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Mission is not completed yet'
      });
    }
    
    // Check if rewards already claimed
    if (userMission.rewardsClaimed) {
      return res.status(400).json({
        success: false,
        error: 'Rewards already claimed for this mission'
      });
    }
    
    const mission = userMission.mission;
    const rewards = mission.rewards;
    
    console.log(`[MISSIONS] Claiming rewards for mission: ${mission.title}`, rewards);
    
    const rewardResults = {
      points: 0,
      badges: [],
      specialRewards: []
    };
    
    try {
      // Award points
      if (rewards.points && rewards.points > 0) {
        const finalPoints = Math.round(rewards.points * (rewards.bonusMultiplier || 1));
        console.log(`[MISSIONS] Awarding ${finalPoints} points (base: ${rewards.points}, multiplier: ${rewards.bonusMultiplier || 1})`);
        
        await PointsService.awardPoints(req.userId, 'mission_completion', finalPoints, {
          missionId: mission._id,
          missionTitle: mission.title
        });
        
        rewardResults.points = finalPoints;
      }
      
      // Award badges
      if (rewards.badges && rewards.badges.length > 0) {
        console.log(`[MISSIONS] Awarding badges:`, rewards.badges);
        
        for (const badgeId of rewards.badges) {
          try {
            const badgeResult = await BadgeService.awardBadge(req.userId, badgeId);
            if (badgeResult && badgeResult.awarded) {
              rewardResults.badges.push({
                badgeId,
                name: badgeResult.badge?.name || badgeId,
                newly_earned: true
              });
            } else {
              rewardResults.badges.push({
                badgeId,
                name: badgeId,
                newly_earned: false,
                reason: 'Already owned or not found'
              });
            }
          } catch (badgeError) {
            console.error(`[MISSIONS] Error awarding badge ${badgeId}:`, badgeError);
            rewardResults.badges.push({
              badgeId,
              name: badgeId,
              newly_earned: false,
              error: badgeError.message
            });
          }
        }
      }
      
      // Handle special rewards
      if (rewards.specialReward) {
        console.log(`[MISSIONS] Special reward: ${rewards.specialReward}`);
        rewardResults.specialRewards.push({
          type: 'special',
          description: rewards.specialReward
        });
      }
      
      // Mark rewards as claimed
      userMission.rewardsClaimed = true;
      userMission.updatedAt = new Date();
      await userMission.save();
      
      console.log(`[MISSIONS] Mission ${missionId} rewards claimed successfully`);
      
      // Get updated user stats for response
      const user = await User.findById(req.userId).select('gamification').lean();
      
      res.json({
        success: true,
        message: 'Mission completed and rewards claimed successfully!',
        mission: {
          id: mission._id,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          category: mission.category,
          difficulty: mission.difficulty
        },
        rewards: rewardResults,
        userStats: {
          totalPoints: user?.gamification?.points || 0,
          level: user?.gamification?.level || 1,
          badgeCount: user?.gamification?.badges?.length || 0
        },
        completedAt: userMission.completedAt
      });
      
    } catch (rewardError) {
      console.error('[MISSIONS] Error processing rewards:', rewardError);
      
      // Don't fail the completion if reward processing fails
      // Mark as claimed to prevent retry issues
      userMission.rewardsClaimed = true;
      await userMission.save();
      
      res.status(207).json({
        success: true,
        message: 'Mission completed but some rewards failed to process',
        mission: {
          id: mission._id,
          title: mission.title,
          description: mission.description
        },
        rewards: rewardResults,
        warning: 'Some rewards may not have been properly awarded',
        error: rewardError.message
      });
    }
    
  } catch (error) {
    console.error('[MISSIONS] Error completing mission:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete mission' 
    });
  }
});

// GET /api/missions/available - Get all available missions for user (all types)
router.get('/available', auth, async (req, res) => {
  try {
    const { type } = req.query;
    
    console.log(`[MISSIONS] Fetching available missions for user: ${req.userId}, type: ${type || 'all'}`);
    
    // Get available missions for the user
    const availableMissions = await Mission.getAvailableMissions(req.userId, type || null);
    
    console.log(`[MISSIONS] Found ${availableMissions.length} available missions`);
    
    // Get user's progress for these missions
    const missionIds = availableMissions.map(m => m._id);
    const userMissions = await UserMission.find({
      user: req.userId,
      mission: { $in: missionIds }
    }).lean();
    
    // Combine mission data with user progress
    const missionsWithProgress = availableMissions.map(mission => {
      const userMission = userMissions.find(um => um.mission.toString() === mission._id.toString());
      
      return {
        id: mission._id,
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        category: mission.category,
        difficulty: mission.difficulty,
        requirements: mission.requirements,
        rewards: mission.rewards,
        isActive: mission.isCurrentlyActive(),
        userProgress: userMission ? {
          status: userMission.status,
          progress: userMission.progress,
          completionPercentage: getCompletionPercentage(userMission.progress),
          completedAt: userMission.completedAt,
          rewardsClaimed: userMission.rewardsClaimed
        } : null,
        startDate: mission.startDate,
        endDate: mission.endDate,
        maxParticipants: mission.maxParticipants,
        currentParticipants: mission.currentParticipants
      };
    });
    
    // Group by type
    const groupedMissions = missionsWithProgress.reduce((acc, mission) => {
      if (!acc[mission.type]) {
        acc[mission.type] = [];
      }
      acc[mission.type].push(mission);
      return acc;
    }, {});
    
    console.log(`[MISSIONS] Returning missions grouped by type:`, Object.keys(groupedMissions).map(type => `${type}(${groupedMissions[type].length})`).join(', '));
    
    res.json({
      success: true,
      missions: type ? missionsWithProgress : groupedMissions,
      totalCount: missionsWithProgress.length
    });
    
  } catch (error) {
    console.error('[MISSIONS] Error fetching available missions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch available missions' 
    });
  }
});

// GET /api/missions/stats - Get mission statistics for user
router.get('/stats', auth, async (req, res) => {
  try {
    console.log(`[MISSIONS] Fetching mission stats for user: ${req.userId}`);
    
    // Get user mission counts by status
    const missionStats = await UserMission.aggregate([
      { $match: { user: req.userId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    // Get mission counts by type and status
    const missionTypeStats = await UserMission.aggregate([
      { $match: { user: req.userId } },
      { $lookup: {
        from: 'missions',
        localField: 'mission',
        foreignField: '_id',
        as: 'missionData'
      }},
      { $unwind: '$missionData' },
      { $group: {
        _id: {
          type: '$missionData.type',
          status: '$status'
        },
        count: { $sum: 1 }
      }}
    ]);
    
    // Format the stats
    const stats = {
      totalMissions: 0,
      active: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      byType: {
        daily: { active: 0, completed: 0, failed: 0, expired: 0 },
        weekly: { active: 0, completed: 0, failed: 0, expired: 0 },
        monthly: { active: 0, completed: 0, failed: 0, expired: 0 },
        special: { active: 0, completed: 0, failed: 0, expired: 0 }
      }
    };
    
    // Process status stats
    missionStats.forEach(stat => {
      stats[stat._id] = stat.count;
      stats.totalMissions += stat.count;
    });
    
    // Process type stats
    missionTypeStats.forEach(stat => {
      const type = stat._id.type;
      const status = stat._id.status;
      if (stats.byType[type]) {
        stats.byType[type][status] = stat.count;
      }
    });
    
    // Calculate completion rate
    stats.completionRate = stats.totalMissions > 0 
      ? Math.round((stats.completed / stats.totalMissions) * 100) 
      : 0;
    
    console.log(`[MISSIONS] Mission stats:`, stats);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('[MISSIONS] Error fetching mission stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch mission statistics' 
    });
  }
});

// Helper function to calculate completion percentage
function getCompletionPercentage(progress) {
  if (!progress || progress.length === 0) return 0;
  
  const totalWeight = progress.length;
  const completedWeight = progress.reduce((sum, prog) => {
    return sum + (prog.current / prog.target);
  }, 0);
  
  return Math.min(Math.round((completedWeight / totalWeight) * 100), 100);
}

module.exports = router;