const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()

const callService = require('../services/callService')
const logger = require('../utils/logger')

// Initiate Call
router.post(
  '/initiate',
  [
    body('callerId').notEmpty().withMessage('Caller ID is required'),
    body('calleeId').notEmpty().withMessage('Callee ID is required'),
    body('sosRequestId').notEmpty().withMessage('SOS Request ID is required'),
    body('callType').isIn(['voice', 'video']).withMessage('Invalid call type'),
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

      const { callerId, calleeId, sosRequestId, callType } = req.body

      const call = await callService.initiateCall({
        callerId,
        calleeId,
        sosRequestId,
        callType,
        timestamp: new Date(),
      })

      logger.info(
        `📞 ${callType} call initiated: ${call.id} from ${callerId} to ${calleeId}`
      )

      res.status(201).json({
        success: true,
        call,
        message: 'Call initiated successfully',
      })
    } catch (error) {
      logger.error('Error initiating call:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to initiate call',
      })
    }
  }
)

// Answer Call
router.patch(
  '/:callId/answer',
  [body('userId').notEmpty().withMessage('User ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        })
      }

      const { callId } = req.params
      const { userId } = req.body

      const call = await callService.answerCall(callId, userId)

      if (!call) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Call not found or cannot be answered',
        })
      }

      logger.info(`📞 Call ${callId} answered by user ${userId}`)

      res.json({
        success: true,
        call,
        message: 'Call answered successfully',
      })
    } catch (error) {
      logger.error('Error answering call:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to answer call',
      })
    }
  }
)

// End Call
router.patch(
  '/:callId/end',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
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

      const { callId } = req.params
      const { userId, reason } = req.body

      const call = await callService.endCall(callId, userId, reason)

      if (!call) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Call not found',
        })
      }

      logger.info(
        `📞 Call ${callId} ended by user ${userId}. Duration: ${call.duration}s`
      )

      res.json({
        success: true,
        call,
        message: 'Call ended successfully',
      })
    } catch (error) {
      logger.error('Error ending call:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to end call',
      })
    }
  }
)

// Reject Call
router.patch(
  '/:callId/reject',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
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

      const { callId } = req.params
      const { userId, reason } = req.body

      const call = await callService.rejectCall(callId, userId, reason)

      if (!call) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Call not found',
        })
      }

      logger.info(`📞 Call ${callId} rejected by user ${userId}`)

      res.json({
        success: true,
        call,
        message: 'Call rejected successfully',
      })
    } catch (error) {
      logger.error('Error rejecting call:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reject call',
      })
    }
  }
)

// Get Call Details
router.get('/:callId', async (req, res) => {
  try {
    const { callId } = req.params

    const call = await callService.getCall(callId)

    if (!call) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found',
      })
    }

    res.json({
      success: true,
      call,
    })
  } catch (error) {
    logger.error('Error fetching call details:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch call details',
    })
  }
})

// Get User's Call History
router.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const history = await callService.getUserCallHistory(
      userId,
      parseInt(page),
      parseInt(limit)
    )

    res.json({
      success: true,
      calls: history.calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.total,
        pages: Math.ceil(history.total / parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error('Error fetching call history:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch call history',
    })
  }
})

// Generate Twilio Access Token
router.post(
  '/token',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sosRequestId').notEmpty().withMessage('SOS Request ID is required'),
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

      const { userId, sosRequestId } = req.body

      const token = await callService.generateAccessToken(userId, sosRequestId)

      res.json({
        success: true,
        token,
        message: 'Access token generated successfully',
      })
    } catch (error) {
      logger.error('Error generating access token:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate access token',
      })
    }
  }
)

// Emergency Call Endpoint
router.post(
  '/emergency',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sosRequestId').notEmpty().withMessage('SOS Request ID is required'),
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

      const { userId, sosRequestId } = req.body

      // Create emergency conference call with multiple attendants
      const emergencyCall = await callService.createEmergencyCall(
        userId,
        sosRequestId
      )

      logger.warn(
        `🚨 Emergency call created: ${emergencyCall.id} for SOS ${sosRequestId}`
      )

      res.status(201).json({
        success: true,
        call: emergencyCall,
        message: 'Emergency call created and attendants notified',
      })
    } catch (error) {
      logger.error('Error creating emergency call:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create emergency call',
      })
    }
  }
)

module.exports = router
