import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, History, Plus, Tag, Calendar, User, Code, CheckCircle,
  FileCode, ShieldCheck, Zap, Wrench, Bug, ExternalLink, Trash2, Search,
  Terminal, Share2, Layers
} from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { BorderBeam } from '../ui/border-beam';
import { AdminHeader } from './AdminHeader';

export interface ChangelogEntry {
  id?: string;
  version: string;
  title: string;
  category: 'Feature' | 'UI/UX' | 'Fix' | 'Security' | 'Performance';
  description: string;
  author: string;
  date: string;
  createdAt?: any;
}

const INITIAL_CHANGELOGS: ChangelogEntry[] = [
  {
    id: 'release-20260815-1556',
    version: 'v1.9.6',
    title: 'Platform Sidebar Complete Redesign, Unified Contest Hub & Submission Flow Fixes',
    category: 'UI/UX',
    description: `• Complete Platform Sidebar Redesign: Overhauled the right platform sidebar into a cohesive 3-tier esports dashboard featuring a Contestant Profile Hub, a unified Live Contest Center, and a single luxury golden Hall of Fame Vault showcase.
• Redundancy Elimination & Archive Consolidation: Excised duplicate "View Hall of Fame Archives" and "Previous Winners" buttons across the sidebar, funneling past champions browsing into a dedicated, interactive trophy showcase card.
• Unified Live Contest Action Center: Merged previously fragmented Contest Status and Contest Info cards into a single real-time telemetry card with pulsing phase indicators (Submissions & Voting statuses), active round counters, a high-impact glowing CTA, and a smooth rules jump link.
• Category Submission Modal Resolution & Error Guard: Fixed the category empty state "Submit Entry" action to reliably trigger the submission modal with the active category pre-selected, resolving raw control character artifacts, lazy loading chunk glitches, and adding error boundary protection.
• Contestant Telemetry Matrix & Role Identification: Enhanced the user profile card with animated NumberTicker statistics (Submissions, Votes Cast, Score), verified member and system admin role badges, inline name editing, and low-profile disconnect controls.
• On-Demand Admin Suggestion Voting Sync: Decoupled the Admin Console suggestions hub from real-time subscriptions so that administrator decision votes persist atomically to Cloud Firestore without triggering unsolicited screen reflows or jumping cards for other reviewing admins.
• Multi-Admin Refresh Synchronization: When an administrator visits the Category Ideas hub or taps the refresh control, the latest scores, community votes, and staff decision tallies are fetched directly from Cloud Firestore.
• Animated Refresh Button Micro-Interactions: Re-engineered the header refresh trigger with smooth Framer Motion spring physics, a continuous 360-degree rotation animation during active sync, glowing orange aura states, and 180-degree hover transitions.
• Zero-Jitter Staff Review Experience: Admins can review proposals and cast votes with optimistic state feedback while preserving layout stability for all other active staff sessions.
• Eliminated Page Refresh Auth Screen Flash: Added dedicated authentication verification lifecycle states in the root application layer, preventing temporary "Admin Email / Admin Password" login forms from flashing while restoring existing administrator sessions.
• Legacy Email/Password Form Removal: Completely excised obsolete Firebase email/password login modules in favor of unified, verified Discord OAuth administration.`,
    author: 'Damon',
    date: 'Aug 15, 2026 at 9:10 PM',
  },
  {
    id: 'release-20260814-1635',
    version: 'v1.9.5',
    title: 'Category Suggestions System, Reddit-Style Voting, Firebase Backend & Admin Console Hub',
    category: 'Feature',
    description: `• Reddit-Style Category Suggestions Portal: Introduced a dedicated community brainstorm platform where verified community members and administrators can submit theme concepts for upcoming Vital RP Photo Contest rounds.
• Firebase Cloud Firestore Backend: Permanently stores and synchronizes category proposals and community votes directly via Cloud Firestore, utilizing atomic transactions (runTransaction) for race-condition-free score and vote calculations.
• Discord OAuth Profile Attribution: Automatically links each proposal and vote to the user's official Discord login profile, preserving Discord handle, Discord ID, and profile avatars across suggestions feeds and moderation screens.
• Dedicated Admin Console Management Hub: Built a full-featured "Category Ideas" management tab in the Admin Console (Contest Control group), complete with summary telemetry metrics (total proposals, total votes cast, curated concepts, leader scores), status toggles (Active, Shortlisted, Archived), and one-click deletion moderation.
• Dual-Axis Voting Engine (▲ / ▼): Engineered an interactive Reddit-style voting mechanism allowing members to cast upvotes (+1) or downvotes (-1), toggle their vote off, or seamlessly reverse their vote (shifting scores by 2) with instant optimistic UI feedback and live database score recalculations.
• Single Vote Document Constraint: Enforced an atomic composite document ID (\${suggestionId}_\${userId}) in Cloud Firestore, strictly guarding against duplicate votes across multiple browser tabs, client reloads, or direct API triggers.
• Real-Time Suggestions Filtering & Sorting: Implemented dynamic sorting controls across 4 distinct modes (Newest, Top Score / Most Upvoted, Lowest Score, and Oldest) alongside instant real-time keyword search across titles, descriptions, and creator handles.
• Direct Navbar & Mobile Sheet Navigation: Added dedicated "Suggestions" navigation pills in both the desktop signal bar and mobile navigation drawer, equipped with active administrator badges and seamless full-page view transitions.
• Adaptive Horizontal Category Navigation: Built a responsive StickyCategoryNav component with dynamic chevron navigation controls (‹ and ›), smooth horizontal mouse wheel translation, auto-centering for active categories, dynamic gradient edge indicators, and responsive max-width truncation with title tooltips so long category titles never cut off or overflow awkwardly.
• Image Censor & Pixelation Gate: Re-introduced the submission image censorship switch in the Admin Console (Controls & Security tab). When activated, all submitted photos are pixelated and obscured to the public throughout the submission phase to eliminate early bias and duplicate concepts. As soon as voting is unlocked (or censorship is toggled off), high-resolution unpixelated images are immediately revealed in real time across photo feeds, category tabs, and the full-screen lightbox.
• Censor Badge Component Reference Fix: Resolved a missing icon component reference in App.tsx that caused a blank page render crash when the image censor toggle was enabled.
• ReactMarkdown & GFM Rendering Engine: Replaced the legacy plain-text line-splitting preview with a high-fidelity Markdown engine powered by ReactMarkdown and remark-gfm, delivering 100% accurate rendering for headings (#, ##, ###), bold (**text**), italics (*text*), blockquotes (> note), bullet & numbered lists, tables, links, code snippets, and custom callouts.
• Instant "Save Rules Now" Action: Added a dedicated instant-save button right inside the Rules & Live Preview tab in Contest Setup, allowing administrators to persist global rules directly to Firestore in one click without needing to re-validate category fields or round metadata.
• Real-Time Typing State Protection: Refactored internal state synchronization in EditContestManager to guard against background Firestore listener updates wiping out unsaved text in the rules editor while administrators are typing.
• One-Click Starter Rules Templates: Integrated quick template presets ("Full Official Rules" and "Short & Compact") and quick formatting syntax chips into the Markdown toolbar for rapid contest rule authoring.
• Dual-Mode Split Preview in Contest Creator: Upgraded the "Create New Contest Round" builder with the full split-view Markdown toolbar and real-time live preview panel matching the active contest editor.
• Front Page Markdown Typography Synchronization: Aligned the main landing page rules section (#rules) with the exact same typography, custom heading accents (#, ##, ###), bold/italic highlights, blockquote callouts, tables, and link styling as the admin live preview.
• Standalone Platform Rules Editor: Added a standalone fallback rules management panel in Contest Setup so administrators can configure global platform rules even when no active contest round is currently deployed.
• Category Suggestions Viewport Fix & Icon Import Resolution: Fixed an issue where opening Category Suggestions could render a blank screen by resolving an unimported History icon reference and upgrading CategorySuggestionsView to a fixed full-screen viewport overlay (fixed inset-0 z-[150]) with responsive overflow scrolling matching the Hall of Fame Vault.
• Viewport-Level React Error Boundary: Implemented a robust ErrorBoundary wrapper around full-screen views (Category Suggestions, Hall of Fame, Analytics) to intercept any runtime exceptions gracefully, displaying actionable diagnostic cards with one-click retry and return actions instead of blank pages.
• Duplicate Submission Bug Resolution: Eliminated optimistic state collisions during proposal submission by relying exclusively on Firestore onSnapshot document deduplication, preventing ghost duplicate entries from flashing before first vote.
• Spring-Animated Reordering Physics: Integrated GPU-accelerated Framer Motion layout physics (motion.div layout) on all category suggestion cards, smoothly gliding cards into their new ranking positions whenever votes change in real time.
• Direct Share Deep Linking & Highlight Animation: Upgraded suggestion share links to include &suggestion={id} or &idea={id}, automatically launching the suggestions view, smoothly scrolling the target card into view, and triggering a 3-second amber highlight ring.
• Voter Breakdown Hover Popovers: Hovering over the upvotes or downvotes pill on any suggestion card reveals a real-time list of members who voted, displaying Discord avatars, usernames, and member tags.
• Multi-Fallback Share Button: Engineered clipboard copying with modern navigator.clipboard and legacy textarea execCommand fallbacks, automatically updating browser history and displaying immediate visual confirmation.
• Admin-Only Profile Dropdown Relocation: Removed public navbar buttons and relocated Category Suggestions exclusively into the User Profile Dropdown, Mobile Drawer, and Sidebar Quick Actions, restricted by administrator privileges with ShieldCheck indicators.
• Browser Refresh View & Section Persistence: Synchronized Category Suggestions view state and deep-link parameters with localStorage and browser search params, ensuring browser reloads keep the user on the suggestions view without resetting state.
• Firestore Read & Write Optimization: Overhauled the entire Category Suggestions data layer to drastically minimize Firestore read and write costs across all user sessions.
• Zero-Read Client Sorting & Search Filtering: Decoupled sorting and text search from Firestore queries—all sorting (Top, Newest, Lowest, Oldest) and multi-keyword filtering now execute 100% in-memory via useMemo, eliminating redundant collection re-reads on tab toggles.
• Inlined Document Voter Summaries: Embedded lightweight voter sample payloads directly into category suggestion documents during vote transactions, allowing hover popovers to resolve instantaneously with zero extra Firestore queries.
• Client-Side LRU Memory Cache & Vote Debounce: Added in-memory voter caching with a 60-second TTL and client-side vote locks to prevent transaction contention and rapid spam-click writes.
• Profile Dropdown Click-Outside & Escape Dismissal: Implemented a robust outside-click boundary listener and Escape key handler on the user profile dropdown, ensuring the menu closes reliably when clicking anywhere outside.
• Dedicated Admin Console Category for Suggestions: Created an independent top-level category group in the Admin Console sidebar and navigation specifically for Category Suggestions with custom theme styling, live telemetry metrics, and dedicated navigation.
• Functional Suggestion Workflow Statuses: Replaced static moderation tags with 6 functional workflow statuses (Open for Voting, Under Review, Approved for Contest, Implemented / Used, Declined, and Archived) with instant dropdown selectors and glowing indicators.
• Admin Status Filtering Tabs with Count Badges: Added dedicated horizontal status filter tabs with dynamic live counters, allowing administrators to filter proposals by workflow state with 0 Firestore read costs.
• Anti-Jitter Layout Stabilization Engine: Engineered a frozen display order architecture across both community and admin suggestion views to prevent cards from constantly shifting and jumping on screen during peak voting traffic.
• Live Vote Inbound Banners & "Update Ranking" Action: Added non-intrusive live activity banners indicating how many proposals have moved rank in the background, with one-click ranking alignment on user demand.
• Stable View vs Live Stream Mode Toggle: Integrated a toolbar toggle allowing users and administrators to switch between Stable Reading mode (frozen positions) and Live Stream mode (continuous auto-gliding animations).
• Staff Contest Decision Voting Suite & Multi-Status Support: Engineered a dedicated staff contest decision voting system in the Admin Console specifically for admins to vote on whether proposals will be used for upcoming contest rounds, active across both "Open for Voting" and "Under Review" statuses with atomic real-time persistence.
• Automated 2/3 Admin Quorum Consensus Pipeline: Engineered a 2-stage automated progression workflow where 2 out of 3 admin "yes" votes on an "Under Review" suggestion automatically promotes it to "Open for Voting", and 2 out of 3 admin "yes" votes on an "Open for Voting" suggestion automatically approves it for the contest.
• Intuitive Admin Voting Phrasing & Dynamic Threshold Messaging: Simplified staff decision displays to dynamic countdown status ("Waiting for 1 more vote to move to Open for Voting" / "Waiting for 1 more vote to approve for contest") with explicit contest context ("Use in Upcoming Contest?").
• Public Community User Vote Telemetry in Admin Cards: Admin suggestion cards prominently display public community scores, upvote/downvote totals, and hover voter popovers alongside staff decision metrics.
• Multi-Strategy Live Discord Avatar Sync ("Pull Discord Photo"): Upgraded the avatar refresh flow to fetch the latest Discord photo directly from Discord API via OAuth bearer tokens, guild member lookups, and user CDN endpoints, resolving avatar cache staleness.
• Global Discord Avatar Persistence & Retroactive Site-Wide Sync: Ensured pulled Discord photos persist in localStorage and Firestore user profiles across refreshes, automatically synchronizing retroactively across existing photo submissions, new entries, and category proposals.
• Resilient Admin Quorum Voting & Live Avatar Reconciliation: Resolved Firestore transaction value serialization and added dynamic avatar reconciliation to ensure all staff votes and updated avatars display instantly across all administrators.
• Real-time Multi-Admin State Synchronization: Standardized status normalization and live Firestore subscriptions ensuring workflow statuses, vote tallies, and quorum progressions sync instantaneously across all active admin consoles.
• Verified Feed Manual Refresh: Ensured the manual refresh button in the Admin Console re-fetches and synchronizes category proposals and staff decisions seamlessly.`,
    author: 'Damon',
    date: 'Aug 14, 2026 at 10:59 PM',
  },
  {
    id: 'release-20260813-2010',
    version: 'v1.9.4',
    title: 'Admin Console Redesign, Unified Headers, Collapsible Contest Editors & Site Lockdown',
    category: 'Feature',
    description: `• Collapsible Active Contest Editor Accordion: Added a collapsible accordion section for "Edit Current Contest" in Contest Setup matching the "Create New Contest Round" accordion, featuring active round indicator pills, ID badges, and smooth collapse/expand triggers.
• Unified Admin Page Header Architecture: Implemented a standardized AdminHeader component across all 8 Admin Console categories (Dashboard, Analytics, Submissions, Voter Audit, Contest Setup, Controls & Security, Changelog, and Danger Zone) delivering complete visual consistency with high-contrast themed badges, pulsating status lights, stylized icons, and action controls.
• In-Place Editable Categories in Contest Setup: After adding categories in the Contest Setup builder, each category item remains fully editable in place (allowing instant adjustments to category names, descriptions, and custom emojis without needing to delete and recreate).
• Expanded High-Fidelity Admin Console: Enlarged modal stage to an expansive responsive viewport (up to 1600px width with 88vh height), providing spacious layouts for data tables, telemetry graphs, and photo previews.
• Enhanced Categorized Sidebar Dock: Upgraded the Admin Side Menu with organized category sections (Core Operations, Contest Control, Platform), interactive spring physics, layout pills, micro-zoom hover states, and live indicator counters.
• Fluid Category Switching Motion: Added motion transitions with spring easing, subtle blur reveals, and layout animations across all admin tabs.
• Full-Width Inline Analytics Dashboard: Refactored the Analytics category view into a native full-width inline dashboard layout, eliminating nested scrollbars and cramped frames.
• Rebuilt Contest Setup Manager: Streamlined contest creation and management workflows with enhanced category emoji selectors, live markdown split-preview rules editor, and removed obsolete schedule dates in favor of real-time gates.
• Official Vital RP Branded Lock Screen: Enhanced the "Contest is Closed" modal with the official high-resolution Vital RP logo centerpiece, ambient neon glow, and reassuring next round notice.
• Streamlined Platform Changelog Header: Redesigned the Changelog tab header into a clean, modern version history portal and resolved rendering crashes.
• Site Closed Lockdown Mode: Added a global toggle switch in the Admin Console (Controls & Security tab) allowing administrators to restrict access to the contest portal when a contest round is concluded or undergoing scheduled maintenance.
• Interactive Creator Easter Egg: Styled a clean "Created by Damon" footer badge featuring Damon's custom avatar that triggers an animated playful wiggle when clicked.
• Seamless Hall of Fame Shortcut: Built-in high-contrast button allowing visitors to immediately explore all past champions and winning entries in the Hall of Fame without requiring login.
• Intuitive Minimize Window Controls: Updated the console minimize button to a standard window-style minus control with bottom dock restoration.
• Administrator Sign-In & Live Bypass: Integrated instant login for administrators directly from the closed modal, accompanied by an admin bypass toggle and quick shortcut to launch the Admin Console.`,
    author: 'Damon',
    date: 'Aug 13, 2026 at 8:59 PM',
  },
  {
    id: 'release-20260812-2208',
    version: 'v1.9.3',
    title: 'Rename Display Name Modal & Profile Menu Cleanup',
    category: 'UI/UX',
    description: `• Rename Display Name Modal Overlay: Rebuilt the "Rename Display Name" feature to launch a dedicated glassmorphic modal overlay when clicked from any profile button (navbar dropdown, mobile menu, or profile card), allowing users to update their handle instantly without having to locate an inline edit field.
• Profile Dropdown Cleanup: Removed the Hall of Fame Vault option from the navbar user profile dropdown to eliminate redundant navigation options, keeping the account menu focused strictly on account management.
• Mobile Menu Rename Shortcut: Added an edit display name icon button inside the mobile menu account card for direct access to profile handle editing on mobile devices.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 10:08 PM',
  },
  {
    id: 'release-20260812-2114',
    version: 'v1.9.2',
    title: 'Mobile Vault Menu, Admin Panel Width & Scroll Indicator Fixes',
    category: 'UI/UX',
    description: `• Mobile Vault Buttons Compacted: Previous contest (vault) selector pills on mobile now have a max-width of 140px with truncated text and smaller font size, preventing super-long buttons that push content off-screen.
• Vault Scroll Fade Indicators: Added left/right gradient fade overlays on the mobile vault pill bar so users can visually tell the list is horizontally scrollable.
• Vault Title Overflow Fix: The selected vault title in the content header now properly truncates on mobile with a smaller font size (text-lg) and stacks vertically so it doesn't go off-page.
• Admin Panel Full Width on Mobile: The admin console modal now fills the entire screen on mobile — no padding, no rounded corners, no max-width constraint — for maximum usable space.
• Admin Tab Scroll Indicators: The mobile admin tab bar now has gradient fade edges and a pulsing chevron arrow on the right to clearly indicate horizontal scrollability.
• Touch Scrolling Improvements: Added touch-pan-x and end spacers on both the vault and admin tab scroll bars for smoother iOS scrolling and preventing the last item from being hidden under the fade.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 9:14 PM',
  },
  {
    id: 'release-20260812-2042',
    version: 'v1.9.1',
    title: 'Hall of Fame Navbar Separation & Submissions Closed Button Cleanup',
    category: 'UI/UX',
    description: `• Hall of Fame Special Standalone Button: Separated Hall of Fame from the regular navigation capsule into its own visually distinct standalone button with amber/gold gradient background, glowing shadow, Trophy icon, and Sparkles accent — making it feel premium and immediately eye-catching.
• Submissions Closed Button Hidden: The "Submissions Closed" navbar button is now completely hidden when submissions are not open, instead of showing a disabled/locked state. The "Submit Entry" button only appears when submissions are actively open.
• Mobile Hall of Fame Section: Added a dedicated Hall of Fame section in the mobile navigation menu with its own "✦ Hall of Fame" header label, amber gradient styling, Trophy icon, and Sparkles to match the desktop treatment.
• Mobile Submissions Cleanup: Mobile menu also hides the Submit Entry option entirely when submissions are closed, keeping the navigation clean and uncluttered.
• Hall of Fame Refresh Persistence: Page refreshes while viewing the Hall of Fame Vault automatically reopen the Hall of Fame view via synced localStorage and URL parameters.
• Admin Console Refresh Persistence: Page refreshes while in the Admin Console overlay keep the Admin Console open seamlessly after browser reloads.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 8:46 PM',
  },
  {
    id: 'release-20260811-2115',
    version: 'v1.9.0',
    title: 'Premium Dual-Layer Glass Navbar & Category Bar Redesign',
    category: 'UI/UX',
    description: `• Dual-Layer Glass Architecture: Redesigned navbar with an outer chrome shell featuring animated shimmer gradient border that travels along the top edge, and a frosted glass interior panel with inset shadows and noise texture overlay for premium depth.
• Animated Shimmer Border: Added a continuously travelling orange-to-gold gradient highlight along the navbar top edge using a custom CSS shimmer keyframe animation, with subtle vertical gradient accents on side edges.
• Profile Capsule Button: Redesigned profile button as a compact rounded-full capsule with circular avatar, green online dot, truncated name, and chevron — fits cleanly within the navbar without any overflow.
• Category Bar Glass Matching: Rebuilt the sticky category menu with the same dual-layer glass architecture as the navbar — noise texture overlay, gradient side accents, frosted interior, and rounded-full pill buttons for visual consistency.
• Navigation Capsule Refinement: Removed obsolete Gallery button and added high-utility nav tabs ("Categories", "Submit Entry" CTA with glowing orange badge, "Rules", and "Hall of Fame") with Lucide icons for quick access.
• Mini Category Bar Spacing: Added 6px top offset under navbar and increased internal track padding (pt-4 pb-3.5) so category buttons are comfortably spaced and easy to read/tap.
• Closed Submissions Guard: Navbar "Submit Entry" button checks contest status and blocks modal launch with a clear toast message when submissions are closed by admins.
• Strict 1920x1080 Resolution Inspector: Image selection inspects dimensions and immediately alerts the user if resolution is under 1920x1080 Full HD, displaying current dimensions vs requirement with explicit error banners and button lock.
• High-Utility Upload Modal: Enhanced upload form with live image metadata badges (resolution, aspect ratio, file size), category description preview, quick caption tags, and verified Discord badge.
• 1 Photo Per User Limit Enforcement: Strictly enforced the single submission per user rule across modal and upload handler logic.
• Existing Submission Preview & Delete CTA: When a participant with an existing entry opens the upload modal while the 1-photo limit is active, the modal displays an intuitive preview card of their current entry (thumbnail, category, votes, caption) with an immediate "Delete Current Submission & Upload New Photo" button to easily swap entries.
• Permanent Flagged Voters Retention: Verified and documented that the flagged_voters collection is strictly retained across contest archives and resets, ensuring alt account bans persist across all future contests.
• Multi-Tier Champion Badges: Implemented dynamic badges for contest winners: Gold Champion (1x Winner), Platinum Crown (2x Champion), and Legendary Flame/Diamond (3+ Wins Grand Champion).
• Universal Winner Badge Display: Displayed Champion Badges across navbar profile capsule, account dropdown header, sidebar profile, gallery photo cards, lightbox viewer, and Hall of Fame vault.
• Hall of Fame Scrollbar Stabilization: Fixed scrollbar layout flicker by applying CSS scrollbar-gutter: stable and removing popLayout height collapses.
• Unconditional Navbar Hall of Fame Link: Prominently added "Hall of Fame" directly to the navbar center capsule and mobile menu so it is easily accessible at all times.
• High-Fidelity Hall of Fame Vault Redesign: Enhanced the Hall of Fame with a glassmorphic hero stats bar, MagicCard spotlight effects, search filters, and interactive winning photo inspection lightbox.
• Universal Profile Picture Display: Integrated user profile avatars across gallery photo cards, lightbox viewer, sidebar profile section, and Hall of Fame winner cards.
• "My Victories" Personal Vault Filter: Added an intuitive filter tab and profile dropdown shortcut allowing users to immediately view all past winning photo entries submitted by their account.
• Multi-Identifier User Victory Resolution: Enhanced user victory matching logic to resolve wins across uid, displayName, discord_name, player_name, email, and local storage handles so past archived victories are reliably detected and counted.
• Consistent Winner Card Layout Baseline: Added a fixed 2-line caption container height (min-h-[2.5rem] flex items-center) so the divider line and user profile footer line up at the exact same vertical baseline across every card regardless of caption length.
• Official Discord Profile Avatar Resolution: Updated resolveAvatarUrl on the Hall of Fame view to prioritize official Discord profile pictures (user.photoURL) for all winning entries, backed by automatic fallback error handling.
• High-Performance Memoized Winner Cards: Isolated winner cards into a memoized WinnerCard component with GPU hardware acceleration (transform-gpu, lazy decoding, optimized particle background count) for ultra-smooth 60fps scrolling and filtering.
• Interactive Photographer Portfolio Filter: Clicking any winner's username or avatar in the Hall of Fame now immediately filters the gallery view to show all past winning entries from that specific photographer, complete with an active filter pill and 1-click clear option.
• Enhanced Share Entry Modal: Rebuilt the Share action to present a dedicated dialog with 1-click "Copy Link to Clipboard", a visible selectable text box for manual copying, and Twitter/X social share shortcuts.
• Custom Display Name Filter Resolution: Updated resolveDisplayName in ArchivedWinnersView.tsx so user filters and winner card headers respect customized display names when a user renames their account.
• Direct Shared Link Deep-Linking: Added URL search parameter listener on page mount (?photo=..., ?archive=..., ?winner=...) in App.tsx and ArchivedWinnersView.tsx so visiting or clicking any shared entry URL automatically launches the winning photo in full detail.
• Accurate Win Count Deduplication: Fixed double-counting bug where a single winning entry document with matching discord_name and player_name double-incremented the winner map. Win count badges and photographer filter counts now precisely reflect the exact number of winning photo documents in the vault.
• Compact Mobile Vault Selector: Replaced vertical sidebar block on mobile viewports with a sleek horizontal scrollable capsule pill bar to prevent the vault menu from taking over the screen.
• Mobile Navbar Overflow & Side-Scroll Elimination: Enforced strict w-full max-w-full overflow-x-hidden constraints, text truncations, and responsive flex-wrap logic across the Hall of Fame navbar header to eliminate horizontal side-scrolling.`,
    author: 'Damon',
    date: 'Aug 11, 2026 at 9:15 PM',
  },
  {
    id: 'release-20260811-2032',
    version: 'v1.8.0',
    title: 'High-Fidelity 3D Category Redesign & Prominent Emoji Visual Polish',
    category: 'UI/UX',
    description: `• 3D Glassmorphic Card Physics: Added spring-loaded 3D cursor tilt physics and specular glare reflection on hover.
• MagicUI Neon Border Beams: Integrated active-state BorderBeam glow effects and ambient DotPattern background overlay.
• Large Floating Emojis: Removed emoji border boxes and enlarged emojis to text-5xl floating graphics with smooth drop-shadow glow effects.
• Cleaned Badge Header: Updated section header badge to clean "Interactive Filters".
• ClipPath Slide-Down Category Menu: Replaced fade-in with a true CSS clipPath reveal animation so the sticky category bar visually peels out from under the navbar; brightened background to #16161e with larger text, generous spacing, and high-contrast pill buttons for readability.
• Premium Profile Button: Redesigned navbar account pill with generous padding (px-5 py-3), ring-offset avatar with online dot indicator, and frosted glass background.
• Real-time Submission Percentage Ring: Displayed animated live submission stats and progress bars using MagicUI NumberTicker.`,
    author: 'Damon',
    date: 'Aug 11, 2026 at 8:32 PM',
  },
  {
    id: 'release-20260810-2151',
    version: 'v1.7.0',
    title: 'DiceBear Dynamic Default Avatars & Discord Fallback Integration',
    category: 'Feature',
    description: `• Discord Photo Priority: Attempts to load user Discord OAuth profile photo first.
• DiceBear SVG Fallback: Automatically falls back to unique, deterministic DiceBear SVG avatars if Discord photo is missing or fails to load.
• Automatic Image onError Fallback: Added automatic image error handlers so broken Discord URLs seamlessly switch to DiceBear.
• Avatar Style Selector: Added interactive style chooser supporting Robots, Adventurers, Avataaars, Lorelei, Thumbs, Fun Emoji, and Identicons.
• Avatar Randomizer: Added one-click "Randomize" avatar seed button to instantly generate fresh profile pictures.
• Voter Search Avatars: Enhanced Admin Voter Search with real-time DiceBear avatar SVGs for all voters.`,
    author: 'Damon',
    date: 'Aug 10, 2026 at 9:51 PM',
  },
  {
    id: 'release-20260809-1947',
    version: 'v1.6.0',
    title: 'Contest Setup Polish, DUSTFILE Scroll Animations & Minimal Notes',
    category: 'Feature',
    description: `• Minimal Changelogs: Simplified release notes into clean, concise 1-line bullet points.
• DUSTFILE Framer Animations: Added scroll reveals, hover tilt elevation, and sticky left timeline column.
• Background Scroll Lock: Main page scrolling is now locked while the Admin Console is open.
• Title Emoji Selector: Added an emoji picker next to the Contest Title input.
• High-Contrast Emoji Buttons: Upgraded emoji buttons across all forms to be bright and easy to see.
• Red Danger Zone: Made the Danger Zone tab button bright glowing red.
• Vital RP Loading Screen Showcase: Featured all 5 winner photos on the server loading screen.
• Sleek Action Buttons: Replaced animated shimmer buttons with high-contrast download buttons.
• Minimizable Admin Dock: Added minimize control to pin Admin Console to bottom dock without resetting state.`,
    author: 'Damon',
    date: 'Aug 9, 2026 at 8:20 PM',
  },
  {
    id: 'release-20260808-1855',
    version: 'v1.5.0',
    title: 'Aceternity Admin Sidebar, WebGL Shader Background & Contest Setup Polish',
    category: 'Feature',
    description: `• Aceternity Admin Sidebar: Added collapsible dark glass navigation sidebar.
• WebGL Background: Added FiveM Orange fluid canvas background.
• Photo Lightbox Showcase: Added dark cinematic lightbox stage for viewing photos.
• Category Dock: Added smooth sliding category switcher.
• Multiline Category Descriptions: Auto-resizing textareas for category descriptions.
• Creator Profile Banner: Added "Website Created & Designed by Damon" credit header.`,
    author: 'Damon',
    date: 'Aug 8, 2026 at 6:55 PM',
  },
  {
    id: 'init-4',
    version: 'v1.3.0',
    title: 'Sticky Category Bar & Header Dock',
    category: 'UI/UX',
    description: '• Sticky Category Bar: Added smooth sliding category switcher pill track.\n• Header Dock: Morphed top bar into floating glass dock on scroll.',
    author: 'Damon',
    date: 'Aug 8, 2026',
  },
  {
    id: 'init-3',
    version: 'v1.2.0',
    title: 'RSA Key Encryption & Discord Role Security',
    category: 'Security',
    description: '• RSA Encryption: Client-side RSA keypair encryption for submission privacy.\n• Discord Verification: Discord guild membership and role verification.',
    author: 'Damon',
    date: 'Aug 5, 2026',
  },
  {
    id: 'init-2',
    version: 'v1.1.0',
    title: 'Voter Audit Inspector & Fraud Protection',
    category: 'Feature',
    description: '• Voter Audit Inspector: Admin tools to inspect vote activity and disqualify invalid votes.\n• Analytics Dashboard: Live voting velocity charts.',
    author: 'Damon',
    date: 'Aug 2, 2026',
  },
  {
    id: 'init-1',
    version: 'v1.0.0',
    title: 'Official Platform Launch',
    category: 'Feature',
    description: '• Official Release: Creation and launch of the Vital RP Photo Contest platform designed and built by Damon.',
    author: 'Damon',
    date: 'Jul 28, 2026',
  },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; icon: typeof Sparkles }> = {
  Feature: { bg: 'bg-fivem-orange/15', text: 'text-fivem-orange', border: 'border-fivem-orange/30', icon: Sparkles },
  'UI/UX': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: Zap },
  Fix: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Wrench },
  Security: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', icon: ShieldCheck },
  Performance: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: Zap },
};

function renderTextWithCodePills(text: string) {
  const regex = /(`[^`]+`|\b[\w-]+\.(?:tsx|ts|js|css|json|md)\b|\([A-Za-z0-9_.-]+\.tsx\)|MagicCard|BorderBeam|NumberTicker|SparklesText|Particles|ShimmerButton|1ff166f|AGENTS\.md)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;
    const isCode = part.startsWith('`') && part.endsWith('`');
    const cleanCode = isCode ? part.slice(1, -1) : part;
    const isHighlightToken = isCode ||
      /\b[\w-]+\.(?:tsx|ts|js|css|json|md)\b/.test(part) ||
      /\([A-Za-z0-9_.-]+\.tsx\)/.test(part) ||
      ['MagicCard', 'BorderBeam', 'NumberTicker', 'SparklesText', 'Particles', 'ShimmerButton', '1ff166f', 'AGENTS.md'].includes(part);

    if (isHighlightToken) {
      return (
        <code
          key={i}
          className="mx-1 px-2 py-0.5 rounded-md bg-[#14141e] border border-fivem-orange/30 text-amber-300 font-mono text-[11px] font-semibold inline-flex items-center shadow-sm"
        >
          {cleanCode}
        </code>
      );
    }
    return part;
  });
}

