const winston = require('winston')
const path = require('path')

// Create logs directory if it doesn't exist
const fs = require('fs')
const logDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Define log levels and colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
}

winston.addColors(customLevels.colors)

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: customLevels.levels,
  format: logFormat,
  defaultMeta: { service: 'fuelsos-backend' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write SOS-specific logs
    new winston.transports.File({
      filename: path.join(logDir, 'sos.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => {
          // Only log SOS-related messages
          if (
            info.message &&
            (info.message.includes('SOS') ||
              info.message.includes('🚨') ||
              info.message.includes('Emergency'))
          ) {
            return `${info.timestamp} [${info.level.toUpperCase()}]: ${
              info.message
            }`
          }
          return ''
        })
      ),
    }),
  ],

  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],

  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
})

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({
          format: 'HH:mm:ss',
        }),
        winston.format.printf((info) => {
          return `${info.timestamp} [${info.level}]: ${info.message}`
        })
      ),
    })
  )
}

// Add request logging middleware
logger.stream = {
  write: function (message) {
    logger.http(message.trim())
  },
}

// Emergency logging function
logger.emergency = function (message, meta = {}) {
  logger.error(`🚨 EMERGENCY: ${message}`, {
    ...meta,
    emergency: true,
    timestamp: new Date().toISOString(),
  })

  // In production, this could trigger immediate alerts
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service, SMS alerts, etc.
    console.error(`🚨 EMERGENCY ALERT: ${message}`)
  }
}

// Security logging function
logger.security = function (message, meta = {}) {
  logger.warn(`🔒 SECURITY: ${message}`, {
    ...meta,
    security: true,
    timestamp: new Date().toISOString(),
  })
}

// Audit logging function
logger.audit = function (action, userId, details = {}) {
  logger.info(`📋 AUDIT: ${action}`, {
    userId,
    action,
    details,
    audit: true,
    timestamp: new Date().toISOString(),
  })
}

module.exports = logger
