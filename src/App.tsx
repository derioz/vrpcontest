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
  Link as LinkIcon
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [rulesMarkdown, setRulesMarkdown] = useState('');
  const [votingOpen, setVotingOpen] = useState(false);
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

  // Fetch initial data (Real-time Firestore listeners)
  useEffect(() => {
    // 1. Listen to Global Settings (rules, theme, votingOpen)
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVotingOpen(!!data.votingOpen);
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

  // Fetch photos when category changes
  useEffect(() => {
    if (!selectedCategory) return;

    const q = query(collection(db, 'photos'), where('category_id', '==', selectedCategory.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Photo[];
      setPhotos(fetchedPhotos);
    }, (err) => {
      console.error("Photos listener error", err);
      toast.error('Failed to load photos');
    });

    return () => unsub();
  }, [selectedCategory]);

  const handleVote = async (photoId: string) => {
    if (!votingOpen) {
      toast.error('Voting is currently closed');
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      const success = await handleDiscordLogin();
      if (!success) return;
      // After login, the 'user' state will eventually update, but we need the immediate user object
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
      // Use Discord UID (or Firebase UID) for strict 1-vote-per-person
      const voteRef = doc(db, 'votes', `${photoId}_${currentUser.uid}`);
      const voteSnap = await getDoc(voteRef);

      if (voteSnap.exists()) {
        toast.error('You have already voted for this photo');
        return;
      }

      await setDoc(voteRef, {
        photoId,
        voterName: currentName,
        voterUid: currentUser.uid,
        voterDiscord: currentUser.displayName,
        timestamp: new Date().toISOString()
      });

      const photoRef = doc(db, 'photos', photoId);
      await updateDoc(photoRef, { vote_count: increment(1) });

      toast.success('Vote recorded!');
    } catch (error) {
      console.error("Vote Error:", error);
      toast.error('Network error or vote failed');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
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
    <div className="min-h-screen pb-20">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0">
              <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="Vital RP" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-black tracking-tight uppercase text-white">
                <span className="text-fivem-orange">VITAL RP</span>
                <span className="text-white/30 mx-2">—</span>
                <span className="text-white">{activeContest?.name || 'PHOTO CONTEST'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                {user.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />}
                <span className="text-xs font-bold text-white/70 hidden sm:block">{user.displayName || user.email}</span>
              </div>
            ) : (
              <button
                onClick={handleDiscordLogin}
                className="flex items-center gap-2 bg-[#5865F2]/20 border border-[#5865F2]/30 text-white/80 hover:text-white hover:bg-[#5865F2]/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              >
                <img src="https://assets-global.website-files.com/6257adef93867e3c8405902d/636e0a2249ac060fd548bc35_discord-icon.svg" className="w-4 h-4 invert" alt="" />
                Login
              </button>
            )}
            <button
              onClick={() => isAdmin ? setShowAdminModal(true) : setShowLoginModal(true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isAdmin ? "bg-fivem-orange text-white" : "bg-white/5 text-white/50 hover:text-white"
              )}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {activeContest ? (
        <section className="relative overflow-hidden border-b border-white/10" style={{ minHeight: '520px' }}>
          {/* Deep dark base */}
          <div className="absolute inset-0 bg-[#080808]" />

          {/* Diagonal photo-frame strips — decorative, right half */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
            {/* Strip 1 */}
            <div className="absolute right-0 top-0 w-[55%] h-full" style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-transparent to-transparent z-10" />
              <div className="w-full h-full grid grid-rows-3 gap-0.5 opacity-25">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/5 border-y border-white/5 overflow-hidden flex items-center justify-center">
                    <div className="w-full h-full" style={{
                      background: i === 0 ? 'linear-gradient(135deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)' :
                        i === 1 ? 'linear-gradient(135deg, #222 25%, #333 50%, #222 75%)' :
                          'linear-gradient(135deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%)'
                    }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Camera aperture watermark */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.03]">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="98" stroke="white" strokeWidth="2" />
                <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="1.5" />
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <line key={i}
                    x1={100 + 55 * Math.cos((deg * Math.PI) / 180)}
                    y1={100 + 55 * Math.sin((deg * Math.PI) / 180)}
                    x2={100 + 96 * Math.cos(((deg + 50) * Math.PI) / 180)}
                    y2={100 + 96 * Math.sin(((deg + 50) * Math.PI) / 180)}
                    stroke="white" strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Left orange spotlight */}
          <div className="absolute top-0 left-0 w-[600px] h-full bg-gradient-to-r from-fivem-orange/8 to-transparent pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-fivem-orange/15 blur-[140px] rounded-full pointer-events-none" />

          {/* Film grain texture overlay */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px'
          }} />

          {/* Main content */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="max-w-2xl">

              {/* Label */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-8"
              >
                {/* Camera icon */}
                <div className="p-2 bg-fivem-orange/15 border border-fivem-orange/30 rounded-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <span className="text-fivem-orange text-xs font-bold uppercase tracking-[0.2em] font-mono">Photo Contest</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="w-1.5 h-1.5 bg-fivem-orange rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Live</span>
                </div>
              </motion.div>

              {/* Contest name */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl xl:text-7xl font-black font-display tracking-tight text-white leading-[0.95] mb-6"
              >
                {activeContest.name}
              </motion.h2>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-white/40 text-base leading-relaxed mb-10 max-w-lg"
              >
                Capture the moment. Submit your best in-game screenshot,
                let the community pick their favorite.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-3 mb-12"
              >
                <button
                  onClick={handleUploadClick}
                  className="group relative flex items-center gap-2.5 bg-fivem-orange text-white font-bold px-8 py-4 rounded-2xl text-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(234,88,12,0.5)]"
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Submit Your Shot
                </button>
                <a
                  href="#rules"
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 text-sm"
                >
                  <FileText size={16} />
                  Rules
                </a>
              </motion.div>

              {/* Stats strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex items-center gap-0 border border-white/8 rounded-2xl overflow-hidden w-fit"
              >
                {[
                  { value: categories.length, label: 'Categories', accent: false },
                  { value: photos.length, label: 'Entries', accent: false },
                  { value: photos.reduce((s, p) => s + (p.vote_count || 0), 0), label: 'Votes Cast', accent: true },
                ].map((stat, i) => (
                  <div key={stat.label} className={cn(
                    'flex flex-col items-center px-6 py-3 border-r border-white/8 last:border-r-0',
                    stat.accent ? 'bg-fivem-orange/10' : 'bg-white/[0.02]'
                  )}>
                    <span className={cn('text-2xl font-black font-display leading-none', stat.accent ? 'text-fivem-orange' : 'text-white')}>{stat.value}</span>
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-mono mt-1">{stat.label}</span>
                  </div>
                ))}
                <div className={cn(
                  'flex flex-col items-center px-5 py-3 bg-emerald-500/10',
                )}>
                  <span className={cn('text-xs font-bold leading-none', votingOpen ? 'text-emerald-400' : 'text-amber-400')}>
                    {votingOpen ? '🟢 Voting Open' : '🟡 Submit Now'}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-white/30 font-mono mt-1">Status</span>
                </div>
              </motion.div>

            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden border-b border-white/10 py-28 flex flex-col items-center justify-center text-center px-6">
          <div className="absolute inset-0 bg-[#080808]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-6">
            <div className="absolute inset-0 bg-white/5 blur-3xl scale-150 rounded-full" />
            <img src="https://r2.fivemanage.com/image/W9MFd5GxTOKZ.png" alt="" className="w-24 h-24 object-contain mx-auto opacity-20 relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-display font-black text-white/30 mb-3 relative z-10">No Active Contest</h2>
          <p className="text-white/20 max-w-sm relative z-10">Check back soon — the next contest is being prepared by the admins.</p>
        </section>
      )}

      {/* Category Tab Bar */}
      {
        categories.length > 0 && (
          <div className="sticky top-[68px] z-30 bg-fivem-dark/98 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0">

                {/* Left label */}
                <div className="shrink-0 flex items-center gap-2 pr-4 border-r border-white/10 py-3">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono whitespace-nowrap">Categories</span>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-2 py-3">
                  {categories.map((cat) => {
                    const entryCount = photos.filter(p => p.category_id === cat.id).length;
                    const isActive = selectedCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "group relative flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                          isActive
                            ? "bg-fivem-orange text-white shadow-[0_0_18px_rgba(234,88,12,0.45)] scale-[1.03]"
                            : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        <span className="text-base leading-none">{cat.emoji || '✨'}</span>
                        <span>{cat.name}</span>
                        {/* Entry count badge */}
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono leading-none",
                          isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/40 group-hover:bg-white/15 group-hover:text-white/60"
                        )}>
                          {entryCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right: total entries count */}
                <div className="ml-auto shrink-0 pl-4 border-l border-white/10 py-3">
                  <span className="text-[10px] font-mono text-white/30">{photos.length} total entries</span>
                </div>

              </div>
            </div>
          </div>
        )
      }

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Main Content â€” 3 cols */}
        <div className="lg:col-span-3 space-y-24 min-w-0">
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
                <p className="text-xs text-white/20 mt-1">Be the first to upload a photo!</p>
                <button
                  onClick={handleUploadClick}
                  className="mt-6 flex items-center gap-2 bg-fivem-orange/20 border border-fivem-orange/30 text-fivem-orange font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-fivem-orange hover:text-white transition-all"
                >
                  <Upload size={16} /> Submit Entry
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
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
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVote(photo.id); }}
                              disabled={!votingOpen}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
                                votingOpen
                                  ? "bg-fivem-orange text-white hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(234,88,12,0.5)] hover:shadow-[0_0_25px_rgba(234,88,12,0.8)]"
                                  : "bg-white/10 text-white/40 cursor-not-allowed"
                              )}
                            >
                              <Vote size={16} />
                              {photo.vote_count || 0}
                            </button>
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
          <section id="rules" className="pt-12 border-t border-white/10">
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

        {/* Right Sidebar â€” 1 col */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-36 self-start">

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
              {votingOpen ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Unlock size={10} /> Voting Open
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Lock size={10} /> Voting Closed
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              {votingOpen
                ? "Browse the entries and cast your votes for your favorites!"
                : "Submit your best shots now. Voting will open soon."}
            </p>
            <button
              onClick={handleUploadClick}
              className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-fivem-orange hover:text-white transition-colors"
            >
              <Upload size={18} />
              Upload Photo
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
                  <p className="text-xs text-white/40">{photos.length} total entries</p>
                </div>
              </div>
            </section>
          )}

        </aside>
      </main >

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-lg bg-fivem-card border-white/10 text-white">
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
        <DialogContent className="w-full max-w-[98vw] md:max-w-5xl lg:max-w-7xl max-h-[95vh] overflow-y-auto bg-fivem-card/95 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white p-0 overflow-x-hidden">
          {/* Decorative Admin Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-fivem-orange/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-fivem-orange/5 blur-[150px] rounded-full pointer-events-none" />

          <div className="p-6 md:p-10 relative z-10 w-full h-full">
            <DialogHeader className="mb-6 flex flex-row justify-between items-center border-b border-white/10 pb-4">
              <DialogTitle className="font-display text-2xl flex items-center gap-3">
                <Settings className="text-fivem-orange" size={24} /> Admin Settings
              </DialogTitle>
            </DialogHeader>

            {!isAdmin ? (
              <div className="space-y-6">
                {user ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-2">
                    <Lock className="mx-auto text-red-400" size={24} />
                    <p className="text-sm font-bold text-red-400">Access Denied</p>
                    <p className="text-xs text-white/50">Your account ({user.displayName}) is not listed as an administrator.</p>
                    <button
                      onClick={() => signOut(auth)}
                      className="text-xs text-white/30 hover:text-white underline mt-2"
                    >
                      Logout to switch accounts
                    </button>
                  </div>
                ) : (
                  <LoginForm onDiscordLogin={handleDiscordLogin} />
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 pt-2">
                  <span className="text-emerald-400 text-sm font-mono font-bold flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 w-fit">
                    <Unlock size={16} /> Admin Authenticated
                  </span>
                  <span className="text-[11px] text-white/40 font-mono italic mt-2 sm:mt-0 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 w-fit">
                    Logged in as <span className="text-white/80 font-bold">{user?.displayName || user?.email || 'Admin'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  {/* Left Column: Quick Controls & Active Contest */}
                  <div className="space-y-8 lg:block">
                    <div className="space-y-4">
                      <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Live Status</h4>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div>
                          <p className="font-bold">Voting Status</p>
                          <p className="text-xs text-white/50">Toggle public voting for all categories</p>
                        </div>
                        <Button
                          onClick={() => toggleVoting(!votingOpen)}
                          variant={votingOpen ? "destructive" : "default"}
                          className={cn(
                            "px-4 py-2 font-bold text-xs transition-all",
                            !votingOpen && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          )}
                        >
                          {votingOpen ? "Close Voting" : "Open Voting"}
                        </Button>
                      </div>
                    </div>

                    {activeContest && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Settings size={14} /> Edit Current Contest
                        </h4>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
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

                  {/* Right Column: Creation & Destructive Actions */}
                  <div className="space-y-8 h-full flex flex-col">
                    <div className="space-y-4 flex-1">
                      <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider flex items-center gap-2">
                        <Plus size={14} /> Create New Contest
                      </h4>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full border-dashed">
                        <CreateContestManager onCreated={() => window.location.reload()} />
                      </div>
                    </div>

                    <div className="pt-8 mt-auto border-t border-red-500/20 space-y-4 relative bg-red-500/5 p-6 rounded-2xl border border-red-500/10">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] rounded-full opacity-30" />
                      <h4 className="text-xs font-mono text-red-500 uppercase tracking-wider font-bold flex items-center gap-2">
                        <AlertCircle size={16} /> Danger Zone
                      </h4>
                      <ArchiveContest onArchived={() => window.location.reload()} />
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
    </div >
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
              "aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
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

