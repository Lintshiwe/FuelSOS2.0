const admin = require('firebase-admin')
const logger = require('../utils/logger')

class SOSService {
  constructor() {
    this.db = admin.firestore()
  }

  async createSOSRequest(sosData) {
    try {
      // Generate unique request ID
      const requestId = `sos_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const sosRequest = {
        id: requestId,
        ...sosData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        priority: sosData.priority || 'normal',
      }

      // Save to Firestore
      await this.db.collection('sos_requests').doc(requestId).set(sosRequest)

      logger.info(`📝 SOS request ${requestId} created in database`)

      return {
        id: requestId,
        ...sosData,
        createdAt: new Date(),
        status: 'pending',
      }
    } catch (error) {
      logger.error('Error creating SOS request in database:', error)
      throw new Error('Failed to create SOS request')
    }
  }

  async createEmergencySOSRequest(sosData) {
    try {
      // Generate unique emergency request ID
      const requestId = `emg_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const emergencyRequest = {
        id: requestId,
        ...sosData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        priority: 'emergency',
        type: 'emergency',
      }

      // Save to Firestore with emergency collection
      await this.db
        .collection('emergency_requests')
        .doc(requestId)
        .set(emergencyRequest)

      // Also add to regular SOS requests for tracking
      await this.db
        .collection('sos_requests')
        .doc(requestId)
        .set(emergencyRequest)

      // Send emergency notifications
      await this.sendEmergencyNotifications(requestId, sosData.location)

      logger.warn(
        `🚨 Emergency SOS request ${requestId} created and notifications sent`
      )

      return {
        id: requestId,
        ...sosData,
        createdAt: new Date(),
        status: 'pending',
        priority: 'emergency',
      }
    } catch (error) {
      logger.error('Error creating emergency SOS request:', error)
      throw new Error('Failed to create emergency SOS request')
    }
  }

