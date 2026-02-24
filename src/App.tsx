/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { ShimmeringText } from './components/ui/shimmering-text';
import { Orb } from './components/ui/orb';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';

// Firebase Integrations
import { auth, discordProvider, db, storage } from './lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, limit, setDoc, updateDoc, increment, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

interface Category {
  id: string;
  name: string;
  description: string;
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

      // Check for Discord admin — look up by document ID
      try {
        const discordProfile = currentUser.providerData.find(p => p.providerId === 'oidc.discord');
        const idsToCheck = new Set([currentUser.uid]);
        if (discordProfile?.uid) idsToCheck.add(discordProfile.uid);

        console.log('Admin check - trying IDs:', [...idsToCheck]);

        for (const id of idsToCheck) {
          const adminDoc = await getDoc(doc(db, 'admins', id));
          if (adminDoc.exists()) {
            console.log('✅ Admin matched:', id);
            setIsAdmin(true);
            return;
          }
        }

        console.log('❌ No admin match. Add one of these IDs to the "admins" collection:', [...idsToCheck]);
        setIsAdmin(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleUpload = async (imageData: string, caption: string, discordName: string, formPlayerName: string) => {
    if (!selectedCategory || !formPlayerName || !discordName) return;

    try {
      const uniquePath = `entries/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, uniquePath);

      await uploadString(storageRef, imageData, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      const newPhoto = {
        category_id: selectedCategory.id,
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
        <div className="w-64 h-64 relative">
          <Orb colors={['#ea580c', '#fb923c']} />
        </div>
        <ShimmeringText text="Connecting to Vital RP..." duration={2} className="text-xl font-bold tracking-widest uppercase font-mono" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0">
              <img src="/vital_logo.svg" alt="Vital RP" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(234,88,12,0.4)]" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight neon-text uppercase">
                <ShimmeringText text={activeContest?.name || "VITAL RP - PHOTO CONTEST"} duration={3} shimmerColor="#ffffff" color="#ea580c" spread={1} />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">


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

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Categories */}
        <aside className="lg:col-span-1 space-y-6">
          <section>
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4">Categories</h2>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all group relative overflow-hidden",
                    selectedCategory?.id === cat.id
                      ? "text-white shadow-lg shadow-fivem-orange/20"
                      : "bg-fivem-card border border-white/5 hover:border-white/20 text-white/70 hover:text-white"
                  )}
                >
                  {selectedCategory?.id === cat.id && (
                    <motion.div
                      layoutId="activeCategory"
                      className="absolute inset-0 bg-fivem-orange z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="text-left relative z-10">
                    <p className="font-medium">{cat.name}</p>
                    <p className={cn("text-xs transition-colors", selectedCategory?.id === cat.id ? "text-white/80" : "text-white/50")}>
                      {cat.description}
                    </p>
                  </div>
                  <ChevronRight size={16} className={cn("transition-transform relative z-10", selectedCategory?.id === cat.id ? "translate-x-1" : "group-hover:translate-x-1")} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4">Account</h2>
            <div className="p-4 bg-fivem-card rounded-xl border border-white/5">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-fivem-orange/10 border border-fivem-orange/20 flex items-center justify-center text-fivem-orange">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user.displayName || 'Anonymous'}</p>
                      <p className="text-[10px] text-white/40 font-mono uppercase truncate">
                        {user.providerData.some(p => p.providerId === 'password') ? 'Admin Account' : 'Discord Account'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider text-center">Login to submit photos & vote</p>
                  <button
                    onClick={handleDiscordLogin}
                    className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <img src="https://assets-global.website-files.com/6257adef93867e3c8405902d/636e0a2249ac060fd548bc35_discord-icon.svg" className="w-5 h-5 invert" alt="" />
                    Login with Discord
                  </button>
                </div>
              )}
            </div>
          </section>

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
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-24">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold">{selectedCategory?.name}</h2>
                <p className="text-sm text-white/50">{photos.length} entries submitted</p>
              </div>
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
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
              <div className="flex flex-col items-center justify-center py-32 bg-fivem-card rounded-3xl border border-dashed border-white/10">
                <ImageIcon size={48} className="text-white/10 mb-4" />
                <p className="text-white/40 font-medium">No entries yet in this category</p>
                <p className="text-xs text-white/20 mt-1">Be the first to upload a photo!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {sortedPhotos.map((photo, index) => (
                    <motion.div
                      layout
                      key={photo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "group bg-fivem-card rounded-2xl overflow-hidden border border-white/5 hover:border-fivem-orange/30 transition-all",
                        sortBy === 'top' && index === 0 ? "md:col-span-2 ring-2 ring-fivem-orange/50 shadow-2xl shadow-fivem-orange/10" : ""
                      )}
                    >
                      <div className={cn("relative overflow-hidden cursor-pointer", sortBy === 'top' && index === 0 ? "aspect-[21/9]" : "aspect-video")} onClick={() => setLightboxPhoto(photo)}>
                        <img
                          src={photo.image_url}
                          alt={photo.caption}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShare(photo); }}
                            className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-fivem-orange transition-colors"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxPhoto(photo); }}
                            className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                            <User size={12} className="text-fivem-orange" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{photo.player_name}</span>
                          </div>
                          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                            <Info size={12} className="text-zinc-400" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{photo.discord_name}</span>
                          </div>
                        </div>

                        <div className="absolute bottom-4 right-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVote(photo.id); }}
                            disabled={!votingOpen}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
                              votingOpen
                                ? "bg-fivem-orange text-white hover:scale-105 active:scale-95 shadow-lg shadow-fivem-orange/40"
                                : "bg-white/10 text-white/40 cursor-not-allowed"
                            )}
                          >
                            <Vote size={16} />
                            {photo.vote_count || 0}
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-fivem-card/90 backdrop-blur-md absolute bottom-0 left-0 right-0 border-t border-white/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-sm font-medium line-clamp-2">{photo.caption || "No caption provided"}</p>
                        <p className="text-[10px] text-white/30 font-mono mt-2 uppercase">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Rules Section (Integrated Below Gallery) */}
          <section className="pt-12 border-t border-white/10">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold mb-2">Contest Rules & Details</h2>
              <p className="text-white/50">Please read carefully before submitting your entries.</p>
            </div>
            <div className="p-8 md:p-12 glass rounded-3xl border border-white/10 relative overflow-hidden">
              {/* Premium Glow Aesthetic behind rules */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-fivem-orange/10 blur-[120px] rounded-full pointer-events-none" />

              {rulesMarkdown ? (
                <div className="prose prose-invert prose-headings:font-display prose-headings:font-bold prose-a:text-fivem-orange prose-a:no-underline hover:prose-a:underline prose-p:text-white/70 prose-li:text-white/70 max-w-none relative z-10">
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
      </main >

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-lg bg-fivem-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Entry</DialogTitle>
          </DialogHeader>
          <UploadForm
            categoryName={selectedCategory?.name || 'Category'}
            discordName={user?.displayName || user?.providerData?.[0]?.displayName || user?.email || 'Authenticated User'}
            onClose={() => setShowUploadModal(false)}
            onUpload={async (imageData, caption, discordName, formPlayerName) => {
              await handleUpload(imageData, caption, discordName, formPlayerName);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-fivem-card border-white/10 text-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display">Admin Settings</DialogTitle>
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
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                  <Unlock size={14} /> Admin Authenticated
                </span>
                <span className="text-[10px] text-white/40 font-mono italic">
                  Logged in as {user?.displayName || user?.email || 'Admin'}
                </span>
              </div>

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
                  <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Edit Current Contest</h4>
                  <EditContestManager
                    activeContest={activeContest}
                    currentRules={rulesMarkdown}
                    currentCategories={categories}
                    onUpdated={() => window.location.reload()}
                  />
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Create New Contest</h4>
                <CreateContestManager onCreated={() => window.location.reload()} />
              </div>

              <div className="pt-8 mt-8 border-t border-red-500/20 space-y-4">
                <h4 className="text-xs font-mono text-red-500/60 uppercase tracking-wider">Danger Zone</h4>
                <ArchiveContest onArchived={() => window.location.reload()} />
              </div>
            </div>
          )}
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


function UploadForm({ categoryName, discordName, onUpload, onClose }: { categoryName: string, discordName: string, onUpload: (imageData: string, caption: string, discordName: string, playerName: string) => Promise<void>, onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
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
    if (!image || !discordName || !formPlayerName) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (resolution && (resolution.w < 1920 || resolution.h < 1080)) {
      toast.error(`Resolution too low: ${resolution.w}x${resolution.h}. Minimum is 1920x1080.`);
      return;
    }

    localStorage.setItem('fivem_player_name', formPlayerName);
    setIsUploading(true);
    await onUpload(image, caption, discordName, formPlayerName);
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
        <img src="https://assets-global.website-files.com/6257adef93867e3c8405902d/636e0a2249ac060fd548bc35_discord-icon.svg" className="w-5 h-5 invert" alt="" />
        Login with Discord
      </button>
    </form>
  );
}

function EditContestManager({ activeContest, currentRules, currentCategories, onUpdated }: { activeContest: any, currentRules: string, currentCategories: Category[], onUpdated: () => void }) {
  const [title, setTitle] = useState(activeContest?.name || '');
  const [rules, setRules] = useState(currentRules || '');
  const [categories, setCategories] = useState<{ id: string | number, name: string, desc: string }[]>(
    currentCategories.map(c => ({ id: c.id, name: c.name, desc: c.description }))
  );

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(activeContest?.name || '');
    setRules(currentRules || '');
    setCategories(currentCategories.map(c => ({ id: c.id, name: c.name, desc: c.description })));
  }, [activeContest, currentRules, currentCategories]);

  const addCategory = () => {
    if (!catName || !catDesc) {
      toast.error('Please enter name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName, desc: catDesc }]);
    setCatName('');
    setCatDesc('');
  };

  const removeCategory = (id: string | number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdate = async () => {
    if (!activeContest) return;
    if (!title) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName && catDesc) {
      finalCategories.push({ id: Date.now(), name: catName, desc: catDesc });
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
            description: cat.desc
          });
        } else {
          const catRef = doc(collection(db, 'categories'));
          batch.set(catRef, {
            contest_id: activeContest.id,
            name: cat.name,
            description: cat.desc
          });
        }
      });

      await batch.commit();

      toast.success(`Successfully updated ${title}!`);
      setCatName('');
      setCatDesc('');
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
    <div className="space-y-6 p-6 bg-fivem-card/50 rounded-2xl border border-white/10 relative overflow-hidden">
      <div className="space-y-2 relative z-10">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">1. Contest Title</label>
        <Input
          placeholder="e.g. Cyberpunk Nights V2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/10 h-10 text-sm font-display"
        />
      </div>

      <div className="space-y-4 relative z-10">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">2. Edit Categories</label>

        {categories.length > 0 && (
          <div className="space-y-2 mb-4">
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{i + 1}. {c.name}</p>
                  <p className="text-xs text-white/50">{c.desc}</p>
                </div>
                <button onClick={() => removeCategory(c.id)} className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/10 sm:w-1/3" />
          <Input placeholder="Description..." value={catDesc} onChange={e => setCatDesc(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
          <Button variant="secondary" onClick={addCategory} className="shrink-0 bg-white/10 hover:bg-white/20 text-white">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">3. Contest Rules (Markdown)</label>
        </div>
        <textarea
          placeholder="Define the rules for this contest..."
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono leading-relaxed outline-none focus:border-fivem-orange/50 transition-colors resize-none placeholder:text-white/20 text-white"
        />
      </div>

      <Button
        onClick={handleUpdate}
        disabled={loading}
        className="w-full h-12 bg-white/10 hover:bg-fivem-orange hover:text-white text-white font-display text-sm tracking-wide rounded-xl mt-4 transition-all relative z-10"
      >
        {loading ? 'Saving Changes...' : 'Save Contest Changes'}
      </Button>
    </div>
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
  const [categories, setCategories] = useState<{ id: number, name: string, desc: string }[]>([]);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const addCategory = () => {
    if (!catName || !catDesc) {
      toast.error('Please enter name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName, desc: catDesc }]);
    setCatName('');
    setCatDesc('');
  };

  const removeCategory = (id: number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleLaunch = async () => {
    if (!title) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName && catDesc) {
      finalCategories.push({ id: Date.now(), name: catName, desc: catDesc });
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
          description: cat.desc
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
    <div className="space-y-6 p-6 bg-gradient-to-br from-fivem-dark to-fivem-dark/80 rounded-2xl border border-white/10 relative overflow-hidden">
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

      <div className="space-y-4 relative z-10">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">2. Define Categories</label>

        {/* Current Categories List */}
        {categories.length > 0 && (
          <div className="space-y-2 mb-4">
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{i + 1}. {c.name}</p>
                  <p className="text-xs text-white/50">{c.desc}</p>
                </div>
                <button onClick={() => removeCategory(c.id)} className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Builder Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/10 sm:w-1/3" />
          <Input placeholder="Description..." value={catDesc} onChange={e => setCatDesc(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
          <Button variant="secondary" onClick={addCategory} className="shrink-0 bg-white/10 hover:bg-white/20 text-white">
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">3. Contest Rules (Markdown)</label>
          <span className="text-[10px] text-white/40">Optional - can be edited later</span>
        </div>
        <textarea
          placeholder="Define the rules for this new contest..."
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono leading-relaxed outline-none focus:border-fivem-orange/50 transition-colors resize-none placeholder:text-white/20 text-white"
        />
      </div>

      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full h-14 bg-fivem-orange hover:bg-fivem-orange/90 text-white font-display text-lg tracking-wide rounded-xl mt-4 shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all relative z-10"
      >
        {loading ? 'Initializing Core Systems...' : '🚀 Launch New Contest'}
      </Button>
    </div>
  );
}


