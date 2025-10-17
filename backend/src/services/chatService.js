const admin = require('firebase-admin')
const logger = require('../utils/logger')

class ChatService {
  constructor() {
    this.db = admin.firestore()
  }

  async createChatRoom(userId, attendantId, sosRequestId) {
    try {
      const chatId = `chat_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const chatRoom = {
        id: chatId,
        userId,
        attendantId,
        sosRequestId,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        messageCount: 0,
        lastMessage: null,
        lastMessageTime: null,
      }

      await this.db.collection('chat_rooms').doc(chatId).set(chatRoom)

      // Send system message
      await this.sendMessage(chatId, {
        senderId: 'system',
        message: 'Chat session started. All messages are monitored for safety.',
        messageType: 'system',
        timestamp: new Date(),
      })

      logger.info(`💬 Chat room ${chatId} created for SOS ${sosRequestId}`)

      return {
        id: chatId,
        ...chatRoom,
        createdAt: new Date(),
      }
    } catch (error) {
      logger.error('Error creating chat room:', error)
      throw new Error('Failed to create chat room')
    }
  }

  async sendMessage(chatId, messageData) {
    try {
      const messageId = `msg_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const message = {
        id: messageId,
        chatId,
        senderId: messageData.senderId,
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        metadata: messageData.metadata || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        isRead: false,
        readBy: [],
      }

      // Save message
      await this.db.collection('chat_messages').doc(messageId).set(message)

      // Update chat room
      await this.db
        .collection('chat_rooms')
        .doc(chatId)
        .update({
          lastMessage: messageData.message,
          lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          messageCount: admin.firestore.FieldValue.increment(1),
        })

      // Send real-time update via Socket.IO
      const io = require('../server').io
      if (io) {
        io.to(`chat_${chatId}`).emit('new_message', {
          ...message,
          timestamp: new Date(),
        })
      }

      // Content moderation check
      if (messageData.messageType === 'text') {
        await this.moderateMessage(messageId, messageData.message)
      }

      return {
        ...message,
        timestamp: new Date(),
      }
    } catch (error) {
      logger.error('Error sending message:', error)
      throw new Error('Failed to send message')
    }
  }

  async getChatMessages(chatId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit

      const snapshot = await this.db
        .collection('chat_messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .get()

      const messages = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
        })
      })

      // Get total count
      const totalSnapshot = await this.db
        .collection('chat_messages')
        .where('chatId', '==', chatId)
        .get()

      return {
        messages: messages.reverse(), // Return in chronological order
        total: totalSnapshot.size,
        hasMore: page * limit < totalSnapshot.size,
      }
    } catch (error) {
      logger.error('Error fetching chat messages:', error)
      throw new Error('Failed to fetch chat messages')
    }
  }

  async getChatRoom(chatId) {
    try {
      const doc = await this.db.collection('chat_rooms').doc(chatId).get()

      if (!doc.exists) {
        return null
      }

      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastMessageTime: data.lastMessageTime?.toDate(),
      }
    } catch (error) {
      logger.error('Error fetching chat room:', error)
      throw new Error('Failed to fetch chat room')
    }
  }

  async markMessagesAsRead(chatId, userId, messageIds) {
    try {
      const batch = this.db.batch()

      for (const messageId of messageIds) {
        const messageRef = this.db.collection('chat_messages').doc(messageId)
        batch.update(messageRef, {
          isRead: true,
          readBy: admin.firestore.FieldValue.arrayUnion(userId),
          readAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      await batch.commit()

      // Send read receipt via Socket.IO
      const io = require('../server').io
      if (io) {
        io.to(`chat_${chatId}`).emit('messages_read', {
          userId,
          messageIds,
          timestamp: new Date(),
        })
      }

      logger.info(
        `📖 ${messageIds.length} messages marked as read by user ${userId}`
      )
    } catch (error) {
      logger.error('Error marking messages as read:', error)
      throw new Error('Failed to mark messages as read')
    }
  }

  async closeChatRoom(chatId, userId, reason) {
    try {
      const chatRoom = await this.getChatRoom(chatId)

      if (!chatRoom) {
        return { success: false, message: 'Chat room not found' }
      }

      if (!chatRoom.isActive) {
        return { success: false, message: 'Chat room is already closed' }
      }

      // Update chat room
      await this.db.collection('chat_rooms').doc(chatId).update({
        isActive: false,
        closedBy: userId,
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        closeReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Send system message
      await this.sendMessage(chatId, {
        senderId: 'system',
        message: 'Chat session has been closed.',
        messageType: 'system',
        timestamp: new Date(),
      })

      // Notify via Socket.IO
      const io = require('../server').io
      if (io) {
        io.to(`chat_${chatId}`).emit('chat_closed', {
          chatId,
          closedBy: userId,
          reason,
          timestamp: new Date(),
        })
      }

      return { success: true, message: 'Chat room closed successfully' }
    } catch (error) {
      logger.error('Error closing chat room:', error)
      throw new Error('Failed to close chat room')
    }
  }

  async getUserActiveChats(userId) {
    try {
      const snapshot = await this.db
        .collection('chat_rooms')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get()

      const chats = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        chats.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          lastMessageTime: data.lastMessageTime?.toDate(),
        })
      })

      return chats
    } catch (error) {
      logger.error('Error fetching active chats:', error)
      throw new Error('Failed to fetch active chats')
    }
  }

  async moderateMessage(messageId, messageText) {
    try {
      // Simple content moderation - in production use proper service
      const inappropriateWords = ['spam', 'scam', 'fake', 'fraud']
      const hasInappropriateContent = inappropriateWords.some((word) =>
        messageText.toLowerCase().includes(word)
      )

      if (hasInappropriateContent) {
        await this.db.collection('moderation_flags').add({
          messageId,
          messageText,
          flagReason: 'inappropriate_content',
          flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending_review',
        })

        logger.warn(`🚨 Message ${messageId} flagged for moderation`)
      }
    } catch (error) {
      logger.error('Error moderating message:', error)
    }
  }
}

module.exports = new ChatService()
