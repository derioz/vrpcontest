import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, History, Plus, Tag, Calendar, User, Code, CheckCircle,
  FileCode, ShieldCheck, Zap, Wrench, Bug, ExternalLink, Trash2, Search,
  Terminal, Share2, Layers, ChevronDown, ChevronUp, ChevronsUpDown
} from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from '../ui/toast';
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
    id: 'release-20260816-1837',
    version: 'v1.9.7',
    title: 'Aceternity Grid Lines Login, Wide Rules Suite & shadcn Skeleton Loading Suite',
    category: 'UI/UX',
    description: `• shadcn/ui Radix Skeleton Placeholder Suite: Integrated the official shadcn/ui Skeleton component (https://ui.shadcn.com/docs/components/radix/skeleton) across the platform—replacing raw spinners with animated dark glass skeleton screens across Hall of Fame vault archives, Category Suggestions feed, Admin Analytics dashboard, submissions preview, and voter audit directory.
• Aceternity UI Simple Login with Grid Lines: Re-engineered the platform authentication modal matching Aceternity UI's iconic grid lines block (https://ui.aceternity.com/blocks/login-and-signup-sections/simple-login-with-grid-lines) with signature corner cross marks (+), linear background grid, glowing Vital RP heraldry, and a dedicated high-impact Discord OAuth2 button.
• Full-Width Wide Contest Rules & Guidelines Suite: Completely redesigned the rules section to span the full stage width below the submissions grid—featuring 4 quick-reference pillar cards (1080p+ resolution, in-game authenticity, fair play, 5 co-champions), BorderBeam light accents, and spacious Markdown formatting.
• Magic UI Ambient Scroll-Based Velocity Backdrop: Integrated the official Magic UI Scroll-Based Velocity component (https://magicui.design/docs/components/scroll-based-velocity) as a clean, minimal kinetic backdrop behind the hero stage with Framer Motion velocity physics and seamless infinite repetition loops.
• Award-Winning SeraUI Hero Redesign: Completely overhauled the landing hero stage with dynamic SparklesText typography, SeraUI Announcement live signal pills, radial ambient orange auras, and a glowing neon GlowLine divider—eliminating raw emoji artifacts from contest titles.
• Dual-Tone Headline Typography Hierarchy: Engineered intelligent title parsing that separates contest rounds (e.g. 'September Photo Contest') into radiant gold sparkles typography, paired with crisp platinum metallic theme subheadings (e.g. 'Rewrite the Rules') and cycling FlipWords taglines.
• SeraUI Precision Vector Heraldry Badges: Overhauled the contest victory badges using custom geometric SVG vector heraldry emblems (GoldChampionIcon, PlatinumChampionIcon, GrandChampionIcon, MythicLegendIcon) with multi-stop metallic gradients, subtle rotating starlight orbits, and deep glassmorphic pill geometry.
• Multi-Tier Victory Progression: Engineered a clean 4-tier victory system (1x Gold Winner, 2x Platinum Champion, 3-4x Royal Amethyst Grand Champion, and 5+ Mythic Legend) with refined dark glass backdrops, crisp metallic borders, and typography.
• High-Density Compact Badge Numbers: Optimized compact badge displays across photo cards, profile capsules, and winner archives with crisp numeric indicators (e.g. [🏆 1], [👑 2x], [👑 3x], [🔥 5x]) preventing line breaks.
• Official SeraUI Verify & Profile Dropdown: Deployed official SeraUI VerifyBadge components with Basic/Gold/Premium variants, paired with frosted glassmorphic profile dropdowns, online status beacons, and unified DiceBear controls.`,
    author: 'Damon',
    date: 'Aug 16, 2026 at 8:52 PM',
  },
  {
    id: 'release-20260815-1556',
    version: 'v1.9.6',
    title: 'SeraUI Component Suite Integration, Radio Voting Buttons & Ambient Contest Rail',
    category: 'UI/UX',
    description: `• Official SeraUI Component Suite Deployment: Integrated the official SeraUI 3D Carousel, Fancy Tabs, DocTabs, Progress Bars, Glassmorphic Modal Dialogs, and native Floating Toast notifications across landing hero, contest setups, and voting flows.
• Atomic Voting Concurrency & Fraud Prevention: Upgraded the voting engine in App.tsx with Firestore runTransaction atomic locking, synthetic double-increment prevention, and a one-click Admin Vote Count Reconciler utility.
• Alt Account Blacklist Manager & Multi-Key Resolution: Enhanced the Voter Search directory with permanent Blacklist registries, direct UID ban modals, cross-contest historical vote aggregation, and normalized multi-key identifier cascade queries.
• Separated Voting & Voter Audit Architecture: Decoupled community voting into standalone SeraUI radio voting buttons and dedicated non-obstructive Voter Badge modal inspection triggers.
• Real-time Admin Suggestion Voting Sync: Decoupled category suggestion decision votes from client screen reflows with optimistic state sync, 360-degree rotating refresh physics, and eliminated page auth flicker states.`,
    author: 'Damon',
    date: 'Aug 15, 2026 at 10:39 PM',
  },
  {
    id: 'release-20260814-1635',
    version: 'v1.9.5',
    title: 'Category Suggestions System, Reddit-Style Voting, Firebase Backend & Admin Console Hub',
    category: 'Feature',
    description: `• Community Category Suggestions Brainstorm Portal: Built a dedicated community theme suggestion hub powered by atomic Firestore transactions, Discord OAuth attribution, and real-time keyword search and sorting.
• Dual-Axis Voting Engine & Score Sync: Implemented interactive Reddit-style upvoting/downvoting (▲ / ▼) with single-vote document constraints, live score recalculation, and hover voter popovers.
• Admin Category Ideas Hub & 2/3 Quorum Progression: Built an admin management center with 6 functional workflow statuses, real-time live activity banners, and an automated 2/3 staff quorum consensus pipeline.
• Real-Time Markdown & GFM Rules Engine: Upgraded contest rules authoring and landing page displays with full ReactMarkdown and remark-gfm rendering, split-view previews, and instant-save actions.
• Adaptive Category Navigation & Image Censor Gate: Introduced StickyCategoryNav with chevron controls alongside an Admin image censorship gate to prevent early bias during submission phases.
• Performance & Zero-Read Optimization: Optimized suggestions data layers with in-memory memoized sorting, voter sample embeddings, and LRU cache debounce.`,
    author: 'Damon',
    date: 'Aug 14, 2026 at 10:59 PM',
  },
  {
    id: 'release-20260813-2010',
    version: 'v1.9.4',
    title: 'Admin Console Redesign, Unified Headers, Collapsible Contest Editors & Site Lockdown',
    category: 'Feature',
    description: `• Unified Admin Page Header Architecture: Standardized AdminHeader across all 8 Admin Console categories with themed badges, pulsating status indicators, and action triggers.
• Collapsible Contest Setup Editors: Added collapsible accordions for active contest editing and new round creation with in-place editable category items and emoji pickers.
• High-Fidelity Responsive Admin Viewport: Enlarged console modal stage (up to 1600px width), categorized dock navigation, and full-width inline analytics dashboards.
• Site Closed Lockdown Gate: Built a global maintenance lockdown toggle in Controls & Security with official Vital RP logo artwork and administrator live bypass.`,
    author: 'Damon',
    date: 'Aug 13, 2026 at 8:59 PM',
  },
  {
    id: 'release-20260812-2208',
    version: 'v1.9.3',
    title: 'Rename Display Name Modal & Profile Menu Cleanup',
    category: 'UI/UX',
    description: `• Dedicated Rename Display Name Modal: Rebuilt handle editing into an interactive glassmorphic modal overlay accessible across navbar dropdowns, mobile menus, and profile cards.
• Mobile Menu & Navigation Cleanup: Streamlined profile menu options and mobile action cards for high-density account management.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 10:08 PM',
  },
  {
    id: 'release-20260812-2114',
    version: 'v1.9.2',
    title: 'Mobile Vault Menu, Admin Panel Width & Scroll Indicator Fixes',
    category: 'UI/UX',
    description: `• Mobile Vault Optimization: Compacted previous contest selector pills with gradient edge fades, text truncation, and smooth touch scrolling.
• Full-Width Mobile Admin Console: Expanded admin overlays to full-width mobile viewports with scrollable tab bars and visual overflow indicators.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 9:14 PM',
  },
  {
    id: 'release-20260812-2042',
    version: 'v1.9.1',
    title: 'Hall of Fame Navbar Separation & Submissions Closed Button Cleanup',
    category: 'UI/UX',
    description: `• Standalone Hall of Fame Vault Pill: Separated Hall of Fame into an eye-catching gold-accented standalone button with persistent URL/localStorage state sync.
• Dynamic CTA Visibility: Submissions Closed buttons are now cleanly hidden when submissions are locked, rendering Submit Entry only when rounds are open.`,
    author: 'Damon',
    date: 'Aug 12, 2026 at 8:46 PM',
  },
  {
    id: 'release-20260811-2115',
    version: 'v1.9.0',
    title: 'Premium Dual-Layer Glass Navbar, Hall of Fame Vault & Strict Resolution Inspector',
    category: 'UI/UX',
    description: `• Dual-Layer Glass Navbar & Category Rail: Engineered animated shimmer gradient borders and frosted glass panels across headers and category navigation.
• Strict 1080p Resolution Inspector & 1-Photo Limit: Enforced strict 1920x1080 upload validation with dimension error alerts and 1-photo per user swap management.
• Hall of Fame Vault & Multi-Tier Victory Badges: Built the archived champions gallery with interactive photo lightboxes, photographer portfolio filters, and multi-tier victory badge attribution.
• Permanent Alt Blacklist Persistence: Ensured flagged account registries persist permanently across round resets and database archives.`,
    author: 'Damon',
    date: 'Aug 11, 2026 at 9:15 PM',
  },
  {
    id: 'release-20260811-2032',
    version: 'v1.8.0',
    title: 'High-Fidelity 3D Category Redesign & Prominent Emoji Visual Polish',
    category: 'UI/UX',
    description: `• 3D Glassmorphic Category Physics: Added spring-loaded cursor tilt physics, specular glare reflections, and MagicUI Neon Border Beams.
• Large Floating Category Emojis: Replaced emoji border boxes with text-5xl floating graphics with smooth drop-shadow glow effects.
• ClipPath Category Peeling Animation: Replaced simple fade-in with a CSS clipPath reveal sliding smoothly from beneath the navbar.`,
    author: 'Damon',
    date: 'Aug 11, 2026 at 8:32 PM',
  },
  {
    id: 'release-20260810-2151',
    version: 'v1.7.0',
    title: 'DiceBear Dynamic Default Avatars & Discord Fallback Integration',
    category: 'Feature',
    description: `• Discord & DiceBear Avatar Pipeline: Prioritizes Discord OAuth photos with automatic deterministic DiceBear SVG fallback on load errors.
• Interactive Avatar Customization: Added avatar style choosers (Robots, Adventurers, Avataaars, Lorelei, Fun Emoji) and seed randomizers across platform cards.`,
    author: 'Damon',
    date: 'Aug 10, 2026 at 9:51 PM',
  },
  {
    id: 'release-20260809-1947',
    version: 'v1.6.0',
    title: 'Contest Setup Polish, DUSTFILE Scroll Animations & Minimal Notes',
    category: 'Feature',
    description: `• DUSTFILE Timeline & Scroll Animations: Added scroll reveals, hover tilt elevation, and sticky left timeline navigation.
• Form Polish & Minimizable Admin Dock: Added contest title emoji selectors, danger zone styling, and minimizable bottom dock controls.`,
    author: 'Damon',
    date: 'Aug 9, 2026 at 8:20 PM',
  },
  {
    id: 'release-20260808-1855',
    version: 'v1.5.0',
    title: 'Aceternity Admin Sidebar, WebGL Shader Background & Contest Setup Polish',
    category: 'Feature',
    description: `• Aceternity Admin Sidebar & WebGL Background: Integrated collapsible dark glass navigation sidebar and FiveM Orange fluid canvas background.
• Cinematic Lightbox & Creator Credit: Added photo inspection lightbox stage and prominent creator credit banner.`,
    author: 'Damon',
    date: 'Aug 8, 2026 at 6:55 PM',
  },
  {
    id: 'init-4',
    version: 'v1.3.0',
    title: 'Sticky Category Bar & Header Dock',
    category: 'UI/UX',
    description: `• Sticky Category Bar: Added smooth sliding category switcher pill track.\n• Header Dock: Morphed top bar into floating glass dock on scroll.`,
    author: 'Damon',
    date: 'Aug 8, 2026',
  },
  {
    id: 'init-3',
    version: 'v1.2.0',
    title: 'RSA Key Encryption & Discord Role Security',
    category: 'Security',
    description: `• RSA Encryption: Client-side RSA keypair encryption for submission privacy.\n• Discord Verification: Discord guild membership and role verification.`,
    author: 'Damon',
    date: 'Aug 5, 2026',
  },
  {
    id: 'init-2',
    version: 'v1.1.0',
    title: 'Voter Audit Inspector & Fraud Protection',
    category: 'Feature',
    description: `• Voter Audit Inspector: Admin tools to inspect vote activity and disqualify invalid votes.\n• Analytics Dashboard: Live voting velocity charts.`,
    author: 'Damon',
    date: 'Aug 2, 2026',
  },
  {
    id: 'init-1',
    version: 'v1.0.0',
    title: 'Official Platform Launch',
    category: 'Feature',
    description: `• Official Release: Creation and launch of the Vital RP Photo Contest platform designed and built by Damon.`,
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

interface ChangelogBulletListProps {
  description: string;
  entryId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  maxCollapsedItems?: number;
}

const ChangelogBulletList: React.FC<ChangelogBulletListProps> = ({
  description,
  entryId,
  isExpanded,
  onToggle,
  maxCollapsedItems = 3,
}) => {
  const lines = description.split('\n').filter((l) => l.trim().length > 0);
  const isBulleted = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-') || /^\d+\.\s/.test(l.trim()));

  if (!isBulleted) {
    return (
      <div className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans whitespace-pre-line mt-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
        {renderTextWithCodePills(description)}
      </div>
    );
  }

  const shouldTruncate = lines.length > maxCollapsedItems;
  const visibleLines = isExpanded || !shouldTruncate ? lines : lines.slice(0, maxCollapsedItems);
  const hiddenCount = lines.length - maxCollapsedItems;

  return (
    <div className="space-y-2 mt-3 text-xs sm:text-sm font-sans leading-relaxed">
      <div className="space-y-2">
        {visibleLines.map((line, idx) => {
          const cleanLine = line.replace(/^([•\-]|^\d+\.)\s*/, '').trim();
          const parts = cleanLine.split(':');
          const hasTitle = parts.length > 1;
          const title = hasTitle ? parts[0].trim() : '';
          const body = hasTitle ? parts.slice(1).join(':').trim() : cleanLine;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
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
            </motion.div>
          );
        })}
      </div>

      {shouldTruncate && (
        <button
          type="button"
          onClick={() => onToggle(entryId)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 mt-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer select-none group/expand active:scale-[0.99]"
        >
          <span>{isExpanded ? 'Show less highlights' : `Show ${hiddenCount} more highlights`}</span>
          {isExpanded ? (
            <ChevronUp size={14} className="text-fivem-orange transition-transform duration-200" />
          ) : (
            <ChevronDown size={14} className="text-fivem-orange transition-transform duration-200 group-hover/expand:translate-y-0.5" />
          )}
        </button>
      )}
    </div>
  );
};

export function ChangelogTab() {
  const [entries, setEntries] = useState<ChangelogEntry[]>(INITIAL_CHANGELOGS);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(false);

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

  const handleToggleEntry = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (isAllExpanded) {
      setExpandedEntries(new Set());
      setIsAllExpanded(false);
    } else {
      const allIds = new Set(entries.map((e) => e.id || e.version));
      setExpandedEntries(allIds);
      setIsAllExpanded(true);
    }
  };

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

        {/* Search & Expand All Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
            title={isAllExpanded ? "Collapse all release details" : "Expand all release details"}
          >
            <ChevronsUpDown size={13} className="text-fivem-orange" />
            <span className="hidden sm:inline">{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>

          <div className="relative w-full sm:w-60">
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
      </div>

      {/* ── CHANGELOG TIMELINE LIST ── */}
      <div className="relative space-y-8">
        {/* Continuous Left Vertical Timeline Axis Line */}
        <div className="absolute left-[3.25rem] sm:left-[4.5rem] md:left-[9.5rem] top-6 bottom-6 w-px bg-gradient-to-b from-fivem-orange/40 via-white/15 to-transparent pointer-events-none hidden md:block" />

        {filteredEntries.map((entry, idx) => {
          const CategoryInfo = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES['Feature'];
          const CategoryIcon = CategoryInfo.icon;
          const entryKey = entry.id || entry.version;
          const isExpanded = expandedEntries.has(entryKey) || isAllExpanded;

          return (
            <motion.div
              key={entry.id || idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="relative flex flex-col md:flex-row items-start gap-4 sm:gap-6 md:gap-8 group"
            >
              {/* Left Column: Sticky Version Anchor & Timeline Node */}
              <div className="md:w-36 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 md:sticky md:top-24 z-10 w-full">
                
                {/* Glowing Node Dot (Desktop) */}
                <div className="hidden md:flex absolute right-[-2.25rem] top-2.5 w-4 h-4 rounded-full bg-[#09090b] border-2 border-fivem-orange items-center justify-center shadow-[0_0_12px_rgba(234,88,12,0.8)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-fivem-orange" />
                </div>

                {/* Version Code Pill */}
                <div className="flex flex-col items-start md:items-end leading-none gap-1">
                  <span className="px-3 py-1 rounded-xl bg-white/[0.06] border border-white/15 text-white font-mono font-bold text-xs tracking-wider shadow-inner group-hover:border-fivem-orange/50 group-hover:text-fivem-orange transition-all">
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

              {/* Right Column: Elevated Glass Content Card */}
              <div className="flex-1 w-full min-w-0">
                <motion.div
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
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

                  {/* Formatted Description Items with Expandable Truncation */}
                  <ChangelogBulletList
                    description={entry.description}
                    entryId={entryKey}
                    isExpanded={isExpanded}
                    onToggle={handleToggleEntry}
                    maxCollapsedItems={3}
                  />
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
