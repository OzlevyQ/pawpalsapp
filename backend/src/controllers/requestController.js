const Request = require('../models/Request');
const Garden = require('../models/Garden');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { 
  sendRequestSubmittedEmail,
  sendRequestStatusUpdateEmail,
  sendNewRequestNotificationEmail
} = require('../utils/emailService');

// Submit a new request
const submitRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, details } = req.body;
    const userId = req.userId;

    // Check if user already has a pending request of this type
    const existingRequest = await Request.findOne({
      user: userId,
      type: type,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: `You already have a pending ${type.replace('_', ' ')} request` 
      });
    }

    // Check if user already has the requested permissions
    const user = await User.findById(userId);
    
    if (type === 'garden_manager' && user.role === 'garden_manager') {
      return res.status(400).json({ 
        error: 'You are already a garden manager' 
      });
    }
    
    if (type === 'event_organizer' && user.eventPermissions?.canCreateEvents) {
      return res.status(400).json({ 
        error: 'You already have event creation permissions' 
      });
    }

    // Create the request
    const request = new Request({
      user: userId,
      type: type,
      details: {
        ...details,
        contactEmail: details.contactEmail || user.email,
        contactPhone: details.contactPhone || user.phone
      }
    });

    await request.save();
    await request.populate('user', 'firstName lastName email');

    // Send confirmation email to user
    try {
      await sendRequestSubmittedEmail(user, request);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    // Send notification to admins
    try {
      // Option 1: Send to specific admin email
      const adminEmail = process.env.ADMIN_EMAIL || 'your-email@example.com';
      if (adminEmail !== 'your-email@example.com') {
        const adminUser = { 
          firstName: 'Admin', 
          lastName: '', 
          email: adminEmail 
        };
        await sendNewRequestNotificationEmail(adminUser, request);
      }
      
      // Option 2: Also send to all admin users in database
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await sendNewRequestNotificationEmail(admin, request);
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    res.status(201).json({
      message: 'Request submitted successfully',
      request: request
    });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ error: 'Error submitting request' });
  }
};

// Get user's requests
const getUserRequests = async (req, res) => {
  try {
    const requests = await Request.findUserRequests(req.userId);
    
    res.json({
      message: 'Requests fetched successfully',
      requests: requests
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Error fetching requests' });
  }
};

// Get all pending requests (admin only)
const getPendingRequests = async (req, res) => {
  try {
    const requests = await Request.findPendingRequests();
    
    res.json({
      message: 'Pending requests fetched successfully',
      requests: requests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Error fetching pending requests' });
  }
};

// Approve request (admin only)
const approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const adminId = req.userId;

    const request = await Request.findById(requestId).populate('user');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    await request.approve(adminId, notes);
    await request.populate('reviewedBy', 'firstName lastName');

    // Send approval email to user
    try {
      await sendRequestStatusUpdateEmail(request.user, request, 'approved');
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({
      message: 'Request approved successfully',
      request: request
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Error approving request' });
  }
};

// Reject request (admin only)
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const adminId = req.userId;

    const request = await Request.findById(requestId).populate('user');
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    await request.reject(adminId, notes);
    await request.populate('reviewedBy', 'firstName lastName');

    // Send rejection email to user
    try {
      await sendRequestStatusUpdateEmail(request.user, request, 'rejected');
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({
      message: 'Request rejected successfully',
      request: request
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Error rejecting request' });
  }
};

// Get request by ID
const getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await Request.findById(requestId)
      .populate('user', 'firstName lastName email')
      .populate('details.preferredGardens', 'name location')
      .populate('reviewedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user can access this request (owner or admin)
    if (request.user._id.toString() !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      message: 'Request fetched successfully',
      request: request
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Error fetching request' });
  }
};

// Get request statistics (admin only)
const getRequestStats = async (req, res) => {
  try {
    const stats = await Request.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    const pendingCount = await Request.countDocuments({ status: 'pending' });
    
    res.json({
      message: 'Request statistics fetched successfully',
      stats: {
        byType: stats,
        pendingCount: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({ error: 'Error fetching request statistics' });
  }
};

module.exports = {
  submitRequest,
  getUserRequests,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getRequestById,
  getRequestStats
}; 