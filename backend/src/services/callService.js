const admin = require('firebase-admin')
const twilio = require('twilio')
const logger = require('../utils/logger')

class CallService {
  constructor() {
    this.db = admin.firestore()

    // Initialize Twilio client (will be null if credentials not provided)
    this.twilioClient = null
    this.initializeTwilio()
  }

  initializeTwilio() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        )
        logger.info('📞 Twilio client initialized')
      } else {
        logger.warn('⚠️ Twilio credentials not provided, using mock service')
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Twilio:', error.message)
    }
  }

  async initiateCall(callData) {
    try {
      const callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const call = {
        id: callId,
        callerId: callData.callerId,
        calleeId: callData.calleeId,
        sosRequestId: callData.sosRequestId,
        callType: callData.callType,
        status: 'initiated',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        startTime: null,
        endTime: null,
        duration: 0,
        quality: null,
        recordingUrl: null,
      }

      // Save call record
      await this.db.collection('calls').doc(callId).set(call)

      // Generate Twilio access tokens for both users
      const callerToken = await this.generateAccessToken(
        callData.callerId,
        callData.sosRequestId
      )
      const calleeToken = await this.generateAccessToken(
        callData.calleeId,
        callData.sosRequestId
      )

      // Send call notification via Socket.IO
      const socketService = require('./socketService')
      const calleeSocket = socketService.getUserSocket(callData.calleeId)

      if (calleeSocket) {
        calleeSocket.emit('incoming_call', {
          callId,
          callerId: callData.callerId,
          callType: callData.callType,
          sosRequestId: callData.sosRequestId,
          accessToken: calleeToken,
          timestamp: new Date(),
        })
      }

      logger.info(
        `📞 Call ${callId} initiated from ${callData.callerId} to ${callData.calleeId}`
      )

      return {
        id: callId,
        ...call,
        callerAccessToken: callerToken,
        calleeAccessToken: calleeToken,
        createdAt: new Date(),
      }
    } catch (error) {
      logger.error('Error initiating call:', error)
      throw new Error('Failed to initiate call')
    }
  }

  async answerCall(callId, userId) {
    try {
      const call = await this.getCall(callId)

      if (!call || call.calleeId !== userId) {
        return null
      }

      if (call.status !== 'initiated') {
        return null
      }

      // Update call status
      const updatedCall = await this.db.collection('calls').doc(callId).update({
        status: 'active',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        answeredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Notify caller via Socket.IO
      const socketService = require('./socketService')
      const callerSocket = socketService.getUserSocket(call.callerId)

      if (callerSocket) {
        callerSocket.emit('call_answered', {
          callId,
          calleeId: userId,
          timestamp: new Date(),
        })
      }

      logger.info(`📞 Call ${callId} answered by ${userId}`)

      return await this.getCall(callId)
    } catch (error) {
      logger.error('Error answering call:', error)
      throw new Error('Failed to answer call')
    }
  }

  async endCall(callId, userId, reason = null) {
    try {
      const call = await this.getCall(callId)

      if (!call) {
        return null
      }

      const endTime = new Date()
      let duration = 0

      if (call.startTime) {
        duration = Math.floor((endTime - call.startTime.toDate()) / 1000)
      }

      // Update call record
      await this.db.collection('calls').doc(callId).update({
        status: 'ended',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        endedBy: userId,
        endReason: reason,
        duration: duration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Notify other participant
      const socketService = require('./socketService')
      const otherUserId =
        call.callerId === userId ? call.calleeId : call.callerId
      const otherSocket = socketService.getUserSocket(otherUserId)

      if (otherSocket) {
        otherSocket.emit('call_ended', {
          callId,
          endedBy: userId,
          duration,
          timestamp: new Date(),
        })
      }

      // Log call completion
      await this.logCallActivity(call.sosRequestId, {
        callId,
        action: 'call_ended',
        endedBy: userId,
        duration,
        reason,
      })

      logger.info(
        `📞 Call ${callId} ended by ${userId}. Duration: ${duration}s`
      )

      return await this.getCall(callId)
    } catch (error) {
      logger.error('Error ending call:', error)
      throw new Error('Failed to end call')
    }
  }

  async rejectCall(callId, userId, reason = null) {
    try {
      const call = await this.getCall(callId)

      if (!call || call.calleeId !== userId || call.status !== 'initiated') {
        return null
      }

      // Update call status
      await this.db.collection('calls').doc(callId).update({
        status: 'rejected',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy: userId,
        rejectReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Notify caller
      const socketService = require('./socketService')
      const callerSocket = socketService.getUserSocket(call.callerId)

      if (callerSocket) {
        callerSocket.emit('call_rejected', {
          callId,
          rejectedBy: userId,
          reason,
          timestamp: new Date(),
        })
      }

      logger.info(`📞 Call ${callId} rejected by ${userId}`)

      return await this.getCall(callId)
    } catch (error) {
      logger.error('Error rejecting call:', error)
      throw new Error('Failed to reject call')
    }
  }

  async getCall(callId) {
    try {
      const doc = await this.db.collection('calls').doc(callId).get()

      if (!doc.exists) {
        return null
      }

      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        startTime: data.startTime?.toDate(),
        endTime: data.endTime?.toDate(),
        answeredAt: data.answeredAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
      }
    } catch (error) {
      logger.error('Error fetching call:', error)
      throw new Error('Failed to fetch call')
    }
  }

  async generateAccessToken(userId, sosRequestId) {
    try {
      if (!this.twilioClient) {
        // Return mock token for development
        return `mock_token_${userId}_${Date.now()}`
      }

      const AccessToken = require('twilio').jwt.AccessToken
      const VoiceGrant = AccessToken.VoiceGrant

      const accessToken = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        { identity: `user_${userId}` }
      )

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_APP_SID,
        incomingAllow: true,
      })

      accessToken.addGrant(voiceGrant)

      const token = accessToken.toJwt()

      logger.info(`🔐 Access token generated for user ${userId}`)

      return token
    } catch (error) {
      logger.error('Error generating access token:', error)
      // Return mock token as fallback
      return `mock_token_${userId}_${Date.now()}`
    }
  }

  async createEmergencyCall(userId, sosRequestId) {
    try {
      const emergencyCallId = `emg_call_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      // Find nearby attendants for emergency
      const sosService = require('./sosService')
      const sosRequest = await sosService.getSOSRequest(sosRequestId)

      if (!sosRequest) {
        throw new Error('SOS request not found')
      }

      const nearbyAttendants = await sosService.findNearbyAttendants(
        sosRequest.location,
        15
      )
      const availableAttendants = nearbyAttendants
        .filter((att) => att.isAvailable && att.isVerified)
        .slice(0, 3)

      // Create emergency call room
      const emergencyCall = {
        id: emergencyCallId,
        type: 'emergency_conference',
        userId,
        sosRequestId,
        attendants: availableAttendants.map((att) => att.id),
        status: 'initiated',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        participants: [userId, ...availableAttendants.map((att) => att.id)],
        activeParticipants: [],
        startTime: null,
        endTime: null,
      }

      await this.db
        .collection('emergency_calls')
        .doc(emergencyCallId)
        .set(emergencyCall)

      // Generate access tokens for all participants
      const tokens = {}
      for (const participantId of emergencyCall.participants) {
        tokens[participantId] = await this.generateAccessToken(
          participantId,
          sosRequestId
        )
      }

      // Notify all attendants
      const socketService = require('./socketService')
      for (const attendantId of availableAttendants.map((att) => att.id)) {
        const attendantSocket = socketService.getUserSocket(attendantId)
        if (attendantSocket) {
          attendantSocket.emit('emergency_call', {
            callId: emergencyCallId,
            userId,
            sosRequestId,
            accessToken: tokens[attendantId],
            timestamp: new Date(),
          })
        }
      }

      logger.emergency(
        `Emergency call ${emergencyCallId} created for SOS ${sosRequestId} with ${availableAttendants.length} attendants`
      )

      return {
        id: emergencyCallId,
        ...emergencyCall,
        accessTokens: tokens,
        createdAt: new Date(),
      }
    } catch (error) {
      logger.error('Error creating emergency call:', error)
      throw new Error('Failed to create emergency call')
    }
  }

  async getUserCallHistory(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit

      // Query calls where user is either caller or callee
      const callerSnapshot = await this.db
        .collection('calls')
        .where('callerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get()

      const calleeSnapshot = await this.db
        .collection('calls')
        .where('calleeId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get()

      const calls = []

      ;[...callerSnapshot.docs, ...calleeSnapshot.docs].forEach((doc) => {
        const data = doc.data()
        calls.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          startTime: data.startTime?.toDate(),
          endTime: data.endTime?.toDate(),
        })
      })

      // Remove duplicates and sort by creation time
      const uniqueCalls = calls
        .filter(
          (call, index, self) =>
            index === self.findIndex((c) => c.id === call.id)
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      // Get total count
      const totalCallerCount = await this.db
        .collection('calls')
        .where('callerId', '==', userId)
        .get()

      const totalCalleeCount = await this.db
        .collection('calls')
        .where('calleeId', '==', userId)
        .get()

      return {
        calls: uniqueCalls.slice(0, limit),
        total: totalCallerCount.size + totalCalleeCount.size,
      }
    } catch (error) {
      logger.error('Error fetching call history:', error)
      throw new Error('Failed to fetch call history')
    }
  }

  async logCallActivity(sosRequestId, activityData) {
    try {
      await this.db.collection('call_activities').add({
        sosRequestId,
        ...activityData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (error) {
      logger.error('Error logging call activity:', error)
    }
  }
}

module.exports = new CallService()
