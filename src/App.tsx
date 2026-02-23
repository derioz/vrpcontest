/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
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
  Trash2,
  Edit3,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Photo {
  id: number;
  category_id: number;
  player_name: string;
  discord_name: string;
  image_data: string;
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
  const [rules, setRules] = useState<Rule[]>([]);
  const [view, setView] = useState<'gallery' | 'rules'>('gallery');
  const [votingOpen, setVotingOpen] = useState(false);
  const [playerName, setPlayerName] = useState(localStorage.getItem('fivem_player_name') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);

  // Check auth token validity on load
  useEffect(() => {
    if (authToken) {
      setIsAdmin(true);
    }
  }, [authToken]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, statusRes, rulesRes, themeRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/status'),
          fetch('/api/rules'),
          fetch('/api/theme')
        ]);
        const cats = await catRes.json();
        const status = await statusRes.json();
        const rulesData = await rulesRes.json();
        const themeData = await themeRes.json();
        
        setCategories(cats);
        setVotingOpen(status.votingOpen);
        setRules(rulesData);
        if (themeData.theme) {
          setCurrentTheme(themeData.theme);
        }
        if (cats.length > 0) setSelectedCategory(cats[0]);
      } catch (error) {
        toast.error('Failed to load contest data');
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchData();
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
    if (selectedCategory) {
      fetch(`/api/photos/${selectedCategory.id}`)
        .then(res => res.json())
        .then(setPhotos)
        .catch(() => toast.error('Failed to load photos'));
    }
  }, [selectedCategory]);

  const handleVote = async (photoId: number) => {
    if (!playerName) {
      toast.error('Please set your player name first');
      return;
    }
    if (!votingOpen) {
      toast.error('Voting is currently closed');
      return;
    }

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, voterName: playerName })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Vote recorded!');
        // Refresh photos to update vote count
        if (selectedCategory) {
          const updatedPhotos = await fetch(`/api/photos/${selectedCategory.id}`).then(r => r.json());
          setPhotos(updatedPhotos);
        }
      } else {
        toast.error(data.error || 'Failed to vote');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleUpload = async (imageData: string, caption: string, discordName: string) => {
    if (!selectedCategory || !playerName || !discordName) return;

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory.id,
          playerName,
          discordName,
          imageData,
          caption
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Photo uploaded successfully!');
        setShowUploadModal(false);
        // Refresh photos
        const updatedPhotos = await fetch(`/api/photos/${selectedCategory.id}`).then(r => r.json());
        setPhotos(updatedPhotos);
      } else {
        toast.error(data.error || 'Failed to upload photo');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const toggleVoting = async (open: boolean) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/toggle-voting', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ open })
      });
      if (res.ok) {
        setVotingOpen(open);
        toast.success(`Voting ${open ? 'opened' : 'closed'}`);
      } else {
        toast.error('Failed to toggle voting');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fivem-dark">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-fivem-orange border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-fivem-orange p-2 rounded-lg">
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight neon-text uppercase">FiveM Contest</h1>
              <p className="text-xs text-white/50 font-mono uppercase tracking-widest">Community Gallery</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <User size={14} className="text-fivem-orange" />
              <input 
                type="text" 
                placeholder="Player Name..."
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  localStorage.setItem('fivem_player_name', e.target.value);
                }}
                className="bg-transparent border-none outline-none text-sm w-32 focus:ring-0 placeholder:text-white/30"
              />
            </div>
            
            <button 
              onClick={() => authToken ? setShowAdminModal(true) : setShowLoginModal(true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                authToken ? "bg-fivem-orange text-white" : "bg-white/5 text-white/50 hover:text-white"
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em]">Navigation</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setView('gallery')}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl transition-all",
                  view === 'gallery' 
                    ? "bg-white/10 text-white border border-white/20" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <ImageIcon size={18} />
                <span className="font-medium">Gallery</span>
              </button>
              <button
                onClick={() => setView('rules')}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl transition-all",
                  view === 'rules' 
                    ? "bg-white/10 text-white border border-white/20" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <FileText size={18} />
                <span className="font-medium">Contest Rules</span>
              </button>
            </div>
          </section>

          {view === 'gallery' && (
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
          )}

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
              onClick={() => playerName ? setShowUploadModal(true) : toast.error('Set your player name first')}
              className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-fivem-orange hover:text-white transition-colors"
            >
              <Upload size={18} />
              Upload Photo
            </button>
          </section>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {view === 'gallery' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold">{selectedCategory?.name}</h2>
                  <p className="text-sm text-white/50">{photos.length} entries submitted</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-white/30">
                  <Trophy size={14} />
                  <span>TOP ENTRIES SHOWN FIRST</span>
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
                    {photos.map((photo) => (
                      <motion.div
                        layout
                        key={photo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group bg-fivem-card rounded-2xl overflow-hidden border border-white/5 hover:border-fivem-orange/30 transition-all"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img 
                            src={photo.image_data} 
                            alt={photo.caption} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="absolute top-4 left-4 flex flex-col gap-2">
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                              <User size={12} className="text-fivem-orange" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">{photo.player_name}</span>
                            </div>
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                              <Info size={12} className="text-blue-400" />
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{photo.discord_name}</span>
                            </div>
                          </div>

                          <div className="absolute bottom-4 right-4">
                            <button
                              onClick={() => handleVote(photo.id)}
                              disabled={!votingOpen}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all",
                                votingOpen 
                                  ? "bg-fivem-orange text-white hover:scale-105 active:scale-95 shadow-lg shadow-fivem-orange/40" 
                                  : "bg-white/10 text-white/40 cursor-not-allowed"
                              )}
                            >
                              <Vote size={16} />
                              {photo.vote_count}
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
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
            </>
          ) : (
            <div className="space-y-8">
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold mb-2">Contest Rules</h2>
                <p className="text-white/50">Please read carefully before submitting your entries.</p>
              </div>

              {rules.length === 0 ? (
                <div className="p-12 bg-fivem-card rounded-3xl border border-dashed border-white/10 text-center">
                  <FileText size={48} className="mx-auto text-white/10 mb-4" />
                  <p className="text-white/40">No rules have been posted yet.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {rules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-6 rounded-2xl border bg-fivem-card",
                        rule.importance === 'Critical' ? "border-red-500/30 bg-red-500/5" : 
                        rule.importance === 'High' ? "border-fivem-orange/30 bg-fivem-orange/5" : 
                        "border-white/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            rule.importance === 'Critical' ? "bg-red-500/20 text-red-400" : 
                            rule.importance === 'High' ? "bg-fivem-orange/20 text-fivem-orange" : 
                            "bg-white/5 text-white/40"
                          )}>
                            <Info size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{rule.title}</h3>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">{rule.category}</span>
                          </div>
                        </div>
                        {rule.importance !== 'Normal' && (
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            rule.importance === 'Critical' ? "bg-red-500 text-white" : "bg-fivem-orange text-white"
                          )}>
                            {rule.importance}
                          </span>
                        )}
                      </div>
                      <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{rule.content}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Entry">
        <UploadForm 
          categoryName={selectedCategory?.name || ''} 
          onUpload={handleUpload} 
          onClose={() => setShowUploadModal(false)} 
        />
      </Modal>

      {/* Login Modal */}
      <Modal show={showLoginModal} onClose={() => setShowLoginModal(false)} title="Admin Login">
        <LoginForm 
          onLogin={(token) => {
            setAuthToken(token);
            localStorage.setItem('admin_token', token);
            setShowLoginModal(false);
            setShowAdminModal(true);
            toast.success('Logged in successfully');
          }} 
        />
      </Modal>

      {/* Admin Modal */}
      <Modal show={showAdminModal} onClose={() => setShowAdminModal(false)} title="Admin Controls">
        <div className="space-y-6">
          <div className="flex justify-end">
             <button 
               onClick={() => {
                 setAuthToken(null);
                 localStorage.removeItem('admin_token');
                 setShowAdminModal(false);
                 toast.success('Logged out');
               }}
               className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
             >
               Log Out
             </button>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">Voting Status</p>
                <p className="text-xs text-white/50">Toggle public voting for all categories</p>
              </div>
              <button
                onClick={() => toggleVoting(!votingOpen)}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-xs transition-all",
                  votingOpen 
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                )}
              >
                {votingOpen ? "Close Voting" : "Open Voting"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Archive Contest</h4>
             <ArchiveContest authToken={authToken!} onArchived={() => {
               window.location.reload();
             }} />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Theme Generator</h4>
            <ThemeGenerator authToken={authToken!} onThemeApplied={(theme) => {
              setCurrentTheme(theme);
              toast.success('Theme applied!');
            }} />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Manage Rules</h4>
            <AdminRulesManager authToken={authToken!} rules={rules} onRefresh={() => {
              fetch('/api/rules').then(r => r.json()).then(setRules);
            }} />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-mono text-white/40 uppercase tracking-wider">Add Category</h4>
            <AddCategoryForm authToken={authToken!} onAdded={() => {
              fetch('/api/categories').then(r => r.json()).then(setCategories);
            }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Modal({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-fivem-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-display font-bold">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function UploadForm({ categoryName, onUpload, onClose }: { categoryName: string, onUpload: (data: string, caption: string, discord: string) => void, onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [discordName, setDiscordName] = useState(localStorage.getItem('fivem_discord_name') || '');
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
    if (!image || !discordName) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (resolution && (resolution.w < 1920 || resolution.h < 1080)) {
      toast.error(`Resolution too low: ${resolution.w}x${resolution.h}. Minimum is 1920x1080.`);
      return;
    }
    
    localStorage.setItem('fivem_discord_name', discordName);
    setIsUploading(true);
    await onUpload(image, caption, discordName);
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-fivem-orange/10 border border-fivem-orange/20 rounded-xl flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-fivem-orange shrink-0" size={18} />
          <p className="text-xs text-fivem-orange/90 leading-relaxed">
            You are uploading to <strong>{categoryName}</strong>.
          </p>
        </div>
        <div className="flex items-start gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <Info className="text-red-400 shrink-0" size={14} />
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
            WARNING: You can only submit ONE photo across all categories. Choose wisely!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Discord Name (Required)</label>
          <input 
            type="text"
            value={discordName}
            onChange={(e) => setDiscordName(e.target.value)}
            placeholder="e.g. Username#1234"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fivem-orange transition-colors"
          />
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
        <button 
          onClick={onClose}
          className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!image || !discordName || isUploading}
          className="flex-1 px-6 py-3 rounded-xl font-bold text-sm bg-fivem-orange text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-fivem-orange/20"
        >
          {isUploading ? "Uploading..." : "Submit Entry"}
        </button>
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-mono text-white/40 uppercase tracking-wider">Admin Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:border-fivem-orange outline-none transition-colors"
            placeholder="Enter password..."
          />
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button 
        type="submit"
        disabled={loading || !password}
        className="w-full bg-fivem-orange text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

function ArchiveContest({ authToken, onArchived }: { authToken: string, onArchived: () => void }) {
  const [nextName, setNextName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm('Are you sure? This will hide current entries and start a fresh contest.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/contest/archive', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ nextContestName: nextName })
      });
      if (res.ok) {
        toast.success('Contest archived');
        onArchived();
      } else {
        toast.error('Failed to archive');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <p className="text-xs text-white/60">Archive the current contest and start a new one.</p>
      <input 
        placeholder="Next Contest Name (Optional)"
        value={nextName}
        onChange={(e) => setNextName(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-fivem-orange"
      />
      <button 
        onClick={handleArchive}
        disabled={loading}
        className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 rounded-lg text-xs font-bold transition-colors"
      >
        {loading ? 'Archiving...' : 'Archive Current Contest'}
      </button>
    </div>
  );
}

function AddCategoryForm({ authToken, onAdded }: { authToken: string, onAdded: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleAdd = async () => {
    if (!name || !authToken) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, description: desc })
      });
      if (res.ok) {
        toast.success('Category added');
        setName('');
        setDesc('');
        onAdded();
      } else {
        toast.error('Failed to add category');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-3">
      <input 
        placeholder="Category Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-fivem-orange"
      />
      <input 
        placeholder="Description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-fivem-orange"
      />
      <button 
        onClick={handleAdd}
        className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Add Category
      </button>
    </div>
  );
}

function ThemeGenerator({ authToken, onThemeApplied }: { authToken: string, onThemeApplied: (theme: Theme) => void }) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description || !authToken) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-theme', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ description })
      });
      const theme = await res.json();
      if (res.ok) {
        onThemeApplied(theme);
        // Save theme
        await fetch('/api/admin/save-theme', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ theme })
        });
        toast.success('Theme generated and applied!');
      } else {
        toast.error('Failed to generate theme');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea 
        placeholder="Describe your theme (e.g. 'Neon Cyberpunk Night', 'Vintage Western', 'Spooky Halloween')"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fivem-orange min-h-[80px] resize-none"
      />
      <button 
        onClick={handleGenerate}
        disabled={isGenerating || !description}
        className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>Generating...</>
        ) : (
          <>
            <Settings size={14} /> Generate Theme
          </>
        )}
      </button>
    </div>
  );
}

