<div align="center">
  <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="Vital RP Logo" width="120" height="120" style="margin-bottom: 20px;" />
  <h1>Vital RP Photo Contest</h1>
  <p><strong>Developed by Damon</strong></p>
</div>

<br />

## Overview

The **Vital RP Photo Contest** is a fully-featured, community-driven event platform built specifically for the **Vital RP** FiveM server. This application provides a stunning, premium interface for players to upload their best in-game screenshots, participate in categorized contests, and vote for their favorite submissions.

It is designed with a sleek "Phantom Bar" navigation, breathtaking glassmorphism UI elements, and a dynamic "Hall of Fame" winner announcement section utilizing advanced Framer Motion animations to spotlight the community's talent.

## Key Features

- **Discord Authentication**: Players sign in effortlessly via Discord. The platform links their in-game character name to their Discord account to ensure accountability and reliable contest tracking.
- **Dynamic Contest Scheduling**: Administrators can spin up new contests with specific submission deadlines and voting end dates. The system automatically restricts uploads and votes when deadlines pass.
- **Real-Time Voting System**: A robust, secure voting mechanism allowing community members to cast and retract their votes on photos spanning multiple categories.
- **Admin Management Console**: A protected, in-app dashboard for managing live contests, configuring rules, adding/removing categories, toggling settings (e.g. "1 Photo Per User"), and terminating categories.
- **Hall of Fame Showcase**: As voting concludes, an animated, spectacular winner showcase automatically drops into the homepage featuring floating particles, "liquid-fire" UI cards, and dynamic category winners.
- **Immersive Dark Theme Aesthetics**: Highly polished ambient orbs, grid overlays, glow effects, and a responsive design focused on visual fidelity.

## Tech Stack

This project leverages a blazing fast, modern web development stack:
- **Frontend**: React (via Vite), TypeScript, Tailwind CSS
- **UI & Animations**: `shadcn/ui`, `framer-motion`, `lucide-react`, and bespoke animations inspired by `uitripled`
- **Backend & Database**: Firebase (Authentication & Firestore Database)
- **Image Hosting**: Fivemanage API for fast, reliable image storage and retrieval

## Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure your Firebase credentials are appropriately configured in the `.env.local` file:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
