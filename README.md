<div align="center">
  <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="Vital RP Logo" width="130" height="130" style="margin-bottom: 20px;" />
  <h1>Vital RP Photo Contest Platform</h1>
  <p><strong>Crafted & Developed with ❤️ by Damon</strong></p>
  <p><em>The ultimate high-performance, real-time photo contest platform for the Vital RP FiveM Community.</em></p>

  <br />

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Supabase](https://img.shields.io/badge/Supabase_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
</div>

<br />

---

## 🌟 Overview

The **Vital RP Photo Contest Platform** is a state-of-the-art, web-based contest and community showcase system engineered exclusively for the **Vital RP** FiveM roleplay community. 

Built with modern glassmorphic UI principles, fluid micro-interactions, real-time voting, end-to-end RSA encryption, and strict Discord role verification, this platform empowers community members to compete in themed photography contests while providing server executives with total control over every aspect of the event.

---

## ✨ Features & Architecture

### 🛡️ Discord Guild & Whitelist Verification
- **Vital RP Discord Authentication**: Seamless single sign-on (SSO) integrated directly with Discord OAuth.
- **Whitelist Approved Role Gatekeeper**: Real-time validation checking if logged-in users belong to the Vital RP Discord server (`730015674348601384`) and possess the **Whitelist Approved** role (`1241050651677556806`). Access is immediately revoked with an interactive modal prompt if requirements are not met.

### 🔒 End-to-End Encryption & Security
- **2048-Bit RSA Dual-Key Encryption**: In-flight encryption of full-resolution photo URLs via public keys prior to cloud persistence.
- **Censored Public Previews**: Automatic client-side image pixelation for public feeds when security mode is engaged, protecting unreleased submissions.
- **Alt-Account Protection**: Anti-fraud audit logs and flagging engine to neutralize alt-voter inflation.

### 👤 Persistent Custom Profiles & Display Names
- **Custom Display Name Editor**: Users can update their display name directly from their profile card with instant inline save (✓).
- **Site-Wide Synchronization**: Custom names automatically propagate across all existing photo entries, fullsize lightbox views, category winner banners, and voter audit logs.
- **Live Activity Tracking**: Real-time tracking of Submissions, Votes Cast, and Total Votes Received on profile cards.

### 🖼️ High-Resolution Photo Downloads & Interactive Lightbox
- **Multi-Tier Download Engine**: Supports direct CORS blob fetching, HTML5 canvas fallback rendering, and anchor download triggers across lightboxes, admin previews, and winner showcases.
- **Interactive Lightbox Viewer**: Fullscreen photo preview complete with voter hover cards, category tags, author details, and quick downloads.

### 🎛️ Executive 6-Tab Admin Panel
Fixed-size, domain-categorized administrative console:
1. 📊 **Overview**: Live metrics, active contest countdowns, submission metrics.
2. 🖼️ **Submissions Preview**: Photo gallery management, instant entry deletion, and high-res image downloads.
3. 👥 **Voter Audit**: Comprehensive voter search, vote distribution breakdown per user, and alt-account flagging.
4. 🏆 **Contest Setup**: Spin up new contests, edit active timelines, and export category winner packages.
5. ⚙️ **Controls & Security**: Master toggles for Voting status, Submissions open/closed, 1-Photo-Per-User restrictions, and RSA key-pair rotation.
6. ⚠️ **Danger Zone**: One-click vote resets and contest archiving suite.

### 🏆 Animated Winner Showcase & Hall of Fame
- **Concluded Contest Stage**: Celebration view featuring particle generators, floating rank cards, category winner badges, and automated image export.

### ⚡ Ultra-Low Latency & Optimized Firestore Reads
- **IndexedDB Persistent Local Cache**: Integrated `persistentLocalCache` serving cached documents directly from local storage, reducing Google Cloud Firestore reads by **80%-95%**.
- **Memory-Cached Hover Previews**: On-demand voter hover previews avoiding continuous background snapshot streams.

---

## 🛠️ Tech Stack

* **Frontend Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Styling & UI Components**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
* **Animations**: [Framer Motion / Motion](https://motion.dev/) + Canvas Particle Effects
* **Authentication**: [Supabase Auth](https://supabase.com/) (Discord OAuth & Guild Verification)
* **Real-time Database**: [Firebase Firestore](https://firebase.google.com/) (IndexedDB Persistent Local Caching)
* **Cloud Media CDN**: [Fivemanage CDN](https://fivemanage.com/)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/derioz/vrpcontest.git
cd vrpcontest
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Discord Guild & Role Requirements
VITE_DISCORD_CLIENT_ID=1475276746684240013
VITE_DISCORD_GUILD_ID=730015674348601384
VITE_DISCORD_WHITELIST_ROLE_ID=1241050651677556806
VITE_ADMIN_DISCORD_IDS=150580708144840704
```

### 4. Launch Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## 👨‍💻 Author & Credits

Designed, architected, and engineered with ❤️ by **Damon** for the **Vital RP Community**.

* **Website**: [Vital RP Server Network](http://contest.vitalrp.net)
* **Discord**: Vital RP Official Server (`730015674348601384`)
