const jwt = require('jsonwebtoken')
const logger = require('../utils/logger')

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token required',
      })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = decoded
      next()
    } catch (jwtError) {
      logger.security(`Invalid JWT token attempt: ${jwtError.message}`, {
        token: token.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      })
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    })
  }
}

const authenticateAttendant = async (req, res, next) => {
  try {
    await authenticateUser(req, res, () => {
      if (req.user.type !== 'attendant') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Attendant access required',
        })
      }
      next()
    })
  } catch (error) {
    logger.error('Attendant authentication error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    })
  }
}

const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateUser(req, res, () => {
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required',
        })
      }
      next()
    })
  } catch (error) {
    logger.error('Admin authentication error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    })
  }
}

// Optional authentication - allows both authenticated and guest users
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null // Guest user
      return next()
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = decoded
    } catch (jwtError) {
      req.user = null // Invalid token, treat as guest
    }

    next()
  } catch (error) {
    logger.error('Optional auth middleware error:', error)
    req.user = null
    next()
  }
}

module.exports = {
  authenticateUser,
  authenticateAttendant,
  authenticateAdmin,
  optionalAuth,
}
