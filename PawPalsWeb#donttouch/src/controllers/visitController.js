const Visit = require('../models/Visit');
const Garden = require('../models/Garden');
const Dog = require('../models/Dog');
const { validationResult } = require('express-validator');
const PointsService = require('../services/PointsService');
const BadgeService = require('../services/BadgeService');
const StreakService = require('../services/StreakService');

const checkIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gardenId, dogIds, notes } = req.body;

    // Check if garden exists and is active
    const garden = await Garden.findById(gardenId);
    if (!garden || !garden.isActive) {
      return res.status(404).json({ error: 'Garden not found or inactive' });
    }

    // Check if user owns all dogs
    const dogs = await Dog.find({
      _id: { $in: dogIds },
      owner: req.userId,
      isActive: true
    });

    if (dogs.length !== dogIds.length) {
      return res.status(400).json({ error: 'Invalid dogs selected' });
    }

    // Check if user already has an active visit
    const activeVisit = await Visit.findOne({
      user: req.userId,
      status: 'active'
    });

    if (activeVisit) {
      return res.status(400).json({ error: 'You already have an active visit' });
    }

    // Check garden capacity
    const activeVisitsCount = await Visit.countDocuments({
      garden: gardenId,
      status: 'active'
    });

    if (activeVisitsCount >= garden.capacity.maxDogs) {
      return res.status(400).json({ error: 'Garden is at full capacity' });
    }

    // Create visit
    const visit = new Visit({
      user: req.userId,
      dogs: dogIds,
      garden: gardenId,
      notes
    });

    await visit.save();

    // Update garden occupancy
    const newOccupancy = activeVisitsCount + dogs.length;
    await Garden.findByIdAndUpdate(
      gardenId,
      { currentOccupancy: newOccupancy },
      { runValidators: false } // Skip validation for this update
    );

    // Award points for check-in
    const pointsResult = await PointsService.awardPoints(req.userId, 'CHECKIN', null, {
      gardenId,
      visitId: visit._id,
      dogIds
    });

    // Check for badges
    const newBadges = await BadgeService.checkAndAwardBadges(req.userId, 'visit', {
      gardenId,
      visitId: visit._id,
      dogIds
    });

    // Update streak
    const streakResult = await StreakService.updateStreak(req.userId);

    await visit.populate(['dogs', 'garden']);

    res.status(201).json({
      message: 'Checked in successfully',
      visit,
      gamification: {
        points: pointsResult,
        badges: newBadges,
        streak: streakResult
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Error checking in' });
  }
};

const checkOut = async (req, res) => {
  try {
    const { visitId } = req.body;

    const visit = await Visit.findOne({
      _id: visitId,
      user: req.userId,
      status: 'active'
    });

    if (!visit) {
      return res.status(404).json({ error: 'Active visit not found' });
    }

    // Update visit
    await visit.checkout();

    // Update garden occupancy
    const garden = await Garden.findById(visit.garden);
    if (garden) {
      const activeVisitsCount = await Visit.countDocuments({
        garden: visit.garden,
        status: 'active'
      });
      
      // Only update occupancy, don't save the garden to avoid validation errors
      await Garden.findByIdAndUpdate(
        visit.garden,
        { currentOccupancy: activeVisitsCount },
        { runValidators: false } // Skip validation for this update
      );
    }

    // Award points for checkout
    const pointsResult = await PointsService.awardPoints(req.userId, 'CHECKOUT', null, {
      gardenId: visit.garden,
      visitId: visit._id,
      duration: visit.duration
    });

    // Record visit for gamification
    const visitResult = await PointsService.recordVisit(req.userId, visit.garden, 'VISIT');

    await visit.populate(['dogs', 'garden']);

    res.json({
      message: 'Checked out successfully',
      visit,
      gamification: {
        checkoutPoints: pointsResult,
        visitPoints: visitResult
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Error checking out' });
  }
};

const getMyVisits = async (req, res) => {
  try {
    const { status, gardenId, dogId, limit = 20, skip = 0 } = req.query;

    let query = { user: req.userId };

    if (status) {
      query.status = status;
    }

    if (gardenId) {
      query.garden = gardenId;
    }

    if (dogId) {
      query.dogs = dogId;
    }

    const visits = await Visit.find(query)
      .populate('dogs', 'name breed')
      .populate('garden', 'name location.address')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Visit.countDocuments(query);

    res.json({
      total,
      visits
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Error fetching visits' });
  }
};

const getActiveVisit = async (req, res) => {
  try {
    const visit = await Visit.findOne({
      user: req.userId,
      status: 'active'
    })
      .populate('dogs')
      .populate('garden');

    res.json({ visit });
  } catch (error) {
    console.error('Error fetching active visit:', error);
    res.status(500).json({ error: 'Error fetching active visit' });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyVisits,
  getActiveVisit
};
