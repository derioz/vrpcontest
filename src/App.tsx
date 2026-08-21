/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  Upload,
  Vote,
  Settings,
  Trophy,
  Image as ImageIcon,
  User,
  ChevronRight,
  X,
  Plus,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Share2,
  LogOut,
  Info,
  Maximize2,
  Trash2,
  Bold,
  Italic,
  List,
  Heading,
  Calendar,
  Smile,
  Link as LinkIcon,
  Layers,
  BarChart3,
  Eye,
  EyeOff,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  Menu,
  Ban,
  CheckCircle,
  Edit3,
  Bug,
  RefreshCw,
  Sparkles,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { toast } from './components/ui/toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { cn, pixelateImage } from './lib/utils';
import { encryptUrl, decryptUrl, generateRSAKeyPair } from './lib/crypto';
import { downloadPhoto } from './lib/download';
import { verifyDiscordGuildAndRole, fetchFreshDiscordAvatar } from './lib/discord';
import { getProfileAvatar, getDiceBearAvatarUrl, AVAILABLE_DICEBEAR_STYLES, DiceBearStyleName } from './lib/dicebear';
import { DiscordRequirementsModal } from './components/DiscordRequirementsModal';
import { BugReportModal } from './components/BugReportModal';
import { ChampionBadge } from './components/ChampionBadge';
import { ProfileSheet } from './components/ProfileSheet';
import { ShaderBackground } from './components/ui/shader-background';
import { ShimmeringText } from './components/ui/shimmering-text';
import { Orb } from './components/ui/orb';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Sheet, SheetContent } from './components/ui/sheet';
import { VoteButton, VotersButton } from './components/VoteButton';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { NumberTicker } from './components/ui/number-ticker';
import { Marquee } from './components/ui/marquee';
import { DotPattern } from './components/ui/dot-pattern';
import { ShimmerButton } from './components/ui/shimmer-button';
import { AnimatedShinyText } from './components/ui/animated-shiny-text';
import { MagicCard } from './components/ui/magic-card';
import { BlurFade } from './components/ui/blur-fade';
import { RetroGrid } from './components/ui/retro-grid';
import { Spotlight } from './components/ui/spotlight';
import { Lens } from './components/ui/lens';
import { FlipWords } from './components/ui/flip-words';
import { CategoryNav } from './components/CategoryNav';
import { Toolbar, ToolbarItem } from './components/ui/toolbar';
import { HoverGradientNavBar, HoverGradientMenuItem } from './components/ui/hover-gradient-nav-bar';
import RadialCarousel, { RadialCarouselItem } from './components/shadcn-studio/carousel/carousel-12';
import { SparklesText } from './components/ui/sparkles-text';
import { GlowLine } from './components/ui/glowline';
import { Announcement } from './components/ui/announcement';
import { VelocityScroll } from './components/ui/scroll-based-velocity';
import { CountdownClock } from './components/ui/countdown-clock';


// Integrations
import { auth, discordProvider, db } from './lib/firebase';
import { signInWithPopup, signInAnonymously, onAuthStateChanged, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, User as FirebaseUser } from 'firebase/auth';
import { supabase } from './lib/supabase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, limit, setDoc, updateDoc, increment, addDoc, deleteDoc, writeBatch, deleteField, runTransaction } from 'firebase/firestore';

import { Category, Photo, Rule, Theme, ArchivedWinner } from './types';

import UploadForm from './components/UploadForm';
import { ContestInfoSidebar } from './components/ContestInfoSidebar';
const ArchivedWinnersView = lazy(() => import('./components/ArchivedWinnersView').then(m => ({ default: m.ArchivedWinnersView })));
const CategorySuggestionsView = lazy(() => import('./components/CategorySuggestionsView'));
const LightboxModal = lazy(() => import('./components/LightboxModal'));
const AnalyticsDashboard = lazy(() => import('./components/admin/AnalyticsDashboard'));
import AdminPanel from './components/admin/AdminPanel';
import { AdminDashboardPage, AdminRouteTab } from './components/admin/AdminDashboardPage';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';
import { ContestClosedModal } from './components/ContestClosedModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContestRulesSection } from './components/ContestRulesSection';
import { GridLinesLoginModal } from './components/GridLinesLoginModal';
import { Skeleton } from './components/ui/skeleton';



