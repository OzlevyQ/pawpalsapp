const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const gardenRoutes = require('./src/routes/gardens');
const dogRoutes = require('./src/routes/dogs');
const visitRoutes = require('./src/routes/visits');
const reviewRoutes = require('./src/routes/reviews');
const chatRoutes = require('./src/routes/chats');
const eventRoutes = require('./src/routes/events');
const notificationRoutes = require('./src/routes/notifications');
const friendshipRoutes = require('./src/routes/friendships');
const photoRoutes = require('./src/routes/photos');
const adminRoutes = require('./src/routes/admin');
const requestRoutes = require('./src/routes/requests');
const gamificationRoutes = require('./src/routes/gamification');
const missionRoutes = require('./src/routes/missions');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com', 'https://dog-parks-app.onrender.com']
    : true, // Allow all origins in development (for mobile app testing)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the React app build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, './dist');
  console.log(`Frontend served from: ${distPath}`);
  
  app.use(express.static(distPath));
  
  // Serve React app for any non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Connect to MongoDB with better error handling
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority',
      authSource: 'admin'
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Full error:', error);
    
    // In production, exit the process if DB connection fails
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gardens', gardenRoutes);
app.use('/api/dogs', dogRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test-notification', require('./src/routes/testNotification'));
app.use('/api/test-all-notifications', require('./src/routes/testAllNotifications'));
app.use('/api/friendships', friendshipRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/missions', missionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Dog Parks API is running',
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WebSocket notifications server
try {
  const webSocketService = require('./src/utils/websocketService');
  if (webSocketService && typeof webSocketService.initialize === 'function') {
    webSocketService.initialize(server);
    console.log('WebSocket notifications server initialized');
  }
} catch (wsError) {
  console.error('Failed to initialize WebSocket service:', wsError);
}

// Initialize Scheduler Service for notifications
try {
  const SchedulerService = require('./src/services/SchedulerService');
  SchedulerService.initialize();
  console.log('SchedulerService initialized successfully');
} catch (schedulerError) {
  console.error('Failed to initialize SchedulerService:', schedulerError);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});
