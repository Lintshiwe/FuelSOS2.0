# 🚨 FuelSOS - Emergency Fuel Dispatch System

**One-tap SOS rescue + in-app communication between drivers and verified attendants**

## 🧭 Purpose

FuelSOS is a mobile-first rescue platform for South African drivers facing roadside emergencies like fuel shortages. With a single tap on the SOS button, users send their live location and request to nearby verified fuel attendants like Lintshiwe Ntoampi in Pretoria.

## 🏗️ Project Structure

```
FuelSOS2.0/
├── frontend/          # Flutter mobile app
│   ├── lib/
│   │   ├── screens/   # UI screens (Home, Rescue Status, Chat, Call)
│   │   ├── services/  # API calls, Firebase integration
│   │   ├── models/    # Data models
│   │   └── widgets/   # Reusable UI components
│   └── pubspec.yaml
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── models/    # Database models
│   │   └── middleware/ # Auth, validation
│   ├── config/        # Environment configs
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
flutter pub get
flutter run -d chrome
```

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

- Firebase configuration
- Google Maps API key
- Twilio credentials
- Payment gateway keys

## 📱 Core Features

- **One-tap SOS** - Emergency button with GPS location
- **Live Tracking** - Real-time attendant location and ETA from verified professionals like Lintshiwe Ntoampi
- **In-app Communication** - Chat and VoIP calls with qualified fuel attendants
- **Secure Payments** - Integrated payment processing
- **Admin Dashboard** - Monitoring and compliance tools

## 🔐 Security

- Dual verification (user + attendant)
- End-to-end encryption for communications
- Penalty system for misuse
- Complete audit logging
