const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // userId -> WebSocket connection
    this.MAX_CONNECTIONS = 1000; // Limit total connections
    this.CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // Cleanup every 5 minutes
    this.RECONNECT_LIMIT = 5; // Max reconnection attempts per user
    this.userReconnectAttempts = new Map(); // Track reconnection attempts
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/notifications-ws',
      maxPayload: 16 * 1024 // 16KB max message size
    });
    
    // Start periodic cleanup
    setInterval(() => this.cleanupConnections(), this.CLEANUP_INTERVAL);

    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract token from query string or headers
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token') || 
                     req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          ws.close(1008, 'Token required');
          return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          ws.close(1008, 'Invalid user');
          return;
        }

        // Check connection limits
        if (this.connections.size >= this.MAX_CONNECTIONS) {
          ws.close(1008, 'Server at maximum capacity');
          return;
        }
        
        // Check if user already has a connection
        const existingConnection = this.connections.get(user._id.toString());
        if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
          existingConnection.close(1000, 'New connection established');
        }
        
        // Store connection with metadata
        ws.userId = user._id.toString();
        ws.lastActivity = Date.now();
        ws.connectionTime = Date.now();
        this.connections.set(ws.userId, ws);
        
        // Reset reconnect attempts on successful connection
        this.userReconnectAttempts.delete(ws.userId);

        console.log(`WebSocket connected: User ${user.firstName} ${user.lastName} (${ws.userId})`);

        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established'
        }));

        // Handle connection close
        ws.on('close', () => {
          console.log(`WebSocket disconnected: User ${ws.userId}`);
          this.connections.delete(ws.userId);
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${ws.userId}:`, error);
          this.connections.delete(ws.userId);
        });

        // Handle ping/pong for connection keep-alive
        ws.on('ping', () => {
          ws.lastActivity = Date.now();
          ws.pong();
        });
        
        // Handle messages to update activity
        ws.on('message', (data) => {
          ws.lastActivity = Date.now();
          // Handle any client messages here if needed
        });
        
        // Start heartbeat
        ws.isAlive = true;
        const heartbeatInterval = setInterval(() => {
          if (ws.isAlive === false) {
            clearInterval(heartbeatInterval);
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping();
        }, 30000); // Ping every 30 seconds
        
        ws.on('pong', () => {
          ws.isAlive = true;
          ws.lastActivity = Date.now();
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    console.log('WebSocket server initialized');
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    const ws = this.connections.get(userId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          notification
        }));
        return true;
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        this.connections.delete(userId.toString());
        return false;
      }
    }
    return false;
  }

  // Send notification to multiple users
  sendNotificationToUsers(userIds, notification) {
    const results = {};
    userIds.forEach(userId => {
      results[userId] = this.sendNotificationToUser(userId, notification);
    });
    return results;
  }

  // Broadcast notification to all connected users
  broadcastNotification(notification) {
    const results = {};
    this.connections.forEach((ws, userId) => {
      results[userId] = this.sendNotificationToUser(userId, notification);
    });
    return results;
  }

  // Send custom message to user
  sendMessageToUser(userId, type, data) {
    const ws = this.connections.get(userId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type,
          ...data
        }));
        return true;
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
        this.connections.delete(userId.toString());
        return false;
      }
    }
    return false;
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connections.size;
  }

  // Get list of connected user IDs
  getConnectedUserIds() {
    return Array.from(this.connections.keys());
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connections.has(userId.toString());
  }

  // Close connection for specific user
  disconnectUser(userId) {
    const ws = this.connections.get(userId.toString());
    if (ws) {
      ws.close(1000, 'Disconnected by server');
      this.connections.delete(userId.toString());
      return true;
    }
    return false;
  }

  // Close all connections
  closeAllConnections() {
    this.connections.forEach((ws, userId) => {
      ws.close(1000, 'Server shutdown');
    });
    this.connections.clear();
  }

  // Enhanced cleanup for inactive connections
  cleanupConnections() {
    const now = Date.now();
    const toRemove = [];
    let inactiveCount = 0;
    let timeoutCount = 0;
    
    this.connections.forEach((ws, userId) => {
      if (ws.readyState !== WebSocket.OPEN) {
        toRemove.push(userId);
      } else if (ws.lastActivity && now - ws.lastActivity > this.CONNECTION_TIMEOUT) {
        // Connection is too old, close it
        ws.close(1000, 'Connection timeout');
        toRemove.push(userId);
        timeoutCount++;
      } else if (!ws.lastActivity && now - ws.connectionTime > this.CONNECTION_TIMEOUT) {
        // No activity recorded, use connection time
        ws.close(1000, 'Connection timeout');
        toRemove.push(userId);
        inactiveCount++;
      }
    });
    
    toRemove.forEach(userId => {
      this.connections.delete(userId);
      this.userReconnectAttempts.delete(userId); // Clean up reconnect attempts
    });
    
    if (toRemove.length > 0) {
      console.log(`🧹 WebSocket cleanup: removed ${toRemove.length} connections (${timeoutCount} timeouts, ${inactiveCount} inactive)`);
    }

    return toRemove.length;
  }
  
  // Check if user can reconnect (prevent spam)
  canUserReconnect(userId) {
    const attempts = this.userReconnectAttempts.get(userId) || 0;
    if (attempts >= this.RECONNECT_LIMIT) {
      return false;
    }
    this.userReconnectAttempts.set(userId, attempts + 1);
    return true;
  }
  
  // Get connection statistics
  getConnectionStats() {
    const now = Date.now();
    let activeConnections = 0;
    let oldConnections = 0;
    
    this.connections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        activeConnections++;
        if (now - ws.connectionTime > this.CONNECTION_TIMEOUT / 2) {
          oldConnections++;
        }
      }
    });
    
    return {
      total: this.connections.size,
      active: activeConnections,
      old: oldConnections,
      maxAllowed: this.MAX_CONNECTIONS
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService; 