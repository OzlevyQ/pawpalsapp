const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  apiType: {
    type: String,
    required: true,
    enum: ['places_text_search', 'places_details', 'places_photos', 'places_autocomplete']
  },
  endpoint: {
    type: String,
    required: true
  },
  requestCount: {
    type: Number,
    default: 1
  },
  costPerRequest: {
    type: Number,
    required: true // in USD
  },
  totalCost: {
    type: Number,
    required: true // in USD
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  year: {
    type: Number,
    index: true
  },
  month: {
    type: Number,
    index: true
  },
  day: {
    type: Number,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some calls might be public
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  responseTime: {
    type: Number, // in milliseconds
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
apiUsageSchema.index({ date: -1 });
apiUsageSchema.index({ year: 1, month: 1, day: 1 });
apiUsageSchema.index({ apiType: 1, date: -1 });

// Static method to get current costs (updated December 2024)
apiUsageSchema.statics.getCurrentCosts = function() {
  return {
    places_text_search: 0.032, // $32 per 1,000 requests
    places_details: 0.017, // $17 per 1,000 requests  
    places_photos: 0.007, // $7 per 1,000 requests
    places_autocomplete: 0.00285 // $2.85 per 1,000 requests
  };
};

// Static method to log usage
apiUsageSchema.statics.logUsage = async function(apiType, endpoint, success = true, errorMessage = null, responseTime = 0, userId = null) {
  try {
    const costs = this.getCurrentCosts();
    const costPerRequest = costs[apiType] || 0;
    const now = new Date();
    
    const usage = new this({
      apiType,
      endpoint,
      requestCount: 1,
      costPerRequest,
      totalCost: costPerRequest,
      date: now,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      userId,
      success,
      errorMessage,
      responseTime
    });
    
    await usage.save();
    console.log(`📊 API Usage logged: ${apiType} - $${costPerRequest.toFixed(4)}`);
    return usage;
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
};

// Static method to get usage stats
apiUsageSchema.statics.getUsageStats = async function(startDate, endDate) {
  try {
    const matchCondition = {
      date: {
        $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default last 30 days
        $lte: endDate || new Date()
      }
    };

    const stats = await this.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$apiType',
          totalRequests: { $sum: '$requestCount' },
          totalCost: { $sum: '$totalCost' },
          successfulRequests: { 
            $sum: { $cond: [{ $eq: ['$success', true] }, '$requestCount', 0] }
          },
          failedRequests: { 
            $sum: { $cond: [{ $eq: ['$success', false] }, '$requestCount', 0] }
          },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    const totalStats = await this.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$requestCount' },
          totalCost: { $sum: '$totalCost' },
          successfulRequests: { 
            $sum: { $cond: [{ $eq: ['$success', true] }, '$requestCount', 0] }
          },
          failedRequests: { 
            $sum: { $cond: [{ $eq: ['$success', false] }, '$requestCount', 0] }
          },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    return {
      byApiType: stats,
      total: totalStats[0] || {
        totalRequests: 0,
        totalCost: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0
      }
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    throw error;
  }
};

// Static method to get daily usage for charts
apiUsageSchema.statics.getDailyUsage = async function(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyUsage = await this.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
            day: '$day'
          },
          totalRequests: { $sum: '$requestCount' },
          totalCost: { $sum: '$totalCost' },
          successfulRequests: { 
            $sum: { $cond: [{ $eq: ['$success', true] }, '$requestCount', 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return dailyUsage;
  } catch (error) {
    console.error('Error getting daily usage:', error);
    throw error;
  }
};

module.exports = mongoose.model('ApiUsage', apiUsageSchema); 