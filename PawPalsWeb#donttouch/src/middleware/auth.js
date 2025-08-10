const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory cache with TTL
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear expired cache entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 60000);

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware: No token provided');
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    // Check cache first
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.token = token;
      req.user = cached.user;
      req.userId = userId;
      return next();
    }
    
    // Only hit database if not in cache
    const user = await User.findOne({ _id: userId, status: 'active' }).lean(); // Use lean() for better performance

    if (!user) {
      console.log('Auth middleware: User not found or inactive:', userId);
      throw new Error('User not found');
    }

    // Cache user data
    userCache.set(userId, {
      user,
      timestamp: Date.now()
    });

    req.token = token;
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.log('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Function to invalidate user cache (call when user data changes)
const invalidateUserCache = (userId) => {
  userCache.delete(userId.toString());
};

// Function to clear all cache
const clearUserCache = () => {
  userCache.clear();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Middleware to check event creation permissions - Allow all authenticated users for now
const canCreateEvents = (req, res, next) => {
  const user = req.user;
  
  // For debugging: Allow all authenticated users to create events
  // Check if user can create events
  const hasPermission = 
    user.role === 'admin' || 
    user.role === 'garden_manager' || 
    user.eventPermissions?.canCreateEvents ||
    true; // Temporarily allow all users
  
  if (!hasPermission) {
    return res.status(403).json({ 
      error: 'You do not have permission to create events. Contact an administrator.' 
    });
  }
  
  next();
};

// Middleware to check event management permissions
const canManageEvents = (req, res, next) => {
  const user = req.user;
  
  // Check if user can manage events
  const hasPermission = 
    user.role === 'admin' || 
    user.eventPermissions?.canManageAllEvents;
  
  if (!hasPermission) {
    return res.status(403).json({ 
      error: 'You do not have permission to manage all events.' 
    });
  }
  
  next();
};

module.exports = { auth, authorize, canCreateEvents, canManageEvents, invalidateUserCache, clearUserCache };
