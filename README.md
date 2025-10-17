# 🚨 FuelSOS - Emergency Fuel Dispatch System

[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2025-blueviolet)](https://hacktoberfest.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.35.5-02569B?logo=flutter)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-16.x-339933?logo=node.js)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Lintshiwe/FuelSOS2.0/blob/main/.github/CONTRIBUTING.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> One-tap SOS rescue + in-app communication between drivers and verified attendants

## 🎃 Hacktoberfest 2025

This project is participating in **Hacktoberfest 2025**! We welcome contributions from developers worldwide. Check out our [Contributing Guide](.github/CONTRIBUTING.md) to get started!

## 🧭 Purpose

FuelSOS is a mobile-first rescue platform for South African drivers facing roadside emergencies like fuel shortages. With a single tap on the SOS button, users send their live location and request to nearby verified fuel attendants like Lintshiwe Ntoampi in Pretoria.

## 🏗️ Project Structure

```text
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
