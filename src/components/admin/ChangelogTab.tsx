import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, History, Plus, Tag, Calendar, User, CheckCircle,
  ShieldCheck, Zap, Wrench, Bug, Trash2, Search,
  Terminal, Layers, ChevronDown, ChevronUp, ChevronsUpDown,
  Clock, Smartphone, Server, Eye, Filter, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { Button, EmptyState, Modal, PageHeader, Panel, SearchField, fieldClass } from './kit';
import { useConfirm } from './confirm';

export type ChangelogLabel = 'UI' | 'FIX' | 'ENHANCE' | 'NEW' | 'PERFORMANCE' | 'MOBILE' | 'ADMIN' | 'SECURITY' | 'BACKEND';

export interface ChangelogItem {
  id?: string;
  dateKey: string;          // e.g. "August 20, 2026"
  timeStr: string;          // e.g. "7:32 PM"
  fullTimestamp?: string;    // e.g. "August 20, 2026 at 7:32 PM"
  labels: ChangelogLabel[];
  title: string;
  bullets: string[];
  author?: string;
  createdAt?: any;
}

export const LABEL_CONFIG: Record<ChangelogLabel, { bg: string; text: string; border: string; label: string }> = {
  NEW: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    label: 'NEW',
  },
  UI: {
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    label: 'UI',
  },
  ENHANCE: {
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    label: 'ENHANCE',
  },
  FIX: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'FIX',
  },
  PERFORMANCE: {
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    text: 'text-yellow-300',
    border: 'border-yellow-500/30',
    label: 'PERFORMANCE',
  },
  MOBILE: {
    bg: 'bg-pink-500/10 hover:bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    label: 'MOBILE',
  },
  ADMIN: {
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
    label: 'ADMIN',
  },
  SECURITY: {
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    label: 'SECURITY',
  },
  BACKEND: {
    bg: 'bg-teal-500/10 hover:bg-teal-500/20',
    text: 'text-teal-300',
    border: 'border-teal-500/30',
    label: 'BACKEND',
  },
};

