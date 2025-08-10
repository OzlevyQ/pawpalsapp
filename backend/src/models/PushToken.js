const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  deviceName: {
    type: String
  },
  osVersion: {
    type: String
  },
  appVersion: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSimulator: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
pushTokenSchema.index({ user: 1 });
pushTokenSchema.index({ token: 1 });
pushTokenSchema.index({ isActive: 1 });

// Static methods
pushTokenSchema.statics.registerToken = async function(userId, tokenData) {
  const { token, platform, deviceName, osVersion, appVersion, isSimulator = false } = tokenData;
  
  console.log('\n===============================================');
  console.log('📱 Registering push token');
  console.log(`   User ID: ${userId}`);
  console.log(`   Token: ${token.substring(0, 30)}...`);
  console.log(`   Platform: ${platform}`);
  console.log(`   Device: ${deviceName || 'Unknown'}`);
  console.log(`   OS Version: ${osVersion || 'Unknown'}`);
  console.log(`   App Version: ${appVersion || 'Unknown'}`);
  console.log(`   Is Simulator: ${isSimulator}`);
  console.log('===============================================');
  
  // Check if token already exists
  let existingToken = await this.findOne({ token });
  
  if (existingToken) {
    console.log('♾️ Updating existing token registration');
    console.log(`   Previous user: ${existingToken.user}`);
    console.log(`   New user: ${userId}`);
    
    // Update existing token with new user if different
    existingToken.user = userId;
    existingToken.platform = platform;
    existingToken.deviceName = deviceName || existingToken.deviceName;
    existingToken.osVersion = osVersion || existingToken.osVersion;
    existingToken.appVersion = appVersion || existingToken.appVersion;
    existingToken.isSimulator = isSimulator;
    existingToken.isActive = true;
    existingToken.lastUsed = new Date();
    await existingToken.save();
    
    console.log('✅ Push token updated successfully');
    console.log('===============================================\n');
    return existingToken;
  }
  
  // Create new token
  console.log('✨ Creating new push token registration');
  const newToken = await this.create({
    user: userId,
    token,
    platform,
    deviceName,
    osVersion,
    appVersion,
    isSimulator
  });
  
  console.log(`✅ Push token registered with ID: ${newToken._id}`);
  console.log('===============================================\n');
  return newToken;
};

pushTokenSchema.statics.getActiveTokensForUser = async function(userId) {
  console.log(`🔍 Looking up active push tokens for user: ${userId}`);
  
  const tokens = await this.find({ 
    user: userId, 
    isActive: true 
  }).select('token platform isSimulator deviceName');
  
  console.log(`📊 Found ${tokens.length} active tokens for user ${userId}:`);
  tokens.forEach((token, index) => {
    console.log(`   ${index + 1}. Platform: ${token.platform}, Device: ${token.deviceName || 'Unknown'}, Simulator: ${token.isSimulator}`);
    console.log(`      Token: ${token.token.substring(0, 30)}...`);
  });
  
  return tokens;
};

pushTokenSchema.statics.deactivateToken = async function(token) {
  return await this.updateOne(
    { token },
    { isActive: false }
  );
};

// Clean up old tokens (older than 90 days and not used)
pushTokenSchema.statics.cleanupOldTokens = async function() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  return await this.deleteMany({
    lastUsed: { $lt: ninetyDaysAgo },
    isActive: false
  });
};

module.exports = mongoose.model('PushToken', pushTokenSchema);