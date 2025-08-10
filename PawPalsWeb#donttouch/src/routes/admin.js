const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Garden = require('../models/Garden');
const Visit = require('../models/Visit');
const Dog = require('../models/Dog');
const Request = require('../models/Request');
const ApiUsage = require('../models/ApiUsage');

// Get admin statistics
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const [userCount, gardenCount, activeVisits, dogCount] = await Promise.all([
      User.countDocuments(),
      Garden.countDocuments(),
      Visit.countDocuments({ checkOutTime: null }),
      Dog.countDocuments()
    ]);

    res.json({
      totalUsers: userCount,
      totalGardens: gardenCount,
      activeVisits,
      totalDogs: dogCount
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Get all users for admin
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all gardens for admin
router.get('/gardens', auth, authorize('admin'), async (req, res) => {
  try {
    const gardens = await Garden.find({})
      .populate('manager', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(gardens);
  } catch (error) {
    console.error('Error fetching gardens:', error);
    res.status(500).json({ error: 'Failed to fetch gardens' });
  }
});

// Get API usage statistics
router.get('/api-usage', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, days } = req.query;
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (parseInt(days) || 30) * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get usage statistics
    const stats = await ApiUsage.getUsageStats(start, end);
    
    // Get daily usage for charts
    const dailyUsage = await ApiUsage.getDailyUsage(parseInt(days) || 30);
    
    res.json({
      total: stats.total,
      byApiType: stats.byApiType,
      dailyUsage: dailyUsage,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch API usage stats' });
  }
});

// Get detailed API usage logs
router.get('/api-usage/logs', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, apiType, success } = req.query;
    
    const query = {};
    if (apiType) query.apiType = apiType;
    if (success !== undefined) query.success = success === 'true';
    
    const logs = await ApiUsage.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ApiUsage.countDocuments(query);
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching API usage logs:', error);
    res.status(500).json({ error: 'Failed to fetch API usage logs' });
  }
});

// Export API usage data
router.get('/api-usage/export', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const logs = await ApiUsage.find({
      date: { $gte: start, $lte: end }
    })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Date,API Type,Endpoint,Requests,Cost,Success,Response Time,User\n';
      const csvData = logs.map(log => 
        `${log.date.toISOString()},${log.apiType},${log.endpoint},${log.requestCount},${log.totalCost},${log.success},${log.responseTime},${log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'Anonymous'}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=api-usage-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        logs,
        summary: await ApiUsage.getUsageStats(start, end),
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error exporting API usage data:', error);
    res.status(500).json({ error: 'Failed to export API usage data' });
  }
});

module.exports = router; 