function renderFormattedDescription(description: string) {
  const lines = description.split('\n').filter((l) => l.trim().length > 0);
  const isBulleted = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-') || /^\d+\.\s/.test(l.trim()));

  if (!isBulleted) {
    return (
      <div className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans whitespace-pre-line mt-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
        {renderTextWithCodePills(description)}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3 text-xs sm:text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^([•\-]|^\d+\.)\s*/, '').trim();
        const parts = cleanLine.split(':');
        const hasTitle = parts.length > 1;
        const title = hasTitle ? parts[0].trim() : '';
        const body = hasTitle ? parts.slice(1).join(':').trim() : cleanLine;

        return (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#0d0d12]/90 border border-white/5 hover:border-fivem-orange/30 transition-all shadow-sm group/bullet"
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-fivem-orange shrink-0 shadow-[0_0_8px_rgba(234,88,12,0.8)] group-hover/bullet:scale-125 transition-transform" />
            <div className="flex-1 min-w-0">
              {hasTitle && (
                <strong className="font-bold text-white font-display text-xs sm:text-sm tracking-wide mr-1.5 inline-block">
                  {renderTextWithCodePills(title)}:
                </strong>
              )}
              <span className="text-white/75">{renderTextWithCodePills(body)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChangelogTab() {
  const [entries, setEntries] = useState<ChangelogEntry[]>(INITIAL_CHANGELOGS);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [version, setVersion] = useState('v1.6.0');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Feature' | 'UI/UX' | 'Fix' | 'Security' | 'Performance'>('Feature');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Changelogs from Firestore
  useEffect(() => {
    const fetchChangelogs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'changelogs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const dbEntries: ChangelogEntry[] = querySnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ChangelogEntry, 'id'>),
          }));
          const seen = new Set<string>();
          const merged: ChangelogEntry[] = [];
          [...INITIAL_CHANGELOGS, ...dbEntries].forEach((entry) => {
            const key = (entry.version || '') + '_' + (entry.title || '');
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(entry);
            }
          });
          setEntries(merged);
        }
      } catch (err) {
        console.warn('Using local fallback changelog history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChangelogs();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error('Please enter a title and description');
      return;
    }

    setIsSubmitting(true);
    const newEntry: ChangelogEntry = {
      version: version || 'v1.6.0',
      title,
      category,
      description,
      author: 'Damon',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'changelogs'), newEntry);
      setEntries((prev) => [{ ...newEntry, id: docRef.id }, ...prev]);
      toast.success('Changelog entry published!');
      setShowAddModal(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Failed to save to Firestore:', err);
      // Fallback add locally
      setEntries((prev) => [{ ...newEntry, id: `local-${Date.now()}` }, ...prev]);
      toast.success('Changelog entry added!');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      if (!id.startsWith('init-') && !id.startsWith('local-')) {
        await deleteDoc(doc(db, 'changelogs', id));
      }
      setEntries((prev) => prev.filter((item) => item.id !== id));
      toast.success('Entry removed');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesTag = selectedTagFilter === 'All' || entry.category === selectedTagFilter;
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.version.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-8 relative">
      
      {/* ── TOP SECTION: Platform Changelog Header ── */}
      <AdminHeader
        badge="VERSION HISTORY"
        badgeColor="bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30"
        title="Platform Changelog"
        subtitle="Live log of platform releases, performance upgrades, security patches, and feature updates."
        icon={<Layers size={20} className="text-fivem-orange" />}
        iconBg="bg-fivem-orange/15 border-fivem-orange/30"
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fivem-orange/20 hover:bg-fivem-orange/30 text-fivem-orange border border-fivem-orange/40 font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
          >
            <Plus size={15} />
            <span>New Release Entry</span>
          </button>
        }
      />

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        
        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['All', 'Feature', 'UI/UX', 'Fix', 'Security', 'Performance'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
                selectedTagFilter === tag
                  ? "bg-white/15 text-white border-white/20 shadow-sm"
                  : "bg-white/[0.02] text-white/40 border-transparent hover:text-white hover:bg-white/5"
              )}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search changelogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-fivem-orange/50 transition-colors font-mono"
          />
        </div>
      </div>

      {/* ── CHANGELOG TIMELINE LIST (DUSTFILE LAYOUT) ── */}
      <div className="relative space-y-8">
        {/* Continuous Left Vertical Timeline Axis Line */}
        <div className="absolute left-[3.25rem] sm:left-[4.5rem] md:left-[9.5rem] top-6 bottom-6 w-px bg-gradient-to-b from-fivem-orange/40 via-white/15 to-transparent pointer-events-none hidden md:block" />

        {filteredEntries.map((entry, idx) => {
          const CategoryInfo = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES['Feature'];
          const CategoryIcon = CategoryInfo.icon;

          return (
            <motion.div
              key={entry.id || idx}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98], delay: idx * 0.05 }}
              className="relative flex flex-col md:flex-row items-start gap-4 md:gap-8 group cursor-default"
            >
              {/* Left Column: Version, Date, Category Badge Tag & Sticky Timeline Node Indicator */}
              <div className="w-full md:w-36 shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:text-right relative md:sticky md:top-24 self-start">
                {/* Timeline Square Node Indicator */}
                <div className="hidden md:block absolute top-3.5 -right-[17px] w-3 h-3 rounded-xs bg-fivem-orange border-2 border-[#060609] shadow-[0_0_10px_rgba(234,88,12,0.8)] z-20 group-hover:scale-125 group-hover:shadow-[0_0_16px_rgba(234,88,12,1)] transition-all" />

                {/* Version & Date */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-0.5">
                  <span className="text-sm font-black font-mono text-white bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg group-hover:border-fivem-orange/50 group-hover:text-fivem-orange transition-colors">
                    {entry.version}
                  </span>
                  <span className="text-[11px] font-mono text-white/50 whitespace-nowrap">
                    {entry.date}
                  </span>
                </div>

                {/* Category Outlined Tag */}
                <div className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 mt-1", CategoryInfo.bg, CategoryInfo.text, CategoryInfo.border)}>
                  <CategoryIcon size={11} />
                  <span>{entry.category}</span>
                </div>
              </div>

              {/* Right Column: Elevated Glass Content Card with Motion Hover Tilt */}
              <div className="flex-1 w-full min-w-0">
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#09090d]/95 p-6 sm:p-8 transition-all hover:border-fivem-orange/40 shadow-xl group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                >
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Geometric Icon Box Container */}
                      <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                        <FileCode size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight leading-snug">
                          {renderTextWithCodePills(entry.title)}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mt-1">
                          <User size={11} className="text-fivem-orange" />
                          <span>Author: <strong className="text-white/70">{entry.author || 'Damon'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {entry.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id!)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all cursor-pointer border border-white/5"
                          title="Delete Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Title Header Block (WHAT'S NEW) */}
                  <div className="text-[11px] font-mono font-bold text-fivem-orange uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Terminal size={13} className="text-fivem-orange" />
                    <span>WHAT'S NEW & IMPROVEMENTS</span>
                  </div>

                  {/* Formatted Description Items */}
                  {renderFormattedDescription(entry.description)}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
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
                  <h3 className="text-base font-bold text-white font-display">New Release Changelog</h3>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="e.g. v1.6.0"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                    >
                      <option value="Feature">Feature</option>
                      <option value="UI/UX">UI/UX</option>
                      <option value="Fix">Fix</option>
                      <option value="Security">Security</option>
                      <option value="Performance">Performance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Release Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Loading Screen Showcase Redesign"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Bullet Changes (One per line)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="• Feature: Description..."
                    rows={6}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange font-mono"
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
                    {isSubmitting ? 'Publishing...' : 'Publish Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