function AdminRulesManager({ authToken, rules, onRefresh }: { authToken: string, rules: Rule[], onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [importance, setImportance] = useState<'Normal' | 'High' | 'Critical'>('Normal');
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSave = async () => {
    if (!title || !content || !authToken) return;
    const url = editingId ? `/api/admin/rules/${editingId}` : '/api/admin/rules';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ title, content, category, importance })
      });
      if (res.ok) {
        toast.success(editingId ? 'Rule updated' : 'Rule added');
        setTitle('');
        setContent('');
        setEditingId(null);
        onRefresh();
      } else {
        toast.error('Failed to save rule');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/admin/rules/${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        toast.success('Rule deleted');
        onRefresh();
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
        <input 
          placeholder="Rule Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-fivem-orange"
        />
        <textarea 
          placeholder="Rule Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-fivem-orange min-h-[80px]"
        />
        <div className="grid grid-cols-2 gap-2">
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
          >
            <option value="General">General</option>
            <option value="Submission">Submission</option>
            <option value="Voting">Voting</option>
            <option value="Prizes">Prizes</option>
          </select>
          <select 
            value={importance}
            onChange={(e) => setImportance(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
          >
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div className="flex gap-2">
          {editingId && (
            <button onClick={() => { setEditingId(null); setTitle(''); setContent(''); }} className="flex-1 bg-white/5 py-2 rounded-lg text-xs">Cancel</button>
          )}
          <button onClick={handleSave} className="flex-1 bg-fivem-orange py-2 rounded-lg text-xs font-bold">
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{rule.title}</p>
              <p className="text-[10px] text-white/30 uppercase">{rule.category} • {rule.importance}</p>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  setEditingId(rule.id);
                  setTitle(rule.title);
                  setContent(rule.content);
                  setCategory(rule.category);
                  setImportance(rule.importance);
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
              >
                <Edit3 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(rule.id)}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/50 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
