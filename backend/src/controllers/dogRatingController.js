const DogRating = require('../models/DogRating');
const Dog = require('../models/Dog');
const Friendship = require('../models/Friendship');
const { validationResult } = require('express-validator');
const PointsService = require('../services/PointsService');
const mongoose = require('mongoose');

// Create or update a dog rating
const rateDog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dogId, ratings, comment } = req.body;

    // Check if dog exists
    const dog = await Dog.findById(dogId);
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check if user is not rating their own dog
    if (dog.owner.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot rate your own dog' });
    }

    // Check if user is friends with the dog owner
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.userId, recipient: dog.owner, status: 'accepted' },
        { requester: dog.owner, recipient: req.userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ error: 'You can only rate dogs owned by your friends' });
    }

    // Check if user has already rated this dog
    let existingRating = await DogRating.findOne({
      dog: dogId,
      rater: req.userId
    });

    if (existingRating) {
      // Update existing rating
      existingRating.ratings = ratings;
      existingRating.comment = comment;
      await existingRating.save();

      // Award points for updating rating (reduced points)
      await PointsService.awardPoints(req.userId, 'DOG_RATING', 1, {
        dogId,
        type: 'update'
      });

      // Update dog's average ratings
      await dog.updateRatings();

      await existingRating.populate('rater', 'firstName lastName profileImage');
      
      res.json({
        message: 'Dog rating updated successfully',
        rating: existingRating
      });
    } else {
      // Create new rating
      const newRating = new DogRating({
        dog: dogId,
        rater: req.userId,
        ratings,
        comment
      });

      await newRating.save();

      // Award points for new rating
      await PointsService.awardPoints(req.userId, 'DOG_RATING', null, {
        dogId,
        type: 'new'
      });

      // Update dog's average ratings
      await dog.updateRatings();

      await newRating.populate('rater', 'firstName lastName profileImage');

      res.status(201).json({
        message: 'Dog rating created successfully',
        rating: newRating
      });
    }
  } catch (error) {
    console.error('Error rating dog:', error);
    res.status(500).json({ error: 'Error rating dog' });
  }
};

// Get ratings for a specific dog
const getDogRatings = async (req, res) => {
  try {
    const { dogId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const dog = await Dog.findById(dogId);
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    const ratings = await DogRating.find({ dog: dogId })
      .populate('rater', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalRatings = await DogRating.countDocuments({ dog: dogId });

    // Add average rating to each rating for easy display
    const ratingsWithAverage = ratings.map(rating => ({
      ...rating.toObject(),
      averageRating: rating.overallRating,
      ratedBy: rating.rater
    }));

    res.json({
      dog: {
        id: dog._id,
        name: dog.name
      },
      ratings: ratingsWithAverage,
      pagination: {
        current: page,
        total: Math.ceil(totalRatings / limit),
        hasMore: page * limit < totalRatings
      }
    });
  } catch (error) {
    console.error('Error fetching dog ratings:', error);
    res.status(500).json({ error: 'Error fetching dog ratings' });
  }
};

// Get user's rating for a specific dog
const getUserRating = async (req, res) => {
  try {
    const { dogId } = req.params;

    const rating = await DogRating.findOne({
      dog: dogId,
      rater: req.userId
    });

    res.json({ rating });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({ error: 'Error fetching user rating' });
  }
};

// Get all ratings by a user
const getUserRatings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ratings = await DogRating.find({ rater: req.userId })
      .populate('dog', 'name breed image owner')
      .populate('dog.owner', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalRatings = await DogRating.countDocuments({ rater: req.userId });

    res.json({
      ratings,
      pagination: {
        current: page,
        total: Math.ceil(totalRatings / limit),
        hasMore: page * limit < totalRatings
      }
    });
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({ error: 'Error fetching user ratings' });
  }
};

// Delete a rating
const deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await DogRating.findOne({
      _id: ratingId,
      rater: req.userId
    });

    if (!rating) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    const dogId = rating.dog;
    await DogRating.deleteOne({ _id: ratingId });

    // Update dog's average ratings
    const dog = await Dog.findById(dogId);
    if (dog) {
      await dog.updateRatings();
    }

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Error deleting rating' });
  }
};

// Get top-rated dogs
const getTopRatedDogs = async (req, res) => {
  try {
    const { limit = 10, category = 'overall' } = req.query;

    let sortField = 'ratings.average';
    
    if (category !== 'overall') {
      sortField = `ratings.breakdown.${category}`;
    }

    const dogs = await Dog.find({
      'ratings.count': { $gt: 0 },
      isActive: true
    })
    .sort({ [sortField]: -1, 'ratings.count': -1 })
    .limit(parseInt(limit))
    .populate('owner', 'firstName lastName profileImage')
    .select('name breed image ratings popularity owner');

    res.json({ dogs });
  } catch (error) {
    console.error('Error fetching top-rated dogs:', error);
    res.status(500).json({ error: 'Error fetching top-rated dogs' });
  }
};

// Get most popular dogs (by friends count)
const getMostPopularDogs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const dogs = await Dog.find({
      'popularity.friendsCount': { $gt: 0 },
      isActive: true
    })
    .sort({ 'popularity.friendsCount': -1 })
    .limit(parseInt(limit))
    .populate('owner', 'firstName lastName profileImage')
    .select('name breed image ratings popularity owner');

    res.json({ dogs });
  } catch (error) {
    console.error('Error fetching most popular dogs:', error);
    res.status(500).json({ error: 'Error fetching most popular dogs' });
  }
};

// Get rating statistics
const getRatingStats = async (req, res) => {
  try {
    const { dogId } = req.params;

    const dog = await Dog.findById(dogId);
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Get average ratings using the model's static method
    const averageRatings = await DogRating.getAverageRatings(dogId);

    // Get rating distribution
    const ratingDistribution = await DogRating.aggregate([
      { $match: { dog: new mongoose.Types.ObjectId(dogId) } },
      {
        $group: {
          _id: { $floor: '$overallRating' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get recent ratings trend
    const recentRatings = await DogRating.find({ dog: dogId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('overallRating createdAt');

    // Calculate trend
    const trend = recentRatings.length > 1 ? 
      (recentRatings[0].overallRating - recentRatings[recentRatings.length - 1].overallRating) : 0;

    res.json({
      dog: {
        id: dog._id,
        name: dog.name
      },
      averageRatings: {
        playfulness: averageRatings.averagePlayfulness || 0,
        friendliness: averageRatings.averageFriendliness || 0,
        energy: averageRatings.averageEnergy || 0,
        obedience: averageRatings.averageObedience || 0,
        cuteness: averageRatings.averageCuteness || 0,
        overall: averageRatings.averageOverall || 0
      },
      totalRatings: averageRatings.totalRatings || 0,
      distribution: ratingDistribution,
      trend: {
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
        value: Math.abs(trend).toFixed(1)
      },
      recentRatings
    });
  } catch (error) {
    console.error('Error fetching rating stats:', error);
    res.status(500).json({ error: 'Error fetching rating stats' });
  }
};

module.exports = {
  rateDog,
  getDogRatings,
  getUserRating,
  getUserRatings,
  deleteRating,
  getTopRatedDogs,
  getMostPopularDogs,
  getRatingStats
};