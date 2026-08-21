import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, History, Plus, Tag, Calendar, User, CheckCircle,
  ShieldCheck, Zap, Wrench, Bug, Trash2, Search,
  Terminal, Layers, ChevronDown, ChevronUp, ChevronsUpDown,
  Clock, Smartphone, Server, Eye, Filter, ArrowUpRight
} from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { AdminHeader } from './AdminHeader';

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
    id: 'entry-20260820-2012',
    dateKey: 'August 20, 2026',
    timeStr: '8:12 PM',
    fullTimestamp: 'August 20, 2026 at 8:12 PM',
    labels: ['ADMIN', 'UI', 'NEW'],
    title: 'Top Horizontal Navigation Dock, Breadcrumbs & Dropdown Sub-Menus',
    bullets: [
      'Replaced the vertical Admin sidebar with a floating, top-centered horizontal navigation dock inspired by 21st.dev with smooth active sliding pills.',
      'Organized Admin tools into direct destinations and interactive floating dropdown popups with click-outside and Escape key support.',
      'Integrated sticky header scroll behavior with dynamic backdrop-blur transitions that keep controls permanently accessible.',
      'Implemented Shadcn Studio Breadcrumb navigation with hierarchical pathing (Vital RP / Admin Console / Section / Page).',
      'Eliminated account loading flashes with Shadcn Skeleton placeholders across navbar and profile accounts.',
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
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(true);

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
    if (isAllExpanded) {
      setExpandedEntries(new Set());
      setIsAllExpanded(false);
    } else {
      const allIds = new Set<string>();
      entries.forEach((e) => {
        allIds.add(e.id || `${e.dateKey}-${e.timeStr}`);
      });
      setExpandedEntries(allIds);
      setIsAllExpanded(true);
    }
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

  return (
    <div className="space-y-8 relative">
      
      {/* ── TOP SECTION: Platform Changelog Header ── */}
      <AdminHeader
        badge="PUBLIC UPDATES"
        badgeColor="bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30"
        title="Platform Changelog"
        subtitle="A clean, chronological record of product updates, visual enhancements, security patches, and performance upgrades."
        icon={<Layers size={20} className="text-fivem-orange" />}
        iconBg="bg-fivem-orange/15 border-fivem-orange/30"
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fivem-orange/20 hover:bg-fivem-orange/30 text-fivem-orange border border-fivem-orange/40 font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
          >
            <Plus size={15} />
            <span>Publish Update</span>
          </button>
        }
      />

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
        
        {/* Label Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedLabelFilter('All')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
              selectedLabelFilter === 'All'
                ? "bg-white/15 text-white border-white/20 shadow-sm"
                : "bg-white/[0.02] text-white/40 border-transparent hover:text-white hover:bg-white/5"
            )}
          >
            All Updates
          </button>

          {allAvailableLabels.map((lbl) => {
            const conf = LABEL_CONFIG[lbl];
            const isSelected = selectedLabelFilter === lbl;
            return (
              <button
                key={lbl}
                type="button"
                onClick={() => setSelectedLabelFilter(isSelected ? 'All' : lbl)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer shrink-0 border",
                  isSelected
                    ? `${conf.bg} ${conf.text} ${conf.border} shadow-sm scale-105`
                    : "bg-white/[0.02] text-white/40 border-transparent hover:text-white hover:bg-white/5"
                )}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        {/* Search & Expand Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
            title={isAllExpanded ? "Collapse all update details" : "Expand all update details"}
          >
            <ChevronsUpDown size={13} className="text-fivem-orange" />
            <span>{isAllExpanded ? 'Collapse' : 'Expand All'}</span>
          </button>

          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-fivem-orange/50 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SUMMARY STATS BAR ── */}
      <div className="flex items-center justify-between text-xs text-white/40 px-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-fivem-orange animate-pulse" />
          <span>Showing <strong>{filteredEntries.length}</strong> updates across <strong>{groupedByDate.length}</strong> release dates</span>
        </div>
        {selectedLabelFilter !== 'All' && (
          <span className="text-fivem-orange font-bold">Filtered by {selectedLabelFilter}</span>
        )}
      </div>

      {/* ── CHANGELOG TIMELINE LIST (GROUPED BY DATE) ── */}
      <div className="space-y-12 relative">
        {groupedByDate.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
            <Layers className="mx-auto text-white/20 mb-3" size={32} />
            <h4 className="text-base font-bold text-white font-display mb-1">No updates found</h4>
            <p className="text-xs text-white/40 font-mono">Try adjusting your search query or label filter.</p>
          </div>
        ) : (
          groupedByDate.map((group, gIdx) => (
            <section key={group.dateKey} className="space-y-6">
              
              {/* ── DATE GROUP HEADER ── */}
              <div className="sticky top-20 z-20 flex items-center gap-3 py-2 bg-[#09090b]/80 backdrop-blur-md border-y border-white/10 sm:border-y-0 sm:bg-transparent">
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/15 text-white shadow-md">
                  <Calendar size={13} className="text-fivem-orange" />
                  <span className="text-xs font-bold font-display tracking-tight">{group.dateKey}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                <span className="text-[10px] font-mono text-white/40 tracking-wider">
                  {group.items.length} {group.items.length === 1 ? 'update' : 'updates'}
                </span>
              </div>

              {/* ── TIMELINE ENTRIES UNDER THIS DATE ── */}
              <div className="relative pl-4 sm:pl-8 space-y-6">
                
                {/* Continuous Left Vertical Timeline Axis */}
                <div className="absolute left-[7px] sm:left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-fivem-orange/50 via-white/15 to-transparent pointer-events-none" />

                {group.items.map((entry, eIdx) => {
                  const entryKey = entry.id || `${entry.dateKey}-${entry.timeStr}-${eIdx}`;
                  const isExpanded = expandedEntries.has(entryKey) || isAllExpanded;
                  const isFirstToday = gIdx === 0 && eIdx === 0;

                  return (
                    <motion.div
                      key={entryKey}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: eIdx * 0.04, duration: 0.25 }}
                      className="relative group"
                    >
                      {/* Timeline Node Icon */}
                      <div className={cn(
                        "absolute -left-[1.35rem] sm:-left-[2.35rem] top-3.5 w-3.5 h-3.5 rounded-full border-2 bg-[#09090b] flex items-center justify-center transition-all z-10",
                        isFirstToday
                          ? "border-fivem-orange shadow-[0_0_10px_rgba(234,88,12,0.8)] ring-2 ring-fivem-orange/30"
                          : "border-white/30 group-hover:border-fivem-orange group-hover:shadow-[0_0_8px_rgba(234,88,12,0.5)]"
                      )}>
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          isFirstToday ? "bg-fivem-orange" : "bg-white/60 group-hover:bg-fivem-orange"
                        )} />
                      </div>

                      {/* Glassmorphic Update Card */}
                      <div className="rounded-2xl border border-white/10 bg-[#0c0c10]/95 hover:bg-[#101017]/95 p-5 sm:p-6 transition-all hover:border-fivem-orange/40 shadow-lg group-hover:shadow-2xl">
                        
                        {/* Header Row: Time + Labels + Delete */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Time Pill */}
                            {entry.timeStr && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/10">
                                <Clock size={11} className="text-fivem-orange" />
                                {entry.timeStr}
                              </span>
                            )}

                            {/* Change-Type Labels (1-3 max) */}
                            {entry.labels.map((lbl) => {
                              const conf = LABEL_CONFIG[lbl] || LABEL_CONFIG['NEW'];
                              return (
                                <span
                                  key={lbl}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border",
                                    conf.bg, conf.text, conf.border
                                  )}
                                >
                                  {lbl}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/30 hidden sm:inline">
                              by {entry.author || 'Damon'}
                            </span>
                            {entry.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry.id!)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                                title="Delete Entry"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        {entry.title && (
                          <h3 className="text-sm sm:text-base font-bold text-white font-display mb-3 tracking-tight group-hover:text-amber-300/90 transition-colors">
                            {entry.title}
                          </h3>
                        )}

                        {/* Bulleted List */}
                        <div className="space-y-2">
                          <ul className="space-y-2 text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                            {(isExpanded ? entry.bullets : entry.bullets.slice(0, 2)).map((bullet, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange/80 mt-2 shrink-0 shadow-[0_0_4px_rgba(234,88,12,0.6)]" />
                                <span className="flex-1">{bullet}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Show more/less if more than 2 bullets */}
                          {entry.bullets.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleToggleEntry(entryKey)}
                              className="text-[11px] font-mono text-fivem-orange hover:text-amber-400 font-bold flex items-center gap-1 pt-1 cursor-pointer transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={12} />
                                  <span>Show less</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} />
                                  <span>+ {entry.bullets.length - 2} more improvements</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── NEW ENTRY MODAL FORM ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0d0d10] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-fivem-orange" size={18} />
                  <h3 className="text-base font-bold text-white font-display">Publish Platform Update</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-white/40 hover:text-white rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Labels Selector */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1.5">
                    Select Change Labels (1-3 max)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allAvailableLabels.map((lbl) => {
                      const isSelected = newLabels.includes(lbl);
                      const conf = LABEL_CONFIG[lbl];
                      return (
                        <button
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
                            "px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer",
                            isSelected
                              ? `${conf.bg} ${conf.text} ${conf.border} shadow-sm`
                              : "bg-white/[0.02] text-white/40 border-white/10 hover:text-white"
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
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                    Short Update Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. 16:9 Vertical 3D Hero Carousel"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                    required
                  />
                </div>

                {/* Bullets */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">
                    Bullet Improvements (One per line)
                  </label>
                  <textarea
                    value={newBulletsText}
                    onChange={(e) => setNewBulletsText(e.target.value)}
                    placeholder="• Upgraded hero showcase with 3D rolling physics&#10;• Added mouse wheel and swipe gestures&#10;• Streamlined navigation controls"
                    rows={5}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange font-sans leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-fivem-orange hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
