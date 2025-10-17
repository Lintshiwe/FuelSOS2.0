const logger = require('../utils/logger')

class SocketService {
  constructor() {
    this.io = null
    this.connectedUsers = new Map()
  }

  initialize(io) {
    this.io = io

    io.on('connection', (socket) => {
      logger.info(`🔌 Socket connected: ${socket.id}`)

      // User authentication and room joining
      socket.on('authenticate', (data) => {
        const { userId, userType, sosRequestId } = data

        socket.userId = userId
        socket.userType = userType

        this.connectedUsers.set(userId, {
          socketId: socket.id,
          userType,
          connectedAt: new Date(),
          sosRequestId,
        })

        // Join appropriate rooms
        if (sosRequestId) {
          socket.join(`sos_${sosRequestId}`)

          if (userType === 'driver' || userType === 'attendant') {
            socket.join(`chat_${sosRequestId}`)
          }
        }

        logger.info(
          `👤 User ${userId} (${userType}) authenticated and joined rooms`
        )

        socket.emit('authenticated', {
          success: true,
          userId,
          rooms: Array.from(socket.rooms),
        })
      })

      // Location updates
      socket.on('location_update', (data) => {
        const { userId, latitude, longitude, sosRequestId } = data

        // Broadcast location to relevant users
        if (sosRequestId) {
          socket.to(`sos_${sosRequestId}`).emit('location_updated', {
            userId,
            location: { latitude, longitude },
            timestamp: new Date(),
          })
        }

        logger.info(
          `📍 Location update from ${userId}: ${latitude}, ${longitude}`
        )
      })

      // Chat typing indicators
      socket.on('typing_start', (data) => {
        const { chatId, userId } = data
        socket
          .to(`chat_${chatId}`)
          .emit('user_typing', { userId, isTyping: true })
      })

      socket.on('typing_stop', (data) => {
        const { chatId, userId } = data
        socket
          .to(`chat_${chatId}`)
          .emit('user_typing', { userId, isTyping: false })
      })

      // SOS status updates
      socket.on('sos_status_update', (data) => {
        const { sosRequestId, status, userId } = data

        socket.to(`sos_${sosRequestId}`).emit('sos_status_changed', {
          sosRequestId,
          status,
          updatedBy: userId,
          timestamp: new Date(),
        })

        logger.info(
          `📱 SOS ${sosRequestId} status updated to ${status} by ${userId}`
        )
      })

      // Call events
      socket.on('call_offer', (data) => {
        const { calleeId, offer, callId } = data
        const calleeSocket = this.getUserSocket(calleeId)

        if (calleeSocket) {
          calleeSocket.emit('incoming_call', {
            callId,
            callerId: socket.userId,
            offer,
            timestamp: new Date(),
          })
        }
      })

      socket.on('call_answer', (data) => {
        const { callerId, answer, callId } = data
        const callerSocket = this.getUserSocket(callerId)

        if (callerSocket) {
          callerSocket.emit('call_answered', {
            callId,
            calleeId: socket.userId,
            answer,
            timestamp: new Date(),
          })
        }
      })

      socket.on('call_end', (data) => {
        const { callId, otherUserId } = data
        const otherSocket = this.getUserSocket(otherUserId)

        if (otherSocket) {
          otherSocket.emit('call_ended', {
            callId,
            endedBy: socket.userId,
            timestamp: new Date(),
          })
        }
      })

      // Emergency events
      socket.on('emergency_alert', (data) => {
        const { sosRequestId, location, userId } = data

        // Broadcast to all admin and nearby attendants
        socket.broadcast.emit('emergency_broadcast', {
          sosRequestId,
          location,
          userId,
          timestamp: new Date(),
        })

        logger.emergency(
          `Emergency alert from ${userId} at ${location.latitude}, ${location.longitude}`
        )
      })

      // Disconnect handling
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId)
          logger.info(`👤 User ${socket.userId} disconnected`)
        }

        logger.info(`🔌 Socket disconnected: ${socket.id}`)
      })

      // Error handling
      socket.on('error', (error) => {
        logger.error(`🔌 Socket error for ${socket.id}:`, error)
      })
    })

    logger.info('🔌 Socket.IO service initialized')
  }

  getUserSocket(userId) {
    const userInfo = this.connectedUsers.get(userId)
    if (userInfo) {
      return this.io.sockets.sockets.get(userInfo.socketId)
    }
    return null
  }

  broadcastToRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, data)
    }
  }

  sendToUser(userId, event, data) {
    const userSocket = this.getUserSocket(userId)
    if (userSocket) {
      userSocket.emit(event, data)
      return true
    }
    return false
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.entries()).map(([userId, info]) => ({
      userId,
      ...info,
    }))
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId)
  }

  // Broadcast emergency to all connected users
  broadcastEmergency(sosRequestId, location, userId) {
    if (this.io) {
      this.io.emit('emergency_broadcast', {
        sosRequestId,
        location,
        userId,
        timestamp: new Date(),
      })

      logger.emergency(`Emergency broadcast sent for SOS ${sosRequestId}`)
    }
  }

  // Send status update to specific SOS participants
  notifySOSParticipants(sosRequestId, status, details = {}) {
    if (this.io) {
      this.io.to(`sos_${sosRequestId}`).emit('sos_status_update', {
        sosRequestId,
        status,
        details,
        timestamp: new Date(),
      })
    }
  }

  // Send chat message to chat room
  sendChatMessage(chatId, message) {
    if (this.io) {
      this.io.to(`chat_${chatId}`).emit('new_message', message)
    }
  }
}

module.exports = new SocketService()