export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string | null>('categories');
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const categoryCacheRef = useRef<Map<string, { photos: Photo[]; timestamp: number }>>(new Map());
  const topNavContainerRef = useRef<HTMLDivElement>(null);
  const categoryHeaderRef = useRef<HTMLElement>(null);
  const pendingScrollCategoryRef = useRef<string | null>(null);

  // Helper to slugify category name for clean URLs (?category=farm-life)
  const slugifyCategory = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  // Helper to dynamically calculate total sticky navigation height across all viewports
  const getStickyNavHeight = useCallback(() => {
    if (topNavContainerRef.current) {
      const rect = topNavContainerRef.current.getBoundingClientRect();
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      // When at the very top, the navbar expands to 80px; when scrolled it shrinks to 56px (difference = 24px)
      const isCurrentlyAtTop = currentScrollY < 60;
      return isCurrentlyAtTop ? rect.height - 24 : rect.height;
    }
    return window.innerWidth >= 640 ? 126 : 108;
  }, []);

  // Dedicated function to smoothly and deterministically scroll to the Selected Category Header
  const scrollToCategoryHeader = useCallback((force = false) => {
    const headerEl = categoryHeaderRef.current || document.getElementById('category-header-anchor') || document.getElementById('submissions-area');
    if (!headerEl) return;

    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const headerRect = headerEl.getBoundingClientRect();
    const stickyHeight = getStickyNavHeight();
    const idealHeaderTop = stickyHeight + 16;
    const targetY = Math.max(0, currentScrollY + headerRect.top - idealHeaderTop);

    // Calculate distance from ideal docked position
    const deltaFromIdeal = Math.abs(headerRect.top - idealHeaderTop);

    // If the category header is not currently docked right below the sticky navigation (e.g. at Hero, Rules, scrolled up/down), smooth scroll to it
    if (deltaFromIdeal > 20 || force) {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, [getStickyNavHeight]);

  // Smart Category Selection:
  // - Updates category state and sets pending scroll flag
  // - Triggers scroll in post-render lifecycle so category header is guaranteed to be rendered
  const handleCategorySelect = useCallback((category: Category, forceScroll = false) => {
    setSelectedCategory(category);
    pendingScrollCategoryRef.current = category.id;

    // Synchronize category in URL query params without full page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const slug = slugifyCategory(category.name);
      if (url.searchParams.get('category') !== slug) {
        url.searchParams.set('category', slug);
        window.history.pushState({ categoryId: category.id }, '', url.toString());
      }
    }
  }, []);

  // Post-render lifecycle: trigger precise scroll after React has rendered the updated category header
  useEffect(() => {
    if (pendingScrollCategoryRef.current && selectedCategory?.id === pendingScrollCategoryRef.current) {
      pendingScrollCategoryRef.current = null;
      // Double requestAnimationFrame ensures React commit phase and browser layout reflow are complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToCategoryHeader();
        });
      });
    }
  }, [selectedCategory?.id, scrollToCategoryHeader]);

  // Listen to browser Back/Forward navigation to restore selected category
  useEffect(() => {
    const handlePopState = () => {
      if (categories.length === 0) return;
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category') || params.get('cat');
      if (catParam) {
        const match = categories.find(
          (c) =>
            c.id === catParam ||
            slugifyCategory(c.name) === catParam.toLowerCase() ||
            c.name.toLowerCase() === catParam.toLowerCase()
        );
        if (match) {
          setSelectedCategory(match);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [categories]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when category selection modal is active
  // Note: isMobileMenuOpen scroll lock is handled by Radix Dialog automatically
  useEffect(() => {
    if (isCategoryMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCategoryMenuOpen]);

  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [rulesMarkdown, setRulesMarkdown] = useState('');
  const [votingOpen, setVotingOpen] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const [onePhotoPerUser, setOnePhotoPerUser] = useState(false);
  const [showWinnersToggle, setShowWinnersToggle] = useState(false);
  const [siteClosed, setSiteClosed] = useState(false);
  const [censorSubmissions, setCensorSubmissions] = useState(false);
  const [adminBypassClosedModal, setAdminBypassClosedModal] = useState(false);
  const [showArchivedWinners, setShowArchivedWinners] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('view');
    const archiveId = params.get('archive') || params.get('winner');
    const storedView = localStorage.getItem('active_view');
    return tab === 'hall-of-fame' || tab === 'hof' || !!archiveId || storedView === 'hall-of-fame';
  });
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('view');
    const suggestionId = params.get('suggestion') || params.get('idea');
    const storedView = localStorage.getItem('active_view');
    return tab === 'suggestions' || tab === 'suggest' || !!suggestionId || storedView === 'suggestions';
  });
  const [playerName, setPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  // ── Router State for Dedicated Full-Page Routes (/admin, /admin/submissions, etc.) ──
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isAdminRoute = currentPath.startsWith('/admin');
  const rawTab = currentPath.replace(/^\/admin\/?/, '').split('/')[0];
  const adminSubTab: AdminRouteTab =
    rawTab === 'ideas' || rawTab === 'suggest'
      ? 'suggestions'
      : (['dashboard', 'analytics', 'submissions', 'suggestions', 'voters', 'contest', 'controls', 'changelogs', 'danger'].includes(rawTab)
          ? (rawTab as AdminRouteTab)
          : 'dashboard');

  const [isAdminMinimized, setIsAdminMinimized] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showNotAdminModal, setShowNotAdminModal] = useState(false);
  const [showDiscordReqModal, setShowDiscordReqModal] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [discordReqReason, setDiscordReqReason] = useState<'not_in_server' | 'missing_role' | 'api_error' | null>(null);
  const [discordReqMessage, setDiscordReqMessage] = useState<string | null>(null);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [notAdminClickCount, setNotAdminClickCount] = useState(0);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [userSubmissionCount, setUserSubmissionCount] = useState(0);
  const [userTotalVotes, setUserTotalVotes] = useState(0);

  const [activeContest, setActiveContest] = useState<{ id: string; name: string; submissions_close_date?: string; voting_end_date?: string } | null>(null);
  const [votedPhotoIds, setVotedPhotoIds] = useState<Set<string>>(new Set());
  const [votingPhotoId, setVotingPhotoId] = useState<string | null>(null);
  const isVotingInProgress = useRef<Set<string>>(new Set());
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [adminPreviewOpen, setAdminPreviewOpen] = useState(false);
  const [archivedWinners, setArchivedWinners] = useState<ArchivedWinner[]>([]);

  // ── Easter Egg: rapid-click logo triggers party mode ──
  const [easterEggActive, setEasterEggActive] = useState(false);
  const easterEggClicks = useRef(0);
  const easterEggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnConfetti = useCallback(() => {
    const orb = document.getElementById('easter-egg-orb');
    if (!orb) return;
    const rect = orb.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#ea580c', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#f43f5e'];
    const emojis = ['✨', '🎉', '🔥', '⭐', '🎊', '💎', '🚀', '🌟'];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('span');
      const useEmoji = Math.random() > 0.6;
      el.textContent = useEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : '●';
      el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${useEmoji ? Math.random() * 16 + 12 : Math.random() * 8 + 4}px;color:${colors[Math.floor(Math.random() * colors.length)]};pointer-events:none;z-index:9999;text-shadow:0 0 6px currentColor;will-change:transform,opacity;`;
      document.body.appendChild(el);
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.5;
      const velocity = 120 + Math.random() * 180;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity - 60;
      const anim = el.animate([
        { transform: 'translate(0, 0) scale(0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 140}px) scale(1.2) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ], { duration: 1000 + Math.random() * 600, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' });
      anim.onfinish = () => el.remove();
    }
  }, []);

  const handleLogoEasterEgg = useCallback(() => {
    easterEggClicks.current += 1;
    if (easterEggTimer.current) clearTimeout(easterEggTimer.current);
    easterEggTimer.current = setTimeout(() => { easterEggClicks.current = 0; }, 2000);
    if (easterEggClicks.current >= 7) {
      easterEggClicks.current = 0;
      if (easterEggTimer.current) clearTimeout(easterEggTimer.current);
      setEasterEggActive(true);
      spawnConfetti();
      toast('🎉 You found the secret!', {
        description: 'You are now officially a Vital RP detective.',
        duration: 3500,
        style: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(234,88,12,0.4)', color: '#fff' },
      });
      setTimeout(() => setEasterEggActive(false), 3000);
    }
  }, [spawnConfetti]);


  const isVotingOpen = votingOpen;
  const isSubmissionsOpen = submissionsOpen;

  // Persist current active view (Hall of Fame) across page refreshes
  useEffect(() => {
    const url = new URL(window.location.href);
    const currentTab = url.searchParams.get('tab') || url.searchParams.get('view');

    if (showArchivedWinners) {
      localStorage.setItem('active_view', 'hall-of-fame');
      if (currentTab !== 'hall-of-fame') {
        url.searchParams.set('tab', 'hall-of-fame');
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      const storedView = localStorage.getItem('active_view');
      if (storedView === 'hall-of-fame') {
        localStorage.removeItem('active_view');
      }
      if (currentTab === 'hall-of-fame' || currentTab === 'hof') {
        url.searchParams.delete('tab');
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [showArchivedWinners]);

  // photos for the currently-selected category (derived from allPhotos)
  const photos = useMemo(() => {
    if (!selectedCategory) return [];
    return allPhotos.filter(p => p.category_id === selectedCategory.id);
  }, [allPhotos, selectedCategory]);

  // Current logged-in user's photo submission for this contest
  const currentUserPhoto = useMemo(() => {
    if (!user || user.isAnonymous || !allPhotos.length) return null;
    return allPhotos.find(p =>
      (user.uid && (p.user_id === user.uid || p.uploader_uid === user.uid)) ||
      (user.displayName && p.discord_name === user.displayName) ||
      (user.providerData && user.providerData.some((pd: any) => pd.displayName === p.discord_name))
    ) || null;
  }, [user, allPhotos]);

  // Photos across ALL categories for the Hero 16:9 Radial Carousel
  const heroCarouselItems: RadialCarouselItem[] = useMemo(() => {
    if (allPhotos && allPhotos.length > 0) {
      return allPhotos.map((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const isPixelated = censorSubmissions && !votingOpen;
        return {
          id: p.id,
          image: p.image_url,
          title: p.caption || p.player_name || 'Vital RP Entry',
          category: cat ? cat.name : 'Contest Entry',
          voteCount: p.vote_count || 0,
          isPixelated,
          isDisqualified: p.is_disqualified,
          rawPhoto: p,
          onClick: () => {
            setLightboxPhoto(p);
          },
        };
      });
    }

    if (categories && categories.length > 0) {
      return categories.map((cat) => ({
        id: `cat-preview-${cat.id}`,
        image: cat.icon_url || 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-42.png',
        title: cat.description || `Submit your finest ${cat.name} photo`,
        category: cat.name,
        voteCount: 0,
        isPixelated: false,
        onClick: () => {
          handleCategorySelect(cat, true);
        },
      }));
    }

    return [];
  }, [allPhotos, categories, censorSubmissions, votingOpen, handleCategorySelect]);

  // Subscribe to archived_winners collection to track user win badges
  useEffect(() => {
    const q = query(collection(db, 'archived_winners'));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ArchivedWinner[];
      setArchivedWinners(fetched);
    }, (err) => {
      console.error('Archived winners listener error:', err);
    });
    return () => unsub();
  }, []);

  // Deep-Link URL Search Parameters Inspector (e.g. ?photo=XYZ, ?archive=XYZ, or ?suggestion=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const photoId = params.get('photo');
    const archiveId = params.get('archive') || params.get('winner');
    const tabParam = params.get('tab') || params.get('view');
    const suggestionId = params.get('suggestion') || params.get('idea');

    if (tabParam === 'suggestions' || tabParam === 'ideas' || suggestionId) {
      setShowCategorySuggestions(true);
    } else if (archiveId || photoId) {
      if (archiveId) {
        setShowArchivedWinners(true);
      } else if (photoId) {
        if (allPhotos.length > 0) {
          const match = allPhotos.find(p => p.id === photoId);
          if (match) {
            setLightboxPhoto(match);
          } else {
            setShowArchivedWinners(true);
          }
        }
      }
    }
  }, [allPhotos]);

  // Sync Category Suggestions state to localStorage and URL for seamless browser refresh persistence
  useEffect(() => {
    if (showCategorySuggestions) {
      localStorage.setItem('active_view', 'suggestions');
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') !== 'suggestions' && !params.get('suggestion')) {
        params.set('tab', 'suggestions');
        window.history.replaceState(null, '', `?${params.toString()}`);
      }
    } else {
      if (localStorage.getItem('active_view') === 'suggestions') {
        localStorage.removeItem('active_view');
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'suggestions' || params.get('view') === 'suggestions') {
        params.delete('tab');
        params.delete('view');
        params.delete('suggestion');
        params.delete('idea');
        const newSearch = params.toString();
        window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
      }
    }
  }, [showCategorySuggestions]);

  const winnerCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    archivedWinners.forEach((w) => {
      const docKeys = new Set<string>();
      if (w.discord_name) docKeys.add(w.discord_name.toLowerCase().trim());
      if (w.player_name) docKeys.add(w.player_name.toLowerCase().trim());
      if ((w as any).user_id) docKeys.add((w as any).user_id);

      docKeys.forEach(key => {
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return map;
  }, [archivedWinners]);

  const getUserWinCount = useCallback((discordName?: string, userId?: string, playerName?: string): number => {
    let count = 0;
    if (discordName) {
      count = Math.max(count, winnerCountsMap.get(discordName.toLowerCase().trim()) || 0);
    }
    if (userId) {
      count = Math.max(count, winnerCountsMap.get(userId) || 0);
    }
    if (playerName) {
      count = Math.max(count, winnerCountsMap.get(playerName.toLowerCase().trim()) || 0);
    }
    const storedPlayer = localStorage.getItem('fivem_player_name');
    if (storedPlayer) {
      count = Math.max(count, winnerCountsMap.get(storedPlayer.toLowerCase().trim()) || 0);
    }
    const storedDiscord = localStorage.getItem('fivem_discord_name');
    if (storedDiscord) {
      count = Math.max(count, winnerCountsMap.get(storedDiscord.toLowerCase().trim()) || 0);
    }
    return count;
  }, [winnerCountsMap]);

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      if (sortBy === 'top') return (b.vote_count || 0) - (a.vote_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [photos, sortBy]);

  const winners = useMemo(() => {
    if (!categories.length || !allPhotos.length) return [];
    return categories.map(cat => {
      const catPhotos = allPhotos.filter(p => p.category_id === cat.id && !p.is_disqualified);
      if (!catPhotos.length) return null;
      const topPhoto = [...catPhotos].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0];
      return {
        id: topPhoto.id,
        categoryName: cat.name,
        playerName: topPhoto.player_name,
        discordName: topPhoto.discord_name,
        imageUrl: topPhoto.image_url,
        caption: topPhoto.caption,
        voteCount: topPhoto.vote_count || 0,
      };
    }).filter(Boolean) as any[];
  }, [categories, allPhotos]);

  const sanitizeDownloadPart = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleDownloadWinningPhotos = async () => {
    if (!activeContest || winners.length === 0) {
      toast.error('No winning photos are available to download.');
      return;
    }

    const toastId = 'download-admin-winners';
    toast.loading('Preparing winning photos...', { id: toastId });

    let successCount = 0;

    for (const winner of winners) {
      const contestPart = sanitizeDownloadPart(activeContest.name) || 'current-contest';
      const categoryPart = sanitizeDownloadPart(winner.categoryName) || 'winner';
      const playerPart = sanitizeDownloadPart(winner.playerName) || 'player';
      const filename = `${contestPart}-${categoryPart}-${playerPart}.jpg`;

      const ok = await downloadPhoto(winner.imageUrl, filename);
      if (ok) {
        successCount += 1;
      } else {
        console.error('Admin winner download failed:', winner.id);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    if (successCount === winners.length) {
      toast.success('Downloaded all category winners.', { id: toastId });
    } else if (successCount > 0) {
      toast.error(`Downloaded ${successCount} of ${winners.length} winning photos.`, { id: toastId });
    } else {
      toast.error('Could not download the winning photos.', { id: toastId });
    }
  };

  const handleShare = (photo: Photo) => {
    const url = `${window.location.origin}/?photo=${photo.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  // Listen for Supabase Auth state changes
  useEffect(() => {
    const handleSessionUser = async (currentUser: any) => {
      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setIsAuthLoading(false);
        return;
      }

      // Map Supabase user metadata for compatibility with existing UI
      const meta = currentUser.user_metadata || {};
      let displayName = meta.full_name || meta.name || meta.custom_claims?.global_name || currentUser.email || 'Discord User';
      let avatarStyle: DiceBearStyleName = 'botttsNeutral';
      let avatarSeed: string = currentUser.id;

      const discordId = 
        meta.provider_id || 
        meta.sub || 
        currentUser.identities?.find((i: any) => i.provider === 'discord')?.identity_data?.provider_id ||
        currentUser.identities?.find((i: any) => i.provider === 'discord')?.identity_data?.sub ||
        currentUser.identities?.find((i: any) => i.provider === 'discord')?.id;

      // Extract raw Discord avatar from Supabase OAuth session
      const rawDiscordPhoto = meta.avatar_url || meta.picture || (meta.avatar && discordId ? `https://cdn.discordapp.com/avatars/${discordId}/${meta.avatar}.png` : null);

      let persistentDiscordPhoto = localStorage.getItem('user_discord_photo_url_' + currentUser.id) || null;
      let persistentAvatarSource = (localStorage.getItem('user_avatar_source_' + currentUser.id) as 'discord' | 'dicebear') || null;
      let persistentPhotoUrl = localStorage.getItem('user_photo_url_' + currentUser.id) || null;

      try {
        const userDocRef = doc(db, 'users', currentUser.id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.custom_display_name) displayName = uData.custom_display_name;
          if (uData.avatar_style) avatarStyle = uData.avatar_style as DiceBearStyleName;
          if (uData.avatar_seed) avatarSeed = uData.avatar_seed;
          if (uData.avatar_source) persistentAvatarSource = uData.avatar_source as 'discord' | 'dicebear';
          if (uData.discord_avatar_url) persistentDiscordPhoto = uData.discord_avatar_url;
          if (uData.photo_url) persistentPhotoUrl = uData.photo_url;
          else if (uData.avatar_url) persistentPhotoUrl = uData.avatar_url;
        } else {
          await setDoc(userDocRef, {
            uid: currentUser.id,
            discord_id: discordId ? String(discordId) : null,
            custom_display_name: displayName,
            avatar_style: avatarStyle,
            avatar_seed: avatarSeed,
            avatar_source: rawDiscordPhoto ? 'discord' : 'dicebear',
            discord_avatar_url: rawDiscordPhoto || null,
            photo_url: rawDiscordPhoto || getDiceBearAvatarUrl(avatarSeed, avatarStyle),
            default_discord_name: meta.full_name || meta.name || 'Discord User',
            updated_at: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (userErr) {
        console.warn("User profile doc fetch error:", userErr);
      }

      const verifiedDiscordPhoto = persistentDiscordPhoto || rawDiscordPhoto || (discordId ? `https://cdn.discordapp.com/avatars/${discordId}/avatar.png` : null);
      if (verifiedDiscordPhoto) {
        localStorage.setItem('user_discord_photo_url_' + currentUser.id, verifiedDiscordPhoto);
      }

      const avatarSource: 'discord' | 'dicebear' = persistentAvatarSource || (verifiedDiscordPhoto ? 'discord' : 'dicebear');
      
      let photoURL: string;
      if (avatarSource === 'discord' && verifiedDiscordPhoto) {
        photoURL = verifiedDiscordPhoto;
      } else {
        photoURL = getDiceBearAvatarUrl(avatarSeed, avatarStyle);
      }

      localStorage.setItem('user_avatar_source_' + currentUser.id, avatarSource);
      localStorage.setItem('user_photo_url_' + currentUser.id, photoURL);

      const normalizedUser = {
        uid: currentUser.id,
        id: currentUser.id,
        discordId: discordId ? String(discordId) : null,
        displayName,
        email: currentUser.email || '',
        avatarSource,
        discordPhotoURL: verifiedDiscordPhoto,
        photoURL,
        avatarStyle,
        avatarSeed,
        hasCustomOAuthAvatar: avatarSource === 'discord',
        providerData: currentUser.identities ? currentUser.identities.map((id: any) => ({
          providerId: id.provider === 'discord' ? 'oidc.discord' : id.provider,
          uid: discordId ? String(discordId) : (id.id || id.identity_data?.sub || currentUser.id),
          displayName,
          email: currentUser.email
        })) : [{ providerId: 'oidc.discord', uid: discordId ? String(discordId) : currentUser.id, displayName, email: currentUser.email }],
        rawSupabaseUser: currentUser,
      };

      setUser(normalizedUser);

      console.log('Supabase Auth User:', {
        uid: currentUser.id,
        discordId,
        displayName,
        email: currentUser.email,
        metadata: meta
      });

      // Check for admin status
      // Uses env-var list first (works without Firestore rules), then Firestore fallback
      try {
        // 1. Superadmin email check
        const userEmail = (currentUser.email || meta.email || '').toLowerCase();
        if (userEmail === 'tx.davidj@gmail.com' || userEmail === 'txdavidj@gmail.com') {
          console.log('✅ Superadmin matched by email:', userEmail);
          setIsAdmin(true);
          return;
        }

        // 2. Build set of IDs to check
        const idsToCheck = new Set<string>();
        if (discordId) idsToCheck.add(String(discordId));
        idsToCheck.add(String(currentUser.id));
        if (meta.sub) idsToCheck.add(String(meta.sub));
        if (meta.provider_id) idsToCheck.add(String(meta.provider_id));
        if (currentUser.identities) {
          currentUser.identities.forEach((idObj: any) => {
            if (idObj.id) idsToCheck.add(String(idObj.id));
            if (idObj.identity_data?.sub) idsToCheck.add(String(idObj.identity_data.sub));
            if (idObj.identity_data?.provider_id) idsToCheck.add(String(idObj.identity_data.provider_id));
          });
        }

        console.log('Admin check - user IDs:', [...idsToCheck]);

        // 3. Check against env-var admin list (primary — no Firestore rules needed)
        const envAdminIds = (import.meta.env.VITE_ADMIN_DISCORD_IDS || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        for (const id of idsToCheck) {
          if (envAdminIds.includes(id)) {
            console.log('✅ Admin matched via VITE_ADMIN_DISCORD_IDS env var, ID:', id);
            setIsAdmin(true);
            return;
          }
        }

        // 4. Firestore admins collection fallback
        let firestoreChecked = false;
        for (const id of idsToCheck) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', id));
            firestoreChecked = true;
            if (adminDoc.exists()) {
              console.log('✅ Admin matched via Firestore admins collection, ID:', id);
              setIsAdmin(true);
              return;
            }
          } catch (docErr: any) {
            console.warn(`Firestore admin lookup failed for ID ${id}:`, docErr?.code || docErr?.message || docErr);
          }
        }

        if (!firestoreChecked) {
          console.warn('⚠️ All Firestore admin lookups failed (rules may not be deployed). Add your Discord ID to VITE_ADMIN_DISCORD_IDS env var.');
        }

        console.log('❌ No admin match. Add one of these IDs to VITE_ADMIN_DISCORD_IDS or the Firestore "admins" collection:', [...idsToCheck]);
        setIsAdmin(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    const processSession = async (session: any) => {
      if (!session || !session.user) {
        handleSessionUser(null);
        return;
      }

      const discordId =
        session.user.user_metadata?.provider_id ||
        session.user.user_metadata?.sub ||
        session.user.identities?.find((i: any) => i.provider === 'discord')?.id ||
        session.user.identities?.find((i: any) => i.provider === 'discord')?.identity_data?.provider_id ||
        session.user.identities?.find((i: any) => i.provider === 'discord')?.identity_data?.sub;

      const verifyRes = await verifyDiscordGuildAndRole({
        providerToken: session.provider_token || null,
        discordId: discordId ? String(discordId) : null,
      });

      if (!verifyRes.allowed) {
        console.warn("🚫 Discord server/role check failed:", verifyRes);
        setDiscordReqReason(verifyRes.reason || 'not_in_server');
        setDiscordReqMessage(verifyRes.message || 'Access denied.');
        setShowDiscordReqModal(true);
        await supabase.auth.signOut();
        localStorage.removeItem('discord_provider_token');
        await handleSessionUser(null);
        return;
      }

      await handleSessionUser(session.user);
    };

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      processSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle email link sign-in callback (magic link from email)
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('oobCode');
            url.searchParams.delete('apiKey');
            url.searchParams.delete('lang');
            window.history.replaceState(null, '', url.pathname + url.search);
            toast.success('Signed in successfully!');
          })
          .catch((error) => {
            console.error('Email link sign-in error:', error);
            toast.error('Sign-in link expired or invalid. Please request a new one.');
          });
      }
    }
  }, []);

  const [archivedStats, setArchivedStats] = useState({ subs: 0, votes: 0 });

  // Fetch archived cumulative stats ONCE per user login (prevents repeated Firestore reads)
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setArchivedStats({ subs: 0, votes: 0 });
      return;
    }
    let cancelled = false;
    const lookupKey = user.displayName || user.uid;
    if (lookupKey) {
      getDoc(doc(db, 'user_stats', lookupKey)).then((statDoc) => {
        if (statDoc.exists() && !cancelled) {
          const stats = statDoc.data();
          setArchivedStats({
            subs: stats.archived_submissions || 0,
            votes: stats.archived_votes || 0,
          });
        }
      }).catch(e => console.error("Failed fetching user_stats", e));
    }
    return () => { cancelled = true; };
  }, [user?.uid, user?.displayName]);

  // Compute User Submissions and Received Votes synchronously from memory
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setUserSubmissionCount(0);
      setUserTotalVotes(0);
      return;
    }

    const userPhotos = allPhotos.filter(p =>
      (user.uid && p.user_id === user.uid) ||
      (user.displayName && p.discord_name === user.displayName)
    );

    const currentSubs = userPhotos.length;
    const currentVotes = userPhotos.reduce((sum, p) => sum + (p.vote_count || 0), 0);

    setUserSubmissionCount(currentSubs + archivedStats.subs);
    setUserTotalVotes(currentVotes + archivedStats.votes);
  }, [user, allPhotos, archivedStats]);


  // Track which photos the current user has voted on (real-time)
  useEffect(() => {
    if (!user) {
      setVotedPhotoIds(new Set());
      return;
    }
    const currentUid = user.uid;
    const q = query(collection(db, 'votes'), where('voterUid', '==', currentUid));
    const unsub = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(d => d.data().photoId as string));
      setVotedPhotoIds(ids);
    }, (err) => {
      console.error("Voted photos listener error:", err);
    });
    return () => unsub();
  }, [user]);
  // Fetch initial data (Real-time Firestore listeners)
  useEffect(() => {
    // 1. Listen to Global Settings (rules, theme, votingOpen)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVotingOpen(!!data.votingOpen);
        setSubmissionsOpen(data.submissionsOpen !== false);
        setOnePhotoPerUser(!!data.onePhotoPerUser); // default false (no limit)
        setShowWinnersToggle(!!data.showWinnersToggle);
        setSiteClosed(!!data.siteClosed);
        setCensorSubmissions(!!data.censorSubmissions);
        setRulesMarkdown(data.rulesMarkdown || '');
        if (data.theme) setCurrentTheme(data.theme);
        setPublicKey(data.publicKey || null);
        setPrivateKey(data.privateKey || null);
      }
    }, (err) => {
      console.error("Settings listener error:", err);
    });

    // 2. Listen to Active Contest
    const qContest = query(collection(db, 'contests'), where('is_active', '==', true), limit(1));
    const unsubContest = onSnapshot(qContest, async (snapshot) => {
      if (!snapshot.empty) {
        const activeDoc = snapshot.docs[0];
        const data = activeDoc.data();
        const contestData = {
          id: activeDoc.id,
          name: data.name,
          submissions_close_date: data.submissions_close_date,
          voting_end_date: data.voting_end_date
        };
        setActiveContest(contestData);

        // 3. Once we have an active contest, fetch its categories
        const qCats = query(collection(db, 'categories'), where('contest_id', '==', activeDoc.id));
        const catSnap = await getDocs(qCats);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];
        setCategories(cats);

        // Check if a category was requested via URL search param (?category=slug)
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const catParam = params ? (params.get('category') || params.get('cat')) : null;
        let matchedCat: Category | null = null;
        if (catParam) {
          matchedCat = cats.find(
            c =>
              c.id === catParam ||
              slugifyCategory(c.name) === catParam.toLowerCase() ||
              c.name.toLowerCase() === catParam.toLowerCase()
          ) || null;
        }

        setSelectedCategory(prev => {
          if (matchedCat) return matchedCat;
          if (!prev && cats.length > 0) return cats[0];
          if (prev && cats.find(c => c.id === prev.id)) return prev;
          return cats.length > 0 ? cats[0] : null;
        });
      } else {
        setActiveContest(null);
        setCategories([]);
        setSelectedCategory(null);
      }
    });

    return () => {
      unsubSettings();
      unsubContest();
    };
  }, []);

  // Apply theme
  useEffect(() => {
    if (currentTheme) {
      const root = document.documentElement;
      // Map generated theme colors to our existing CSS variables
      root.style.setProperty('--color-fivem-dark', currentTheme.colors.background);
      root.style.setProperty('--color-fivem-card', currentTheme.colors.card);
      root.style.setProperty('--color-fivem-orange', currentTheme.colors.primary);

      // Also set some utility variables for text if needed, though we mostly use white
      // We can use the text color for body if we want
      root.style.setProperty('--color-text', currentTheme.colors.text);

      // Update font if needed
      if (currentTheme.font === 'serif') {
        root.style.setProperty('--font-display', 'serif');
        root.style.setProperty('--font-sans', 'serif');
      } else {
        root.style.removeProperty('--font-display');
        root.style.removeProperty('--font-sans');
      }
    }
  }, [currentTheme]);

  const activeContestId = activeContest?.id;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute cache TTL

  // Decrypt and process photos
  const decryptAndProcessPhotos = useCallback(async (rawPhotos: Photo[]): Promise<Photo[]> => {
    const isCensoredNow = censorSubmissions && !votingOpen;

    return await Promise.all(rawPhotos.map(async (photo) => {
      if (privateKey && photo.encrypted_image_url) {
        try {
          const clearUrl = await decryptUrl(photo.encrypted_image_url, privateKey);
          return {
            ...photo,
            image_url: isCensoredNow ? (photo.censored_image_url || clearUrl) : clearUrl,
            clear_image_url: clearUrl
          };
        } catch (e) {
          console.error("Failed to decrypt photo", photo.id);
          return { ...photo, image_url: photo.censored_image_url || photo.image_url };
        }
      }

      if (isCensoredNow) {
        return {
          ...photo,
          image_url: photo.censored_image_url || photo.image_url,
          clear_image_url: photo.image_url
        };
      }

      if (photo.encrypted_image_url && !privateKey) {
        return { ...photo, image_url: photo.censored_image_url || photo.image_url };
      }

      return { ...photo, image_url: photo.image_url };
    }));
  }, [privateKey, censorSubmissions, votingOpen]);

  // Real-time photo listener: loads all contest submissions across all categories immediately on visit
  useEffect(() => {
    if (!activeContestId) {
      setAllPhotos([]);
      setIsCategoryLoading(false);
      return;
    }

    setIsCategoryLoading(true);
    let isCancelled = false;

    const qPhotos = collection(db, 'photos');
    const unsub = onSnapshot(qPhotos, async (snapshot) => {
      try {
        const rawPhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Photo[];
        const processed = await decryptAndProcessPhotos(rawPhotos);

        if (!isCancelled) {
          setAllPhotos(processed);
          setIsCategoryLoading(false);
        }
      } catch (err) {
        console.error("Photos listener processing error:", err);
        if (!isCancelled) {
          setIsCategoryLoading(false);
        }
      }
    }, (err) => {
      console.error("Photos listener error:", err);
      if (!isCancelled) {
        setIsCategoryLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      unsub();
    };
  }, [activeContestId, decryptAndProcessPhotos]);

  // Subscribe to flagged_voters collection
  const [flaggedVoterIds, setFlaggedVoterIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, 'flagged_voters'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data();
          if (d.id) ids.add(d.id.toLowerCase());
          if (data.voterUid) ids.add(String(data.voterUid).toLowerCase());
          if (data.uid) ids.add(String(data.uid).toLowerCase());
          if (data.id) ids.add(String(data.id).toLowerCase());
          if (data.voterName) ids.add(String(data.voterName).toLowerCase());
        });
        setFlaggedVoterIds(ids);
      },
      (err) => {
        console.error('Flagged voters listener error:', err);
      }
    );
    return () => unsub();
  }, []);

  const handleToggleDisqualifyPhoto = async (photoId: string, disqualify: boolean, reason?: string) => {
    try {
      const photoRef = doc(db, 'photos', photoId);
      if (disqualify) {
        await updateDoc(photoRef, {
          is_disqualified: true,
          disqualification_reason: reason || 'Disqualified by admin',
        });
        toast.success('Photo marked as Disqualified');
      } else {
        await updateDoc(photoRef, {
          is_disqualified: false,
          disqualification_reason: deleteField(),
        });
        toast.success('Photo re-qualified successfully');
      }

      // Optimistically update memory and cache
      setAllPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_disqualified: disqualify, disqualification_reason: disqualify ? (reason || 'Disqualified by admin') : undefined } : p));
      const targetPhoto = allPhotos.find(p => p.id === photoId);
      if (targetPhoto?.category_id) {
        const cached = categoryCacheRef.current.get(targetPhoto.category_id);
        if (cached) {
          cached.photos = cached.photos.map(p => p.id === photoId ? { ...p, is_disqualified: disqualify, disqualification_reason: disqualify ? (reason || 'Disqualified by admin') : undefined } : p);
        }
      }
    } catch (error: any) {
      console.error('Failed to update disqualification status:', error);
      toast.error('Failed to update disqualification status: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleVote = async (photoId: string) => {
    if (!isVotingOpen) {
      toast.error('Voting is currently closed');
      return;
    }

    if (!user) {
      toast.error('Please sign in with Discord to vote!');
      setShowSignInModal(true);
      return;
    }

    const voterUid = user.uid;

    if (flaggedVoterIds.has(voterUid)) {
      toast.error('Your account has been flagged as an alt account and cannot vote.');
      return;
    }

    const targetPhoto = allPhotos.find((p) => p.id === photoId);
    if (targetPhoto?.is_disqualified) {
      toast.error('This photo is disqualified and cannot receive votes.');
      return;
    }

    // Debounce / lock duplicate in-flight calls on the exact same photo
    const lockKey = `${photoId}_${voterUid}`;
    if (isVotingInProgress.current.has(lockKey)) {
      return;
    }
    isVotingInProgress.current.add(lockKey);

    let currentName = playerName;
    if (!currentName) {
      currentName = user.displayName || 'Discord User';
    }

    try {
      let actionResult: 'voted' | 'unvoted' = 'voted';

      await runTransaction(db, async (transaction) => {
        const voteRef = doc(db, 'votes', `${photoId}_${voterUid}`);
        const photoRef = doc(db, 'photos', photoId);

        const voteSnap = await transaction.get(voteRef);
        const photoSnap = await transaction.get(photoRef);

        if (voteSnap.exists()) {
          // Already voted — atomically remove vote doc and decrement photo count
          transaction.delete(voteRef);
          if (photoSnap.exists()) {
            const currentVotes = photoSnap.data().vote_count || 0;
            transaction.update(photoRef, { vote_count: Math.max(0, currentVotes - 1) });
          }
          actionResult = 'unvoted';
        } else {
          // Cast new vote — atomically write vote doc and increment photo count
          transaction.set(voteRef, {
            photoId,
            voterName: currentName,
            voterUid: voterUid,
            voterDiscord: user?.displayName || currentName,
            timestamp: new Date().toISOString()
          });
          if (photoSnap.exists()) {
            const currentVotes = photoSnap.data().vote_count || 0;
            transaction.update(photoRef, { vote_count: currentVotes + 1 });
          }
          actionResult = 'voted';
        }
      });

      if (actionResult === 'voted') {
        toast.success('Vote recorded!');
      } else {
        toast.success('Vote removed!');
      }

      // Optimistically update photo vote count in memory & category cache
      setAllPhotos(prev => prev.map(p => {
        if (p.id === photoId) {
          const newCount = actionResult === 'voted' ? (p.vote_count || 0) + 1 : Math.max(0, (p.vote_count || 0) - 1);
          return { ...p, vote_count: newCount };
        }
        return p;
      }));

      if (targetPhoto?.category_id) {
        const cached = categoryCacheRef.current.get(targetPhoto.category_id);
        if (cached) {
          cached.photos = cached.photos.map(p => {
            if (p.id === photoId) {
              const newCount = actionResult === 'voted' ? (p.vote_count || 0) + 1 : Math.max(0, (p.vote_count || 0) - 1);
              return { ...p, vote_count: newCount };
            }
            return p;
          });
        }
      }
    } catch (error: any) {
      console.error("Vote Error:", error);
      toast.error(error?.message || 'Network error or vote failed');
    } finally {
      setTimeout(() => {
        isVotingInProgress.current.delete(lockKey);
      }, 350);
    }
  };

  const handleResetVotes = async () => {
    if (!isAdmin) return;
    const toastId = toast.loading('Resetting all votes to 0...');
    try {
      // 1. Clear all vote records from 'votes' collection
      const votesSnap = await getDocs(collection(db, 'votes'));
      const batchSize = 450;
      let batch = writeBatch(db);
      let count = 0;

      for (const voteDoc of votesSnap.docs) {
        batch.delete(voteDoc.ref);
        count++;
        if (count % batchSize === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % batchSize !== 0 && count > 0) {
        await batch.commit();
      }

      // 2. Reset vote_count to 0 on all photos in 'photos' collection
      const photosSnap = await getDocs(collection(db, 'photos'));
      let photoBatch = writeBatch(db);
      let pCount = 0;

      for (const photoDoc of photosSnap.docs) {
        photoBatch.update(photoDoc.ref, { vote_count: 0 });
        pCount++;
        if (pCount % batchSize === 0) {
          await photoBatch.commit();
          photoBatch = writeBatch(db);
        }
      }
      if (pCount % batchSize !== 0 && pCount > 0) {
        await photoBatch.commit();
      }

      // Invalidate memory cache so fresh 0 votes reflect everywhere
      categoryCacheRef.current.clear();
      setAllPhotos(prev => prev.map(p => ({ ...p, vote_count: 0 })));
      setVotedPhotoIds(new Set());
      toast.success('Successfully reset all votes to 0!', { id: toastId });
    } catch (error: any) {
      console.error('Failed to reset votes:', error);
      toast.error('Failed to reset votes: ' + (error?.message || 'Unknown error'), { id: toastId });
    }
  };

  const handleDeletePhoto = async (photoId: string, photoDiscordName: string, skipConfirm = false) => {
    // Ownership check: only the photo owner or an admin can delete
    const targetPhoto = allPhotos.find(p => p.id === photoId);
    const isOwner = user && (
      (targetPhoto?.user_id && targetPhoto.user_id === user.uid) ||
      (targetPhoto?.uploader_uid && targetPhoto.uploader_uid === user.uid) ||
      (user.displayName && photoDiscordName && user.displayName === photoDiscordName) ||
      (user.providerData && user.providerData.some((p: any) => p.displayName === photoDiscordName))
    );
    if (!isAdmin && !isOwner) {
      toast.error('You can only delete your own photos');
      return false;
    }
    if (!skipConfirm && !window.confirm("Are you sure you want to delete this photo?")) return false;
    try {
      await deleteDoc(doc(db, 'photos', photoId));
      if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
      setAllPhotos(prev => prev.filter(p => p.id !== photoId));
      if (targetPhoto?.category_id) {
        const cached = categoryCacheRef.current.get(targetPhoto.category_id);
        if (cached) {
          cached.photos = cached.photos.filter(p => p.id !== photoId);
        }
      }
      toast.success('Photo deleted successfully!');
      return true;
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error('Failed to delete photo');
      return false;
    }
  };

  const handleUpload = async (imageData: string, caption: string, discordName: string, formPlayerName: string, categoryId: string) => {
    if (!isSubmissionsOpen) {
      toast.error('Submissions are currently closed');
      return;
    }
    // Enforce 1-photo-per-user limit server-side guard
    if (onePhotoPerUser && userSubmissionCount >= 1) {
      toast.error('Only 1 submission per user is allowed.');
      return;
    }
    if (!categoryId || !formPlayerName || !discordName) return;

    try {
      toast.loading("Encrypting and uploading securely...", { id: "upload-toast" });

      // 1. Pixelate original image
      const censoredDataUrl = await pixelateImage(imageData, 60);

      // Convert base64 data URLs to Blobs
      const res = await fetch(imageData);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('file', blob, `entry_${Date.now()}.png`);

      const censoredRes = await fetch(censoredDataUrl);
      const censoredBlob = await censoredRes.blob();
      const censoredFormData = new FormData();
      censoredFormData.append('file', censoredBlob, `censored_${Date.now()}.png`);

      const headers = { 'Authorization': 'IHo5KJCgcYdVYCqAZsnYokzPAYoUnTsK' };

      const [uploadRes, censoredUploadRes] = await Promise.all([
        fetch('https://api.fivemanage.com/api/image', { method: 'POST', headers, body: formData }),
        fetch('https://api.fivemanage.com/api/image', { method: 'POST', headers, body: censoredFormData })
      ]);

      if (!uploadRes.ok || !censoredUploadRes.ok) {
        throw new Error('Failed to upload image to Fivemanage');
      }

      const uploadData = await uploadRes.json();
      const downloadURL = uploadData.url;

      const censoredUploadData = await censoredUploadRes.json();
      const censoredURL = censoredUploadData.url;

      let encryptedURL = '';
      if (publicKey) {
        encryptedURL = await encryptUrl(downloadURL, publicKey);
      } else {
        console.warn("No public key found, falling back to unencrypted storage (Not Recommended).");
      }

      const newPhoto = {
        category_id: categoryId,
        player_name: formPlayerName,
        discord_name: discordName,
        user_id: user?.uid || auth.currentUser?.uid || '',
        uploader_uid: auth.currentUser?.uid || user?.uid || '',
        user_photo_url: user?.photoURL || null,
        author_avatar_url: user?.photoURL || null,
        avatar_seed: user?.avatarSeed || null,
        avatar_style: user?.avatarStyle || null,
        image_url: publicKey ? censoredURL : downloadURL,
        censored_image_url: censoredURL,
        encrypted_image_url: encryptedURL,
        caption: caption || '',
        created_at: new Date().toISOString(),
        vote_count: 0
      };

      await addDoc(collection(db, 'photos'), newPhoto);

      // Invalidate category cache to ensure freshly uploaded photo displays
      categoryCacheRef.current.delete(categoryId);

      toast.success('Secure upload successful!', { id: "upload-toast" });
      setShowUploadModal(false);

      setPlayerName(formPlayerName);
      localStorage.setItem('fivem_player_name', formPlayerName);
      localStorage.setItem('fivem_discord_name', discordName);
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error('Failed to upload photo');
    }
  };

  const toggleVoting = async (open: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { votingOpen: open });
      setVotingOpen(open);
      toast.success(`Voting ${open ? 'opened' : 'closed'}`);
    } catch (error) {
      console.error("Toggle Voting Error:", error);
      toast.error('Failed to toggle voting');
    }
  };

  const toggleSubmissions = async (open: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { submissionsOpen: open });
      setSubmissionsOpen(open);
      toast.success(`Submissions ${open ? 'opened' : 'closed'}`);
    } catch (error) {
      console.error("Toggle Submissions Error:", error);
      toast.error('Failed to toggle submissions');
    }
  };

  const toggleOnePhotoPerUser = async (enabled: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { onePhotoPerUser: enabled });
      setOnePhotoPerUser(enabled);
      toast.success(enabled ? '1-photo limit enabled' : '1-photo limit disabled');
    } catch (error) {
      console.error("Toggle OnePhotoPerUser Error:", error);
      toast.error('Failed to toggle limit');
    }
  };

  const toggleShowWinners = async (enabled: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { showWinnersToggle: enabled });
      setShowWinnersToggle(enabled);
      toast.success(enabled ? 'Winner announcement visible' : 'Winner announcement hidden');
    } catch (error) {
      console.error("Toggle ShowWinners Error:", error);
      toast.error('Failed to toggle winner announcement');
    }
  };

  const toggleSiteClosed = async (closed: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { siteClosed: closed });
      setSiteClosed(closed);
      toast.success(`Contest access ${closed ? 'restricted (Site Closed Mode Active)' : 'opened to all users'}`);
    } catch (error) {
      console.error("Toggle Site Closed Error:", error);
      toast.error('Failed to toggle site closed status');
    }
  };

  const handleGenerateKeys = async () => {
    if (!isAdmin) return;
    if (publicKey && !window.confirm("Keys already exist. Generating new keys will completely break existing encrypted images. Continue?")) return;

    try {
      const keys = await generateRSAKeyPair();
      localStorage.setItem(`vrp_private_key`, keys.privateKey);
      await setDoc(doc(db, 'secrets', 'keys'), { privateKey: keys.privateKey }, { merge: true });
      await updateDoc(doc(db, 'settings', 'global'), { publicKey: keys.publicKey, privateKey: null });
      toast.success("Security keys generated! Private key saved securely.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate keys");
    }
  };

  const handleToggleReveal = async (reveal: boolean) => {
    if (!isAdmin) return;
    try {
      if (reveal) {
        let storedKey = localStorage.getItem(`vrp_private_key`);
        if (!storedKey) {
          const secretDoc = await getDoc(doc(db, 'secrets', 'keys'));
          if (secretDoc.exists()) storedKey = secretDoc.data().privateKey;
        }
        
        if (!storedKey) {
          toast.error("Private key not found. Cannot reveal.");
          return;
        }
        await updateDoc(doc(db, 'settings', 'global'), { privateKey: storedKey });
        toast.success("Images Revealed!");
      } else {
        await updateDoc(doc(db, 'settings', 'global'), { privateKey: null });
        toast.success("Images Censored securely.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle reveal");
    }
  };

  const toggleCensorSubmissions = async (enabled: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), { censorSubmissions: enabled });
      toast.success(
        enabled
          ? "Image censoring enabled (Submissions pixelated until voting starts)."
          : "Image censoring disabled (Full resolution images visible)."
      );
    } catch (error) {
      console.error("Failed to toggle censor submissions:", error);
      toast.error("Failed to update censor setting");
    }
  };

  const handleDiscordLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
          scopes: 'identify email guilds.members.read'
        }
      });
      if (error) {
        toast.error(`Authentication failed: ${error.message}`);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Detailed Discord Auth Error:", error);
      toast.error(`Authentication failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('discord_provider_token');
      setUser(null);
      setIsAdmin(false);
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error("Failed to sign out");
    }
  };

  const handleChangeAvatarStyle = async (newStyle: DiceBearStyleName) => {
    if (!user || user.isAnonymous) return;
    const seed = user.avatarSeed || user.uid;
    const newAvatarUrl = getDiceBearAvatarUrl(seed, newStyle);
    
    // Update local user state
    setUser((prev: any) => prev ? { 
      ...prev, 
      avatarStyle: newStyle, 
      photoURL: prev.hasCustomOAuthAvatar ? prev.photoURL : newAvatarUrl 
    } : null);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { avatar_style: newStyle, updated_at: new Date().toISOString() }, { merge: true });
      const matchedStyle = AVAILABLE_DICEBEAR_STYLES.find(s => s.id === newStyle);
      toast.success(`Avatar style updated to ${matchedStyle?.label || newStyle}!`);
    } catch (err) {
      console.error('Failed to update avatar style:', err);
      toast.error('Failed to update avatar style');
    }
  };

  const handleShuffleAvatarSeed = async () => {
    if (!user || user.isAnonymous) return;
    const newSeed = Math.random().toString(36).substring(2, 10);
    const style = user.avatarStyle || 'botttsNeutral';
    const newAvatarUrl = getDiceBearAvatarUrl(newSeed, style);

    // Update local user state
    setUser((prev: any) => prev ? { 
      ...prev, 
      avatarSeed: newSeed, 
      photoURL: newAvatarUrl,
      hasCustomOAuthAvatar: false 
    } : null);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { avatar_seed: newSeed, updated_at: new Date().toISOString() }, { merge: true });
      toast.success('Generated a new random DiceBear avatar!');
    } catch (err) {
      console.error('Failed to shuffle avatar:', err);
      toast.error('Failed to randomize avatar');
    }
  };

  const handleRetryDiscordAvatar = async () => {
    if (!user || user.isAnonymous) {
      toast.error('Please sign in to pull your Discord photo.');
      return;
    }

    const toastId = 'retry-discord-avatar';
    toast.loading('Fetching latest Discord photo...', { id: toastId });

    try {
      // Refresh current Supabase session metadata
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      const meta = currentUser?.user_metadata || user.rawSupabaseUser?.user_metadata || {};

      const discordId = 
        user.discordId ||
        meta.provider_id || 
        meta.sub || 
        currentUser?.identities?.find((i: any) => i.provider === 'discord')?.identity_data?.provider_id ||
        currentUser?.identities?.find((i: any) => i.provider === 'discord')?.id;

      // Pull latest avatar directly from Discord API via multi-tiered resolver
      const freshRes = await fetchFreshDiscordAvatar(discordId ? String(discordId) : null);
      let discordAvatar = freshRes.avatarUrl;

      if (!discordAvatar) {
        discordAvatar = meta.avatar_url || meta.picture || (meta.avatar && discordId ? `https://cdn.discordapp.com/avatars/${discordId}/${meta.avatar}.png` : null);
      }

      if (!discordAvatar && discordId) {
        discordAvatar = `https://cdn.discordapp.com/avatars/${discordId}/avatar.png`;
      }

      if (discordAvatar) {
        const freshAvatarUrl = `${discordAvatar.split('?')[0]}?t=${Date.now()}`;

        // Verify image loads
        const imgTest = new Image();
        imgTest.src = freshAvatarUrl;
        
        await new Promise((resolve) => {
          imgTest.onload = () => resolve(true);
          imgTest.onerror = () => resolve(false);
        });

        setUser((prev: any) => prev ? {
          ...prev,
          avatarSource: 'discord',
          discordPhotoURL: freshAvatarUrl,
          photoURL: freshAvatarUrl,
          hasCustomOAuthAvatar: true,
        } : null);

        // Cache in localStorage for instant 0ms retrieval on page loads
        localStorage.setItem('user_avatar_source_' + user.uid, 'discord');
        localStorage.setItem('user_discord_photo_url_' + user.uid, freshAvatarUrl);
        localStorage.setItem('user_photo_url_' + user.uid, freshAvatarUrl);

        try {
          // 1. Save in Firestore users collection
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            avatar_source: 'discord',
            discord_avatar_url: freshAvatarUrl,
            photo_url: freshAvatarUrl,
            avatar_url: freshAvatarUrl,
            updated_at: new Date().toISOString(),
          }, { merge: true });

          // 2. Retroactively update all active photo submissions by this user
          const photosQuery = query(collection(db, 'photos'), where('user_id', '==', user.uid));
          const photosSnap = await getDocs(photosQuery);
          if (!photosSnap.empty) {
            const batch = writeBatch(db);
            photosSnap.docs.forEach((photoDoc) => {
              batch.update(photoDoc.ref, {
                user_photo_url: freshAvatarUrl,
                author_avatar_url: freshAvatarUrl,
                submitter_avatar: freshAvatarUrl,
              });
            });
            await batch.commit();
          }

          // 3. Retroactively update all category suggestions & staff votes by this user
          const suggestionsSnap = await getDocs(collection(db, 'category_suggestions'));
          if (!suggestionsSnap.empty) {
            const batch = writeBatch(db);
            let hasChanges = false;
            suggestionsSnap.docs.forEach((sDoc) => {
              const sData = sDoc.data();
              const isAuthor = sData.user_id === user.uid || (user.discordId && sData.discord_id === user.discordId);
              const votes = Array.isArray(sData.admin_votes) ? sData.admin_votes : [];
              const hasMyAdminVote = votes.some((v: any) =>
                v.adminId === user.uid ||
                (user.discordId && v.adminId === user.discordId) ||
                (v.adminName && user.displayName && v.adminName.toLowerCase() === user.displayName.toLowerCase())
              );

              if (isAuthor || hasMyAdminVote) {
                hasChanges = true;
                const updatedVotes = votes.map((v: any) => {
                  if (
                    v.adminId === user.uid ||
                    (user.discordId && v.adminId === user.discordId) ||
                    (v.adminName && user.displayName && v.adminName.toLowerCase() === user.displayName.toLowerCase())
                  ) {
                    return { ...v, adminAvatarUrl: freshAvatarUrl };
                  }
                  return v;
                });

                batch.update(sDoc.ref, {
                  ...(isAuthor ? { author_avatar_url: freshAvatarUrl } : {}),
                  ...(hasMyAdminVote ? { admin_votes: updatedVotes } : {})
                });
              }
            });
            if (hasChanges) {
              await batch.commit();
            }
          }

          // 4. Optimistically update local gallery photos state so avatar displays instantly
          setAllPhotos((prev) =>
            prev.map((p) =>
              p.user_id === user.uid || (p as any).uploader_uid === user.uid
                ? { ...p, user_photo_url: freshAvatarUrl, author_avatar_url: freshAvatarUrl }
                : p
            )
          );
        } catch (dbErr) {
          console.warn('Failed to sync photo_url across collections in Firestore:', dbErr);
        }

        toast.success('Successfully updated Discord profile picture across the entire website!', { id: toastId });
        return freshAvatarUrl;
      } else {
        toast.error('No Discord avatar found. Make sure your Discord account has an avatar uploaded.', { id: toastId });
        return null;
      }
    } catch (err) {
      console.error('Error refreshing Discord avatar:', err);
      toast.error('Failed to pull latest Discord photo.', { id: toastId });
      return null;
    }
  };

  const handleSaveProfile = async ({
    displayName: newName,
    avatarStyle: newStyle,
    avatarSeed: newSeed,
    avatarSource: newSource,
  }: {
    displayName: string;
    avatarStyle: DiceBearStyleName;
    avatarSeed: string;
    avatarSource: 'discord' | 'dicebear';
  }) => {
    if (!user) return;
    const cleanName = newName.trim();
    if (!cleanName) {
      toast.error('Display name cannot be empty');
      return;
    }

    const toastId = 'save-profile-toast';
    toast.loading('Saving profile changes...', { id: toastId });

    try {
      let resolvedPhotoUrl: string;

      if (newSource === 'discord') {
        let discordUrl = user.discordPhotoURL || localStorage.getItem('user_discord_photo_url_' + user.uid);
        if (!discordUrl && user.discordId) {
          const fresh = await fetchFreshDiscordAvatar(user.discordId);
          if (fresh.avatarUrl) discordUrl = fresh.avatarUrl;
        }
        resolvedPhotoUrl = discordUrl || getDiceBearAvatarUrl(newSeed, newStyle);
      } else {
        resolvedPhotoUrl = getDiceBearAvatarUrl(newSeed, newStyle);
      }

      // Optimistic update
      setUser((prev: any) => prev ? {
        ...prev,
        displayName: cleanName,
        avatarSource: newSource,
        avatarStyle: newStyle,
        avatarSeed: newSeed,
        photoURL: resolvedPhotoUrl,
        hasCustomOAuthAvatar: newSource === 'discord',
      } : null);
      setPlayerName(cleanName);
      localStorage.setItem('fivem_player_name', cleanName);
      localStorage.setItem('user_avatar_source_' + user.uid, newSource);
      localStorage.setItem('user_photo_url_' + user.uid, resolvedPhotoUrl);

      // 1. Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      const updatePayload: Record<string, any> = {
        uid: user.uid,
        discord_id: user.discordId || null,
        custom_display_name: cleanName,
        avatar_source: newSource,
        avatar_style: newStyle,
        avatar_seed: newSeed,
        photo_url: resolvedPhotoUrl,
        avatar_url: resolvedPhotoUrl,
        updated_at: new Date().toISOString(),
      };

      if (newSource === 'discord' && resolvedPhotoUrl) {
        updatePayload.discord_avatar_url = resolvedPhotoUrl;
        localStorage.setItem('user_discord_photo_url_' + user.uid, resolvedPhotoUrl);
      }

      await setDoc(userDocRef, updatePayload, { merge: true });

      // 2. Update Supabase Auth metadata
      try {
        await supabase.auth.updateUser({
          data: { full_name: cleanName, name: cleanName }
        });
      } catch (authErr) {
        console.warn('Supabase auth update notice:', authErr);
      }

      // 3. Retroactively sync user's name & avatar across active submissions in Firestore
      try {
        const photosQuery = query(collection(db, 'photos'), where('user_id', '==', user.uid));
        const photosSnap = await getDocs(photosQuery);
        if (!photosSnap.empty) {
          const batch = writeBatch(db);
          photosSnap.docs.forEach((pDoc) => {
            batch.update(pDoc.ref, {
              discord_name: cleanName,
              user_photo_url: resolvedPhotoUrl,
              author_avatar_url: resolvedPhotoUrl,
              submitter_avatar: resolvedPhotoUrl,
            });
          });
          await batch.commit();
        }

        // Update local gallery state
        setAllPhotos((prev) =>
          prev.map((p) =>
            p.user_id === user.uid || (p as any).uploader_uid === user.uid
              ? { ...p, discord_name: cleanName, user_photo_url: resolvedPhotoUrl, author_avatar_url: resolvedPhotoUrl }
              : p
          )
        );
      } catch (syncErr) {
        console.warn('Failed to sync submissions:', syncErr);
      }

      toast.success('Profile and avatar updated across the entire website!', { id: toastId });
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile changes.', { id: toastId });
    }
  };

  const handleSaveDisplayName = async () => {
    if (!editedDisplayName.trim() || !user) {
      toast.error('Display name cannot be empty');
      return;
    }
    const cleanName = editedDisplayName.trim();

    // Optimistically update local state so UI & profile update instantly!
    setUser((prev: any) => (prev ? { ...prev, displayName: cleanName } : null));
    setPlayerName(cleanName);
    localStorage.setItem('fivem_player_name', cleanName);
    setIsEditingDisplayName(false);

    toast.success('Display name updated across the website!');

    try {
      // 1. Save persistent custom display name in Firestore 'users' collection
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        discord_id: user.discordId || null,
        custom_display_name: cleanName,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      // 2. Update Supabase Auth user metadata
      const { error } = await supabase.auth.updateUser({
        data: { full_name: cleanName, name: cleanName }
      });
      if (error) {
        console.warn("Supabase name update warning:", error);
      }

      // 3. Batch update existing photo submissions by this user in Firestore so their new name updates for ALL website visitors retroactively!
      try {
        const photosQuery = query(collection(db, 'photos'), where('user_id', '==', user.uid));
        const photosSnap = await getDocs(photosQuery);
        if (!photosSnap.empty) {
          const batch = writeBatch(db);
          photosSnap.docs.forEach(photoDoc => {
            batch.update(photoDoc.ref, {
              player_name: cleanName,
              discord_name: cleanName,
            });
          });
          await batch.commit();
        }
      } catch (photoErr) {
        console.warn("Could not batch update user photos:", photoErr);
      }
    } catch (err: any) {
      console.warn("Background profile persistence note:", err);
    }
  };

  const handleUploadClick = async () => {
    if (!isSubmissionsOpen) {
      toast.error('Submissions are currently closed');
      return;
    }
    if (onePhotoPerUser && userSubmissionCount >= 1) {
      toast.error('You have already submitted a photo. Only 1 submission per user is allowed.');
      return;
    }

    if (user) {
      setShowUploadModal(true);
      return;
    }

    setShowSignInModal(true);
  };


  // ── Scroll-aware Signal Bar hooks ──
  const navbarRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const rawNavH = useTransform(scrollY, [0, 80], [80, 56]);
  const navH = useSpring(rawNavH, { stiffness: 200, damping: 30, mass: 0.5 });
  const navBg = useTransform(scrollY, [0, 80], ['rgba(9,9,11,0.6)', 'rgba(9,9,11,0.95)']);

  const isSiteLocked = siteClosed && (!isAdmin || !adminBypassClosedModal);

  // ── Router Check: If URL starts with /admin, render Dedicated AdminCN Dashboard ──
  if (isAdminRoute) {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen w-full bg-[#07070a] text-white flex flex-col items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-fivem-orange mb-3" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-widest">
            Verifying Admin Session...
          </span>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <AdminRouteGuard
          user={user}
          onNavigateHome={() => navigateTo('/')}
          onOpenSignIn={() => setShowSignInModal(true)}
        />
      );
    }

    return (
      <AdminDashboardPage
        currentTab={adminSubTab}
        onNavigateTab={(tab) => navigateTo(tab === 'dashboard' ? '/admin' : `/admin/${tab}`)}
        onNavigateHome={() => navigateTo('/')}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        user={user}
        activeContest={activeContest}
        categories={categories}
        allPhotos={allPhotos}
        votingOpen={votingOpen}
        submissionsOpen={submissionsOpen}
        onePhotoPerUser={onePhotoPerUser}
        showWinnersToggle={showWinnersToggle}
        siteClosed={siteClosed}
        censorSubmissions={censorSubmissions}
        publicKey={publicKey}
        privateKey={privateKey}
        rulesMarkdown={rulesMarkdown}
        winners={winners}
        onToggleVoting={toggleVoting}
        onToggleSubmissions={toggleSubmissions}
        onToggleOnePhotoPerUser={toggleOnePhotoPerUser}
        onToggleShowWinners={toggleShowWinners}
        onToggleSiteClosed={toggleSiteClosed}
        onToggleCensorSubmissions={toggleCensorSubmissions}
        onGenerateKeys={handleGenerateKeys}
        onToggleReveal={handleToggleReveal}
        onDownloadWinners={handleDownloadWinningPhotos}
        onDeletePhoto={handleDeletePhoto}
        onToggleDisqualifyPhoto={handleToggleDisqualifyPhoto}
        onResetVotes={handleResetVotes}
        onOpenAnalytics={() => navigateTo('/admin/analytics')}
      />
    );
  }

  return (
    <ShaderBackground className={cn("min-h-screen flex flex-col relative w-full overflow-x-clip max-w-full", isSiteLocked && !showArchivedWinners && !showCategorySuggestions && "overflow-hidden")}>
      <div className={cn("flex flex-col flex-1 w-full max-w-full overflow-x-clip transition-all duration-500", isSiteLocked && !showArchivedWinners && !showCategorySuggestions && "filter blur-lg sm:blur-xl opacity-60 pointer-events-none select-none max-h-screen overflow-hidden")}>
        
        {/* ── 1. UNIFIED FIXED TOP NAVIGATION CONTAINER ── */}
        <div ref={topNavContainerRef} className="fixed top-0 sm:top-2.5 left-0 sm:left-1/2 sm:-translate-x-1/2 right-0 sm:right-auto w-full sm:w-[calc(100%-2rem)] sm:max-w-7xl z-50 pointer-events-none flex flex-col gap-1 sm:gap-2 px-0">
          <motion.header
            ref={navbarRef}
            style={{ height: navH }}
            className="pointer-events-auto w-full sm:rounded-2xl transition-all duration-700 ease-out relative"
          >
        {/* ═══ OUTER CHROME SHELL ═══ */}
        {/* Animated gradient border — travels along the edge */}
        <div className="absolute inset-0 sm:rounded-2xl overflow-hidden pointer-events-none">
          {/* Travelling gradient highlight along top edge */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, transparent 20%, rgba(234,88,12,0.6) 40%, rgba(251,191,36,0.4) 50%, rgba(234,88,12,0.6) 60%, transparent 80%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 4s ease-in-out infinite',
            }}
          />
          {/* Left vertical accent */}
          <div className="hidden sm:block absolute top-[20%] bottom-[20%] left-0 w-[1px] bg-gradient-to-b from-transparent via-fivem-orange/25 to-transparent" />
          {/* Right vertical accent */}
          <div className="hidden sm:block absolute top-[20%] bottom-[20%] right-0 w-[1px] bg-gradient-to-b from-transparent via-fivem-orange/25 to-transparent" />
          {/* Bottom edge */}
          <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* ═══ FROSTED GLASS INTERIOR ═══ */}
        <motion.div
          style={{ backgroundColor: navBg }}
          className={cn(
            "absolute inset-0 sm:inset-[1px] sm:rounded-[15px] backdrop-blur-2xl transition-all duration-500",
            isScrolled
              ? "bg-[#07070a]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.9)]"
              : "bg-[#0a0a0e]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.5)]"
          )}
        >
          {/* Noise texture overlay for premium glass feel */}
          <div
            className="absolute inset-0 sm:rounded-[15px] opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          />
          {/* Inner ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-fivem-orange/[0.04] blur-2xl rounded-full pointer-events-none" />
        </motion.div>

        {/* ═══ CONTENT LAYER ═══ */}
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">

          {/* ── LEFT: Brand Beacon ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 group/brand shrink-0"
          >
            {/* Brand Logo */}
            <div
              id="easter-egg-orb"
              className="relative w-9 h-9 flex items-center justify-center cursor-pointer select-none rounded-xl bg-gradient-to-br from-fivem-orange/20 to-fivem-orange/5 border border-fivem-orange/30 transition-all duration-300 hover:border-fivem-orange/60 hover:shadow-[0_0_24px_rgba(234,88,12,0.3)] active:scale-95"
              onClick={handleLogoEasterEgg}
            >
              {easterEggActive && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-[-10px]"
                  style={{
                    background: 'conic-gradient(from 0deg, #ea580c, #facc15, #34d399, #60a5fa, #a78bfa, #f472b6, #ea580c)',
                  }}
                />
              )}
              {easterEggActive && (
                <div className="absolute inset-[2px] bg-fivem-dark rounded-[10px] z-5 pointer-events-none" />
              )}
              <motion.img
                src="https://r2.fivemanage.com/image/be70Qnvx8DT5.png"
                alt="Vital RP"
                className="w-5.5 h-5.5 object-contain relative z-10 drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]"
                animate={easterEggActive ? { rotate: [0, 360], scale: [1, 1.2, 1] } : {}}
                transition={easterEggActive ? { duration: 0.6, ease: 'easeInOut' } : {}}
              />
            </div>

            {/* Wordmark */}
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-display font-black text-sm tracking-[0.2em] leading-none uppercase drop-shadow-sm">
                  VITAL <span className="text-fivem-orange">RP</span>
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-white/40 font-mono text-[9px] uppercase tracking-[0.2em] leading-none font-bold">
                  {activeContest?.name || 'Photo Contest'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── CENTER: Perfectly Sized & Flowing HoverGradientNavBar ── */}
          <div className="hidden lg:flex items-center justify-center flex-1 max-w-fit mx-auto min-w-0">
            <HoverGradientNavBar
              activeId={activeNavId}
              items={[
                {
                  id: 'categories',
                  icon: <Layers className="h-4 w-4" />,
                  label: 'Categories',
                  gradient: 'radial-gradient(circle, rgba(234,88,12,0.25) 0%, rgba(249,115,22,0.1) 50%, rgba(194,65,12,0) 100%)',
                  iconColor: 'group-hover:text-fivem-orange text-orange-400',
                  onClick: () => {
                    setActiveNavId('categories');
                    const el = document.getElementById('category-nav') || document.getElementById('submissions-area');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else window.scrollTo({ top: 380, behavior: 'smooth' });
                  }
                },
                {
                  id: 'rules',
                  icon: <FileText className="h-4 w-4" />,
                  label: 'Rules',
                  gradient: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.1) 50%, rgba(29,78,216,0) 100%)',
                  iconColor: 'group-hover:text-blue-400 text-blue-400',
                  onClick: () => {
                    setActiveNavId('rules');
                    document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' });
                  }
                },
                {
                  id: 'hall-of-fame',
                  icon: <Trophy className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />,
                  label: 'Hall of Fame',
                  gradient: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(217,119,6,0.15) 50%, rgba(180,83,9,0) 100%)',
                  iconColor: 'group-hover:text-amber-300 text-amber-400',
                  onClick: () => {
                    setShowArchivedWinners(true);
                  }
                },
                ...(isAdmin ? [
                  {
                    id: 'suggest',
                    icon: <Sparkles className="h-4 w-4" />,
                    label: 'Suggest Theme',
                    badge: 'Staff',
                    badgeClassName: 'bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold',
                    gradient: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(147,51,234,0.1) 50%, rgba(126,34,206,0) 100%)',
                    iconColor: 'group-hover:text-purple-400 text-purple-400',
                    onClick: () => {
                      navigateTo('/admin/suggestions');
                    }
                  },
                  {
                    id: 'admin',
                    icon: <ShieldCheck className="h-4 w-4" />,
                    label: 'Admin Hub',
                    badge: 'Staff',
                    badgeClassName: 'bg-red-500/25 text-red-300 border border-red-500/40 font-bold',
                    gradient: 'radial-gradient(circle, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.1) 50%, rgba(185,28,28,0) 100%)',
                    iconColor: 'group-hover:text-red-400 text-red-400',
                    onClick: () => {
                      navigateTo('/admin');
                    }
                  }
                ] : [])
              ]}
            />
          </div>

          {/* ── RIGHT: Far Right Profile Button (Avatar Only) / Sign In / Mobile Toggle ── */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAuthLoading ? (
              <Skeleton className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
            ) : user && !user.isAnonymous ? (
              <motion.button
                type="button"
                onClick={() => setIsProfileSheetOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group/avatar relative w-9 h-9 rounded-full bg-[#0c0c14] border border-white/20 hover:border-fivem-orange/60 p-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_16px_rgba(234,88,12,0.4)] transition-all cursor-pointer flex items-center justify-center overflow-visible"
                title={`Signed in as ${user.displayName || 'User'} • Open Profile`}
                aria-label="Open Account & Profile Menu"
              >
                <img
                  src={getProfileAvatar(user.photoURL, user.avatarSeed || user.uid, user.avatarStyle)}
                  alt="Profile Avatar"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = getDiceBearAvatarUrl(user.avatarSeed || user.uid, user.avatarStyle);
                    if (target.src !== fallback) target.src = fallback;
                  }}
                  className="w-full h-full rounded-full object-cover"
                />
                {/* Live Online Status Pip */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-[#09090b] shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                className="group/login relative flex items-center gap-2 px-3.5 h-8 rounded-full
                  bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-fivem-orange text-white transition-all duration-300 cursor-pointer active:scale-[0.98] shadow-[0_4px_16px_rgba(234,88,12,0.3)] hover:shadow-[0_6px_24px_rgba(234,88,12,0.5)] border border-orange-400/30"
              >
                <User className="w-3.5 h-3.5 relative z-10 opacity-90 group-hover/login:opacity-100 transition-opacity duration-200" size={13} />
                <span className="relative z-10 text-[11px] font-display font-bold tracking-wider uppercase whitespace-nowrap">
                  Sign In
                </span>
              </button>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-white/15 bg-white/[0.04] text-white/80 active:text-white cursor-pointer transition-all active:scale-95 shadow-sm"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Permanent Secondary Category Navigation ── */}
      {categories.length > 0 && (
        <CategoryNav
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          allPhotos={allPhotos}
        />
      )}
    </div>

      {/* ── Mobile Side Sheet Navigation (Radix Sheet) ── */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 bg-[#09090d]/98 backdrop-blur-2xl">
          <div className="space-y-5">

            {/* ── Quick Actions Grid ── */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => { const el = document.getElementById('category-nav') || document.getElementById('submissions-area'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 380, behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.08] active:border-white/15 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/25 flex items-center justify-center">
                  <Layers size={18} className="text-fivem-orange" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Categories</span>
              </button>

              {submissionsOpen ? (
                <button
                  onClick={() => { if (!user) setShowSignInModal(true); else setShowUploadModal(true); setIsMobileMenuOpen(false); }}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-fivem-orange/[0.06] border border-fivem-orange/20 active:bg-fivem-orange/15 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-fivem-orange/20 border border-fivem-orange/30 flex items-center justify-center">
                    <Upload size={18} className="text-fivem-orange" />
                  </div>
                  <span className="text-[10px] font-bold text-fivem-orange uppercase tracking-wider">Submit</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] opacity-40 cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Lock size={18} className="text-white/40" />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Closed</span>
                </button>
              )}

              <button
                onClick={() => { document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.08] active:border-white/15 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <FileText size={18} className="text-white/70" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Rules</span>
              </button>
            </div>

            {/* ── Featured Action Cards ── */}
            <div className="space-y-2">
              <button
                onClick={() => { setShowArchivedWinners(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Trophy size={18} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white font-display">Hall of Fame</div>
                  <div className="text-[10px] text-white/40 truncate">Explore past contest champions & winners</div>
                </div>
                <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              </button>

              {/* Suggest Category */}
              <button
                onClick={() => { setShowCategorySuggestions(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] active:bg-white/[0.06] transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold text-white/80 block">Suggest Category</span>
                  <span className="text-[10px] text-white/35 font-mono">Submit ideas for next round</span>
                </div>
                <ChevronRight size={16} className="text-white/15 shrink-0" />
              </button>

              {/* Admin Tools (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigateTo('/admin');
                  }}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-fivem-orange/[0.05] border border-fivem-orange/15 active:bg-fivem-orange/10 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/25 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-fivem-orange" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-bold text-fivem-orange/90 block">Admin Console</span>
                    <span className="text-[10px] text-white/30 font-mono">Full-page dashboard</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-fivem-orange/15 text-[9px] font-mono font-bold text-fivem-orange uppercase shrink-0">Admin</span>
                </button>
              )}
            </div>

            {/* ── Account ── */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 px-1">Account</span>

              {isAuthLoading ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <Skeleton className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-32 h-4 rounded bg-white/10" />
                    <Skeleton className="w-44 h-3 rounded bg-white/5" />
                  </div>
                </div>
              ) : user && !user.isAnonymous ? (
                <div
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileSheetOpen(true);
                  }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] active:border-fivem-orange/40 transition-all cursor-pointer group"
                >
                  <div className="relative shrink-0">
                    <img
                      src={getProfileAvatar(user.photoURL, user.avatarSeed || user.uid, user.avatarStyle)}
                      alt=""
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getDiceBearAvatarUrl(user.avatarSeed || user.uid, user.avatarStyle);
                        if (target.src !== fallback) target.src = fallback;
                      }}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c0c14] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white truncate block group-hover:text-fivem-orange transition-colors">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-white/40">Open Profile & Avatar Studio</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/30 group-hover:text-white transition-colors shrink-0" />
                </div>
              ) : (
                <button
                  onClick={() => { setShowSignInModal(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-fivem-orange to-orange-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-transform shadow-lg shadow-orange-500/20"
                >
                  <User size={16} />
                  <span>Sign In with Discord</span>
                </button>
              )}
            </div>

            {/* ── Support ── */}
            <div className="flex gap-2.5">
              <button
                onClick={() => { setIsMobileMenuOpen(false); setShowBugModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 active:text-white active:bg-white/[0.06] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Bug size={13} className="text-rose-400/70" />
                <span>Report Bug</span>
              </button>
              {!isAdmin && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowNotAdminModal(true);
                    setNotAdminClickCount(c => c + 1);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 active:text-white active:bg-white/[0.06] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Settings size={13} className="text-white/40" />
                  <span>Settings</span>
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Winner Announcement Section */}
      {activeContest && showWinnersToggle && winners.length > 0 && (
        <WinnerAnnouncement winners={winners} contestName={activeContest.name} />
      )}

      {/* Hero Banner — SeraUI Award-Winning Hero Stage */}
      {activeContest ? (() => {
        const heroContainerVariants = {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
        };
        const heroItemVariants = {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
        };

        // Clean and sanitize the contest title (eliminate all emojis like 📁 📸 🏆)
        const rawName = activeContest.name || '';
        const cleanName = rawName
          .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
          .trim();

        // Split on colon if present (e.g. "September Photo Contest: Rewrite the Rules")
        let primaryTitle = cleanName;
        let themeSubtitle = '';
        if (cleanName.includes(':')) {
          const colonParts = cleanName.split(':');
          primaryTitle = colonParts[0].trim();
          themeSubtitle = colonParts.slice(1).join(':').trim();
        }

        const hasHeroItems = heroCarouselItems.length > 0;

        return (
          <section
            className="relative overflow-hidden border-b border-white/10 pt-36 sm:pt-48 pb-16 sm:pb-24"
            style={{ minHeight: '540px' }}
          >
            {/* ── Deep luxury base ── */}
            <div className="absolute inset-0 bg-[#050508]" />

            {/* ── Radial Ambient Aura behind Hero ── */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-br from-fivem-orange/20 via-amber-500/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-gradient-to-bl from-purple-500/10 via-pink-500/5 to-transparent blur-[140px] rounded-full pointer-events-none" />

            {/* ── Aceternity Spotlight Beams ── */}
            <Spotlight
              className="-top-40 left-0 md:left-48 md:-top-20"
              fill="rgba(234, 88, 12, 0.32)"
            />
            <Spotlight
              className="top-10 right-0 md:left-full md:-translate-x-[75%] h-[80vh] w-[50vw] max-w-full pointer-events-none"
              fill="rgba(251, 146, 60, 0.15)"
            />

            {/* ── DotPattern ── */}
            <DotPattern width={28} height={28} cr={0.75} className="opacity-[0.05] z-[1]" />
            
            {/* ── Magic UI Ambient Velocity Scroll Background Layer ── */}
            <div className="absolute inset-0 flex flex-col justify-around opacity-[0.028] pointer-events-none overflow-hidden select-none z-0">
              <VelocityScroll
                defaultVelocity={1.2}
                numRows={2}
                className="font-display font-black text-6xl sm:text-8xl lg:text-9xl uppercase tracking-tighter text-white"
              >
                {`VITAL RP PHOTO CONTEST • ${primaryTitle} • `}
              </VelocityScroll>
            </div>

            {/* ── Main Hero Layout ── */}
            <div className={cn(
              "relative z-10 max-w-7xl mx-auto px-4 sm:px-6 items-center",
              hasHeroItems ? "grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16" : "flex flex-col items-center text-center max-w-3xl"
            )}>

              {/* LEFT — Text, CTAs & Telemetry */}
              <motion.div
                variants={heroContainerVariants}
                initial="hidden"
                animate="visible"
                className={cn("flex flex-col", !hasHeroItems && "items-center")}
              >
                {/* SeraUI Live Announcement Capsule */}
                <motion.div variants={heroItemVariants} className="mb-5">
                  <Announcement
                    variant="gradient"
                    badge={isVotingOpen ? 'VOTING LIVE' : isSubmissionsOpen ? 'SUBMISSIONS OPEN' : 'ACTIVE CONTEST'}
                    badgeColor={
                      isVotingOpen
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : isSubmissionsOpen
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }
                  >
                    <AnimatedShinyText shimmerWidth={100}>
                      <span className="text-white/90 font-bold uppercase tracking-wider text-[11px]">
                        Vital RP Photo Contest
                      </span>
                    </AnimatedShinyText>
                  </Announcement>
                </motion.div>

                {/* Main Headline with SparklesText and Dual-Tone Hierarchy */}
                <motion.div variants={heroItemVariants} className={cn("mb-4 space-y-1.5", !hasHeroItems && "text-center")}>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl 2xl:text-6xl font-black font-display tracking-tight leading-[1.08] text-white">
                    <SparklesText
                      text={primaryTitle}
                      sparklesCount={8}
                      colors={{ first: '#f59e0b', second: '#fb923c' }}
                      className="text-3xl sm:text-4xl lg:text-5xl 2xl:text-6xl font-black font-display tracking-tight"
                    />
                  </h1>
                  {themeSubtitle && (
                    <div className={cn("pt-1", !hasHeroItems && "flex justify-center")}>
                      <span className="text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-black font-display tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-sm">
                        {themeSubtitle}
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Animated Tagline via FlipWords */}
                <motion.div variants={heroItemVariants} className={cn(
                  "text-white/65 text-sm sm:text-base leading-relaxed mb-6 max-w-lg font-medium h-[2.8em]",
                  !hasHeroItems && "text-center mx-auto"
                )}>
                  <FlipWords
                    words={[
                      "Capture the visual spirit of Los Santos through your lens.",
                      "Submit your finest high-resolution in-game photography.",
                      "Community votes decide the five round co-champions.",
                      "Win eternal glory, custom badges, and server loading screen fame.",
                    ]}
                    duration={3600}
                    className="text-white/70 font-sans"
                  />
                </motion.div>

                {/* SeraUI GlowLine subtle separator */}
                <motion.div variants={heroItemVariants} className="w-full max-w-md mb-6 opacity-60">
                  <GlowLine color="orange" />
                </motion.div>

                {/* Animated Countdown Clock */}
                <motion.div variants={heroItemVariants} className="mb-8">
                  <CountdownClock
                    targetDate={new Date('2026-08-28T17:59:00-05:00')}
                    label="Submissions Close In"
                  />
                </motion.div>

                {/* High Impact Actions */}
                <motion.div variants={heroItemVariants} className={cn(
                  "flex flex-wrap gap-3.5 mb-10",
                  !hasHeroItems && "justify-center"
                )}>
                  {isSubmissionsOpen ? (
                    <ShimmerButton
                      onClick={handleUploadClick}
                      shimmerColor="#fb923c"
                      shimmerDuration="3s"
                      background="rgba(234,88,12,0.95)"
                      borderRadius="0.85rem"
                      className="px-7 py-3.5 text-xs font-black uppercase tracking-wider cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(234,88,12,0.4)] transition-all duration-300 shadow-lg"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Submit Photo Entry
                    </ShimmerButton>
                  ) : (
                    <button
                      disabled
                      className="group relative flex items-center gap-2.5 font-bold px-7 py-3.5 rounded-2xl text-xs uppercase tracking-wider bg-white/10 text-white/30 cursor-not-allowed border border-white/10 shadow-sm"
                    >
                      <Lock size={15} className="relative z-10" />
                      <span className="relative z-10">Submissions Closed</span>
                    </button>
                  )}

                  <a
                    href="#rules"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 bg-[#0c0c14]/80 hover:bg-white/[0.08] border border-white/15 hover:border-white/25 text-white/80 hover:text-white font-bold px-6 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-xs uppercase tracking-wider backdrop-blur-md cursor-pointer shadow-md active:scale-95"
                  >
                    <FileText size={14} className="text-fivem-orange" />
                    Rules & Guidelines
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowCategorySuggestions(true)}
                    className="flex items-center gap-2 bg-[#0c0c14]/80 hover:bg-fivem-orange/15 border border-white/15 hover:border-fivem-orange/40 text-white/80 hover:text-white font-bold px-6 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 text-xs uppercase tracking-wider backdrop-blur-md cursor-pointer shadow-md active:scale-95"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    Suggest Category
                  </button>
                </motion.div>

                {/* Non-Redundant Telemetry Matrix */}
                <motion.div
                  variants={heroItemVariants}
                  className="relative grid grid-cols-3 gap-3 p-3.5 rounded-2xl border border-white/10 bg-[#0c0c14]/90 backdrop-blur-xl max-w-md shadow-xl"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-black font-display text-white">
                      <NumberTicker value={categories.length} delay={0.3} />
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Categories</span>
                  </div>

                  <div className="flex flex-col border-l border-white/10 pl-3">
                    <span className="text-lg font-black font-display text-white">
                      <NumberTicker value={allPhotos.length} delay={0.3} />
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Submissions</span>
                  </div>

                  <div className="flex flex-col border-l border-white/10 pl-3">
                    <span className="text-lg font-black font-display text-fivem-orange">
                      <NumberTicker value={allPhotos.reduce((s, p) => s + (p.vote_count || 0), 0)} delay={0.3} />
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">Votes Cast</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* RIGHT — 16:9 Radial Carousel (All Categories) */}
              {hasHeroItems && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center relative w-full overflow-visible py-2"
                >
                  <RadialCarousel
                    items={heroCarouselItems}
                    isVotingOpen={votingOpen}
                    censorSubmissions={censorSubmissions}
                    onItemClick={(item) => {
                      if (item.rawPhoto) {
                        setLightboxPhoto(item.rawPhoto);
                      }
                    }}
                  />
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 tracking-wider mt-1 select-none">
                    <Sparkles size={11} className="text-fivem-orange animate-pulse" />
                    <span>Scroll, drag, or arrow keys to rotate · Click active slide to inspect</span>
                  </div>
                </motion.div>
              )}

            </div>
          </section>
        );
      })() : (
        <section className="relative overflow-hidden border-b border-white/10 pt-36 sm:pt-48 pb-28 flex flex-col items-center justify-center text-center px-6">
          <div className="absolute inset-0 bg-[#060606]" />
          <Spotlight className="-top-40 left-1/2 -translate-x-1/2" fill="rgba(234, 88, 12, 0.2)" />
          <DotPattern width={32} height={32} cr={0.8} className="opacity-[0.04] z-[1]" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-6">
            <div className="absolute inset-0 bg-white/5 blur-3xl scale-150 rounded-full" />
            <img src="https://r2.fivemanage.com/image/be70Qnvx8DT5.png" alt="" className="w-24 h-24 object-contain mx-auto opacity-20 relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-display font-black text-white/30 mb-3 relative z-10">No Active Contest</h2>
          <p className="text-white/20 max-w-sm relative z-10">Check back soon — the next contest is being prepared by the admins.</p>
        </section>
      )}


      {/* ── Redesigned Full-Width Wide Contest Rules & Guidelines ── */}
      <ContestRulesSection rulesMarkdown={rulesMarkdown} />

      <main id="submissions-area" className="scroll-mt-36 sm:scroll-mt-44 max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        {/* Main Content – 3 cols */}
        <div className="lg:col-span-3 space-y-12 sm:space-y-20 min-w-0">
          <section ref={categoryHeaderRef} id="category-header-anchor" className="scroll-mt-36 sm:scroll-mt-44">
            <motion.div
              layout
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 min-h-[76px]"
            >
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedCategory?.id || 'none'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-3xl leading-none">{selectedCategory?.emoji || '📷'}</span>
                      <h2 className="text-2xl font-display font-bold text-white">{selectedCategory?.name || 'Entries'}</h2>
                    </div>
                    {selectedCategory?.description && (
                      <p className="text-sm text-white/50 leading-relaxed max-w-2xl">{selectedCategory?.description}</p>
                    )}
                    <p className="text-xs text-white/35 mt-1.5 font-mono">{photos.length} entries submitted</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setSortBy('top')}
                  className={cn(
                    "flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-all cursor-pointer",
                    sortBy === 'top' ? "bg-fivem-orange text-white shadow-lg shadow-fivem-orange/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <Trophy size={14} /> TOP VOTED
                </button>
                <button
                  onClick={() => setSortBy('newest')}
                  className={cn(
                    "flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-all cursor-pointer",
                    sortBy === 'newest' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  NEWEST
                </button>
              </div>
            </motion.div>

            <motion.div
              layout
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
            {isCategoryLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-fivem-card/70 rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
                    <Skeleton className="w-full aspect-video rounded-xl" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="w-24 h-3.5 rounded-md" />
                      </div>
                      <Skeleton className="w-16 h-7 rounded-full" />
                    </div>
                    <Skeleton className="w-3/4 h-3 rounded-md" />
                  </div>
                ))}
              </div>
            ) : photos.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 bg-fivem-card rounded-3xl border border-dashed border-white/10"
              >
                <ImageIcon size={48} className="text-white/10 mb-4" />
                <p className="text-white/40 font-medium">No entries yet in this category</p>
                <p className="text-xs text-white/20 mt-1">{submissionsOpen ? 'Be the first to upload a photo!' : 'Submissions are currently closed.'}</p>
                {submissionsOpen && (
                  <button
                    onClick={handleUploadClick}
                    className="mt-6 flex items-center gap-2 bg-fivem-orange/20 border border-fivem-orange/30 text-fivem-orange font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-fivem-orange hover:text-white transition-all cursor-pointer"
                  >
                    <Upload size={16} /> Submit Entry
                  </button>
                )}
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory?.id || 'all'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                >
                  {sortedPhotos.map((photo, index) => {
                    const rankEmoji = sortBy === 'top' ? (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null) : null;
                    return (
                      <BlurFade key={photo.id} delay={index * 0.04} duration={0.35} className={cn(sortBy === 'top' && index === 0 ? "md:col-span-2" : "")}>
                        <MagicCard
                          active={sortBy === 'top' && index === 0}
                          borderBeamProps={{ size: 280, duration: 10, colorFrom: "#ea580c", colorTo: "#fcd34d", borderWidth: 2 }}
                          gradientColor="rgba(234, 88, 12, 0.16)"
                          className={cn(
                            "relative group bg-fivem-card rounded-2xl border transition-all h-full group-hover:z-30",
                            photo.is_disqualified
                              ? "ring-2 ring-red-500/80 border-red-500/50"
                              : sortBy === 'top' && index === 0
                                ? "ring-2 ring-fivem-orange/50 shadow-2xl shadow-fivem-orange/10 border-fivem-orange/30"
                                : "border-white/5 hover:border-fivem-orange/30"
                          )}
                        >
                          <div className={cn("relative cursor-pointer", sortBy === 'top' && index === 0 ? "aspect-[21/9]" : "aspect-video")} onClick={() => setLightboxPhoto(photo)}>
                          <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                            <img
                              src={photo.image_url}
                              alt={photo.caption}
                              className={cn(
                                "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
                                photo.is_disqualified && "grayscale-[40%] opacity-80"
                              )}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          </div>

                          {/* Pixelated / Censored Indicator */}
                          {censorSubmissions && !votingOpen && (
                            <div className="absolute bottom-3 left-3 bg-amber-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 text-[9px] font-mono text-amber-300 font-bold z-10 shadow-sm">
                              <EyeOff size={10} />
                              <span>Pixelated until voting</span>
                            </div>
                          )}

                          {/* DISQUALIFIED Permanent Banner */}
                          {photo.is_disqualified && (
                            <div className="absolute top-0 inset-x-0 bg-red-600/95 text-white font-black text-xs uppercase tracking-widest py-1.5 px-3 flex items-center justify-center gap-1.5 z-30 shadow-lg border-b border-red-400/40">
                              <Ban size={14} className="stroke-[2.5]" />
                              <span>DISQUALIFIED</span>
                              {photo.disqualification_reason && (
                                <span className="font-normal text-[10px] opacity-90 truncate max-w-[150px] font-mono">
                                  ({photo.disqualification_reason})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Top-left: rank badge + player avatar + name in one row */}
                          <div className={cn("absolute left-3 flex items-center gap-2 z-10", photo.is_disqualified ? "top-9" : "top-3")}>
                            {rankEmoji && (
                              <span className="text-2xl drop-shadow-lg leading-none">{rankEmoji}</span>
                            )}
                            <div className="bg-black/70 backdrop-blur-md pl-1 pr-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5 max-w-[200px] shadow-lg">
                              <img
                                src={getProfileAvatar((photo as any).user_photo_url, (photo as any).avatar_seed || (photo as any).user_id || photo.discord_name, (photo as any).avatar_style)}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover border border-fivem-orange/50 shrink-0"
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wider truncate text-white">
                                {privateKey ? photo.player_name : "Anonymous"}
                              </span>
                            </div>
                            {getUserWinCount(photo.discord_name, photo.user_id || photo.uploader_uid) > 0 && (
                              <ChampionBadge winCount={getUserWinCount(photo.discord_name, photo.user_id || photo.uploader_uid)} size="sm" showLabel={false} />
                            )}
                          </div>

                          {/* Top-right: action buttons (hover) */}
                          <div className={cn("absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10", photo.is_disqualified ? "top-9" : "top-3")}>
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (photo.is_disqualified) {
                                    handleToggleDisqualifyPhoto(photo.id, false);
                                  } else {
                                    const reason = window.prompt("Reason for disqualifying this photo (optional):");
                                    if (reason !== null) {
                                      handleToggleDisqualifyPhoto(photo.id, true, reason || undefined);
                                    }
                                  }
                                }}
                                className={cn(
                                  "bg-black/60 backdrop-blur-md p-2 rounded-full border transition-colors cursor-pointer",
                                  photo.is_disqualified
                                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                    : "border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
                                )}
                                title={photo.is_disqualified ? "Re-qualify Photo" : "Disqualify Photo"}
                              >
                                {photo.is_disqualified ? <CheckCircle size={14} /> : <Ban size={14} />}
                              </button>
                            )}
                            {(isAdmin || (user && (user.displayName === photo.discord_name || user.providerData.some(p => p.displayName === photo.discord_name)))) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id, photo.discord_name); }}
                                className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                title="Delete Photo"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(photo); }}
                              className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-fivem-orange transition-colors"
                            >
                              <Share2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setLightboxPhoto(photo); }}
                              className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              <Maximize2 size={14} />
                            </button>
                          </div>

                          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
                            <VotersButton
                              photoId={photo.id}
                              photoCaption={photo.caption}
                              voteCount={photo.vote_count || 0}
                            />
                            <VoteButton
                              photoId={photo.id}
                              photoCaption={photo.caption}
                              voteCount={photo.vote_count || 0}
                              hasVoted={votedPhotoIds.has(photo.id)}
                              votingOpen={isVotingOpen}
                              isDisqualified={photo.is_disqualified}
                              categorySharePct={(() => {
                                const total = photos.reduce((s, p) => s + (p.vote_count || 0), 0);
                                return total > 0 ? Math.round(((photo.vote_count || 0) / total) * 100) : 0;
                              })()}
                              onVote={() => {
                                setVotingPhotoId(photo.id);
                                setTimeout(() => setVotingPhotoId(null), 700);
                                handleVote(photo.id);
                              }}
                            />
                          </div>

                        </div>
                        <div className="p-4 pr-32 bg-fivem-card/90 backdrop-blur-md absolute bottom-0 left-0 right-0 border-t border-white/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
                          <p className="text-sm font-medium line-clamp-2 text-white">{photo.caption || "No caption provided"}</p>
                          <p className="text-[10px] text-white/40 font-mono mt-2 uppercase tracking-widest">
                            {new Date(photo.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </MagicCard>
                    </BlurFade>
                  );
                })}
                </motion.div>
              </AnimatePresence>
            )}
            </motion.div>
          </section>

        </div>

        {/* Contest Info Sidebar – 1 col (SeraUI Design) */}
        <div className="lg:col-span-1 min-w-0">
          <ContestInfoSidebar
            activeContest={activeContest}
            votingOpen={votingOpen}
            submissionsOpen={submissionsOpen}
            categories={categories}
            allPhotos={allPhotos}
            user={user}
            currentUserPhoto={currentUserPhoto}
            userSubmissionCount={userSubmissionCount}
            onePhotoPerUser={onePhotoPerUser}
            archivedWinners={archivedWinners}
            onUploadClick={handleUploadClick}
            onOpenHallOfFame={() => setShowArchivedWinners(true)}
            onSignInClick={() => setShowSignInModal(true)}
          />
        </div>
      </main>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-xl bg-[#0a0a0e] border-white/15 text-white rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
              <Sparkles className="text-fivem-orange" size={20} />
              Submit Contest Entry
            </DialogTitle>
          </DialogHeader>
          <ErrorBoundary fallbackTitle="Submission Form Error" onReset={() => setShowUploadModal(false)}>
            <UploadForm
              categories={categories}
              initialCategoryId={selectedCategory?.id || ''}
              discordName={user?.displayName || user?.providerData?.[0]?.displayName || user?.email || 'Authenticated User'}
              submissionsOpen={submissionsOpen}
              onePhotoPerUser={onePhotoPerUser}
              existingPhoto={currentUserPhoto}
              onDeleteExisting={async (photoId, discordName) => {
                return await handleDeletePhoto(photoId, discordName, true);
              }}
              onClose={() => setShowUploadModal(false)}
              onUpload={async (imageData, caption, discordName, formPlayerName, categoryId) => {
                await handleUpload(imageData, caption, discordName, formPlayerName, categoryId);
              }}
            />
          </ErrorBoundary>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <Suspense fallback={null}>
          <LightboxModal
            photo={lightboxPhoto}
            photos={photos}
            privateKey={privateKey}
            isCensored={censorSubmissions && !votingOpen}
            winCount={getUserWinCount(lightboxPhoto.discord_name, (lightboxPhoto as any).user_id || (lightboxPhoto as any).uploader_uid)}
            onClose={() => setLightboxPhoto(null)}
            onNavigate={(p) => setLightboxPhoto(p)}
          />
        </Suspense>
      )}

      {/* Discord Server & Role Requirement Modal */}
      <DiscordRequirementsModal
        isOpen={showDiscordReqModal}
        onClose={() => setShowDiscordReqModal(false)}
        onRetry={() => {
          setShowDiscordReqModal(false);
          setShowSignInModal(true);
        }}
        reason={discordReqReason}
        message={discordReqMessage}
      />

      {/* Bug Report & Damon Discord Profile Modal */}
      <BugReportModal
        isOpen={showBugModal}
        onClose={() => setShowBugModal(false)}
        user={user}
      />

      {/* Rename Display Name Dedicated Modal Overlay */}
      <AnimatePresence>
        {isEditingDisplayName && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingDisplayName(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md bg-[#0c0c10]/98 border border-white/15 rounded-3xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black font-display text-white">Rename Display Name</h3>
                    <p className="text-[10px] text-white/50 font-mono">Update your public contest handle</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDisplayName(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-white/70 uppercase tracking-wider block">
                  Public Display Name
                </label>
                <input
                  type="text"
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDisplayName();
                    if (e.key === 'Escape') setIsEditingDisplayName(false);
                  }}
                  placeholder="Enter new display name..."
                  autoFocus
                  className="w-full px-4 py-3 text-sm font-semibold bg-black/60 border border-white/20 focus:border-fivem-orange text-white rounded-2xl focus:outline-none transition-all shadow-inner"
                />
                <p className="text-[11px] text-white/40 leading-relaxed font-sans">
                  This name will be displayed across your contest entries, photo credits, and Hall of Fame victories.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingDisplayName(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange border border-fivem-orange/40 shadow-lg shadow-fivem-orange/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle size={14} />
                  <span>Save Name</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analytics Dashboard Fullscreen Render */}
      <AnimatePresence>
        {showAnalyticsDashboard && isAdmin && (
          <Suspense fallback={null}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-0 z-[200] bg-black"
            >
              <AnalyticsDashboard
                photos={allPhotos}
                categories={categories}
                onClose={() => {
                  setShowAnalyticsDashboard(false);
                }}
              />
            </motion.div>
          </Suspense>
        )}

        {/* Archived Winners Fullscreen Render */}
        {showArchivedWinners && (
          <ErrorBoundary fallbackTitle="Hall of Fame Error" onReset={() => setShowArchivedWinners(false)}>
            <Suspense fallback={
              <div className="fixed inset-0 z-[150] bg-[#060608] flex flex-col p-4 sm:p-8 space-y-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-48 h-5 rounded-md bg-white/[0.08]" />
                      <Skeleton className="w-32 h-3 rounded-md bg-white/[0.05]" />
                    </div>
                  </div>
                  <Skeleton className="w-28 h-8 rounded-full bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 rounded-3xl border border-white/10 bg-[#0d0d14]/70 space-y-4">
                      <Skeleton className="w-full aspect-[16/10] rounded-2xl bg-white/[0.07]" />
                      <div className="space-y-2">
                        <Skeleton className="w-2/3 h-5 rounded-md bg-white/[0.08]" />
                        <Skeleton className="w-1/3 h-4 rounded-md bg-white/[0.05]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <ArchivedWinnersView currentUser={user} onClose={() => setShowArchivedWinners(false)} />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Category Suggestions Fullscreen Render */}
        {showCategorySuggestions && (
          <ErrorBoundary fallbackTitle="Category Suggestions Error" onReset={() => setShowCategorySuggestions(false)}>
            <Suspense fallback={
              <div className="fixed inset-0 z-[150] bg-[#07070b] flex flex-col p-4 sm:p-8 space-y-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-white/[0.08]" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-48 h-5 rounded-md bg-white/[0.08]" />
                      <Skeleton className="w-32 h-3 rounded-md bg-white/[0.05]" />
                    </div>
                  </div>
                  <Skeleton className="w-36 h-9 rounded-full bg-white/[0.06]" />
                </div>
                <div className="max-w-4xl mx-auto w-full space-y-4 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-3xl border border-white/10 bg-[#0d0d14]/70 flex gap-5 items-start">
                      <Skeleton className="w-12 h-20 rounded-2xl shrink-0 bg-white/[0.07]" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="w-1/3 h-5 rounded-md bg-white/[0.08]" />
                        <Skeleton className="w-full h-10 rounded-xl bg-white/[0.05]" />
                        <Skeleton className="w-1/4 h-4 rounded-md bg-white/[0.06]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }>
              <CategorySuggestionsView
                currentUser={user}
                isAdmin={isAdmin}
                onClose={() => setShowCategorySuggestions(false)}
                onOpenSignIn={() => setShowSignInModal(true)}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      {/* ── MagicUI Marquee — scrolling community ticker ── */}
      <div className="relative overflow-hidden border-t border-white/[0.07] bg-[#050505] py-3">
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] z-10 pointer-events-none" />
        <Marquee pauseOnHover duration={50} className="[--gap:2rem]">
          {[
            '📸 Vital RP Photo Contest',
            '🏆 Submit Your Best Shot',
            '🎮 FiveM Community',
            '⭐ Vote for Your Favorites',
            '🔥 Capture the Spirit of the City',
            '✨ Winners Announced Weekly',
            '🎯 In-Game Screenshots Only',
            '💎 Premium Photography Contest',
          ].map((text, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/20 whitespace-nowrap">
              {text}
              <span className="w-1 h-1 rounded-full bg-fivem-orange/30" />
            </span>
          ))}
        </Marquee>
      </div>

      <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#060606] mt-auto">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[-60px] w-[600px] h-[200px] bg-fivem-orange/[0.04] blur-[80px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-7">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">

            {/* Left — branding */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-3">
                {/* VRP logo mark */}
                <img src="https://r2.fivemanage.com/image/be70Qnvx8DT5.png" alt="Vital RP logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
                <div>
                  <p className="text-white font-black font-display text-lg leading-none">Vital RP</p>
                  <p className="text-white/30 text-[10px] font-mono uppercase tracking-[0.2em] leading-none mt-0.5">Photo Contest</p>
                </div>
              </div>
              <p className="text-white/30 text-xs text-center md:text-left max-w-xs leading-relaxed">
                An in-game screenshot competition for the Vital RP FiveM community. Capture your best moment and let the community vote.
              </p>
              <a
                href="http://vitalrp.net"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-fivem-orange/80 hover:text-fivem-orange text-xs font-mono transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                vitalrp.net
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            </div>

            {/* Right — links + credit */}
            <div className="flex flex-col items-center md:items-end gap-4">
              {/* Quick links */}
              <div className="flex items-center gap-5 text-[11px] font-mono uppercase tracking-[0.15em]">
                {[
                  { label: 'Website', href: 'http://vitalrp.net' },
                  { label: 'Discord', href: 'http://discord.gg/vitalrp' },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-white/30 hover:text-white/70 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Made by Damon pill */}
              <button
                onClick={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  if (el.dataset.egging) return;
                  el.dataset.egging = "true";

                  const span = el.querySelector('.damon-text') as HTMLDivElement;
                  const img = el.querySelector('img') as HTMLImageElement;
                  if (!span || !img) return;

                  // 1. Shrink pill and hide text
                  span.style.maxWidth = '0px';
                  span.style.opacity = '0';
                  // Use negative margin to conceptually collapse the flex gap on the parent
                  span.style.marginLeft = '-10px';

                  // 2. Enlarge and wiggle icon
                  img.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

                  let wiggleCount = 0;
                  const wiggleInterval = setInterval(() => {
                    wiggleCount++;
                    const rot = wiggleCount % 2 === 0 ? 15 : -15;
                    img.style.transform = `scale(2.2) rotate(${rot}deg)`;
                  }, 120);

                  // 3. Pop and return to normal
                  setTimeout(() => {
                    clearInterval(wiggleInterval);
                    img.style.transition = 'all 0.15s ease-out';
                    img.style.transform = 'scale(3.5)';
                    img.style.opacity = '0';

                    setTimeout(() => {
                      img.style.transition = 'none';
                      img.style.transform = 'scale(0)';

                      requestAnimationFrame(() => {
                        // Reset everything back to normal with a satisfying spring
                        img.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        img.style.transform = '';
                        img.style.opacity = '1';

                        span.style.maxWidth = '200px';
                        span.style.opacity = '1';
                        span.style.marginLeft = '0px';

                        setTimeout(() => {
                          span.style.maxWidth = '';
                          span.style.opacity = '';
                          span.style.marginLeft = '';
                          delete el.dataset.egging;
                        }, 500);
                      });
                    }, 150);
                  }, 1500);
                }}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md px-3.5 py-2 hover:border-white/20 transition-all duration-300 group cursor-pointer"
              >
                <img
                  src="https://r2.fivemanage.com/image/JOQmUtYFGJ7q.png"
                  alt="Damon"
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20 relative z-10 shrink-0"
                />
                <div className="damon-text overflow-hidden whitespace-nowrap transition-all duration-300 origin-left opacity-100 max-w-[200px]">
                  <span className="text-[11px] font-mono text-white/40 group-hover:text-white/60 transition-colors">
                    Made by <span className="text-white/70 font-semibold">Damon</span>
                  </span>
                </div>
              </button>

              {/* Copyright */}
              <p className="text-[10px] font-mono text-white/20 tracking-widest uppercase">
                © {new Date().getFullYear()} Vital RP · All rights reserved
              </p>
            </div>

          </div>

          {/* Bottom divider line */}
          <div className="mt-8 pt-5 border-t border-white/[0.05] flex items-center justify-center">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/15 uppercase tracking-[0.3em]">
              <span className="w-8 h-px bg-white/10" />
              Vital RP Photo Contest
              <span className="w-8 h-px bg-white/10" />
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* ─── SITE CLOSED / LOCKDOWN MODAL OVERLAY ─── */}
      {isSiteLocked && !showArchivedWinners && (
        <ContestClosedModal
          isAdmin={isAdmin}
          user={user}
          adminBypass={adminBypassClosedModal}
          onToggleAdminBypass={(bypass) => setAdminBypassClosedModal(bypass)}
          onOpenHallOfFame={() => setShowArchivedWinners(true)}
          onOpenSignIn={() => setShowSignInModal(true)}
          onSignOut={() => signOut(auth)}
          onOpenAdminPanel={() => navigateTo('/admin')}
        />
      )}

      {/* Floating Admin Banner when Admin has bypassed the modal */}
      {siteClosed && isAdmin && adminBypassClosedModal && (
        <div className="fixed top-24 right-4 z-[90] bg-[#09090d]/95 border border-red-500/40 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.25)] flex items-center gap-3 text-xs font-mono text-white select-none animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-bold text-red-300">Site Closed Mode Active</span>
          </div>
          <button
            onClick={() => setAdminBypassClosedModal(false)}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
          >
            Show Lock Screen
          </button>
        </div>
      )}

      {/* ─── NOT AN ADMIN: Humorous Gate Modal ─── */}
      <AnimatePresence>
        {showNotAdminModal && (() => {
          const messages = [
            { title: "lol nope", body: "You thought you could just waltz in here? Bold move. The admins have been alerted. (They haven't.)", emoji: "🔒" },
            { title: "Still trying?", body: "Sir, this is a Wendy's. Also, you are not an admin. These two facts are equally important.", emoji: "🍔" },
            { title: "Impressive persistence.", body: "At this rate you'll have the job by morning. Unfortunately the hiring manager is also an admin, so... awkward.", emoji: "💼" },
            { title: "FBI OPEN UP", body: "Your IP has been logged, printed, laminated, and filed under 'absolutely not an admin'. Have a lovely day.", emoji: "🚨" },
            { title: "okay we're impressed", body: "Nobody has clicked this many times. You've unlocked a secret: you're STILL not an admin. Congratulations.", emoji: "🏆" },
          ];
          const idx = Math.min(notAdminClickCount - 1, messages.length - 1);
          const msg = messages[idx];
          const threatLevel = Math.min(notAdminClickCount, 5);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotAdminModal(false)}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 30, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.85, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="relative max-w-sm w-full rounded-3xl border border-white/10 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a00 100%)' }}
              >
                {/* Orange glow backdrop */}
                <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(234,88,12,0.6), transparent 70%)' }} />

                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #ea580c 30%, #fb923c 50%, #ea580c 70%, transparent)' }} />

                <div className="relative px-7 pt-8 pb-7">
                  {/* Wiggling lock emoji */}
                  <motion.div
                    animate={{ rotate: [0, -12, 12, -8, 8, -4, 4, 0] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-5xl text-center mb-5 select-none"
                  >
                    {msg.emoji}
                  </motion.div>

                  <h2 className="text-white font-display font-black text-xl text-center mb-3 tracking-tight">
                    {msg.title}
                  </h2>
                  <p className="text-white/55 text-sm text-center leading-relaxed mb-6">
                    {msg.body}
                  </p>

                  {/* Threat level meter */}
                  <div className="mb-6 px-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Threat Level</span>
                      <span className="text-[10px] font-mono text-fivem-orange/80">{['HARMLESS', 'LOW', 'MEDIUM', 'CONCERNING', 'HIGH', 'YOU NEED HELP'][threatLevel]}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(threatLevel / 5) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
                        className="h-full rounded-full"
                        style={{ background: threatLevel >= 4 ? 'linear-gradient(90deg, #ea580c, #ef4444)' : 'linear-gradient(90deg, #ea580c, #fb923c)' }}
                      />
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowNotAdminModal(false)}
                    className="w-full py-3 rounded-2xl font-display font-bold text-sm tracking-wide
                      bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 hover:border-white/20
                      text-white/70 hover:text-white transition-all duration-200"
                  >
                    {['Walk away in silence', 'Fine, FINE.', 'I accept my fate 😔', 'okay I get it!!', 'please let me go', 'I WILL NEVER RETURN'][Math.min(notAdminClickCount - 1, 5)]}
                  </motion.button>

                  {user && (
                    <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Discord User ID</span>
                        <button
                          onClick={() => {
                            const idToCopy = user.discordId || user.uid || user.id;
                            navigator.clipboard.writeText(String(idToCopy));
                            toast.success("Discord User ID copied to clipboard!");
                          }}
                          className="text-[10px] font-mono text-fivem-orange hover:underline cursor-pointer font-bold"
                        >
                          Copy Discord ID
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-white/90 select-all break-all">{user.discordId || user.uid || user.id}</p>

                      {user.discordId && user.discordId !== user.uid && (
                        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Supabase Auth ID</span>
                          <span className="text-[10px] font-mono text-white/40 select-all break-all">{user.uid}</span>
                        </div>
                      )}

                      <p className="text-[10px] text-white/40 leading-snug pt-0.5">Ensure this Discord User ID exists as a document ID in the Firestore <code className="text-fivem-orange font-mono">admins</code> collection.</p>
                    </div>
                  )}

                  <p className="text-center text-[10px] font-mono text-white/20 mt-3 tracking-widest uppercase">
                    hack attempt #{notAdminClickCount} logged
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>


      {/* ── Aceternity UI — Simple Login With Grid Lines Modal ── */}
      <GridLinesLoginModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onDiscordLogin={async () => {
          setShowSignInModal(false);
          const success = await handleDiscordLogin();
          if (!success) setShowSignInModal(true);
        }}
      />

      {/* ── Animate UI Radix Sheet — User Profile & Kokonut UI Avatar Picker ── */}
      <ProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        user={user}
        isAdmin={isAdmin}
        isAuthLoading={isAuthLoading}
        getUserWinCount={getUserWinCount}
        getProfileAvatar={getProfileAvatar}
        getDiceBearAvatarUrl={getDiceBearAvatarUrl}
        availableDiceBearStyles={AVAILABLE_DICEBEAR_STYLES}
        onSaveProfile={handleSaveProfile}
        onRetryDiscordAvatar={handleRetryDiscordAvatar}
        onOpenAdminModal={() => navigateTo('/admin')}
        onOpenCategorySuggestions={() => navigateTo('/admin/suggestions')}
        onOpenBugModal={() => setShowBugModal(true)}
        onSignOut={handleSignOut}
      />

    </ShaderBackground>
  );
}




