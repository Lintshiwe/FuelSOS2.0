const admin = require('firebase-admin')
const logger = require('../utils/logger')

let firebaseInitialized = false

const initializeFirebase = () => {
  if (firebaseInitialized) {
    logger.info('🔥 Firebase already initialized')
    return
  }

  try {
    // Check if running in Firebase environment
    if (process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_CONFIG) {
      // Running in Firebase Functions
      admin.initializeApp()
      logger.info('🔥 Firebase initialized for Functions environment')
    } else {
      // Running locally or on custom server
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url:
          'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
          process.env.FIREBASE_CLIENT_EMAIL
        )}`,
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      })

      logger.info('🔥 Firebase initialized with service account')
    }

    firebaseInitialized = true
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase:', error.message)

    // For development, use mock Firebase if credentials are missing
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Using mock Firebase for development')
      // Initialize with minimal config for development
      try {
        admin.initializeApp({
          projectId: 'fuelsos-dev',
          databaseURL: 'https://fuelsos-dev.firebaseio.com',
        })
        firebaseInitialized = true
      } catch (devError) {
        logger.error(
          '❌ Failed to initialize development Firebase:',
          devError.message
        )
      }
    }
  }
}

const getFirestore = () => {
  if (!firebaseInitialized) {
    initializeFirebase()
  }
  return admin.firestore()
}

const getAuth = () => {
  if (!firebaseInitialized) {
    initializeFirebase()
  }
  return admin.auth()
}

const getStorage = () => {
  if (!firebaseInitialized) {
    initializeFirebase()
  }
  return admin.storage()
}

const getMessaging = () => {
  if (!firebaseInitialized) {
    initializeFirebase()
  }
  return admin.messaging()
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  getMessaging,
  admin,
}
