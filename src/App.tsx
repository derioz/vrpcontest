/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { cn } from './lib/utils';
import { ShimmeringText } from './components/ui/shimmering-text';
import { Orb } from './components/ui/orb';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { VoteButton } from './components/VoteButton';

// Firebase Integrations
import { auth, discordProvider, db } from './lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, limit, setDoc, updateDoc, increment, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface Category {
  id: string;
  name: string;
  description: string;
  emoji?: string;
}

interface Photo {
  id: string;
  category_id: string;
  player_name: string;
  discord_name: string;
  image_url: string;
  caption: string;
  created_at: string;
  vote_count: number;
}

interface Rule {
  id: number;
  title: string;
  content: string;
  category: string;
  importance: 'Normal' | 'High' | 'Critical';
}

interface Theme {
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    card: string;
    accent: string;
  };
  font: string;
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [rulesMarkdown, setRulesMarkdown] = useState('');
  const [votingOpen, setVotingOpen] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(true);
  const [onePhotoPerUser, setOnePhotoPerUser] = useState(false);
  const [playerName, setPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [userSubmissionCount, setUserSubmissionCount] = useState(0);
  const [userTotalVotes, setUserTotalVotes] = useState(0);

  const [activeContest, setActiveContest] = useState<{ id: string; name: string } | null>(null);
  const [votedPhotoIds, setVotedPhotoIds] = useState<Set<string>>(new Set());
  const [votingPhotoId, setVotingPhotoId] = useState<string | null>(null);

  // photos for the currently-selected category (derived from allPhotos)
  const photos = useMemo(() => {
    if (!selectedCategory) return [];
    return allPhotos.filter(p => p.category_id === selectedCategory.id);
  }, [allPhotos, selectedCategory]);

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      if (sortBy === 'top') return (b.vote_count || 0) - (a.vote_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [photos, sortBy]);

  const handleShare = (photo: Photo) => {
    const url = `${window.location.origin}/?photo=${photo.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      // Debug: Log user info to help troubleshoot
      console.log('Firebase Auth User:', {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        providerData: currentUser.providerData.map(p => ({
          providerId: p.providerId,
          uid: p.uid,
          displayName: p.displayName,
          email: p.email
        }))
      });

      // Check for email user (legacy admin)
      const isEmailUser = currentUser.providerData.some(p => p.providerId === 'password');
      if (isEmailUser) {
        setIsAdmin(true);
        return;
      }

      // Check for Discord admin â€” look up by document ID
      try {
        const discordProfile = currentUser.providerData.find(p => p.providerId === 'oidc.discord');
        const idsToCheck = new Set([currentUser.uid]);
        if (discordProfile?.uid) idsToCheck.add(discordProfile.uid);

        console.log('Admin check - trying IDs:', [...idsToCheck]);

        for (const id of idsToCheck) {
          const adminDoc = await getDoc(doc(db, 'admins', id));
          if (adminDoc.exists()) {
            console.log('âœ… Admin matched:', id);
            setIsAdmin(true);
            return;
          }
        }

        console.log('âŒ No admin match. Add one of these IDs to the "admins" collection:', [...idsToCheck]);
        setIsAdmin(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Track User Submissions and Votes
  useEffect(() => {
    if (!user || !user.displayName) {
      setUserSubmissionCount(0);
      setUserTotalVotes(0);
      return;
    }

    const q = query(collection(db, 'photos'), where('discord_name', '==', user.displayName));
    const unsub = onSnapshot(q, (snapshot) => {
      setUserSubmissionCount(snapshot.size);
      let votes = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        votes += (data.vote_count || 0);
      });
      setUserTotalVotes(votes);
    }, (err) => {
      console.error("User submissions listener error", err);
    });

    return () => unsub();
  }, [user]);

  // Track which photos the current user has voted on (real-time)
  useEffect(() => {
    if (!user) {
      setVotedPhotoIds(new Set());
      return;
    }
    const q = query(collection(db, 'votes'), where('voterUid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(d => d.data().photoId as string));
      setVotedPhotoIds(ids);
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
        setRulesMarkdown(data.rulesMarkdown || '');
        if (data.theme) setCurrentTheme(data.theme);
      }
      setIsInitialLoad(false);
    }, (err) => {
      console.error("Settings listener error:", err);
      setIsInitialLoad(false);
    });

    // 2. Listen to Active Contest
    const qContest = query(collection(db, 'contests'), where('is_active', '==', true), limit(1));
    const unsubContest = onSnapshot(qContest, async (snapshot) => {
      if (!snapshot.empty) {
        const activeDoc = snapshot.docs[0];
        const contestData = { id: activeDoc.id, name: activeDoc.data().name };
        setActiveContest(contestData);

        // 3. Once we have an active contest, fetch its categories
        const qCats = query(collection(db, 'categories'), where('contest_id', '==', activeDoc.id));
        const catSnap = await getDocs(qCats);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];
        setCategories(cats);
        setSelectedCategory(prev => {
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

  // Listen to ALL photos for all categories in the active contest
  useEffect(() => {
    if (!activeContest || categories.length === 0) {
      setAllPhotos([]);
      return;
    }
    const catIds = categories.map(c => c.id);
    const q = query(collection(db, 'photos'), where('category_id', 'in', catIds));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Photo[];
      setAllPhotos(fetched);
    }, (err) => {
      console.error('Photos listener error', err);
      toast.error('Failed to load photos');
    });
    return () => unsub();
  }, [activeContest, categories]);

  const handleVote = async (photoId: string) => {
    if (!votingOpen) {
      toast.error('Voting is currently closed');
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      const success = await handleDiscordLogin();
      if (!success) return;
      currentUser = auth.currentUser;
      if (!currentUser) return;
    }

    let currentName = playerName;
    if (!currentName) {
      const promptedName = window.prompt("Please enter your Vital RP Character Name to vote:");
      if (!promptedName) {
        toast.error('Player name is required to vote');
        return;
      }
      currentName = promptedName;
      setPlayerName(currentName);
      localStorage.setItem('fivem_player_name', currentName);
    }

    try {
      const voteRef = doc(db, 'votes', `${photoId}_${currentUser.uid}`);
      const voteSnap = await getDoc(voteRef);
      const photoRef = doc(db, 'photos', photoId);

      if (voteSnap.exists()) {
        // Already voted — remove the vote
        await deleteDoc(voteRef);
        await updateDoc(photoRef, { vote_count: increment(-1) });
        toast.success('Vote removed!');
      } else {
        // Cast a new vote
        await setDoc(voteRef, {
          photoId,
          voterName: currentName,
          voterUid: currentUser.uid,
          voterDiscord: currentUser.displayName,
          timestamp: new Date().toISOString()
        });
        await updateDoc(photoRef, { vote_count: increment(1) });
        toast.success('Vote recorded!');
      }
    } catch (error) {
      console.error("Vote Error:", error);
      toast.error('Network error or vote failed');
    }
  };

  const handleDeletePhoto = async (photoId: string, photoDiscordName: string) => {
    // Ownership check: only the photo owner or an admin can delete
    const isOwner = user && (
      user.displayName === photoDiscordName ||
      user.providerData.some(p => p.displayName === photoDiscordName)
    );
    if (!isAdmin && !isOwner) {
      toast.error('You can only delete your own photos');
      return;
    }
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    try {
      await deleteDoc(doc(db, 'photos', photoId));
      if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
      toast.success('Photo deleted successfully!');
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error('Failed to delete photo');
    }
  };

  const handleUpload = async (imageData: string, caption: string, discordName: string, formPlayerName: string, categoryId: string) => {
    if (!submissionsOpen) {
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
      // Convert base64 data URL to Blob
      const res = await fetch(imageData);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, `entry_${Date.now()}.png`);

      const uploadRes = await fetch('https://api.fivemanage.com/api/image', {
        method: 'POST',
        headers: {
          'Authorization': 'IHo5KJCgcYdVYCqAZsnYokzPAYoUnTsK'
        },
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image to Fivemanage');
      }

      const uploadData = await uploadRes.json();
      const downloadURL = uploadData.url;

      const newPhoto = {
        category_id: categoryId,
        player_name: formPlayerName,
        discord_name: discordName,
        image_url: downloadURL,
        caption: caption || '',
        created_at: new Date().toISOString(),
        vote_count: 0
      };

      await addDoc(collection(db, 'photos'), newPhoto);

      toast.success('Photo uploaded successfully!');
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

  const handleDiscordLogin = async () => {
    try {
      await signInWithPopup(auth, discordProvider);
      return true;
    } catch (error: any) {
      console.error("Detailed Discord Auth Error:", error);

      if (error.code === 'auth/popup-closed-by-user') {
        return false;
      }

      // Handle common configuration errors with helpful messages
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized in Firebase. Add your Vercel URL to "Authorized Domains" in the Firebase Console.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Discord login is not enabled in Firebase. Enable it in the "Sign-in method" tab.');
      } else {
        toast.error(`Authentication failed: ${error.message || 'Unknown error'}`);
      }

      return false;
    }
  };

  const handleUploadClick = async () => {
    if (!submissionsOpen) {
      toast.error('Submissions are currently closed');
      return;
    }
    if (onePhotoPerUser && userSubmissionCount >= 1) {
      toast.error('You have already submitted a photo. Only 1 submission per user is allowed.');
      return;
    }

    const isDiscordUser = user?.providerData.some(p => p.providerId === 'oidc.discord');

    if (user && isDiscordUser) {
      setShowUploadModal(true);
      return;
    }

    const success = await handleDiscordLogin();
    if (success) {
      setShowUploadModal(true);
    }
  };

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex flex-col gap-8 items-center justify-center bg-fivem-dark">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glow rings */}
          <div className="absolute inset-0 rounded-full bg-fivem-orange/20 blur-3xl scale-150 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-orange-400/10 blur-2xl scale-125" />
          <img
            src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png"
            alt="Vital RP"
            className="w-40 h-40 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(234,88,12,0.7)]"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ShimmeringText text="Connecting to Vital RP..." duration={2} className="text-xl font-bold tracking-widest uppercase font-mono" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" theme="dark" />

      {/* Top-Anchored Command Bar (Unique Non-Pill Design) */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {/* The Glass Backdrop — Only blurs what passes directly behind the taller header */}
        <div className="absolute inset-0 h-24 bg-[#030303]/40 backdrop-blur-2xl border-b border-white/[0.04] mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />

        {/* The Animated Glow Line at the very top edge */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/50 to-transparent"
        />

        <div className="relative h-16 sm:h-24 max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between pointer-events-none">

          {/* Left: Branding — pure minimalist geometry */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="pointer-events-auto flex items-center gap-4 group/brand"
          >
            {/* The Orb */}
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-fivem-orange/10 border border-fivem-orange/20 scale-100 group-hover/brand:scale-110 transition-transform duration-500" />
              <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="Vital RP" className="w-6 h-6 object-contain relative z-10 drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
            </div>
            {/* The Typography */}
            <div className="flex flex-col">
              <span className="text-white font-display font-black text-sm tracking-[0.2em] leading-none mb-1">
                VITAL RP
              </span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-px bg-fivem-orange/50" />
                <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] leading-none">
                  {activeContest?.name || 'Photo Contest'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Actions — floating glass tags */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pointer-events-auto flex items-center gap-3"
          >
            {user ? (
              <div className="group/user relative flex items-center gap-3 px-2 py-2 rounded-full hover:bg-white/[0.04] transition-colors duration-500 border border-transparent hover:border-white/[0.05]">
                <div className="flex flex-col items-end pr-1 hidden sm:flex">
                  <span className="text-xs font-bold text-white/90 leading-none mb-1">{user.displayName?.split(' ')[0] || user.email?.split('@')[0]}</span>
                  <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30 leading-none">Online</span>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full ring-1 ring-white/10 group-hover/user:ring-white/30 transition-all" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-white/50 border border-white/10">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleDiscordLogin}
                className="group/login relative px-6 h-11 rounded-full flex items-center gap-2 overflow-hidden bg-white/[0.03] border border-white/[0.08] hover:border-[#5865F2]/50 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-[#5865F2]/10 translate-y-full group-hover/login:translate-y-0 transition-transform duration-500 ease-out" />
                <img src="https://assets-global.website-files.com/6257adef93867e3c8405902d/636e0a2249ac060fd548bc35_discord-icon.svg" className="w-4 h-4 invert opacity-50 group-hover/login:opacity-100 group-hover/login:invert-0 transition-all duration-500 relative z-10" style={{ filter: 'brightness(0) saturate(100%) invert(100%)' }} alt="" />
                <span className="text-xs font-display font-bold tracking-[0.15em] uppercase text-white/60 group-hover/login:text-[#5865F2] transition-colors duration-500 relative z-10">Sign In</span>
              </button>
            )}

            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1" />

            <button
              onClick={() => isAdmin ? setShowAdminModal(true) : setShowLoginModal(true)}
              className={cn(
                "group/setting relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-500",
                isAdmin
                  ? "hover:bg-fivem-orange/10 border border-transparent hover:border-fivem-orange/30"
                  : "hover:bg-white/[0.06] border border-transparent hover:border-white/[0.05]"
              )}
            >
              {isAdmin && (
                <div className="absolute inset-0 rounded-full bg-fivem-orange/5 animate-pulse opacity-50" />
              )}
              <Settings size={18} className={cn(
                "transition-all duration-[1s] ease-[cubic-bezier(0.22,1,0.36,1)]",
                isAdmin ? "text-fivem-orange group-hover/setting:rotate-[360deg]" : "text-white/40 group-hover/setting:text-white/80 group-hover/setting:rotate-90"
              )} />
              {isAdmin && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,1)]" />}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Hero Banner — GlowyWavesHero + NewHeroSection patterns from uitripled */}
      {activeContest ? (() => {
        // uitripled containerVariants / itemVariants / statsVariants pattern
        const heroContainerVariants = {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
        };
        const heroItemVariants = {
          hidden: { opacity: 0, y: 24 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
        };

        return (
          <section className="relative overflow-hidden border-b border-white/10 pt-20 sm:pt-28" style={{ minHeight: '500px' }}>
            {/* ── Deep dark base ── */}
            <div className="absolute inset-0 bg-[#060606]" />

            {/* ── Animated ambient orbs (uitripled GlassmorphismHeroBlock pattern) ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute left-[10%] top-[-10%] w-[700px] h-[700px] rounded-full bg-fivem-orange/[0.07] blur-[160px] animate-pulse" style={{ animationDuration: '6s' }} />
              <div className="absolute right-[5%] bottom-[-20%] w-[500px] h-[500px] rounded-full bg-fivem-orange/[0.05] blur-[120px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />
              <div className="absolute left-[40%] top-[30%] w-[400px] h-[400px] rounded-full bg-orange-400/[0.03] blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
            </div>

            {/* ── Grid dot overlay (uitripled texture detail) ── */}
            <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {/* ── Film grain ── */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px'
            }} />

            {/* ── Main 2-col layout ── */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

              {/* LEFT — text content */}
              <motion.div
                variants={heroContainerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col"
              >
                {/* Badge pill */}
                <motion.div variants={heroItemVariants} className="mb-8">
                  <div className="inline-flex items-center gap-3 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 backdrop-blur-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fivem-orange">
                    <div className="p-1.5 bg-fivem-orange/20 rounded-full">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    Photo Contest
                    <span className="flex items-center gap-1.5 ml-1 pl-3 border-l border-fivem-orange/20">
                      <span className="w-1.5 h-1.5 bg-fivem-orange rounded-full animate-pulse" />
                      <span className="text-[9px] tracking-widest">LIVE</span>
                    </span>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  variants={heroItemVariants}
                  className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black font-display tracking-tight leading-[0.92] mb-5"
                >
                  <span className="text-white">{activeContest.name.split(' ')[0]}</span>
                  {activeContest.name.split(' ').length > 1 && (
                    <>
                      {' '}
                      <span className="bg-gradient-to-r from-fivem-orange via-orange-400 to-amber-300 bg-clip-text text-transparent">
                        {activeContest.name.split(' ').slice(1).join(' ')}
                      </span>
                    </>
                  )}
                </motion.h2>

                {/* Tagline */}
                <motion.p variants={heroItemVariants} className="text-white/45 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                  Capture the moment. Submit your best in-game screenshot and let the community pick their favorite.
                </motion.p>

                {/* CTAs */}
                <motion.div variants={heroItemVariants} className="flex flex-wrap gap-3 mb-10">
                  <button
                    onClick={handleUploadClick}
                    disabled={!submissionsOpen}
                    className={cn(
                      "group relative flex items-center gap-2.5 font-bold px-8 py-4 rounded-2xl text-sm overflow-hidden transition-all",
                      submissionsOpen
                        ? "bg-fivem-orange text-white hover:-translate-y-1 hover:shadow-[0_12px_50px_rgba(234,88,12,0.6)]"
                        : "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                    )}
                  >
                    {submissionsOpen && <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />}
                    {submissionsOpen ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    ) : (
                      <Lock size={17} className="relative z-10" />
                    )}
                    <span className="relative z-10">{submissionsOpen ? 'Submit Your Shot' : 'Submissions Closed'}</span>
                  </button>
                  <a
                    href="#rules"
                    className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 text-sm backdrop-blur-sm"
                  >
                    <FileText size={15} />
                    Contest Rules
                  </a>
                </motion.div>

                {/* Stats — GlassmorphismMinimalMetricsBlock: rounded-2xl, backdrop-blur-2xl, hover-lift, color-coded */}
                <motion.div variants={heroItemVariants} className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: categories.length, label: 'Categories' },
                    { value: allPhotos.length, label: 'Entries' },
                    { value: allPhotos.reduce((s, p) => s + (p.vote_count || 0), 0), label: 'Votes', accent: true },
                    { value: votingOpen ? 'Open' : 'Closed', label: 'Voting', status: true },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1',
                        (stat as any).accent
                          ? 'border-fivem-orange/25 bg-fivem-orange/[0.08] hover:border-fivem-orange/40'
                          : (stat as any).status
                            ? (votingOpen ? 'border-emerald-500/25 bg-emerald-500/[0.08]' : 'border-amber-500/25 bg-amber-500/[0.08]')
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className={cn('text-2xl font-black font-display leading-none mb-1.5 relative z-10',
                        (stat as any).accent ? 'text-fivem-orange' : (stat as any).status ? (votingOpen ? 'text-emerald-400' : 'text-amber-400') : 'text-white'
                      )}>{String(stat.value)}</p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 leading-none relative z-10">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* RIGHT — photo mosaic (uitripled BentoGridBlock gallery pattern) */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                className="hidden lg:block relative"
              >
                {/* Spinning circular text badge — uitripled bento sparkle rotate */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-8 -right-4 z-20 w-24 h-24"
                >
                  <svg viewBox="0 0 80 80" className="w-full h-full">
                    <path id="heroCircle" d="M 40,40 m -30,0 a 30,30 0 1,1 60,0 a 30,30 0 1,1 -60,0" fill="none" />
                    <text fontSize="8.5" fill="rgba(234,88,12,0.65)" fontFamily="monospace" letterSpacing="3.2">
                      <textPath href="#heroCircle">PHOTO CONTEST • LIVE • SUBMIT •</textPath>
                    </text>
                  </svg>
                  <div className="absolute inset-[28%] rounded-full bg-fivem-orange/20 border border-fivem-orange/30 flex items-center justify-center">
                    <span className="text-xl">📸</span>
                  </div>
                </motion.div>

                {/* Photo mosaic */}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.slice(0, 4).map((photo, i) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={cn(
                          'relative overflow-hidden rounded-2xl border border-white/10 group cursor-pointer',
                          i === 0 ? 'aspect-[4/3]' : i === 3 ? 'aspect-[4/3]' : 'aspect-square'
                        )}
                        onClick={() => setSelectedCategory(categories.find(c => c.id === photo.category_id) || null)}
                      >
                        <img src={photo.image_url} alt={photo.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {(photo.vote_count || 0) > 0 && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs">❤️</span>
                            <span className="text-xs font-bold text-white">{photo.vote_count}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { bg: 'from-fivem-orange/20 to-orange-900/20', icon: '📸', label: 'Be first to submit' },
                      { bg: 'from-purple-500/15 to-purple-900/10', icon: '🎬', label: 'In-game shots' },
                      { bg: 'from-blue-500/15 to-blue-900/10', icon: '✨', label: 'Community voting' },
                      { bg: 'from-emerald-500/15 to-emerald-900/10', icon: '🏆', label: 'Win prizes' },
                    ].map((card, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className={cn(
                          'relative overflow-hidden rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 bg-gradient-to-br',
                          i === 0 ? 'aspect-[4/3]' : i === 3 ? 'aspect-[4/3]' : 'aspect-square',
                          card.bg
                        )}
                      >
                        <span className="text-3xl mb-2">{card.icon}</span>
                        <span className="text-xs text-white/50 font-mono text-center">{card.label}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Aperture watermark */}
                <div className="absolute -bottom-6 -right-6 w-40 h-40 opacity-[0.035] pointer-events-none">
                  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="98" stroke="white" strokeWidth="2" />
                    <circle cx="100" cy="100" r="65" stroke="white" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="32" stroke="white" strokeWidth="1" />
                    {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                      <line key={i}
                        x1={100 + 68 * Math.cos((deg * Math.PI) / 180)}
                        y1={100 + 68 * Math.sin((deg * Math.PI) / 180)}
                        x2={100 + 96 * Math.cos(((deg + 55) * Math.PI) / 180)}
                        y2={100 + 96 * Math.sin(((deg + 55) * Math.PI) / 180)}
                        stroke="white" strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                </div>
              </motion.div>

            </div>
          </section>
        );
      })() : (
        <section className="relative overflow-hidden border-b border-white/10 py-28 flex flex-col items-center justify-center text-center px-6">
          <div className="absolute inset-0 bg-[#060606]" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-fivem-orange/[0.04] blur-[160px] rounded-full pointer-events-none" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-6">
            <div className="absolute inset-0 bg-white/5 blur-3xl scale-150 rounded-full" />
            <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="" className="w-24 h-24 object-contain mx-auto opacity-20 relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-display font-black text-white/30 mb-3 relative z-10">No Active Contest</h2>
          <p className="text-white/20 max-w-sm relative z-10">Check back soon — the next contest is being prepared by the admins.</p>
        </section>
      )}

      {/* Category Tab Bar — spring-animated (inspired by uitripled NativeTabs) */}

      {
        categories.length > 0 && (
          <div className="relative z-30 bg-fivem-dark/98 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_20px_rgba(0,0,0,0.4)]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar touch-pan-x py-4">

                {/* Left anchor label */}
                <div className="shrink-0 flex flex-col justify-center gap-1 pr-5 border-r border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-fivem-orange font-mono leading-none">Browse</span>
                  <span className="text-base font-black text-white font-display whitespace-nowrap leading-tight">Categories</span>
                  <span className="text-[11px] font-mono text-white/30 leading-none">{categories.length} topics</span>
                </div>

                {/* Category pill strip — position:relative so the layoutId indicator can be absolute */}
                <div className="relative flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                  {categories.map((cat) => {
                    const entryCount = allPhotos.filter(p => p.category_id === cat.id).length;
                    const isActive = selectedCategory?.id === cat.id;
                    const totalAll = allPhotos.length;
                    const pct = totalAll > 0 ? ((entryCount / totalAll) * 100).toFixed(0) : '0';
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="relative z-10 flex flex-col gap-1.5 px-5 py-3.5 rounded-xl transition-colors duration-150 text-left shrink-0"
                      >
                        {/* Spring sliding indicator behind the active button */}
                        {isActive && (
                          <motion.div
                            layoutId="cat-active-pill"
                            className="absolute inset-0 rounded-xl bg-fivem-orange shadow-[0_0_20px_rgba(234,88,12,0.5)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30, bounce: 0.15 }}
                          />
                        )}
                        {/* Content always above the indicator */}
                        <div className="relative flex items-center gap-2">
                          <span className="text-xl leading-none">{cat.emoji || '✨'}</span>
                          <span className={cn("text-sm font-bold whitespace-nowrap transition-colors", isActive ? "text-white" : "text-white/65 group-hover:text-white")}>{cat.name}</span>
                        </div>
                        <div className="relative flex items-center justify-between gap-2">
                          <span className={cn("text-xs font-mono leading-none transition-colors", isActive ? "text-white/80" : "text-white/40")}>
                            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                          </span>
                          <span className={cn("text-[10px] font-mono leading-none px-1.5 py-0.5 rounded-full transition-colors", isActive ? "bg-white/20 text-white/80" : "bg-white/8 text-white/30")}>
                            {pct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right: stacked total */}
                <div className="ml-auto shrink-0 pl-5 border-l border-white/10 flex flex-col justify-center items-end gap-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 leading-none">Total</span>
                  <span className="text-xl font-black font-display text-white leading-none">{allPhotos.length}</span>
                  <span className="text-[9px] font-mono text-white/30 leading-none">entries</span>
                </div>

              </div>
            </div>
          </div>
        )
      }



      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">

        {/* Main Content – 3 cols */}
        <div className="lg:col-span-3 space-y-12 sm:space-y-20 min-w-0">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-3xl">{selectedCategory?.emoji || 'ðŸ“·'}</span>
                  <h2 className="text-2xl font-display font-bold">{selectedCategory?.name || 'Entries'}</h2>
                </div>
                <p className="text-sm text-white/40">{selectedCategory?.description}</p>
                <p className="text-xs text-white/30 mt-1 font-mono">{photos.length} entries submitted</p>
              </div>
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
                <button
                  onClick={() => setSortBy('top')}
                  className={cn(
                    "flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-all",
                    sortBy === 'top' ? "bg-fivem-orange text-white shadow-lg shadow-fivem-orange/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <Trophy size={14} /> TOP VOTED
                </button>
                <button
                  onClick={() => setSortBy('newest')}
                  className={cn(
                    "flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg transition-all",
                    sortBy === 'newest' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  NEWEST
                </button>
              </div>
            </div>

            {photos.length === 0 ? (
              <motion.div
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
                    className="mt-6 flex items-center gap-2 bg-fivem-orange/20 border border-fivem-orange/30 text-fivem-orange font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-fivem-orange hover:text-white transition-all"
                  >
                    <Upload size={16} /> Submit Entry
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {sortedPhotos.map((photo, index) => {
                    const rankEmoji = sortBy === 'top' ? (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null) : null;
                    return (
                      <motion.div
                        layout
                        key={photo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "relative group bg-fivem-card rounded-2xl overflow-hidden border transition-all",
                          sortBy === 'top' && index === 0
                            ? "md:col-span-2 ring-2 ring-fivem-orange/50 shadow-2xl shadow-fivem-orange/10 border-fivem-orange/30"
                            : "border-white/5 hover:border-fivem-orange/30"
                        )}
                      >
                        <div className={cn("relative overflow-hidden cursor-pointer", sortBy === 'top' && index === 0 ? "aspect-[21/9]" : "aspect-video")} onClick={() => setLightboxPhoto(photo)}>
                          <img
                            src={photo.image_url}
                            alt={photo.caption}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                          {/* Top-left: rank badge + player name in one row */}
                          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                            {rankEmoji && (
                              <span className="text-2xl drop-shadow-lg leading-none">{rankEmoji}</span>
                            )}
                            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 max-w-[160px]">
                              <User size={10} className="text-fivem-orange shrink-0" />
                              <span className="text-[10px] font-bold uppercase tracking-wider truncate">{photo.player_name}</span>
                            </div>
                          </div>

                          {/* Top-right: action buttons (hover) */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
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

                          <div className="absolute bottom-3 right-3 z-20">
                            <VoteButton
                              photoId={photo.id}
                              voteCount={photo.vote_count || 0}
                              hasVoted={votedPhotoIds.has(photo.id)}
                              votingOpen={votingOpen}
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Rules Section */}
          <section id="rules" className="pt-12 pb-24 border-t border-white/10">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Contest Rules & Details</h2>
              <p className="text-white/50">Please read carefully before submitting your entries.</p>
            </div>
            <div className="p-8 md:p-12 glass rounded-3xl border border-white/10 relative overflow-hidden">
              {/* Premium Glow Aesthetic behind rules */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-fivem-orange/10 blur-[120px] rounded-full pointer-events-none" />

              {rulesMarkdown ? (
                <div className="prose prose-invert prose-headings:font-display prose-headings:font-bold prose-a:text-fivem-orange prose-a:no-underline hover:prose-a:underline prose-p:text-white/70 prose-p:whitespace-pre-wrap prose-li:text-white/70 max-w-none relative z-10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {rulesMarkdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center relative z-10">
                  <FileText size={48} className="text-white/10 mb-4" />
                  <p className="text-white/40 font-medium">No rules have been posted yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar – 1 col */}
        <aside className="lg:col-span-1 space-y-4 sm:space-y-6 lg:sticky lg:top-28 self-start order-first lg:order-last">

          {/* Profile */}
          <section>
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4">Your Profile</h2>
            {user ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-xl backdrop-blur-md">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-fivem-orange/10 blur-[50px] pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-fivem-orange/30 p-1">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-fivem-orange/10 flex items-center justify-center text-fivem-orange">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#ea580c]/20 bg-emerald-500" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{user.displayName || 'Anonymous Explorer'}</h3>
                      <p className="text-xs text-fivem-orange/80 font-mono uppercase tracking-wider mt-0.5">
                        {isAdmin ? 'System Admin' : 'Verified Member'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="rounded-xl bg-black/20 p-3 border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-default">
                      <span className="text-2xl font-display font-bold text-white">{userSubmissionCount}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Submissions</span>
                    </div>
                    <div className="rounded-xl bg-fivem-orange/10 p-3 border border-fivem-orange/20 flex flex-col items-center justify-center text-center hover:bg-fivem-orange/20 transition-colors cursor-default">
                      <span className="text-2xl font-display font-bold text-fivem-orange">{userTotalVotes}</span>
                      <span className="text-[10px] text-fivem-orange/60 uppercase tracking-widest mt-1">Total Votes</span>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut(auth)}
                    className="w-full group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <LogOut size={16} className="text-white/50 group-hover:text-red-400 transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-red-400 transition-colors">Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 overflow-hidden bg-gradient-to-br from-[#5865F2]/15 via-fivem-card to-fivem-card">
                {/* Top graphic strip */}
                <div className="h-1.5 bg-gradient-to-r from-[#5865F2] via-[#7289da] to-[#5865F2]" />
                <div className="p-6 space-y-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center">
                    <svg role="img" viewBox="0 0 24 24" className="w-7 h-7 fill-[#7289da]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Sign in with Discord</h3>
                    <p className="text-xs text-white/40 leading-relaxed">Submit entries, cast votes, and track your community standing.</p>
                  </div>
                  <button
                    onClick={handleDiscordLogin}
                    className="group w-full relative overflow-hidden bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all hover:shadow-[0_0_28px_rgba(88,101,242,0.55)] hover:-translate-y-0.5 text-sm"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                    <svg role="img" viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                    Continue with Discord
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Contest Status + Submit CTA */}
          <section className="p-6 bg-fivem-card rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Contest Status</h3>
              <div className="flex flex-col items-end gap-1">
                {votingOpen ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Unlock size={10} /> Voting Open
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Lock size={10} /> Voting Closed
                  </span>
                )}
                {submissionsOpen ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-fivem-orange bg-fivem-orange/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Unlock size={10} /> Submissions Open
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Lock size={10} /> Submissions Closed
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              {submissionsOpen
                ? votingOpen
                  ? "Browse the entries and cast your votes for your favorites!"
                  : "Submit your best shots now. Voting will open soon."
                : "Submissions are closed. Stay tuned for voting!"}
            </p>
            <button
              onClick={handleUploadClick}
              disabled={!submissionsOpen}
              className={cn(
                "w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors",
                submissionsOpen
                  ? "bg-white text-black hover:bg-fivem-orange hover:text-white"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              {submissionsOpen ? <Upload size={18} /> : <Lock size={18} />}
              {submissionsOpen ? 'Upload Photo' : 'Submissions Closed'}
            </button>
          </section>

          {/* Contest Quick Facts */}
          {activeContest && (
            <section className="p-6 bg-fivem-card rounded-2xl border border-white/5 space-y-3">
              <h3 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em]">Contest Info</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Trophy size={14} className="text-fivem-orange shrink-0" />
                  <p className="text-xs text-white/70 font-medium truncate">{activeContest.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-white/30 shrink-0" />
                  <p className="text-xs text-white/40">{categories.length} categories active</p>
                </div>
                <div className="flex items-center gap-3">
                  <ImageIcon size={14} className="text-white/30 shrink-0" />
                  <p className="text-xs text-white/40">{allPhotos.length} total entries</p>
                </div>
              </div>
            </section>
          )}

        </aside>
      </main >

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg bg-fivem-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Entry</DialogTitle>
          </DialogHeader>
          <UploadForm
            categories={categories}
            initialCategoryId={selectedCategory?.id || ''}
            discordName={user?.displayName || user?.providerData?.[0]?.displayName || user?.email || 'Authenticated User'}
            onClose={() => setShowUploadModal(false)}
            onUpload={async (imageData, caption, discordName, formPlayerName, categoryId) => {
              await handleUpload(imageData, caption, discordName, formPlayerName, categoryId);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-[98vw] md:max-w-5xl lg:max-w-7xl bg-[#0a0a0a]/98 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.7)] text-white p-0 overflow-x-hidden">

          {/* Ambient glows — uitripled glassmorphism pattern */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fivem-orange/8 blur-[200px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fivem-orange/4 blur-[160px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-fivem-orange/3 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col -m-6">

            {/* ── Header Bar ── */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-fivem-orange/15 border border-fivem-orange/30 rounded-xl">
                  <Settings size={20} className="text-fivem-orange" />
                </div>
                <div>
                  <h2 className="text-lg font-black font-display text-white leading-none">Admin Settings</h2>
                  <p className="text-[11px] text-white/30 font-mono mt-0.5">Contest Management Console</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[11px] font-bold text-emerald-400 font-mono">Admin Authenticated</span>
                  </div>
                  <div className="text-[11px] text-white/30 font-mono px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    {user?.displayName || user?.email || 'Admin'}
                  </div>
                </div>
              )}
            </div>

            {!isAdmin ? (
              <div className="flex-1 flex items-center justify-center p-10">
                {user ? (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3 max-w-sm">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                      <Lock className="text-red-400" size={24} />
                    </div>
                    <p className="font-bold text-red-400">Access Denied</p>
                    <p className="text-xs text-white/50">Your account ({user.displayName}) is not listed as an administrator.</p>
                    <button onClick={() => signOut(auth)} className="text-xs text-white/30 hover:text-white underline">
                      Logout to switch accounts
                    </button>
                  </div>
                ) : (
                  <LoginForm onDiscordLogin={handleDiscordLogin} />
                )}
              </div>
            ) : (
              <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">

                {/* ── Glassmorphism Stats Row (uitripled stats-card pattern) ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Active Contest', value: activeContest?.name || 'None', icon: Trophy, color: 'orange' },
                    { label: 'Categories', value: categories.length, icon: Layers, color: 'blue' },
                    { label: 'Total Entries', value: allPhotos.length, icon: ImageIcon, color: 'purple' },
                    { label: 'Voting', value: votingOpen ? 'Open' : 'Closed', icon: votingOpen ? Unlock : Lock, color: votingOpen ? 'emerald' : 'red' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    const colors: Record<string, string> = {
                      orange: 'from-fivem-orange/20 border-fivem-orange/25 [--c:theme(colors.orange.500)]',
                      blue: 'from-blue-500/15 border-blue-500/20 [--c:theme(colors.blue.400)]',
                      purple: 'from-purple-500/15 border-purple-500/20 [--c:theme(colors.purple.400)]',
                      emerald: 'from-emerald-500/15 border-emerald-500/20 [--c:theme(colors.emerald.400)]',
                      red: 'from-red-500/15 border-red-500/20 [--c:theme(colors.red.400)]',
                    };
                    const iconColors: Record<string, string> = { orange: 'text-fivem-orange', blue: 'text-blue-400', purple: 'text-purple-400', emerald: 'text-emerald-400', red: 'text-red-400' };
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.4 }}
                        className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br to-white/5 p-4", colors[stat.color])}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 blur-[40px] opacity-30 rounded-full bg-current" />
                        <Icon size={16} className={cn("mb-3 relative z-10", iconColors[stat.color])} />
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
                        <p className="text-sm font-black text-white leading-tight truncate">{String(stat.value)}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Main 2-col Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* LEFT: Live Controls + Edit Contest */}
                  <div className="space-y-6">

                    {/* Live Controls card */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-fivem-orange/50 to-transparent" />
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-4 bg-fivem-orange rounded-full" />
                        <h4 className="text-[11px] font-mono text-white/50 uppercase tracking-[0.2em]">Live Controls</h4>
                      </div>
                      <div className="space-y-4">
                        {/* Voting Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">Voting Status</p>
                            <p className="text-xs text-white/40 mt-0.5">Toggle public voting for all categories</p>
                          </div>
                          <button
                            onClick={() => toggleVoting(!votingOpen)}
                            className={cn(
                              "relative shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden",
                              votingOpen
                                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            )}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {votingOpen ? <Lock size={14} /> : <Unlock size={14} />}
                              {votingOpen ? 'Close Voting' : 'Open Voting'}
                            </span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.06]" />

                        {/* Submissions Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">Submissions Status</p>
                            <p className="text-xs text-white/40 mt-0.5">Allow or block new photo submissions</p>
                          </div>
                          <button
                            onClick={() => toggleSubmissions(!submissionsOpen)}
                            className={cn(
                              "relative shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden",
                              submissionsOpen
                                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            )}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {submissionsOpen ? <Lock size={14} /> : <Unlock size={14} />}
                              {submissionsOpen ? 'Close Submissions' : 'Open Submissions'}
                            </span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/[0.06]" />

                        {/* 1 Photo Per User Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-white">1 Photo Per User</p>
                            <p className="text-xs text-white/40 mt-0.5">Limit each Discord account to one submission</p>
                          </div>
                          <button
                            onClick={() => toggleOnePhotoPerUser(!onePhotoPerUser)}
                            className={cn(
                              "relative shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden",
                              onePhotoPerUser
                                ? "bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30 hover:bg-fivem-orange/30 shadow-[0_0_20px_rgba(234,88,12,0.2)]"
                                : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                            )}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {onePhotoPerUser ? <Lock size={14} /> : <Unlock size={14} />}
                              {onePhotoPerUser ? 'Limit ON' : 'Limit OFF'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Edit Current Contest */}
                    {activeContest && (
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="px-6 pt-5 pb-4 border-b border-white/[0.07] flex items-center gap-2">
                          <div className="w-1 h-4 bg-white/30 rounded-full" />
                          <h4 className="text-[11px] font-mono text-white/50 uppercase tracking-[0.2em]">Edit Current Contest</h4>
                        </div>
                        <div className="p-6">
                          <EditContestManager
                            activeContest={activeContest}
                            currentRules={rulesMarkdown}
                            currentCategories={categories}
                            onUpdated={() => window.location.reload()}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Create + Danger */}
                  <div className="space-y-6 flex flex-col">

                    {/* Create New Contest */}
                    <div className="relative overflow-hidden rounded-2xl border border-fivem-orange/15 bg-fivem-orange/[0.03] flex-1">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-fivem-orange/60 to-transparent" />
                      <div className="absolute top-0 right-0 w-48 h-48 bg-fivem-orange/8 blur-[80px] rounded-full pointer-events-none" />
                      <div className="px-6 pt-5 pb-4 border-b border-fivem-orange/[0.12] flex items-center gap-2">
                        <div className="w-1 h-4 bg-fivem-orange rounded-full" />
                        <h4 className="text-[11px] font-mono text-fivem-orange/70 uppercase tracking-[0.2em]">Create New Contest</h4>
                      </div>
                      <div className="p-6 relative z-10">
                        <CreateContestManager onCreated={() => window.location.reload()} />
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.03]">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                      <div className="px-6 pt-5 pb-4 border-b border-red-500/[0.12] flex items-center gap-2">
                        <div className="w-1 h-4 bg-red-500/70 rounded-full" />
                        <AlertCircle size={13} className="text-red-500/80" />
                        <h4 className="text-[11px] font-mono text-red-500/80 uppercase tracking-[0.2em]">Danger Zone</h4>
                      </div>
                      <div className="p-6">
                        <ArchiveContest onArchived={() => window.location.reload()} />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxPhoto(null)}
              className="absolute inset-0"
            />

            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors z-10"
            >
              <X size={24} />
            </button>

            <motion.div
              layoutId={lightboxPhoto.id.toString()}
              className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col items-center justify-center pointer-events-none"
            >
              <img
                src={lightboxPhoto.image_url}
                alt={lightboxPhoto.caption}
                className="max-w-full max-h-full object-contain pointer-events-auto rounded-xl shadow-2xl shadow-fivem-orange/20"
              />

              <div className="absolute bottom-[-2rem] md:bottom-[-4rem] left-0 right-0 flex flex-col items-center text-center px-4 pointer-events-auto">
                <p className="text-white text-lg md:text-xl font-medium drop-shadow-lg">{lightboxPhoto.caption || "No caption provided"}</p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <User size={14} className="text-fivem-orange" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">{lightboxPhoto.player_name}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <Vote size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">{lightboxPhoto.vote_count || 0} Votes</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
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
                <div className="w-9 h-9 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
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
                  const el = e.currentTarget;
                  if (el.dataset.egging) return;
                  el.dataset.egging = "true";

                  const span = el.querySelector('.damon-text');
                  const img = el.querySelector('img');
                  if (!span || !img) return;

                  const oldHtml = span.innerHTML;
                  span.innerHTML = 'Made by <span class="text-white font-black drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]">✨ A GOD ✨</span>';

                  el.style.transform = 'scale(1.4) translateY(-10px) rotate(5deg)';
                  el.style.background = 'rgba(234,88,12,0.2)';
                  el.style.borderColor = 'rgba(234,88,12,0.5)';
                  img.classList.add('animate-spin');

                  setTimeout(() => {
                    span.innerHTML = oldHtml;
                    el.style.transform = '';
                    el.style.background = '';
                    el.style.borderColor = '';
                    img.classList.remove('animate-spin');
                    delete el.dataset.egging;
                  }, 2500);
                }}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md px-3.5 py-2 hover:border-white/20 transition-all duration-300 group cursor-pointer"
              >
                <img
                  src="https://r2.fivemanage.com/image/JOQmUtYFGJ7q.png"
                  alt="Damon"
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
                />
                <span className="damon-text text-[11px] font-mono text-white/40 group-hover:text-white/60 transition-colors">
                  Made by <span className="text-white/70 font-semibold">Damon</span>
                </span>
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
  );
}


function UploadForm({ categories, initialCategoryId, discordName, onUpload, onClose }: { categories: Category[], initialCategoryId: string, discordName: string, onUpload: (imageData: string, caption: string, discordName: string, playerName: string, categoryId: string) => Promise<void>, onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [formPlayerName, setFormPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
  const [isUploading, setIsUploading] = useState(false);
  const [resolution, setResolution] = useState<{ w: number, h: number } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setResolution({ w: img.width, h: img.height });
          setImage(dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false
  } as any);

  const handleSubmit = async () => {
    if (!image || !discordName || !formPlayerName || !selectedCategoryId) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (resolution && (resolution.w < 1920 || resolution.h < 1080)) {
      toast.error(`Resolution too low: ${resolution.w}x${resolution.h}. Minimum is 1920x1080.`);
      return;
    }

    localStorage.setItem('fivem_player_name', formPlayerName);
    setIsUploading(true);
    await onUpload(image, caption, discordName, formPlayerName, selectedCategoryId);
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-fivem-orange/10 border border-fivem-orange/20 rounded-xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Info className="text-fivem-orange shrink-0" size={18} />
          <p className="text-xs text-fivem-orange/90 leading-relaxed">
            We need your <strong>Discord Name</strong> and <strong>Character Name</strong> to securely verify your identity and easily distribute any contest rewards you might win!
          </p>
        </div>
        <div className="flex items-start gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="text-red-400 shrink-0" size={14} />
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
            WARNING: You can only submit ONE photo across all categories. Choose wisely!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Category (Required)</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-sm outline-none focus:border-fivem-orange text-white appearance-none"
          >
            <option value="" disabled className="bg-fivem-dark text-white/50">Select a Category...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id} className="bg-fivem-dark">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Character Name (Required)</label>
            <Input
              type="text"
              value={formPlayerName}
              onChange={(e) => setFormPlayerName(e.target.value)}
              placeholder="e.g. John Doe"
              className="bg-white/5 border-white/10 h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Discord Account</label>
            <div className="bg-emerald-500/10 border border-emerald-500/20 h-10 rounded-md px-3 flex items-center text-emerald-400 font-mono text-sm">
              <User size={14} className="mr-2" />
              {discordName}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Photo (Min 1920x1080)</label>
          <div
            {...getRootProps()}
            className={cn(
              "aspect-[16/9] sm:aspect-video max-h-48 sm:max-h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
              isDragActive ? "border-fivem-orange bg-fivem-orange/5" : "border-white/10 hover:border-white/20 bg-white/5",
              image && "border-none"
            )}
          >
            <input {...getInputProps()} />
            {image ? (
              <>
                <img src={image} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-widest">Click to change</p>
                  {resolution && (
                    <span className={cn(
                      "text-[10px] px-2 py-1 rounded bg-black/60",
                      (resolution.w < 1920 || resolution.h < 1080) ? "text-red-400" : "text-emerald-400"
                    )}>
                      {resolution.w}x{resolution.h}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/5 p-4 rounded-full mb-4">
                  <Upload className="text-white/40" size={32} />
                </div>
                <p className="text-sm font-medium">Drop your photo here</p>
                <p className="text-xs text-white/30 mt-1">or click to browse files</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Caption (Optional)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe your shot..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-fivem-orange transition-colors min-h-[100px] resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 h-12 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!image || !discordName || isUploading}
          className="flex-1 h-12 bg-fivem-orange hover:bg-fivem-orange/90 text-white rounded-xl"
        >
          {isUploading ? "Uploading..." : "Submit Entry"}
        </Button>
      </div>
    </div>
  );
}

function LoginForm({ onDiscordLogin }: { onDiscordLogin: () => Promise<boolean> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Admin Email</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 pl-10 h-12"
            placeholder="admin@vitalrp.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Admin Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 pl-10 h-12"
            placeholder="Enter password..."
          />
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <Button
        type="submit"
        disabled={loading || !password || !email}
        className="w-full h-12 bg-fivem-orange hover:bg-fivem-orange/90 text-white rounded-xl"
      >
        {loading ? 'Authenticating...' : 'Secure Login'}
      </Button>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-fivem-card px-2 text-white/20 font-mono">Or Admin via OAuth</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDiscordLogin()}
        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
      >
        <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
          <title>Discord</title>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        Login with Discord
      </button>
    </form>
  );
}

function MarkdownToolbar({ text, textareaRef, onTextChange }: { text: string, textareaRef: React.RefObject<HTMLTextAreaElement | null>, onTextChange: (t: string) => void }) {
  const [showEmoji, setShowEmoji] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === undefined || end === undefined) {
      onTextChange(text + `\n${before}text${after}`);
      return;
    }

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

    onTextChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="flex gap-2 p-2 bg-white/5 border border-white/10 rounded-t-xl border-b-0">
      <button onClick={() => insertText('**', '**')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Bold">
        <Bold size={16} />
      </button>
      <button onClick={() => insertText('*', '*')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Italic">
        <Italic size={16} />
      </button>
      <button onClick={() => insertText('# ', '')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Heading">
        <Heading size={16} />
      </button>
      <button onClick={() => insertText('- ', '')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="List">
        <List size={16} />
      </button>
      <button onClick={() => insertText('[Link Name](', ')')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Link">
        <LinkIcon size={16} />
      </button>
      <div className="relative static-emoji-wrapper">
        <button onClick={(e) => { e.preventDefault(); setShowEmoji(!showEmoji); }} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Emoji">
          <Smile size={16} />
        </button>
        {showEmoji && (
          <div className="absolute top-10 right-0 z-[9999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
            <Picker
              data={data}
              theme="dark"
              onEmojiSelect={(e: any) => {
                insertText(e.native);
                setShowEmoji(false);
              }}
              previewPosition="none"
              navPosition="bottom"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EditContestManager({ activeContest, currentRules, currentCategories, onUpdated }: { activeContest: any, currentRules: string, currentCategories: Category[], onUpdated: () => void }) {
  const [title, setTitle] = useState(activeContest?.name || '');
  const [rules, setRules] = useState(currentRules || '');
  const [categories, setCategories] = useState<{ id: string | number, name: string, desc: string, emoji?: string }[]>(
    currentCategories.map(c => ({ id: c.id, name: c.name, desc: c.description, emoji: c.emoji }))
  );

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEmoji, setCatEmoji] = useState('✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingEmojiIdx, setEditingEmojiIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);


  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(activeContest?.name || '');
    setRules(currentRules || '');
    setCategories(currentCategories.map(c => ({ id: c.id, name: c.name, desc: c.description, emoji: c.emoji })));
  }, [activeContest, currentRules, currentCategories]);

  const addCategory = () => {
    if (!catName || !catDesc) {
      toast.error('Please enter name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName, desc: catDesc, emoji: catEmoji }]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
  };

  const removeCategory = (id: string | number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdate = async () => {
    if (!activeContest) return;
    if (!title) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName && catDesc) {
      finalCategories.push({ id: Date.now(), name: catName, desc: catDesc, emoji: catEmoji });
    }

    if (finalCategories.length === 0) return toast.error('At least one category is required');

    setLoading(true);
    try {
      const batch = writeBatch(db);

      if (title !== activeContest.name) {
        batch.update(doc(db, 'contests', activeContest.id), { name: title });
      }

      if (rules !== currentRules) {
        batch.set(doc(db, 'settings', 'global'), { rulesMarkdown: rules }, { merge: true });
      }

      const currentCatMap = new Map(currentCategories.map(c => [c.id, c]));
      const finalCatIds = new Set(finalCategories.map(c => c.id));

      currentCategories.forEach(oldCat => {
        if (!finalCatIds.has(oldCat.id)) {
          batch.delete(doc(db, 'categories', oldCat.id));
        }
      });

      finalCategories.forEach(cat => {
        if (typeof cat.id === 'string' && currentCatMap.has(cat.id)) {
          batch.update(doc(db, 'categories', cat.id), {
            name: cat.name,
            description: cat.desc,
            emoji: cat.emoji || '✨'
          });
        } else {
          const catRef = doc(collection(db, 'categories'));
          batch.set(catRef, {
            contest_id: activeContest.id,
            name: cat.name,
            description: cat.desc,
            emoji: cat.emoji || '✨'
          });
        }
      });

      await batch.commit();

      toast.success(`Successfully updated ${title}!`);
      setCatName('');
      setCatDesc('');
      setCatEmoji('✨');
      onUpdated();
    } catch (e) {
      console.error("Update Error:", e);
      toast.error('Failed to update contest');
    } finally {
      setLoading(false);
    }
  };

  if (!activeContest) return null;

  return (
    <div className="space-y-6 p-6 bg-fivem-card/50 rounded-2xl border border-white/10 relative">
      <div className="space-y-2 relative z-10">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">1. Contest Title</label>
        <Input
          placeholder="e.g. Cyberpunk Nights V2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/10 h-10 text-sm font-display"
        />
      </div>

      <div className="space-y-4 relative z-30">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">2. Edit Categories</label>

        {categories.length > 0 && (
          <div className="space-y-2 mb-4">
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-xl min-w-0">
                {/* Per-row emoji picker */}
                <div className="relative shrink-0 static-emoji-wrapper">
                  <button
                    onClick={(e) => { e.preventDefault(); setEditingEmojiIdx(editingEmojiIdx === i ? null : i); }}
                    className="w-10 h-10 rounded-lg bg-fivem-orange/10 flex items-center justify-center text-xl hover:bg-fivem-orange/20 transition-colors border border-white/10"
                    title="Change emoji"
                  >
                    {c.emoji || '✨'}
                  </button>
                  {editingEmojiIdx === i && (
                    <div className="absolute top-12 left-0 z-[9999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
                      <Picker
                        data={data}
                        theme="dark"
                        onEmojiSelect={(e: any) => {
                          setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, emoji: e.native } : cat));
                          setEditingEmojiIdx(null);
                        }}
                        previewPosition="none"
                        navPosition="bottom"
                      />
                    </div>
                  )}
                </div>
                {/* Inline name and description inputs */}
                <input
                  value={c.name}
                  onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, name: e.target.value } : cat))}
                  placeholder="Category name..."
                  className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-fivem-orange/50 transition-colors"
                />
                <input
                  value={c.desc}
                  onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, desc: e.target.value } : cat))}
                  placeholder="Description..."
                  className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/60 outline-none focus:border-fivem-orange/50 transition-colors"
                />
                <button onClick={() => removeCategory(c.id)} className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-lg transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 relative z-50">
          <div className="relative shrink-0 static-emoji-wrapper">
            <Button variant="outline" className="h-10 w-12 bg-white/5 border-white/10 text-xl flex items-center justify-center p-0" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
              {catEmoji}
            </Button>
            {showEmojiPicker && (
              <div className="absolute top-12 left-0 z-[9999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
                <Picker
                  data={data}
                  theme="dark"
                  onEmojiSelect={(e: any) => {
                    setCatEmoji(e.native);
                    setShowEmojiPicker(false);
                  }}
                  previewPosition="none"
                  navPosition="bottom"
                />
              </div>
            )}
          </div>
          <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/10 sm:w-1/3 h-10" />
          <Input placeholder="Description..." value={catDesc} onChange={e => setCatDesc(e.target.value)} className="bg-white/5 border-white/10 flex-1 h-10" />
          <Button variant="secondary" onClick={addCategory} className="shrink-0 bg-white/10 hover:bg-white/20 text-white h-10">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-2 relative z-20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">3. Contest Rules (Markdown)</label>
        </div>
        <div className="flex flex-col">
          <MarkdownToolbar text={rules} textareaRef={textareaRef} onTextChange={setRules} />
          <textarea
            ref={textareaRef}
            placeholder="Define the rules for this contest..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="w-full min-h-[128px] bg-white/5 border border-white/10 rounded-b-xl p-4 text-sm font-mono leading-relaxed outline-none focus:border-fivem-orange/50 transition-colors resize-y placeholder:text-white/20 text-white"
          />
        </div>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={loading}
        className="w-full h-12 bg-white/10 hover:bg-fivem-orange hover:text-white text-white font-display text-sm tracking-wide rounded-xl mt-4 transition-all relative z-0"
      >
        {loading ? 'Saving Changes...' : 'Save Contest Changes'}
      </Button>
    </div >
  );
}

function ArchiveContest({ onArchived }: { onArchived: () => void }) {
  const [nextName, setNextName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      const qActive = query(collection(db, 'contests'), where('is_active', '==', true));
      const activeSnaps = await getDocs(qActive);
      activeSnaps.forEach(d => {
        batch.update(d.ref, { is_active: false });
      });

      batch.set(doc(db, 'settings', 'global'), { votingOpen: false }, { merge: true });

      if (nextName) {
        const newContestRef = doc(collection(db, 'contests'));
        batch.set(newContestRef, {
          name: nextName,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }

      await batch.commit();

      toast.success('Contest archived');
      onArchived();
      setConfirming(false);
      setNextName('');
    } catch (e) {
      console.error("Archive Error:", e);
      toast.error('Network error or permission denied');
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/30 space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle size={24} />
          <h4 className="font-bold">Are you absolutely sure?</h4>
        </div>
        <p className="text-xs text-red-400/80 leading-relaxed">
          This action will immediately archive the current contest, locking all submissions and votes. It cannot be undone. Are you sure you want to proceed?
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</Button>
          <Button onClick={handleArchive} disabled={loading} variant="destructive" className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Archiving...' : 'Yes, Archive Now'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <p className="text-xs text-white/60">Quickly archive the current contest and wipe the slate clean.</p>
      <Input
        placeholder="Next Contest Name (Optional)"
        value={nextName}
        onChange={(e) => setNextName(e.target.value)}
        className="bg-white/5 border-white/10"
      />
      <Button
        onClick={() => setConfirming(true)}
        disabled={loading}
        variant="destructive"
        className="w-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
      >
        Archive Current Contest
      </Button>
    </div>
  );
}

function CreateContestManager({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState('');
  const [categories, setCategories] = useState<{ id: number, name: string, desc: string, emoji?: string }[]>([]);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEmoji, setCatEmoji] = useState('✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addCategory = () => {
    if (!catName || !catDesc) {
      toast.error('Please enter name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName, desc: catDesc, emoji: catEmoji }]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
  };

  const removeCategory = (id: number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleLaunch = async () => {
    if (!title) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName && catDesc) {
      finalCategories.push({ id: Date.now(), name: catName, desc: catDesc, emoji: catEmoji });
    }

    if (finalCategories.length === 0) return toast.error('At least one category is required');

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Archive current active contest(s)
      const qActive = query(collection(db, 'contests'), where('is_active', '==', true));
      const activeSnaps = await getDocs(qActive);
      activeSnaps.forEach((dSnap) => {
        batch.update(dSnap.ref, { is_active: false });
      });

      // 2. Create new Contest Document
      const newContestRef = doc(collection(db, 'contests'));
      batch.set(newContestRef, {
        name: title,
        is_active: true,
        created_at: new Date().toISOString()
      });

      // 3. Create embedded Category references
      finalCategories.forEach(cat => {
        const catRef = doc(collection(db, 'categories'));
        batch.set(catRef, {
          contest_id: newContestRef.id,
          name: cat.name,
          description: cat.desc,
          emoji: cat.emoji || '✨'
        });
      });

      if (rules) {
        batch.set(doc(db, 'settings', 'global'), { rulesMarkdown: rules }, { merge: true });
      }

      await batch.commit();

      toast.success(`Successfully deployed ${title}!`);
      setTitle('');
      setCategories([]);
      setCatName('');
      setCatDesc('');
      setCatEmoji('✨');
      setRules('');
      onCreated();
    } catch (e) {
      console.error("Launch Error:", e);
      toast.error('Failed to create contest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-fivem-dark to-fivem-dark/80 rounded-2xl border border-white/10 relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-fivem-orange/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="space-y-2 relative z-10">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">1. Contest Title</label>
        <Input
          placeholder="e.g. Cyberpunk Nights V2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/10 h-14 text-lg font-display"
        />
      </div>

      <div className="space-y-4 relative z-30">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">2. Define Categories</label>

        {/* Current Categories List */}
        {categories.length > 0 && (
          <div className="space-y-2 mb-4">
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-fivem-orange/10 flex items-center justify-center text-xl">
                    {c.emoji || '✨'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{i + 1}. {c.name}</p>
                    <p className="text-xs text-white/50">{c.desc}</p>
                  </div>
                </div>
                <button onClick={() => removeCategory(c.id)} className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Builder Row */}
        <div className="flex flex-col sm:flex-row gap-2 relative z-50">
          <div className="relative shrink-0 static-emoji-wrapper">
            <Button variant="outline" className="h-10 w-12 bg-white/5 border-white/10 text-xl flex items-center justify-center p-0" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
              {catEmoji}
            </Button>
            {showEmojiPicker && (
              <div className="absolute top-12 left-0 z-[9999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
                <Picker
                  data={data}
                  theme="dark"
                  onEmojiSelect={(e: any) => {
                    setCatEmoji(e.native);
                    setShowEmojiPicker(false);
                  }}
                  previewPosition="none"
                  navPosition="bottom"
                />
              </div>
            )}
          </div>
          <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/10 sm:w-1/3 h-10" />
          <Input placeholder="Description..." value={catDesc} onChange={e => setCatDesc(e.target.value)} className="bg-white/5 border-white/10 flex-1 h-10" />
          <Button variant="secondary" onClick={addCategory} className="shrink-0 bg-white/10 hover:bg-white/20 text-white h-10">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-2 relative z-20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">3. Contest Rules (Markdown)</label>
          <span className="text-[10px] text-white/40">Optional - can be edited later</span>
        </div>
        <div className="flex flex-col">
          <MarkdownToolbar text={rules} textareaRef={textareaRef} onTextChange={setRules} />
          <textarea
            ref={textareaRef}
            placeholder="Define the rules for this new contest..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="w-full min-h-[128px] bg-white/5 border border-white/10 rounded-b-xl p-4 text-sm font-mono leading-relaxed outline-none focus:border-fivem-orange/50 transition-colors resize-y placeholder:text-white/20 text-white"
          />
        </div>
      </div>

      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full h-14 bg-fivem-orange hover:bg-fivem-orange/90 text-white font-display text-lg tracking-wide rounded-xl mt-4 shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all relative z-0"
      >
        {loading ? 'Initializing Core Systems...' : '🚀 Launch New Contest'}
      </Button>
    </div>
  );
}

