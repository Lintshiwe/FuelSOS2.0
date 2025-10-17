const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()

const sosService = require('../services/sosService')
const { authenticateUser } = require('../middleware/auth')
const logger = require('../utils/logger')

// Create SOS Request
router.post(
  '/request',
  [
    body('location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('type')
      .isIn(['fuel_emergency', 'breakdown', 'accident'])
      .withMessage('Invalid emergency type'),
    body('userId').notEmpty().withMessage('User ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        })
      }

      const { location, type, userId, additionalInfo } = req.body

      logger.info(
        `🚨 New SOS request from user ${userId} at ${location.latitude}, ${location.longitude}`
      )

      // Create SOS request
      const sosRequest = await sosService.createSOSRequest({
        userId,
        location,
        type,
        additionalInfo,
        timestamp: new Date(),
        status: 'pending',
      })

      // Find and assign nearest attendant
      const assignment = await sosService.assignNearestAttendant(
        sosRequest.id,
        location
      )

      if (assignment.success) {
        logger.info(
          `✅ SOS request ${sosRequest.id} assigned to attendant ${assignment.attendantId}`
        )

        res.status(201).json({
          success: true,
          sosRequest: {
            ...sosRequest,
            assignedAttendant: assignment.attendant,
            estimatedArrival: assignment.estimatedArrival,
          },
          message: 'SOS request created and attendant assigned',
        })
      } else {
        logger.warn(
          `⚠️ No attendants available for SOS request ${sosRequest.id}`
        )

        res.status(202).json({
          success: true,
          sosRequest,
          message: 'SOS request created, searching for available attendants...',
        })
      }
    } catch (error) {
      logger.error('Error creating SOS request:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create SOS request',
      })
    }
  }
)

// Get SOS Request Status
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params

    const sosRequest = await sosService.getSOSRequest(requestId)

    if (!sosRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'SOS request not found',
      })
    }

    res.json({
      success: true,
      sosRequest,
    })
  } catch (error) {
    logger.error('Error fetching SOS request:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch SOS request',
    })
  }
})

// Update SOS Request Status
router.patch(
  '/:requestId/status',
  [
    body('status')
      .isIn([
        'pending',
        'assigned',
        'confirmed',
        'enroute',
        'arrived',
        'completed',
        'cancelled',
      ])
      .withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        })
      }

      const { requestId } = req.params
      const { status, attendantId } = req.body

      const updatedRequest = await sosService.updateSOSRequestStatus(
        requestId,
        status,
        attendantId
      )

      if (!updatedRequest) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'SOS request not found',
        })
      }

      logger.info(`📱 SOS request ${requestId} status updated to ${status}`)

      res.json({
        success: true,
        sosRequest: updatedRequest,
        message: `SOS request status updated to ${status}`,
      })
    } catch (error) {
      logger.error('Error updating SOS request status:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update SOS request status',
      })
    }
  }
)

// Cancel SOS Request
router.delete('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params
    const { userId, reason } = req.body

    const result = await sosService.cancelSOSRequest(requestId, userId, reason)

    if (!result.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: result.message,
      })
    }

    logger.info(`❌ SOS request ${requestId} cancelled by user ${userId}`)

    res.json({
      success: true,
      message: 'SOS request cancelled successfully',
    })
  } catch (error) {
    logger.error('Error cancelling SOS request:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel SOS request',
    })
  }
})

// Get User's SOS History
router.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    const history = await sosService.getUserSOSHistory(
      userId,
      parseInt(page),
      parseInt(limit)
    )

    res.json({
      success: true,
      history: history.requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.total,
        pages: Math.ceil(history.total / parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error('Error fetching SOS history:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch SOS history',
    })
  }
})

// Emergency endpoint for direct SOS trigger (bypasses some validations)
router.post(
  '/emergency',
  [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),
    body('userId').notEmpty().withMessage('User ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        })
      }

      const { latitude, longitude, userId } = req.body

      logger.warn(
        `🚨 EMERGENCY SOS triggered by user ${userId} at ${latitude}, ${longitude}`
      )

      // Create emergency SOS request with high priority
      const sosRequest = await sosService.createEmergencySOSRequest({
        userId,
        location: { latitude, longitude },
        type: 'emergency',
        priority: 'high',
        timestamp: new Date(),
      })

      // Immediately try to assign multiple attendants
      const assignments = await sosService.assignMultipleAttendants(
        sosRequest.id,
        { latitude, longitude }
      )

      res.status(201).json({
        success: true,
        sosRequest,
        assignments,
        message:
          'Emergency SOS request created and multiple attendants notified',
      })
    } catch (error) {
      logger.error('Error creating emergency SOS request:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create emergency SOS request',
      })
    }
  }
)

module.exports = router