export const INITIAL_CHANGELOG_ENTRIES: ChangelogItem[] = [
  {
    id: 'entry-20261126-2120',
    dateKey: 'November 26, 2026',
    timeStr: '9:20 PM',
    fullTimestamp: 'November 26, 2026 at 9:20 PM',
    labels: ['NEW', 'ADMIN', 'PERFORMANCE'],
    title: 'Faster contest page and a rebuilt admin console',
    bullets: [
      'The contest page loads faster, shifts around less and has a bigger headline.',
      'Uploading a photo is simpler, with fixes for two problems that could hide or lose your work.',
      'Staff have a new admin console with a side menu, quick search and clearer photo review.',
      'Staff can see voting results, recent votes and approaching deadlines more easily.',
      'The admin screens work better on phones and with a keyboard.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20261016-1925',
    dateKey: 'October 16, 2026',
    timeStr: '7:25 PM',
    fullTimestamp: 'October 16, 2026 at 7:25 PM',
    labels: ['ENHANCE', 'SECURITY', 'ADMIN'],
    title: 'Photo Visibility Safeguards & Complete Alt Blocking Removal',
    bullets: [
      'Guaranteed that disqualified photos remain visible across contest galleries and categories with clear indicator badges instead of being hidden.',
      'Completely removed the alt account blocking system, allowing all community members to vote freely without account restrictions.',
      'Permanently cleared all historical banned accounts and alt flags from the database, restoring full platform access to everyone.',
      'Streamlined Discord authentication so players can log in immediately without role gates or forced logouts.',
      'Re-architected the admin voter audit interface into a clean directory focused exclusively on voting history and submission previews.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20261015-1556',
    dateKey: 'October 15, 2026',
    timeStr: '3:56 PM',
    fullTimestamp: 'October 15, 2026 at 3:56 PM',
    labels: ['NEW', 'ADMIN', 'ENHANCE'],
    title: 'Multi-Contest Management, Instant Pause & Replace, and Deadline Preservation Engine',
    bullets: [
      'Introduced comprehensive multi-contest management allowing staff to pause active contests and deploy temporary replacement contests in under 60 seconds.',
      'Added Saved Contests vault preserving all photo entries, encrypted votes, categories, rules, and frozen countdown timers with zero data loss.',
      'Engineered intelligent deadline preservation so restored contests automatically resume with their exact remaining submission and voting time.',
      'Added real-time visitor alerts notifying online users whenever a contest round is switched or updated without page breaks.',
      'Equipped the admin console with contest creation wizards, interactive player previews, copy-from-previous presets, and an immutable audit trail.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20261005-1903',
    dateKey: 'October 5, 2026',
    timeStr: '7:03 PM',
    fullTimestamp: 'October 5, 2026 at 7:03 PM',
    labels: ['NEW', 'ADMIN', 'UI'],
    title: 'Category Suggestions Monthly Hero & Countdown Customizer',
    bullets: [
      'Added full administrative control to customize the Hero section title, month highlight, theme badge, and guidelines for monthly category suggestion cycles.',
      'Integrated a dedicated countdown clock scheduler for category suggestions with precision timezones, quick duration jumpers, and expiration messages.',
      'Introduced 1-click monthly theme presets (Jan–Dec) that automatically populate seasonal titles, descriptions, and deadlines.',
      'Enabled dual timer management in the Admin Countdown panel so staff can effortlessly configure both Photo Contest voting and Category Suggestion deadlines.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260920-2308',
    dateKey: 'September 20, 2026',
    timeStr: '11:08 PM',
    fullTimestamp: 'September 20, 2026 at 11:08 PM',
    labels: ['SECURITY', 'BACKEND', 'FIX'],
    title: 'Cross-Platform Unified Firestore Rules & Compatibility Sync',
    bullets: [
      'Synchronized Cloud Firestore security rules between Vital RP and the Photo Contest to ensure seamless interoperability.',
      'Protected shared collections including user profiles, site configuration, and contest voting pipelines across both platforms.',
      'Eliminated permission conflicts so administrative changes and contest submissions remain fully accessible without database lockouts.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260920-1635',
    dateKey: 'September 20, 2026',
    timeStr: '4:35 PM',
    fullTimestamp: 'September 20, 2026 at 4:35 PM',
    labels: ['FIX', 'ADMIN', 'BACKEND'],
    title: 'Category Suggestion Mode Toggle & Firestore Access Restoration',
    bullets: [
      'Resolved permission issues preventing administrators from disabling Category Suggestion Mode.',
      'Deployed unified Cloud Firestore security rules restoring settings and contest database access.',
      'Reinforced admin settings controls with resilient merge writes and local storage state persistence.',
      'Defaulted homepage mode to the active October Photo Contest with streamlined fallback resolution.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260914-1824',
    dateKey: 'September 14, 2026',
    timeStr: '6:24 PM',
    fullTimestamp: 'September 14, 2026 at 6:24 PM',
    labels: ['NEW', 'ADMIN', 'UI'],
    title: 'Admin Custom Countdown Scheduler, Category Fixes & Minimal Carousel',
    bullets: [
      'Added a full-featured Countdown Timer manager in the Admin Console with custom date and time scheduling, timezone selections, and instant duration presets.',
      'Integrated a live interactive mechanical flip clock preview directly in admin controls for immediate testing before publishing.',
      'Replaced generic stock photos in the empty carousel with a sleek, minimal dark photography viewfinder placeholder.',
      'Resolved category deletion failures and prevented accidental duplicate categories in contest setup.',
      'Enabled real-time synchronization between custom countdown timers and public visitor screens without page refreshes.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260907-1240',
    dateKey: 'September 7, 2026',
    timeStr: '12:40 PM',
    fullTimestamp: 'September 7, 2026 at 12:40 PM',
    labels: ['UI', 'FIX', 'ENHANCE'],
    title: 'Category Suggestion Auto-Scroll, Skeleton Loading & Viewport Styling',
    bullets: [
      'Added smooth auto-scrolling with a temporary amber glow highlight when creating a new category suggestion, scrolling you directly to your ranked card.',
      'Introduced tailored skeleton loaders across cards, stats counters, user allowances, voter lists, and user avatars to eliminate layout shift and fake zeroes.',
      'Standardized universal dark viewport styling across all pages, completely eliminating light background gaps beneath footers during empty searches.',
      'Refined voter list previews with instant skeleton feedback and resilient request animation frame alignment respecting reduced motion preferences.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260906-2255',
    dateKey: 'September 6, 2026',
    timeStr: '10:55 PM',
    fullTimestamp: 'September 6, 2026 at 10:55 PM',
    labels: ['UI', 'ENHANCE', 'NEW'],
    title: 'October Loading Screen Category Phase & Schedule Alignment',
    bullets: [
      'Tailored the Category Suggestion hub to focus on themes for October’s Vital RP loading screen, encouraging seasonal, spooky, and fall-inspired concepts.',
      'Optimized the voter preview dropdown with synchronous inlined sample extraction, ensuring upvoters and downvoters populate instantly on the first click.',
      'Upgraded the scroll-to-top action into a true viewport-floating glassmorphic button with dual window and container scroll detection.',
      'Configured the official Category Suggestion submission and voting window to start immediately and conclude Saturday, September 12 at Midnight EST.',
      'Expanded the hub to an expansive 16:9 widescreen layout with public voter previews and live profile resolution.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260906-2115',
    dateKey: 'September 6, 2026',
    timeStr: '9:15 PM',
    fullTimestamp: 'September 6, 2026 at 9:15 PM',
    labels: ['SECURITY', 'BACKEND', 'ADMIN'],
    title: 'Firestore Security Hardening & Cloud Changelog Sync',
    bullets: [
      'Hardened Cloud Firestore Security Rules with a strict deny-by-default architecture protecting site settings, secret keys, admin privileges, and user profile integrity.',
      'Synchronized all platform changelog history to Cloud Firestore and added a 1-click cloud sync tool for authorized administrators.',
      'Re-architected the community moderation menu with top-level portal overlays, ensuring dropdowns float above all cards with zero clipping or stacking context bleed.',
      'Equipped dropdown menus with responsive viewport collision detection, automatically flipping menus above cards when near screen boundaries.',
      'Preserved 100% backward compatibility for photo contest submissions, community voting, winner podiums, and historical galleries.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260831-1150',
    dateKey: 'August 31, 2026',
    timeStr: '11:55 AM',
    fullTimestamp: 'August 31, 2026 at 11:55 AM',
    labels: ['UI', 'ENHANCE', 'NEW'],
    title: 'Equal Co-Champions Celebration Podium & Photo Lightbox',
    bullets: [
      'Engineered an award-show celebration stage honoring all 5 category winners equally as prestigious co-champions with uniform pedestals.',
      'Implemented full-screen interactive click-to-enlarge lightbox modal with left/right navigation and keyboard shortcuts.',
      'Added an interactive multi-colored confetti celebration cannon button with particle physics and streamers.',
      'Introduced a dual-mode stage switcher allowing users to toggle between the Celebration Stage and Category Grid.',
      'Enhanced category champion cards with DiceBear avatar integration, community vote tickers, and 4K photo downloads.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260830-2225',
    dateKey: 'August 30, 2026',
    timeStr: '10:25 PM',
    fullTimestamp: 'August 30, 2026 at 10:25 PM',
    labels: ['UI', 'ADMIN', 'ENHANCE'],
    title: 'Dedicated Admin Menu Item for Category Suggestions & Whitelist',
    bullets: [
      'Promoted Category Suggestions to its own dedicated top-level menu item in the Admin Console navigation bar.',
      'Extracted suggestions out of the Contest dropdown so admins can access proposals, quorum votes, and the beta whitelist in a single direct click.',
      'Synchronized navigation labels across desktop floating docks, mobile sliding bars, and breadcrumb trails.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260830-2200',
    dateKey: 'August 30, 2026',
    timeStr: '10:00 PM',
    fullTimestamp: 'August 30, 2026 at 10:00 PM',
    labels: ['FIX', 'ADMIN', 'SECURITY'],
    title: 'Beta Tester Authorization Sanitization & Scope Clarification',
    bullets: [
      'Resolved Firestore document write validation error when authorizing beta testers without a custom name or notes.',
      'Configured database ignoreUndefinedProperties safety guard to protect against uninitialized field serialization.',
      'Clarified beta tester permission boundaries across the management modal confirming access applies strictly to category suggestions and never grants admin dashboard access.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260830-1830',
    dateKey: 'August 30, 2026',
    timeStr: '6:32 PM',
    fullTimestamp: 'August 30, 2026 at 6:32 PM',
    labels: ['ADMIN', 'SECURITY', 'NEW', 'UI'],
    title: 'Suggestion Categories Beta Whitelist & Discord ID Access Controls',
    bullets: [
      'Added Beta Tester Whitelist Management in the Admin Panel to authorize community members by numeric Discord ID with instant access granting and revocation.',
      'Prominently badged the Suggestion Categories feature as BETA across navigation bars, mobile drawers, hero banners, and full-screen view headers.',
      'Granted authorized beta testers full ability to propose concepts, vote, and participate ahead of the public rollout while preserving admin moderation boundaries.',
      'Hardened in-flight concurrency deduplication and real-time rank stability transitions with zero UI jumping or database flooding.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260828-1710',
    dateKey: 'August 28, 2026',
    timeStr: '5:10 PM',
    fullTimestamp: 'August 28, 2026 at 5:10 PM',
    labels: ['UI', 'ENHANCE'],
    title: 'Dynamic Voting Phase Mechanical Countdown Clock',
    bullets: [
      'Updated the mechanical split-flap countdown clock to seamlessly transition from the submissions deadline to the community voting deadline.',
      'Locked active voting countdown to Sunday, August 30, 2026 at 11:59 PM EST with synchronized multi-timezone support.',
      'Added dynamic event dates and phase-specific completion messaging for voting and submission phases.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260828-1605',
    dateKey: 'August 28, 2026',
    timeStr: '4:05 PM',
    fullTimestamp: 'August 28, 2026 at 4:05 PM',
    labels: ['UI', 'ENHANCE', 'FIX'],
    title: 'Photo Resubmission & Entry Management for 1-Photo Contests',
    bullets: [
      'Restored the ability to replace contest submissions when the 1-photo-per-user limit is active, allowing participants to view their current entry and remove it to upload a new one.',
      'Added dedicated "Manage Your Entry" actions across the contest sidebar and hero banners so participants can directly access and manage their existing submissions.',
      'Updated the upload modal to instantly transition into the fresh submission form upon deleting an entry without requiring page reloads.',
      'Fixed an issue where previous contest participation could erroneously prevent users from submitting photos in new contests.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260825-0019',
    dateKey: 'August 25, 2026',
    timeStr: '12:44 AM',
    fullTimestamp: 'August 25, 2026 at 12:44 AM',
    labels: ['UI', 'ENHANCE', 'SECURITY'],
    title: 'Consistent Profile Avatars, Cleaner Countdown & Secure Updates',
    bullets: [
      'Unified the countdown cards around the contest orange accent for a calmer, more cohesive presentation.',
      'Removed the constantly pulsing separators while preserving subtle hover feedback and the signature flip animation.',
      'Restricted changelog publishing to authenticated contest administrators while keeping updates visible to everyone.',
      'Made Discord profile photos the default everywhere, including contest galleries and admin voter tools.',
      'Ensured a selected DiceBear avatar follows the user across submissions, suggestions, archives, and future visits.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260822-1701',
    dateKey: 'August 22, 2026',
    timeStr: '5:01 PM',
    fullTimestamp: 'August 22, 2026 at 5:01 PM',
    labels: ['UI', 'ENHANCE'],
    title: 'Seamless Transparent Flip Clock & Layout Integration',
    bullets: [
      'Removed outer card container and background box to seamlessly blend the countdown clock directly into the page layout.',
      'Maintained individual mechanical split-flap 3D folding animations, seams, and subtle card surfaces.',
      'Streamlined event date typography stack and integrated pulse status indicator.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260822-1420',
    dateKey: 'August 22, 2026',
    timeStr: '2:20 PM',
    fullTimestamp: 'August 22, 2026 at 2:20 PM',
    labels: ['NEW', 'UI', 'PERFORMANCE'],
    title: 'Centerpiece Mechanical Split-Flap Countdown Clock & Time Warp Cascade',
    bullets: [
      'Engineered a retro split-flap mechanical countdown clock with realistic 3D top and bottom folding physics.',
      'Locked countdown to Friday, August 28, 2026 at 5:59 PM EDT with drift-free wall-clock synchronization across all timezones.',
      'Added interactive cursor tracking with dynamic 3D tilt and specular lighting across the clock frame.',
      'Created a hidden "Time Warp" easter egg with rapid airport split-flap cascade animations.',
      'Built a seamless completion sequence that transitions into official judging when the timer hits zero.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260820-2105',
    dateKey: 'August 20, 2026',
    timeStr: '9:05 PM',
    fullTimestamp: 'August 20, 2026 at 9:05 PM',
    labels: ['PERFORMANCE', 'UI', 'ENHANCE'],
    title: 'Site-Wide Performance & UX Optimization Pass',
    bullets: [
      'Extracted memoized PhotoCard with skeleton shimmer loaders, asynchronous decoding, and aspect ratio reservation to eliminate layout shift.',
      'Optimized shader canvas background with tab visibility pausing and reduced motion support, slashing idle CPU/GPU usage.',
      'Precomputed category submission counts and cached decrypted photo assets for instant, stutter-free interactions.',
      'Added smooth hover-based submenu navigation for desktop Admin panel with intentional first-hover delay and instant category switching.',
      'Optimized Admin voter directory search with memoized data aggregation for instant search filtering without input lag.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260819-2036',
    dateKey: 'August 19, 2026',
    timeStr: '8:36 PM',
    fullTimestamp: 'August 19, 2026 at 8:36 PM',
    labels: ['ADMIN', 'UI', 'SECURITY'],
    title: 'Full-Page Admin Dashboard & Profile Drawer Upgrades',
    bullets: [
      'Migrated the Admin Console to a dedicated full-page dashboard with a collapsible sidebar and route security.',
      'Upgraded the profile drawer with smooth spring animations and reliable Discord avatar syncing.',
      'Enhanced category navigation with 3D flip card interactions and active category glows.',
      'Added direct URL routing and refresh support for all admin pages.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260818-2232',
    dateKey: 'August 18, 2026',
    timeStr: '10:32 PM',
    fullTimestamp: 'August 18, 2026 at 10:32 PM',
    labels: ['FIX', 'PERFORMANCE'],
    title: 'Real-Time Submission Counts Synchronization',
    bullets: [
      'Fixed photo entry counters to instantly sync total submissions across all category tabs and stat counters on initial page load.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260818-2057',
    dateKey: 'August 18, 2026',
    timeStr: '8:57 PM',
    fullTimestamp: 'August 18, 2026 at 8:57 PM',
    labels: ['UI', 'MOBILE', 'ENHANCE'],
    title: 'All-Visible Category Grid & Social Link Previews',
    bullets: [
      'Replaced horizontal category scrolling with an all-visible responsive grid showing all categories at once.',
      'Added rich social media preview cards when sharing contest links on Discord, Twitter/X, and messaging apps.',
      'Improved category header transitions so selecting any category smoothly scrolls it into view.',
      'Centered all dialogs and modals on screen to eliminate clipping on mobile devices.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260816-2201',
    dateKey: 'August 16, 2026',
    timeStr: '10:01 PM',
    fullTimestamp: 'August 16, 2026 at 10:01 PM',
    labels: ['UI', 'MOBILE', 'NEW'],
    title: 'Mobile Navigation Bottom Sheet & Submission Countdown Clock',
    bullets: [
      'Redesigned mobile navigation as a convenient bottom sheet with quick action shortcuts and swipeable category pills.',
      'Added an animated countdown clock showing exact time remaining until submissions close.',
      'Overhauled the Hall of Fame sidebar with luxury vault archives and clear contest edition titles.',
      'Redesigned contest rules into interactive quick-rule cards with an expandable guide.',
      'Added smooth skeleton loading screens across the entire site.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260816-1906',
    dateKey: 'August 16, 2026',
    timeStr: '7:06 PM',
    fullTimestamp: 'August 16, 2026 at 7:06 PM',
    labels: ['UI', 'ENHANCE'],
    title: 'Hero Typography Polish & Multi-Tier Victory Badges',
    bullets: [
      'Redesigned the homepage hero with live status pills, glowing borders, and gold sparkles typography.',
      'Upgraded community victory badges with custom metallic heraldry icons for Gold, Platinum, Grand Champion, and Mythic Legend tiers.',
      'Redesigned the user profile dropdown menu with live online indicators and Discord status.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260815-2249',
    dateKey: 'August 15, 2026',
    timeStr: '10:49 PM',
    fullTimestamp: 'August 15, 2026 at 10:49 PM',
    labels: ['UI', 'SECURITY', 'ENHANCE'],
    title: 'Radio Voting Buttons, Sidebar Overhaul & Voter Security',
    bullets: [
      'Redesigned voting buttons into responsive radio buttons with instant 1-click feedback.',
      'Built persistent voter fraud auditing and alt account protection with atomic transaction safety.',
      'Redesigned the contest information sidebar with a visual stage timeline and live community stats.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260815-1606',
    dateKey: 'August 15, 2026',
    timeStr: '4:06 PM',
    fullTimestamp: 'August 15, 2026 at 4:06 PM',
    labels: ['ADMIN', 'ENHANCE'],
    title: 'Staff Suggestion Decision Sync',
    bullets: [
      'Added on-demand vote synchronization with an animated refresh button for real-time staff decisions on category proposals.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260814-2310',
    dateKey: 'August 14, 2026',
    timeStr: '11:10 PM',
    fullTimestamp: 'August 14, 2026 at 11:10 PM',
    labels: ['NEW', 'ADMIN', 'ENHANCE'],
    title: 'Community Category Suggestions & Upvoting System',
    bullets: [
      'Launched community category suggestions with Reddit-style voting and Discord profile attribution.',
      'Built an admin category workflow pipeline with automated 2/3 staff consensus quorum.',
      'Added live rank sorting, search, and deep-link sharing for submitted category ideas.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260814-1701',
    dateKey: 'August 14, 2026',
    timeStr: '5:01 PM',
    fullTimestamp: 'August 14, 2026 at 5:01 PM',
    labels: ['UI', 'SECURITY'],
    title: 'Live Rules Markdown Preview & Image Censoring Controls',
    bullets: [
      'Upgraded contest rules editing with live Markdown preview in the admin console.',
      'Enhanced public image censoring to keep submissions pixelated until voting officially begins.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260813-2100',
    dateKey: 'August 13, 2026',
    timeStr: '9:00 PM',
    fullTimestamp: 'August 13, 2026 at 9:00 PM',
    labels: ['ADMIN', 'NEW'],
    title: 'Contest Lockdown Mode & Admin Console Redesign',
    bullets: [
      'Added a full-site maintenance lockdown mode with admin bypass controls.',
      'Overhauled the Admin Console with unified headers, collapsible contest editors, and integrated analytics.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260812-2208',
    dateKey: 'August 12, 2026',
    timeStr: '10:08 PM',
    fullTimestamp: 'August 12, 2026 at 10:08 PM',
    labels: ['UI', 'ENHANCE'],
    title: 'Dedicated Hall of Fame Button & Custom Handle Editor',
    bullets: [
      'Added a dedicated Hall of Fame navigation button with persistent view state across page refreshes.',
      'Created an interactive modal for photographers to customize their display names.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260811-2216',
    dateKey: 'August 11, 2026',
    timeStr: '10:16 PM',
    fullTimestamp: 'August 11, 2026 at 10:16 PM',
    labels: ['NEW', 'UI', 'ENHANCE'],
    title: 'Multi-Tier Champion Badges, Portfolios & Sticky Category Bar',
    bullets: [
      'Introduced Multi-Tier Champion Badges (Gold, Platinum, Legendary) tracking cumulative wins.',
      'Added photographer portfolio views, winner victory filters, and enhanced photo share links.',
      'Built a smooth slide-down sticky category bar that docks beneath the navbar during scrolling.',
      'Enforced a 1-photo-per-user limit with existing submission preview and 1-click replacement.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260810-2151',
    dateKey: 'August 10, 2026',
    timeStr: '9:51 PM',
    fullTimestamp: 'August 10, 2026 at 9:51 PM',
    labels: ['NEW', 'UI'],
    title: 'DiceBear Avatar System & Fallback Engine',
    bullets: [
      'Added rich DiceBear avatar generation with instant fallbacks when Discord profile pictures are unavailable.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260809-2021',
    dateKey: 'August 9, 2026',
    timeStr: '8:21 PM',
    fullTimestamp: 'August 9, 2026 at 8:21 PM',
    labels: ['UI', 'ADMIN'],
    title: '5 Co-Champion Winners Stage & Contest Setup Presets',
    bullets: [
      'Redesigned the winner announcement stage to celebrate 5 equal round co-champions.',
      'Upgraded contest setup with preset templates, countdown calculators, and markdown previews.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260808-1855',
    dateKey: 'August 8, 2026',
    timeStr: '6:55 PM',
    fullTimestamp: 'August 8, 2026 at 6:55 PM',
    labels: ['UI', 'NEW', 'PERFORMANCE'],
    title: 'Cinematic Lightbox, Spotlight Hero & Space Grotesk Typography',
    bullets: [
      'Built a cinematic photo Lightbox viewer with ambient backlighting and keyboard shortcuts.',
      'Redesigned the homepage hero with interactive Spotlight beams and flip-word taglines.',
      'Upgraded site-wide typography to Space Grotesk and Outfit fonts.',
      'Added the platform Changelog system and Discord Bug Report modal.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260804-1928',
    dateKey: 'August 4, 2026',
    timeStr: '7:28 PM',
    fullTimestamp: 'August 4, 2026 at 7:28 PM',
    labels: ['SECURITY', 'PERFORMANCE'],
    title: 'Discord Server Role Verification & Firestore Caching',
    bullets: [
      'Enforced automatic Vital RP Discord membership and Whitelisted role verification upon login.',
      'Enabled persistent local caching to drastically reduce database reads and boost load times.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260803-1907',
    dateKey: 'August 3, 2026',
    timeStr: '7:07 PM',
    fullTimestamp: 'August 3, 2026 at 7:07 PM',
    labels: ['NEW', 'ADMIN', 'SECURITY'],
    title: 'Interactive Voters Modal & Voter Audit Directory',
    bullets: [
      'Added an interactive Voters modal to view and search all community voters on any photo.',
      'Built an Admin Voter Search directory with entry inspection, alt account flagging, and photo moderation.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260803-1220',
    dateKey: 'August 3, 2026',
    timeStr: '12:20 PM',
    fullTimestamp: 'August 3, 2026 at 12:20 PM',
    labels: ['SECURITY', 'ENHANCE'],
    title: 'Discord Authentication Requirement for Voting',
    bullets: [
      'Required Discord authentication for casting votes to prevent abuse and ensure fair community voting.',
      'Added vote reset tools in the Admin Danger Zone and improved hover vote badges.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260801-1806',
    dateKey: 'August 1, 2026',
    timeStr: '6:06 PM',
    fullTimestamp: 'August 1, 2026 at 6:06 PM',
    labels: ['ENHANCE'],
    title: 'Public Contest Browsing Fallbacks',
    bullets: [
      'Allowed unauthenticated viewers to browse contest submissions and categories seamlessly.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260729-2114',
    dateKey: 'July 29, 2026',
    timeStr: '9:14 PM',
    fullTimestamp: 'July 29, 2026 at 9:14 PM',
    labels: ['NEW'],
    title: 'Passwordless Email Authentication',
    bullets: [
      'Added email magic link passwordless sign-in option.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260718-2054',
    dateKey: 'July 18, 2026',
    timeStr: '8:54 PM',
    fullTimestamp: 'July 18, 2026 at 8:54 PM',
    labels: ['UI', 'ENHANCE'],
    title: 'Visual Components Suite Upgrades',
    bullets: [
      'Enhanced landing visual components with border beams and ambient glow effects.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260716-1657',
    dateKey: 'July 16, 2026',
    timeStr: '4:57 PM',
    fullTimestamp: 'July 16, 2026 at 4:57 PM',
    labels: ['ADMIN', 'UI'],
    title: 'Admin Panel Controls Modernization',
    bullets: [
      'Modernized admin panel switches, settings controls, and layout cards.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260707-1157',
    dateKey: 'July 7, 2026',
    timeStr: '11:57 AM',
    fullTimestamp: 'July 7, 2026 at 11:57 AM',
    labels: ['UI', 'MOBILE', 'ENHANCE'],
    title: 'Compact Sticky Categories & Squircle Design Language',
    bullets: [
      'Introduced responsive category grids on desktop and centered category dropdown on mobile.',
      'Applied rounded squircle design tokens and clean typography site-wide.',
      'Fixed mobile category modal clipping and header stacking contexts.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260409-1647',
    dateKey: 'April 9, 2026',
    timeStr: '4:47 PM',
    fullTimestamp: 'April 9, 2026 at 4:47 PM',
    labels: ['ENHANCE', 'NEW'],
    title: 'Winner Photo Downloads & Confetti Easter Egg',
    bullets: [
      'Added high-resolution winner photo download actions to admin settings.',
      'Added an interactive confetti party mode easter egg when clicking the logo orb.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260404-1959',
    dateKey: 'April 4, 2026',
    timeStr: '7:59 PM',
    fullTimestamp: 'April 4, 2026 at 7:59 PM',
    labels: ['ADMIN', 'SECURITY'],
    title: 'Admin Submissions Decryption Preview & Test Contest Manager',
    bullets: [
      'Added an admin-only submissions preview tool to inspect decrypted original photos before voting.',
      'Added contest cleanup tools in the Admin Danger Zone to manage test contests.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260304-1733',
    dateKey: 'March 4, 2026',
    timeStr: '5:33 PM',
    fullTimestamp: 'March 4, 2026 at 5:33 PM',
    labels: ['UI', 'SECURITY'],
    title: 'Signal Bar Navbar & Photo Delete Ownership',
    bullets: [
      'Redesigned the navigation bar with scroll-shrink physics, telemetry strip, and live status badge.',
      'Enforced photo delete permissions so only the original uploader or admins can remove an entry.',
      'Added a playful security modal for unauthorized permission attempts.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260302-2049',
    dateKey: 'March 2, 2026',
    timeStr: '8:49 PM',
    fullTimestamp: 'March 2, 2026 at 8:49 PM',
    labels: ['ADMIN', 'FIX'],
    title: 'Contest Archive Engine & Emoji Picker Stacking Fix',
    bullets: [
      'Fixed contest archiving with automated winner recording and previous winners preservation.',
      'Resolved stacking conflicts so emoji pickers always display cleanly above all dialogs.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260302-1431',
    dateKey: 'March 2, 2026',
    timeStr: '2:31 PM',
    fullTimestamp: 'March 2, 2026 at 2:31 PM',
    labels: ['SECURITY', 'NEW'],
    title: 'Image Encryption & Hall of Fame Architecture',
    bullets: [
      'Built image encryption and pixelation to keep entries hidden until voting starts.',
      'Added submitter anonymity during the submission phase to eliminate voting bias.',
      'Created the initial Hall of Fame winner archive view.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260228-2140',
    dateKey: 'February 28, 2026',
    timeStr: '9:40 PM',
    fullTimestamp: 'February 28, 2026 at 9:40 PM',
    labels: ['FIX'],
    title: 'Gradient Text Rendering Fix',
    bullets: [
      'Fixed text rendering issues with gradient clipping on certain web browsers.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260228-1830',
    dateKey: 'February 28, 2026',
    timeStr: '6:30 PM',
    fullTimestamp: 'February 28, 2026 at 6:30 PM',
    labels: ['ADMIN', 'UI', 'NEW'],
    title: 'Contest Scheduling, Analytics Dashboard & 1080p Lightbox',
    bullets: [
      'Built automated contest scheduling and live winner announcement banners.',
      'Added the Admin Analytics Dashboard with live charts and vote distribution telemetry.',
      'Enforced strict 1920x1080 landscape resolution validation for photo submissions.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260227-2103',
    dateKey: 'February 27, 2026',
    timeStr: '9:03 PM',
    fullTimestamp: 'February 27, 2026 at 9:03 PM',
    labels: ['ADMIN', 'ENHANCE'],
    title: 'Toggleable 1-Photo-Per-User Setting',
    bullets: [
      'Added an admin toggle to restrict users to a single photo entry per contest round.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260227-1955',
    dateKey: 'February 27, 2026',
    timeStr: '7:55 PM',
    fullTimestamp: 'February 27, 2026 at 7:55 PM',
    labels: ['UI', 'MOBILE', 'ENHANCE'],
    title: 'Liquid Fill Vote Button, Particle Burst & Mobile Polish',
    bullets: [
      'Upgraded vote buttons with animated rolling counters, liquid fill animations, and particle bursts.',
      'Added voter hover preview popups showing total category share.',
      'Completed a full mobile responsiveness pass across all modals and submission grids.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260224-1839',
    dateKey: 'February 24, 2026',
    timeStr: '6:39 PM',
    fullTimestamp: 'February 24, 2026 at 6:39 PM',
    labels: ['UI', 'NEW', 'ENHANCE'],
    title: 'Cinematic Landing Page, Sliding Category Tabs & Command Bar',
    bullets: [
      'Rebuilt the homepage into an immersive contest landing page with 2-column hero and live photo mosaic.',
      'Upgraded category tabs with spring-animated sliding indicators, live entry counts, and progress bars.',
      'Added the official Vital RP footer with "Website Created and Designed by Damon" credit.',
      'Upgraded the top command bar navbar with floating glassmorphism styling.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260224-1314',
    dateKey: 'February 24, 2026',
    timeStr: '1:14 PM',
    fullTimestamp: 'February 24, 2026 at 1:14 PM',
    labels: ['NEW', 'ADMIN', 'UI'],
    title: 'Fivemanage Photo Storage, Markdown Toolbar & 2-Column Admin Modal',
    bullets: [
      'Migrated photo storage to Fivemanage API for ultra-fast CDN delivery.',
      'Enhanced the contest rules editor with rich markdown toolbars, text formatting, and emoji selectors.',
      'Rebuilt the Admin Settings modal into a 2-column wide layout with custom themed scrollbars.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260223-1908',
    dateKey: 'February 23, 2026',
    timeStr: '7:08 PM',
    fullTimestamp: 'February 23, 2026 at 7:08 PM',
    labels: ['BACKEND', 'SECURITY', 'NEW'],
    title: 'Firebase & Vercel Architecture with Discord OAuth',
    bullets: [
      'Migrated database and hosting to Firebase Firestore and Vercel.',
      'Implemented Discord OAuth2 authentication with multi-strategy admin role authorization.',
    ],
    author: 'Damon',
  },
  {
    id: 'entry-20260223-0938',
    dateKey: 'February 23, 2026',
    timeStr: '9:38 AM',
    fullTimestamp: 'February 23, 2026 at 9:38 AM',
    labels: ['NEW'],
    title: 'Vital RP Photo Contest Platform Inception',
    bullets: [
      'Initial release and public launch of the Vital RP Photo Contest community platform.',
    ],
    author: 'Damon',
  },
];

export function ChangelogTab() {
  const [entries, setEntries] = useState<ChangelogItem[]>(INITIAL_CHANGELOG_ENTRIES);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  // Release dates drawn at once; the full history is long
  const [visibleDates, setVisibleDates] = useState(10);
  const confirm = useConfirm();

  // Form State for Admin New Entry Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLabels, setNewLabels] = useState<ChangelogLabel[]>(['NEW', 'UI']);
  const [newBulletsText, setNewBulletsText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Changelogs from Firestore (and merge with local seed data)
  useEffect(() => {
    const fetchChangelogs = async () => {
      try {
        const q = query(collection(db, 'changelogs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const dbEntries: ChangelogItem[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Support both new structured format and legacy format
          const bullets = Array.isArray(data.bullets)
            ? data.bullets
            : (data.description || '')
                .split('\n')
                .map((l: string) => l.replace(/^•\s*/, '').trim())
                .filter(Boolean);

          const labels = Array.isArray(data.labels)
            ? data.labels
            : [data.category === 'UI/UX' ? 'UI' : data.category === 'Feature' ? 'NEW' : data.category === 'Fix' ? 'FIX' : 'ENHANCE'];

          dbEntries.push({
            id: docSnap.id,
            dateKey: data.dateKey || data.date || 'Recent Updates',
            timeStr: data.timeStr || '',
            fullTimestamp: data.fullTimestamp || data.date || '',
            labels: labels as ChangelogLabel[],
            title: data.title || 'Platform Update',
            bullets: bullets.length > 0 ? bullets : ['Platform improvement and maintenance updates.'],
            author: data.author || 'Damon',
            createdAt: data.createdAt,
          });
        });

        // Merge without duplicating IDs
        const existingIds = new Set<string>();
        const merged: ChangelogItem[] = [];

        [...dbEntries, ...INITIAL_CHANGELOG_ENTRIES].forEach((entry) => {
          const key = entry.id || `${entry.dateKey}-${entry.timeStr}-${entry.title}`;
          if (!existingIds.has(key)) {
            existingIds.add(key);
            merged.push(entry);
          }
        });

        setEntries(merged);
      } catch (err) {
        console.error('Error fetching changelogs from Firestore:', err);
      }
    };

    fetchChangelogs();
  }, []);

  const handleToggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    // Individual rows record exceptions to this setting, so clearing them applies it to all
    setIsAllExpanded((open) => !open);
    setExpandedEntries(new Set());
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBulletsText.trim()) {
      toast.error('Please fill in title and updates.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const dateKey = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const fullTimestamp = `${dateKey} at ${timeStr}`;

    const bullets = newBulletsText
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);

    const newEntry: ChangelogItem = {
      dateKey,
      timeStr,
      fullTimestamp,
      labels: newLabels.length > 0 ? newLabels : ['NEW'],
      title: newTitle.trim(),
      bullets: bullets.length > 0 ? bullets : [newTitle.trim()],
      author: 'Damon',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'changelogs'), newEntry);
      setEntries((prev) => [{ ...newEntry, id: docRef.id }, ...prev]);
      toast.success('Changelog entry published!');
      setShowAddModal(false);
      setNewTitle('');
      setNewBulletsText('');
      setNewLabels(['NEW', 'UI']);
    } catch (err) {
      console.error('Failed to save changelog to Firestore:', err);
      // Fallback add locally
      setEntries((prev) => [{ ...newEntry, id: `local-${Date.now()}` }, ...prev]);
      toast.success('Changelog entry added locally!');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this update?',
      body: 'It is removed from the changelog.',
      confirmLabel: 'Delete update',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      if (!id.startsWith('entry-') && !id.startsWith('local-')) {
        await deleteDoc(doc(db, 'changelogs', id));
      }
      setEntries((prev) => prev.filter((item) => item.id !== id));
      toast.success('Entry removed');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((entry) => {
      const matchesLabel =
        selectedLabelFilter === 'All' ||
        entry.labels.some((l) => l.toUpperCase() === selectedLabelFilter.toUpperCase());

      const matchesSearch =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.dateKey.toLowerCase().includes(q) ||
        entry.timeStr.toLowerCase().includes(q) ||
        entry.labels.some((l) => l.toLowerCase().includes(q)) ||
        entry.bullets.some((b) => b.toLowerCase().includes(q));

      return matchesLabel && matchesSearch;
    });
  }, [entries, selectedLabelFilter, searchQuery]);

  // Group filtered entries by dateKey (preserving chronological order)
  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; items: ChangelogItem[] }[] = [];
    const map = new Map<string, ChangelogItem[]>();

    for (const entry of filteredEntries) {
      const key = entry.dateKey;
      if (!map.has(key)) {
        const list: ChangelogItem[] = [];
        map.set(key, list);
        groups.push({ dateKey: key, items: list });
      }
      map.get(key)!.push(entry);
    }
    return groups;
  }, [filteredEntries]);

  const allAvailableLabels: ChangelogLabel[] = ['NEW', 'UI', 'ENHANCE', 'FIX', 'MOBILE', 'ADMIN', 'SECURITY', 'PERFORMANCE', 'BACKEND'];

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncAllToFirestore = async () => {
    setIsSyncing(true);
    try {
      let syncedCount = 0;
      for (const item of INITIAL_CHANGELOG_ENTRIES) {
        if (!item.id) continue;
        const docRef = doc(db, 'changelogs', item.id);
        await setDoc(
          docRef,
          {
            ...item,
            author: item.author || 'Damon',
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        syncedCount++;
      }
      toast.success(`Synced ${syncedCount} changelog entries to Firestore!`);
    } catch (err: any) {
      console.error('Error syncing changelogs to Firestore:', err);
      toast.error('Failed to sync changelogs to Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Changelog"
        description={`${filteredEntries.length} updates across ${groupedByDate.length} release dates`}
        actions={
          <>
            <Button onClick={handleSyncAllToFirestore} disabled={isSyncing} title="Copy the built-in entries to the database">
              <RefreshCw size={14} aria-hidden="true" className={cn(isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing' : 'Sync to database'}
            </Button>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus size={15} aria-hidden="true" /> Publish update
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search updates" className="min-w-52 flex-1 sm:max-w-xs" />
        <select
          aria-label="Type of change"
          value={selectedLabelFilter}
          onChange={(e) => setSelectedLabelFilter(e.target.value)}
          className={cn(fieldClass, 'cursor-pointer')}
        >
          <option value="All">All types</option>
          {allAvailableLabels.map((lbl) => (
            <option key={lbl} value={lbl}>{lbl.charAt(0) + lbl.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <Button onClick={handleToggleAll}>{isAllExpanded ? 'Collapse all' : 'Expand all'}</Button>
      </div>

      {groupedByDate.length === 0 ? (
        <Panel><EmptyState title="No updates found">Try a different search or type.</EmptyState></Panel>
      ) : (
        groupedByDate.slice(0, visibleDates).map((group) => (
          <Panel key={group.dateKey} title={group.dateKey}>
            {group.items.map((entry, eIdx) => {
              const entryKey = entry.id || `${entry.dateKey}-${entry.timeStr}-${eIdx}`;
              const isExpanded = isAllExpanded !== expandedEntries.has(entryKey);

              return (
                <article key={entryKey} className="border-b border-white/[0.07] px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => handleToggleEntry(entryKey)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-fivem-orange"
                    >
                      <ChevronDown size={14} aria-hidden="true" className={cn('mt-0.5 shrink-0 text-white/55 transition-transform', isExpanded && 'rotate-180')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">{entry.title || entry.bullets[0]}</span>
                        <span className="block text-xs text-white/55">
                          {[entry.timeStr, ...entry.labels.map((l) => l.toLowerCase())].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </button>
                    {entry.id && (
                      <Button size="sm" variant="ghost" className="text-white/55 hover:!text-red-400" aria-label={`Delete entry: ${entry.title}`} onClick={() => handleDeleteEntry(entry.id!)}>
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <ul className="mt-2 max-w-prose list-disc space-y-1 pl-10 text-sm leading-relaxed text-white/75">
                      {entry.bullets.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </Panel>
        ))
      )}

      {groupedByDate.length > visibleDates && (
        <div className="flex justify-center">
          <Button onClick={() => setVisibleDates((n) => n + 10)}>Show older updates</Button>
        </div>
      )}

      {/* ── NEW ENTRY MODAL FORM ── */}
      {showAddModal && (
          <Modal label="Publish an update" onClose={() => { if (!isSubmitting) setShowAddModal(false); }} className="max-w-lg">
            <div
              className="relative w-full rounded-lg border border-white/15 bg-[#0d0d10] p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-fivem-orange" size={18} />
                  <h3 className="text-base font-bold text-white font-display">Publish Platform Update</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close"
                  className="p-1 text-white/55 hover:text-white rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Labels Selector */}
                <div>
                  <label className="block text-xs tabular-nums text-white/55 mb-1.5">
                    Select Change Labels (1-3 max)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allAvailableLabels.map((lbl) => {
                      const isSelected = newLabels.includes(lbl);
                      const conf = LABEL_CONFIG[lbl];
                      return (
                        <button data-choice aria-pressed={isSelected}
                          key={lbl}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewLabels(newLabels.filter((l) => l !== lbl));
                            } else if (newLabels.length < 3) {
                              setNewLabels([...newLabels, lbl]);
                            } else {
                              toast.info('Maximum 3 labels per update.');
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs tabular-nums font-bold   border transition-all cursor-pointer",
                            isSelected
                              ? `${conf.bg} ${conf.text} ${conf.border} shadow-sm`
                              : "bg-white/[0.02] text-white/55 border-white/10 hover:text-white"
                          )}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Release Title */}
                <div>
                  <label className="block text-xs tabular-nums text-white/55 mb-1">
                    Short Update Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. 16:9 Vertical 3D Hero Carousel"
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                    required
                  />
                </div>

                {/* Bullets */}
                <div>
                  <label className="block text-xs tabular-nums text-white/55 mb-1">
                    Bullet Improvements (One per line)
                  </label>
                  <textarea
                    value={newBulletsText}
                    onChange={(e) => setNewBulletsText(e.target.value)}
                    placeholder="• Upgraded hero showcase with 3D rolling physics&#10;• Added mouse wheel and swipe gestures&#10;• Streamlined navigation controls"
                    rows={5}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange font-sans leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-md text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button data-btn="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-md bg-fivem-orange hover:bg-amber-500 text-black font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Update'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
      )}

      {/* ── FOOTER: Website Created & Designed by Damon Banner ── */}
      <div className="pt-8 border-t border-white/10 text-center flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Terminal size={14} className="text-fivem-orange" />
          <span>Website Created and Designed by <strong className="text-white">Damon</strong></span>
        </div>
      </div>
    </div>
  );
}
