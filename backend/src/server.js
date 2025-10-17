const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const logger = require('./utils/logger')
const { initializeFirebase } = require('./config/firebase')

// Route imports
const sosRoutes = require('./routes/sos')
const userRoutes = require('./routes/users')
const attendantRoutes = require('./routes/attendants')
const chatRoutes = require('./routes/chat')
const callRoutes = require('./routes/calls')

// Service imports
const socketService = require('./services/socketService')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
})

// Initialize Firebase
initializeFirebase()

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
)
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use('/api/', limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'FuelSOS Backend API',
  })
})

// API Routes
app.use('/api/sos', sosRoutes)
app.use('/api/users', userRoutes)
app.use('/api/attendants', attendantRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/calls', callRoutes)

// Socket.IO connection handling
socketService.initialize(io)

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack)

  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details,
    })
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong!'
        : err.message,
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.',
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  logger.info(`🚨 FuelSOS Backend Server running on port ${PORT}`)
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`📡 Socket.IO enabled for real-time communication`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

module.exports = app
