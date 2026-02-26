# MoniPool Mobile App

MoniPool is a digital Cooperative Savings (Ajo/Esusu) platform built with **React Native** and **Expo**.

## ✅ Project Status: MVP Complete
The Phase 1 MVP is fully implemented, featuring:
- **Secured Core Logic**: "Safe Zone" service pattern prevents exploits.
- **Polished UI**: Consistent Material Design icons and dark mode aesthetics.
- **Complete Flows**: Onboarding, Wallet, Pool Joining, and Chat.
- **Backend Ready**: Data contracts and service layers prepared for API integration.

## 🚀 How to Run the App

### Prerequisites
- Node.js installed.
- **Xcode** installed (for iOS Simulator).

### Quick Start
To start the development server and launch the iOS simulator automatically, run:

```bash
npm run ios
```

### Alternative Method
1. Start the Expo server:
   ```bash
   npx expo start
   ```
2. Once the server starts, press **`i`** on your keyboard to open the iOS simulator.

---

## 🏗 Project Architecture

This app uses a **Service Layer Pattern** ("Safe Zone") to handle business logic securely.

### Key Directories
- **`app/`**: Screens and Navigation (Expo Router).
- **`app/services/`**: The "Safe Zone" for logic.
  - `WalletService.ts`: Manages the internal ledger and balance.
  - `PoolService.ts`: Handles pool assignment and lifecycle.
  - `ReputationService.ts`: Manages user scores and access levels.
- **`app/models/`**: Strict TypeScript definitions (`Pool`, `User`, `Transaction`).

### Core Features
- **Flexible Contributions**: Users can join pools and choose to contribute **Daily**, **Weekly**, or **Monthly**.
- **Auto-Pool Creation**: When a pool fills up (5/5), a new one is automatically created.
- **Internal Ledger**: A secure, double-entry style system for tracking user funds.

## 📚 Documentation
- [Technical Architecture](technical_architecture.md)
- [User Flow & Journey](user_flow.md)
