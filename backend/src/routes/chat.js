const express = require('express')
const { body, validationResult } = require('express-validator')
const router = express.Router()

const chatService = require('../services/chatService')
const logger = require('../utils/logger')

// Create Chat Room
router.post(
  '/room',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('attendantId').notEmpty().withMessage('Attendant ID is required'),
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

      const { userId, attendantId, sosRequestId } = req.body

      const chatRoom = await chatService.createChatRoom(
        userId,
        attendantId,
        sosRequestId
      )

      logger.info(
        `💬 Chat room created: ${chatRoom.id} for SOS ${sosRequestId}`
      )

      res.status(201).json({
        success: true,
        chatRoom,
        message: 'Chat room created successfully',
      })
    } catch (error) {
      logger.error('Error creating chat room:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create chat room',
      })
    }
  }
)

// Send Message
router.post(
  '/:chatId/message',
  [
    body('senderId').notEmpty().withMessage('Sender ID is required'),
    body('message')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Message cannot be empty'),
    body('messageType')
      .isIn(['text', 'image', 'location', 'system'])
      .withMessage('Invalid message type'),
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

      const { chatId } = req.params
      const { senderId, message, messageType, metadata } = req.body

      const chatMessage = await chatService.sendMessage(chatId, {
        senderId,
        message,
        messageType,
        metadata,
        timestamp: new Date(),
      })

      res.status(201).json({
        success: true,
        message: chatMessage,
        chatId,
      })
    } catch (error) {
      logger.error('Error sending message:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send message',
      })
    }
  }
)

// Get Chat Messages
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params
    const { page = 1, limit = 50 } = req.query

    const messages = await chatService.getChatMessages(
      chatId,
      parseInt(page),
      parseInt(limit)
    )

    res.json({
      success: true,
      messages: messages.messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.total,
        hasMore: messages.hasMore,
      },
    })
  } catch (error) {
    logger.error('Error fetching chat messages:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch chat messages',
    })
  }
})

// Get Chat Room Info
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params

    const chatRoom = await chatService.getChatRoom(chatId)

    if (!chatRoom) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Chat room not found',
      })
    }

    res.json({
      success: true,
      chatRoom,
    })
  } catch (error) {
    logger.error('Error fetching chat room:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch chat room',
    })
  }
})

// Mark Messages as Read
router.patch(
  '/:chatId/read',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('messageIds').isArray().withMessage('Message IDs must be an array'),
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

      const { chatId } = req.params
      const { userId, messageIds } = req.body

      await chatService.markMessagesAsRead(chatId, userId, messageIds)

      res.json({
        success: true,
        message: 'Messages marked as read',
      })
    } catch (error) {
      logger.error('Error marking messages as read:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark messages as read',
      })
    }
  }
)

// Close Chat Room
router.patch(
  '/:chatId/close',
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

      const { chatId } = req.params
      const { userId, reason } = req.body

      const result = await chatService.closeChatRoom(chatId, userId, reason)

      if (!result.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: result.message,
        })
      }

      logger.info(`💬 Chat room ${chatId} closed by user ${userId}`)

      res.json({
        success: true,
        message: 'Chat room closed successfully',
      })
    } catch (error) {
      logger.error('Error closing chat room:', error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to close chat room',
      })
    }
  }
)

// Get User's Active Chats
router.get('/user/:userId/active', async (req, res) => {
  try {
    const { userId } = req.params

    const activeChats = await chatService.getUserActiveChats(userId)

    res.json({
      success: true,
      chats: activeChats,
    })
  } catch (error) {
    logger.error('Error fetching active chats:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch active chats',
    })
  }
})

module.exports = router
