import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, History, Plus, Tag, Calendar, User, Code, CheckCircle,
  FileCode, ShieldCheck, Zap, Wrench, Bug, ExternalLink, Trash2, Search
} from 'lucide-react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { BorderBeam } from '../ui/border-beam';

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
    id: 'release-20260808-1838',
    version: 'v1.5.0',
    title: 'Aceternity Admin Sidebar, WebGL Shader Background & Discord Bug Inbox',
    category: 'Feature',
    description: `• Hero Section: Rebuilt with Aceternity Spotlight SVG beams & Lens photo magnifier.
• Lightbox Showcase: Re-engineered photo Lightbox into a dark cinematic stage with viewfinder corner accents.
• Typography & Mobile Polish: Upgraded font system to Space Grotesk & Outfit; polished phone viewports across site & Admin Panel.
• Category Dock: Added ElevenLabs-inspired single-line sticky category switcher with spring tab slider.
• Aceternity Admin Sidebar: Re-architected Admin Console with collapsible dark glass sidebar dock, animated link indicators, and Damon Creator profile footer.
• WebGL Shader Canvas: Implemented interactive FiveM Orange WebGL fluid gradient canvas background across the main page.
• Changelog DB & Credits: Built Firestore Changelog system with prominent "Website Created & Designed by Damon" credit banner.
• Discord Profile & DM Launcher: Added Damon's custom Discord avatar (qePVNvTsc65p.png), fixed profile card text alignment (@mcspace / ID: 150580708144840704), and integrated smart Discord App + Web DM launcher.
• Admin Overview Inbox: Redesigned Admin Console Overview section into an elevated dashboard with a live Bug Reports Inbox and status controls.
• Compact Changelog Layout: Redesigned changelog release cards to use compact inline bullet items with subtle thin divider lines and single-line Date/Time pills.`,
    author: 'Damon',
    date: 'Aug 8, 2026 at 6:38 PM',
  },
  {
    id: 'init-4',
    version: 'v1.3.0',
    title: 'Single-Line Sticky Category Track & Header Dock',
    category: 'UI/UX',
    description: 'Added ElevenLabs inspired sticky category switcher with Framer Motion layoutId spring active tab slider and edge gradient fade masks. Morphed top header into floating glass dock on scroll.',
    author: 'Damon',
    date: 'Aug 8, 2026',
  },
  {
    id: 'init-3',
    version: 'v1.2.0',
    title: 'RSA Key Encryption & Discord Role Verification',
    category: 'Security',
    description: 'Integrated client-side RSA keypair encryption for submission privacy and Discord OAuth2 guild membership + whitelist role verification.',
    author: 'Damon',
    date: 'Aug 5, 2026',
  },
  {
    id: 'init-2',
    version: 'v1.1.0',
    title: 'Voter Audit Inspector & Disqualification Controls',
    category: 'Feature',
    description: 'Added Admin Voter Audit inspector, disqualification reason workflows, and live analytics charts for voting velocity.',
    author: 'Damon',
    date: 'Aug 2, 2026',
  },
  {
    id: 'init-1',
    version: 'v1.0.0',
    title: 'Initial Platform Release & Design Launch',
    category: 'Feature',
    description: 'Official creation and launch of the Vital RP Photo Contest platform designed and built by Damon.',
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

function renderFormattedDescription(description: string) {
  const lines = description.split('\n').filter((l) => l.trim().length > 0);
  const isBulleted = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-'));

  if (!isBulleted) {
    return (
      <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans whitespace-pre-line">
        {description}
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-3 text-xs sm:text-sm font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const cleanLine = line.replace(/^[•\-]\s*/, '').trim();
        const parts = cleanLine.split(':');
        const hasTitle = parts.length > 1;
        const title = hasTitle ? parts[0].trim() : '';
        const body = hasTitle ? parts.slice(1).join(':').trim() : cleanLine;

        return (
          <React.Fragment key={idx}>
            {/* Subtle line separator between grouped sub-sections */}
            {idx > 0 && (
              <div className="my-2 border-t border-white/10" />
            )}

            {/* Compact inline bullet item */}
            <div className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-fivem-orange shrink-0 shadow-[0_0_6px_rgba(234,88,12,0.8)]" />
              <div className="flex-1 min-w-0">
                {hasTitle && (
                  <strong className="font-bold text-fivem-orange font-display text-xs uppercase tracking-wide mr-1.5">
                    {title}:
                  </strong>
                )}
                <span className="text-white/80">{body}</span>
              </div>
            </div>
          </React.Fragment>
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
  const [version, setVersion] = useState('v1.5.0');
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
          setEntries(dbEntries);
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
      version: version || 'v1.0.0',
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
    <div className="space-y-6">
      
      {/* ── CREATOR CREDIT BANNER: "Website Created & Designed by Damon" ── */}
      <div className="relative overflow-hidden rounded-3xl border border-fivem-orange/30 bg-gradient-to-r from-fivem-orange/15 via-[#0c0c10] to-[#08080a] p-6 sm:p-8 shadow-[0_10px_40px_rgba(234,88,12,0.15)]">
        <BorderBeam size={280} duration={12} colorFrom="#ea580c" colorTo="#fb923c" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-fivem-orange/20 border border-fivem-orange/40 flex items-center justify-center text-fivem-orange shrink-0 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
              <Code size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fivem-orange/20 border border-fivem-orange/40 text-fivem-orange text-[10px] font-bold uppercase tracking-widest mb-2">
                <Sparkles size={12} />
                <span>Lead Creator & Architect</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                Website Created & Designed by <span className="text-fivem-orange">Damon</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/50 mt-1 max-w-xl leading-relaxed">
                Full-stack architecture, custom UI/UX design system, real-time Firebase integrations, and interactive components built exclusively for the Vital RP community.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-mono text-white/40">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 font-bold">@mcspace</span>
                <span>•</span>
                <span>Discord ID: 150580708144840704</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(234,88,12,0.4)] cursor-pointer shrink-0 active:scale-95"
          >
            <Plus size={16} />
            <span>New Release Entry</span>
          </button>
        </div>
      </div>

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

      {/* ── CHANGELOG TIMELINE LIST ── */}
      <div className="space-y-4">
        {filteredEntries.map((entry, idx) => {
          const CategoryInfo = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES['Feature'];
          const CategoryIcon = CategoryInfo.icon;

          return (
            <motion.div
              key={entry.id || idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090c]/90 p-5 sm:p-6 transition-all hover:border-white/20 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black font-mono text-fivem-orange px-2.5 py-1 rounded-lg bg-fivem-orange/10 border border-fivem-orange/20">
                    {entry.version}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold font-display text-white">
                    {entry.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border", CategoryInfo.bg, CategoryInfo.text, CategoryInfo.border)}>
                    <CategoryIcon size={12} />
                    <span>{entry.category}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/50 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 whitespace-nowrap shrink-0">
                    <Calendar size={11} className="text-fivem-orange" />
                    <span>{entry.date}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => entry.id && handleDeleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {renderFormattedDescription(entry.description)}

              <div className="mt-3 pt-2 flex items-center gap-2 text-[10px] font-mono text-white/30">
                <User size={11} className="text-fivem-orange/70" />
                <span>Author: <strong className="text-white/60">{entry.author || 'Damon'}</strong></span>
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
                      placeholder="e.g. v1.5.0"
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
                    placeholder="Short release summary title"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Description / Details</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the features, fixes, or UI enhancements added in this update..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-fivem-orange resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-fivem-orange hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)]"
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