  async getSOSRequest(requestId) {
    try {
      const doc = await this.db.collection('sos_requests').doc(requestId).get()

      if (!doc.exists) {
        return null
      }

      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      }
    } catch (error) {
      logger.error('Error fetching SOS request:', error)
      throw new Error('Failed to fetch SOS request')
    }
  }

  async updateSOSRequestStatus(requestId, status, attendantId = null) {
    try {
      const updateData = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      if (attendantId) {
        updateData.assignedAttendant = attendantId
      }

      // Add status-specific updates
      switch (status) {
        case 'confirmed':
          updateData.confirmedAt = admin.firestore.FieldValue.serverTimestamp()
          break
        case 'enroute':
          updateData.enrouteAt = admin.firestore.FieldValue.serverTimestamp()
          break
        case 'arrived':
          updateData.arrivedAt = admin.firestore.FieldValue.serverTimestamp()
          break
        case 'completed':
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp()
          break
        case 'cancelled':
          updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp()
          break
      }

      await this.db.collection('sos_requests').doc(requestId).update(updateData)

      // Send real-time update via Socket.IO
      const io = require('../server').io
      if (io) {
        io.to(`sos_${requestId}`).emit('status_update', {
          requestId,
          status,
          timestamp: new Date(),
        })
      }

      logger.info(`📊 SOS request ${requestId} status updated to ${status}`)

      return await this.getSOSRequest(requestId)
    } catch (error) {
      logger.error('Error updating SOS request status:', error)
      throw new Error('Failed to update SOS request status')
    }
  }

  async assignNearestAttendant(requestId, location) {
    try {
      // Find available attendants within 10km radius
      const nearbyAttendants = await this.findNearbyAttendants(location, 10)

      if (nearbyAttendants.length === 0) {
        logger.warn(
          `⚠️ No attendants available near ${location.latitude}, ${location.longitude}`
        )
        return { success: false, message: 'No attendants available in area' }
      }

      // Sort by distance and availability
      const sortedAttendants = nearbyAttendants
        .filter((att) => att.isAvailable && att.isVerified)
        .sort((a, b) => a.distance - b.distance)

      if (sortedAttendants.length === 0) {
        return { success: false, message: 'No verified attendants available' }
      }

      const selectedAttendant = sortedAttendants[0]

      // Assign attendant to SOS request
      await this.db
        .collection('sos_requests')
        .doc(requestId)
        .update({
          assignedAttendant: selectedAttendant.id,
          status: 'assigned',
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          estimatedArrival: this.calculateETA(selectedAttendant.distance),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

      // Update attendant availability
      await this.db.collection('attendants').doc(selectedAttendant.id).update({
        isAvailable: false,
        currentSOSRequest: requestId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Send notification to attendant
      await this.sendAttendantNotification(selectedAttendant.id, requestId)

      logger.info(
        `✅ Attendant ${selectedAttendant.id} assigned to SOS request ${requestId}`
      )

      return {
        success: true,
        attendantId: selectedAttendant.id,
        attendant: selectedAttendant,
        estimatedArrival: this.calculateETA(selectedAttendant.distance),
      }
    } catch (error) {
      logger.error('Error assigning attendant:', error)
      throw new Error('Failed to assign attendant')
    }
  }

  async assignMultipleAttendants(requestId, location) {
    try {
      // Find multiple attendants for emergency
      const nearbyAttendants = await this.findNearbyAttendants(location, 15)
      const availableAttendants = nearbyAttendants
        .filter((att) => att.isAvailable && att.isVerified)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3) // Assign up to 3 attendants for emergency

      const assignments = []

      for (const attendant of availableAttendants) {
        try {
          // Create assignment record
          const assignmentId = `assign_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 6)}`

          await this.db
            .collection('emergency_assignments')
            .doc(assignmentId)
            .set({
              id: assignmentId,
              sosRequestId: requestId,
              attendantId: attendant.id,
              status: 'pending',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              estimatedArrival: this.calculateETA(attendant.distance),
            })

          // Send emergency notification
          await this.sendEmergencyAttendantNotification(attendant.id, requestId)

          assignments.push({
            attendantId: attendant.id,
            attendant: attendant,
            assignmentId: assignmentId,
            estimatedArrival: this.calculateETA(attendant.distance),
          })
        } catch (error) {
          logger.error(`Error assigning attendant ${attendant.id}:`, error)
        }
      }

      // Update SOS request with multiple assignments
      await this.db
        .collection('sos_requests')
        .doc(requestId)
        .update({
          emergencyAssignments: assignments.map((a) => a.assignmentId),
          status: 'assigned',
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

      logger.info(
        `🚨 Emergency SOS ${requestId} assigned to ${assignments.length} attendants`
      )

      return assignments
    } catch (error) {
      logger.error('Error assigning multiple attendants:', error)
      throw new Error('Failed to assign multiple attendants')
    }
  }

  async findNearbyAttendants(location, radiusKm) {
    try {
      // In production, use proper geospatial queries
      // For now, return mock data for testing
      const mockAttendants = [
        {
          id: 'att_001',
          name: 'Lintshiwe Ntoampi',
          phone: '+27123456789',
          vehiclePlate: 'ABC-123-GP',
          isVerified: true,
          isAvailable: true,
          location: {
            latitude: location.latitude + 0.01,
            longitude: location.longitude + 0.01,
          },
          distance: 1.2,
          rating: 4.8,
          reviewCount: 127,
        },
        {
          id: 'att_002',
          name: 'Lintshiwe Ntoampi',
          phone: '+27123456790',
          vehiclePlate: 'DEF-456-GP',
          isVerified: true,
          isAvailable: true,
          location: {
            latitude: location.latitude - 0.01,
            longitude: location.longitude - 0.01,
          },
          distance: 2.1,
          rating: 4.6,
          reviewCount: 89,
        },
      ]

      // Filter by radius
      return mockAttendants.filter((att) => att.distance <= radiusKm)
    } catch (error) {
      logger.error('Error finding nearby attendants:', error)
      return []
    }
  }

  calculateETA(distanceKm) {
    // Simple ETA calculation: distance / average speed (30 km/h in traffic)
    const averageSpeedKmh = 30
    const etaMinutes = Math.ceil((distanceKm / averageSpeedKmh) * 60)

    const eta = new Date()
    eta.setMinutes(eta.getMinutes() + etaMinutes)

    return eta
  }

  async sendAttendantNotification(attendantId, requestId) {
    try {
      // Implementation would send push notification to attendant
      logger.info(
        `📱 Notification sent to attendant ${attendantId} for SOS ${requestId}`
      )

      // Store notification in database
      await this.db.collection('notifications').add({
        type: 'sos_assignment',
        recipientId: attendantId,
        recipientType: 'attendant',
        sosRequestId: requestId,
        message: 'New SOS request assigned to you',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      })
    } catch (error) {
      logger.error('Error sending attendant notification:', error)
    }
  }

  async sendEmergencyAttendantNotification(attendantId, requestId) {
    try {
      logger.warn(
        `🚨 Emergency notification sent to attendant ${attendantId} for SOS ${requestId}`
      )

      // Store emergency notification
      await this.db.collection('notifications').add({
        type: 'emergency_assignment',
        recipientId: attendantId,
        recipientType: 'attendant',
        sosRequestId: requestId,
        message: 'EMERGENCY: New SOS request requires immediate attention',
        priority: 'high',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      })
    } catch (error) {
      logger.error('Error sending emergency notification:', error)
    }
  }

  async sendEmergencyNotifications(requestId, location) {
    try {
      // Send notifications to emergency contacts, admin dashboard, etc.
      logger.warn(
        `🚨 Emergency notifications sent for SOS request ${requestId}`
      )

      // Store admin notification
      await this.db.collection('admin_notifications').add({
        type: 'emergency_sos',
        sosRequestId: requestId,
        location: location,
        message: 'Emergency SOS request created - immediate attention required',
        priority: 'critical',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      })
    } catch (error) {
      logger.error('Error sending emergency notifications:', error)
    }
  }

  async cancelSOSRequest(requestId, userId, reason) {
    try {
      const sosRequest = await this.getSOSRequest(requestId)

      if (!sosRequest) {
        return { success: false, message: 'SOS request not found' }
      }

      if (sosRequest.userId !== userId) {
        return {
          success: false,
          message: 'Unauthorized to cancel this request',
        }
      }

      if (['completed', 'cancelled'].includes(sosRequest.status)) {
        return {
          success: false,
          message: 'Cannot cancel completed or already cancelled request',
        }
      }

      // Update request status
      await this.updateSOSRequestStatus(requestId, 'cancelled')

      // Free up assigned attendant
      if (sosRequest.assignedAttendant) {
        await this.db
          .collection('attendants')
          .doc(sosRequest.assignedAttendant)
          .update({
            isAvailable: true,
            currentSOSRequest: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
      }

      // Log cancellation
      await this.db.collection('sos_cancellations').add({
        sosRequestId: requestId,
        userId: userId,
        reason: reason,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return { success: true, message: 'SOS request cancelled successfully' }
    } catch (error) {
      logger.error('Error cancelling SOS request:', error)
      throw new Error('Failed to cancel SOS request')
    }
  }

  async getUserSOSHistory(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit

      const snapshot = await this.db
        .collection('sos_requests')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get()

      const requests = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        })
      })

      // Get total count
      const totalSnapshot = await this.db
        .collection('sos_requests')
        .where('userId', '==', userId)
        .get()

      return {
        requests,
        total: totalSnapshot.size,
      }
    } catch (error) {
      logger.error('Error fetching user SOS history:', error)
      throw new Error('Failed to fetch SOS history')
    }
  }
}

module.exports = new SOSService()
