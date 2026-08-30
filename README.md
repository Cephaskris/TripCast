# TripCast 🚗 📢

**In-Transit Digital Out-Of-Home (DOOH) Video Advertising & Telemetry Platform**

TripCast connects ride-hailing and transit fleets in Nigeria with high-impact brand advertising. Vehicle tablets broadcast dynamic video ad loops in traffic, while providing verifiable cryptographic proof-of-play audits and monthly driver compensation.

---

## 🌟 Core Features

- **Expo SDK 54 Edge Tablet Client**:
  - Offline-first SQLite local ad caching and background video downloading.
  - Keep-awake video player loop (`expo-keep-awake`, `expo-av`) with hardware error recovery.
  - Automatic telemetry sync when vehicle enters cellular connectivity corridors.
  - Battery, storage, and connectivity fleet heartbeats.

- **Reactive Cloud Backend (Convex)**:
  - Strongly typed schema across `users`, `campaigns`, `vehicles`, `playbackLogs`, `payouts`, `tickets`, and `rates`.
  - Real-time reactive queries and mutations (`https://dutiful-dotterel-920.convex.cloud`).
  - Express API gateway simulation on port 8080 with dual-layer Convex cloud synchronization.

- **Admin Central Command Console**:
  - **Moderation Queue**: Review, approve, or reject advertiser video creatives.
  - **Revenue & Financials**: Daily, weekly, monthly, and historical ad revenue tracking with 60% gross margin analytics and CSV export.
  - **Driver Settlements**: Configurable driver payout rate (`₦10.00` default), monthly performance hours, and 1-click **Bulk Dispatch All Settlements** via NIBSS clearing.
  - **Customer Service Hub**: Live dispute handling, ticket categorization, and agent assignment.
  - **User Directory Hub**: Multi-role directory with granular metrics for Drivers (hours, plays, earnings), Advertisers (spend, active campaigns), and Support Staff.

- **Advertiser Brand Portal**:
  - Campaign creation and targeting with estimated impression calculator.
  - Paystack simulated payment checkout with transaction references.
  - Cryptographic Proof-of-Play Audit table with 1-click CSV export.

- **Driver Web Cast Portal**:
  - 16:9 interactive video cast player with real-time shift earnings accumulation.
  - Live admin active rate reflection (`₦/play`).
  - Helpdesk dispute submission.

---

## 🛠️ Tech Stack

- **Mobile Client**: React Native, Expo SDK 54, TypeScript, Expo SQLite, Expo AV, NetInfo.
- **Backend & Database**: Convex (`^1.45.0`), Express 5, TypeScript (`ts-node`).
- **Web Dashboards**: Vanilla CSS (Crextio Aesthetic: warm amber/cream canvas, porcelain white cards, charcoal contrast pills).
- **Currency**: Strictly Nigerian Naira (`₦` / NGN). Standard rates: Advertiser `₦25.00/play`, Driver `₦10.00/play` (Admin configurable).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` (or copy `.env.example`):
```ini
EXPO_PUBLIC_CONVEX_URL=https://dutiful-dotterel-920.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://dutiful-dotterel-920.convex.site
CONVEX_URL=https://dutiful-dotterel-920.convex.cloud
PORT=8080
```

### 3. Run Convex Dev
```bash
npx convex dev
```

### 4. Start Local Backend & Web Portals
```bash
npx ts-node backend/server.ts
```
- **Admin Console**: `http://localhost:8080/admin` (admin@tripcast.io / admin123)
- **Advertiser Portal**: `http://localhost:8080/advertiser` (advertiser@brand.com / pass123)
- **Driver Portal**: `http://localhost:8080/driver` (driver@tripcast.io / driver123)

### 5. Launch Expo Tablet App
```bash
npx expo start
```
