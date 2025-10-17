# 🚨 FuelSOS - Quick Setup Guide

## Prerequisites

- Node.js 16+ and npm
- Flutter SDK 3.0+
- Firebase project
- Google Maps API key
- Twilio account (optional for VoIP)

## Backend Setup

1. **Navigate to backend folder**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

Backend will run on http://localhost:3000

## Frontend Setup

1. **Navigate to frontend folder**

   ```bash
   cd frontend
   ```

2. **Install Flutter dependencies**

   ```bash
   flutter pub get
   ```

3. **Configure Firebase**

   - Add your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Update Firebase configuration in the app

4. **Run the app**
   ```bash
   flutter run
   ```

## API Endpoints

### Core SOS Endpoints

- `POST /api/sos/request` - Create SOS request
- `GET /api/sos/:requestId` - Get SOS status
- `PATCH /api/sos/:requestId/status` - Update SOS status
- `POST /api/sos/emergency` - Emergency SOS

### Chat Endpoints

- `POST /api/chat/room` - Create chat room
- `POST /api/chat/:chatId/message` - Send message
- `GET /api/chat/:chatId/messages` - Get messages

### Call Endpoints

- `POST /api/calls/initiate` - Start call
- `PATCH /api/calls/:callId/answer` - Answer call
- `PATCH /api/calls/:callId/end` - End call

## Key Features Implemented

✅ **Core SOS System**

- One-tap emergency button
- GPS location detection
- Attendant assignment
- Real-time status updates

✅ **Communication System**

- In-app chat with Firebase
- VoIP calls with Twilio integration
- Message status tracking
- Call logging

✅ **UI Screens**

- Home screen with SOS button
- Rescue status with live map
- Chat interface
- Call interface

✅ **Backend API**

- Express.js server
- Firebase integration
- Socket.IO for real-time updates
- Comprehensive logging

## Environment Variables

Key variables to configure:

```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_MAPS_API_KEY=your-maps-key
TWILIO_ACCOUNT_SID=your-twilio-sid
JWT_SECRET=your-jwt-secret
```

## Next Steps

1. **Set up Firebase project**

   - Create Firestore database
   - Enable Authentication
   - Configure security rules

2. **Get API keys**

   - Google Maps API key
   - Twilio credentials
   - Payment gateway keys

3. **Deploy and test**
   - Test SOS flow end-to-end
   - Verify real-time updates
   - Test communication features

## Development Notes

- All API keys have placeholders for easy testing
- Mock data is used when external services aren't configured
- Real-time features work via Socket.IO
- Comprehensive logging for debugging

## Architecture

```
Frontend (Flutter)
├── Home Screen (SOS Button)
├── Status Screen (Tracking)
├── Chat Screen
└── Call Screen

Backend (Node.js)
├── SOS Dispatcher
├── Chat Service
├── Call Service
├── Firebase Integration
└── Socket.IO (Real-time)
```

The system is lightweight, focused on core specifications, and ready for development and testing!
