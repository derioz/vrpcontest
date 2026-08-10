import React, { useState, useRef, useEffect } from 'react'; import { toast } from 'sonner';
import { Category, Photo } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { AlertCircle, X, Plus, Bold, Italic, Heading, List, Link as LinkIcon, Smile, Trash2, ServerCrash, Clock, Activity } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
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
          <div className="absolute top-10 right-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
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

export function EditContestManager({ activeContest, currentRules, currentCategories, onUpdated }: { activeContest: any, currentRules: string, currentCategories: Category[], onUpdated: () => void }) {
  const formatDateForInput = (isoString?: string) => isoString ? new Date(isoString).toISOString().slice(0, 16) : '';
  const [setupTab, setSetupTab] = useState<'general' | 'categories' | 'rules' | 'schedule'>('general');
  const [rulesView, setRulesView] = useState<'edit' | 'preview' | 'split'>('split');
  
  const [title, setTitle] = useState(activeContest?.name || '');
  const [rules, setRules] = useState(currentRules || '');
  const [submissionsCloseDate, setSubmissionsCloseDate] = useState(formatDateForInput(activeContest?.submissions_close_date));
  const [votingEndDate, setVotingEndDate] = useState(formatDateForInput(activeContest?.voting_end_date));
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
    setSubmissionsCloseDate(formatDateForInput(activeContest?.submissions_close_date));
    setVotingEndDate(formatDateForInput(activeContest?.voting_end_date));
    setCategories(currentCategories.map(c => ({ id: c.id, name: c.name, desc: c.description, emoji: c.emoji })));
  }, [activeContest, currentRules, currentCategories]);

  const addCategory = () => {
    if (!catName || !catDesc) {
      toast.error('Please enter category name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName, desc: catDesc, emoji: catEmoji }]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
    toast.success(`Added "${catName}" category`);
  };

  const removeCategory = (id: string | number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.info('Category removed');
  };

  const loadCategoryPreset = (presetType: 'standard' | 'automotive' | 'community') => {
    if (presetType === 'standard') {
      setCategories([
        { id: Date.now() + 1, name: 'Automotive & Rides', desc: 'Show off your finest rides, stance, and custom builds around San Andreas.', emoji: '🚗' },
        { id: Date.now() + 2, name: 'Landscapes & Scenery', desc: 'Breathtaking views, sunrises, and architecture across Los Santos and Blaine County.', emoji: '🌆' },
        { id: Date.now() + 3, name: 'Character & Roleplay', desc: 'In-character portraits, storytelling moments, and community roleplay scenes.', emoji: '🎭' },
        { id: Date.now() + 4, name: 'Action & Pursuits', desc: 'High-octane pursuits, stunts, drift maneuvers, and intense law enforcement action.', emoji: '🎬' },
        { id: Date.now() + 5, name: 'Night & Cyberpunk', desc: 'Neon lights, rain reflections, and nocturnal vibes after dark.', emoji: '🌌' },
      ]);
      toast.success('Loaded 5 Standard FiveM Category Presets!');
    } else if (presetType === 'automotive') {
      setCategories([
        { id: Date.now() + 1, name: 'Supercars & Exotics', desc: 'Exotic hypercars and luxury supercars in pristine lighting.', emoji: '🏎️' },
        { id: Date.now() + 2, name: 'Bikes & Choppers', desc: 'Custom motorcycles, choppers, and stunt bikes on the open road.', emoji: '🏍️' },
        { id: Date.now() + 3, name: 'Offroad & Utility', desc: 'Mud, mountain trails, and heavy-duty offroad builds in Blaine County.', emoji: '🚚' },
        { id: Date.now() + 4, name: 'Custom Builds & Tuners', desc: 'Slammed tuners, custom stance, and garage mechanics.', emoji: '🔧' },
      ]);
      toast.success('Loaded 4 Automotive Category Presets!');
    } else if (presetType === 'community') {
      setCategories([
        { id: Date.now() + 1, name: 'Server Events & Parties', desc: 'Unforgettable moments from server events, concerts, and gatherings.', emoji: '🎉' },
        { id: Date.now() + 2, name: 'Emergency Services (PD/EMS)', desc: 'Law enforcement, fire rescue, and medical emergency roleplay.', emoji: '🚓' },
        { id: Date.now() + 3, name: 'Business & Crime', desc: 'Underworld operations, corporate meetings, and faction life.', emoji: '💼' },
        { id: Date.now() + 4, name: 'Casual Memories', desc: 'Everyday adventures with friends around San Andreas.', emoji: '📸' },
      ]);
      toast.success('Loaded 4 Community Category Presets!');
    }
  };

  const loadRulePreset = (presetType: 'standard' | 'automotive' | 'simple') => {
    if (presetType === 'standard') {
      setRules(`# 📸 Vital RP Photo Contest Rules & Guidelines

### 1. In-Game Screenshots Only
- All photos must be captured inside the **Vital RP** server.
- No external graphic modifications, heavily photoshopped backgrounds, or AI generation.

### 2. HUD & Overlay Removal
- Screenshots must be taken with the game HUD, mini-map, chat log, and UI overlays toggled **OFF**.

### 3. Submission Limits
- You may submit **1 entry per category**.
- Duplicate submissions across categories will be subject to disqualification.

### 4. Community Voting
- Voting is open to all verified community members.
- Vote manipulation or self-voting scripts will lead to instant disqualification.`);
      toast.success('Inserted Standard Vital RP Rules Preset');
    } else if (presetType === 'automotive') {
      setRules(`# 🏎️ Automotive Photography Contest Rules

### 1. Featured Vehicles
- Photos must feature a player-owned vehicle inside Vital RP.
- Capture clear lighting, reflections, and unique San Andreas locations.

### 2. Camera & Angle
- Game HUD and player UI overlays must be disabled before taking the screenshot.
- Angles, camera height, and lighting are completely up to your creative vision!

### 3. Submissions
- Maximum 1 vehicle entry per participant.`);
      toast.success('Inserted Automotive Rules Preset');
    } else if (presetType === 'simple') {
      setRules(`# 🌟 General Contest Rules

1. All screenshots must be taken in Vital RP with HUD hidden.
2. 1 photo submission per category.
3. Be respectful and have fun!`);
      toast.success('Inserted Simple Rules Preset');
    }
  };

  const calculateRemainingTime = (dateIso?: string) => {
    if (!dateIso) return null;
    const target = new Date(dateIso).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return 'Expired / Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} Days, ${hours} Hours remaining`;
    return `${hours} Hours, ${mins} Mins remaining`;
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

      const updates: any = {};
      if (title !== activeContest.name) updates.name = title;

      const newSubClose = submissionsCloseDate ? new Date(submissionsCloseDate).toISOString() : null;
      if (newSubClose !== activeContest.submissions_close_date) updates.submissions_close_date = newSubClose;

      const newVoteEnd = votingEndDate ? new Date(votingEndDate).toISOString() : null;
      if (newVoteEnd !== activeContest.voting_end_date) updates.voting_end_date = newVoteEnd;

      if (Object.keys(updates).length > 0) {
        batch.update(doc(db, 'contests', activeContest.id), updates);
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

      toast.success(`Successfully saved all changes for ${title}!`);
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
    <div className="space-y-6 relative">
      
      {/* ── SEGMENTED WORKSPACE TABS ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
        {[
          { id: 'general', label: '1. Title & Status', emoji: '📜' },
          { id: 'categories', label: `2. Categories (${categories.length})`, emoji: '🏷️' },
          { id: 'rules', label: '3. Rules & Preview', emoji: '📝' },
          { id: 'schedule', label: '4. Schedule & Timers', emoji: '📅' },
        ].map((tab) => {
          const isActive = setupTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSetupTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all cursor-pointer flex items-center gap-2 shrink-0 select-none",
                isActive
                  ? "bg-gradient-to-r from-fivem-orange to-amber-600 text-white shadow-lg border border-amber-400/30"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: TITLE & STATUS ── */}
      {setupTab === 'general' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 01 · General Info</span>
              <h3 className="text-lg font-bold text-white font-display">Contest Title & Status</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE CONTEST</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">Contest Title</label>
            <Input
              placeholder="e.g. Cyberpunk Nights V2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/15 h-12 text-base font-bold text-white font-display rounded-2xl focus:border-fivem-orange focus:ring-1 focus:ring-fivem-orange/50"
            />
          </div>

          {/* Title Presets */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase text-white/40 font-bold tracking-wider">Quick Title Preset Suggestions:</span>
            <div className="flex flex-wrap gap-2">
              {[
                'Vital RP Photo Contest - Season 2',
                'Cyberpunk Nights V2',
                'Vehicle Showcase 2026',
                'Los Santos Sunset Photography',
                'Emergency Services RP Showcase'
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono text-white/70 hover:text-amber-300 transition-all cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CATEGORIES ── */}
      {setupTab === 'categories' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 02 · Categories</span>
              <h3 className="text-lg font-bold text-white font-display">Manage Contest Categories ({categories.length})</h3>
            </div>

            {/* Presets Button Toolbar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => loadCategoryPreset('standard')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                ⚡ Standard 5 Categories
              </button>
              <button
                type="button"
                onClick={() => loadCategoryPreset('automotive')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                🏎️ Automotive Set
              </button>
              <button
                type="button"
                onClick={() => loadCategoryPreset('community')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                🎉 Community RP Set
              </button>
            </div>
          </div>

          {/* Categories Cards List */}
          {categories.length > 0 && (
            <div className="space-y-3">
              {categories.map((c, i) => (
                <div key={c.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 transition-all hover:border-fivem-orange/30 group/cat shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0 static-emoji-wrapper">
                      <button
                        onClick={(e) => { e.preventDefault(); setEditingEmojiIdx(editingEmojiIdx === i ? null : i); }}
                        className="w-11 h-11 rounded-2xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center text-xl hover:bg-fivem-orange/25 transition-all shrink-0 cursor-pointer shadow-inner"
                        title="Change Emoji"
                      >
                        {c.emoji || '✨'}
                      </button>
                      {editingEmojiIdx === i && (
                        <div className="absolute top-13 left-0 z-[999999] shadow-2xl bg-[#0d0d12] border border-white/20 rounded-2xl overflow-hidden p-1 min-w-[320px]">
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

                    <input
                      value={c.name}
                      onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, name: e.target.value } : cat))}
                      placeholder="Category Name (e.g. Wildlife)"
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-fivem-orange transition-all font-display"
                    />

                    <button
                      type="button"
                      onClick={() => removeCategory(c.id)}
                      className="p-2.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl border border-transparent hover:border-red-500/30 transition-all shrink-0 cursor-pointer"
                      title="Remove Category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={c.desc}
                      onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, desc: e.target.value } : cat))}
                      onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
                      }}
                      placeholder="Category description..."
                      style={{ fieldSizing: 'content' } as any}
                      className="w-full min-h-[68px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/90 outline-none focus:border-fivem-orange transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Category Card Form */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/20 space-y-3">
            <p className="text-[10px] font-mono text-fivem-orange uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Plus size={12} /> Add New Category
            </p>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0 static-emoji-wrapper">
                <Button variant="outline" className="h-11 w-12 bg-white/5 border-white/15 text-xl flex items-center justify-center p-0 rounded-2xl cursor-pointer" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
                  {catEmoji}
                </Button>
                {showEmojiPicker && (
                  <div className="absolute top-13 left-0 z-[999999] shadow-2xl bg-[#0d0d12] border border-white/20 rounded-2xl overflow-hidden p-1 min-w-[320px]">
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
              <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/15 flex-1 h-11 text-sm font-bold text-white rounded-xl" />
            </div>
            <textarea
              rows={2}
              placeholder="Category Description..."
              value={catDesc}
              onChange={e => setCatDesc(e.target.value)}
              onInput={(e: any) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
              }}
              style={{ fieldSizing: 'content' } as any}
              className="w-full min-h-[68px] bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-fivem-orange transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
            />
            <Button variant="secondary" onClick={addCategory} className="w-full bg-fivem-orange/20 hover:bg-fivem-orange hover:text-black border border-fivem-orange/40 text-fivem-orange h-11 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Plus size={16} /> Add Category
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 3: RULES & PREVIEW ── */}
      {setupTab === 'rules' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 03 · Contest Rules</span>
              <h3 className="text-lg font-bold text-white font-display">Rules Editor & Split Live Preview</h3>
            </div>

            {/* Presets & View Controls */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => loadRulePreset('standard')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                📜 Standard Rules
              </button>
              <button
                type="button"
                onClick={() => loadRulePreset('automotive')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                🏎️ Automotive Rules
              </button>
              <button
                type="button"
                onClick={() => loadRulePreset('simple')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-fivem-orange/20 border border-white/10 hover:border-fivem-orange/40 text-xs font-mono font-bold text-white/80 transition-all cursor-pointer shrink-0"
              >
                🌟 Simple Rules
              </button>
            </div>
          </div>

          {/* Rules Editor & Split Preview Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Editor Side */}
            <div className="flex flex-col h-full space-y-2">
              <label className="text-[10px] font-mono text-fivem-orange uppercase tracking-wider font-bold">Markdown Source Code</label>
              <MarkdownToolbar text={rules} textareaRef={textareaRef} onTextChange={setRules} />
              <textarea
                ref={textareaRef}
                placeholder="Define the rules for this contest in Markdown format..."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full min-h-[260px] flex-1 bg-black/60 border border-white/10 rounded-b-2xl p-4 text-xs font-mono leading-relaxed outline-none focus:border-fivem-orange transition-colors resize-y placeholder:text-white/20 text-white"
              />
            </div>

            {/* Live Formatting Preview Side */}
            <div className="flex flex-col h-full space-y-2">
              <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Formatting Preview
              </label>
              <div className="w-full min-h-[300px] flex-1 bg-[#050508] border border-white/10 rounded-2xl p-5 text-xs text-white/80 leading-relaxed font-sans overflow-y-auto max-h-[400px]">
                {rules ? (
                  <div className="prose prose-invert prose-xs max-w-none space-y-3">
                    {rules.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i} className="text-base font-bold text-white font-display border-b border-white/10 pb-1">{line.slice(2)}</h1>;
                      if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-fivem-orange font-display mt-2">{line.slice(3)}</h2>;
                      if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-bold text-amber-300 font-display mt-2">{line.slice(4)}</h3>;
                      if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-white/70">{line.slice(2)}</li>;
                      if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 list-decimal text-white/70">{line.replace(/^\d+\.\s/, '')}</li>;
                      if (!line.trim()) return <br key={i} />;
                      return <p key={i} className="text-white/80">{line}</p>;
                    })}
                  </div>
                ) : (
                  <div className="text-white/30 italic text-center pt-12">
                    Start typing rules on the left to see live formatting preview...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SCHEDULE & TIMERS ── */}
      {setupTab === 'schedule' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 04 · Schedule & Timers</span>
            <h3 className="text-lg font-bold text-white font-display">Contest Automation Timers</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-mono text-fivem-orange uppercase font-bold tracking-wider block">1. Submissions Closing Datetime</label>
              <Input
                type="datetime-local"
                value={submissionsCloseDate}
                onChange={(e) => setSubmissionsCloseDate(e.target.value)}
                className="bg-black/50 border-white/15 text-white [color-scheme:dark] h-11 text-xs font-mono rounded-xl"
              />
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/60">
                <span>Submissions Countdown: </span>
                <strong className="text-amber-300 font-bold">{calculateRemainingTime(submissionsCloseDate) || 'No date set'}</strong>
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <label className="text-xs font-mono text-fivem-orange uppercase font-bold tracking-wider block">2. Voting Ending Datetime</label>
              <Input
                type="datetime-local"
                value={votingEndDate}
                onChange={(e) => setVotingEndDate(e.target.value)}
                className="bg-black/50 border-white/15 text-white [color-scheme:dark] h-11 text-xs font-mono rounded-xl"
              />
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/60">
                <span>Voting Countdown: </span>
                <strong className="text-amber-300 font-bold">{calculateRemainingTime(votingEndDate) || 'No date set'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE ALL CHANGES PRIMARY ACTION FOOTER ── */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
        <div className="text-xs font-mono text-white/40">
          <span>Active Contest: </span>
          <strong className="text-white">{title}</strong>
        </div>

        <Button
          onClick={handleUpdate}
          disabled={loading}
          className="px-8 h-12 bg-gradient-to-r from-fivem-orange to-amber-600 hover:from-amber-600 hover:to-fivem-orange text-white font-display font-bold text-sm tracking-wide rounded-2xl transition-all shadow-[0_4px_25px_rgba(234,88,12,0.4)] cursor-pointer active:scale-95"
        >
          {loading ? 'Saving All Changes...' : 'Save Contest Setup Changes'}
        </Button>
      </div>
    </div>
  );
}

export function ArchiveContest({
  onArchived,
  activeContest,
  categories,
  allPhotos
}: {
  onArchived: () => void,
  activeContest: any,
  categories: Category[],
  allPhotos: Photo[]
}) {
  const [nextName, setNextName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<'archive' | 'destroy' | null>(null);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const nowString = new Date().toISOString();
      console.log('[Archive] Starting archive process...');

      // 1. Compute winners
      console.log('[Archive] Phase 1: Computing winners from', allPhotos.length, 'photos across', categories.length, 'categories');
      const winners = categories.map(cat => {
        const catPhotos = allPhotos.filter(p => p.category_id === cat.id);
        if (!catPhotos.length) return null;
        const topPhoto = [...catPhotos].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0];
        return {
          contest_name: activeContest?.name || 'Unknown Contest',
          category_name: cat.name,
          player_name: topPhoto.player_name,
          discord_name: topPhoto.discord_name,
          image_url: topPhoto.image_url,
          caption: topPhoto.caption,
          vote_count: topPhoto.vote_count || 0,
          archived_at: nowString
        };
      }).filter(Boolean) as any[];
      console.log('[Archive] Winners computed:', winners.length);

      // 2. Compute user stats to preserve
      console.log('[Archive] Phase 2: Computing user stats');
      const statsByDiscordName = new Map<string, { subs: number, votes: number }>();
      allPhotos.forEach(p => {
        const current = statsByDiscordName.get(p.discord_name) || { subs: 0, votes: 0 };
        current.subs += 1;
        current.votes += (p.vote_count || 0);
        statsByDiscordName.set(p.discord_name, current);
      });
      console.log('[Archive] User stats computed for', statsByDiscordName.size, 'users');

      // 3. Import increment helper
      const { increment } = await import('firebase/firestore');

      // --- Reads: fetch all data before building write ops ---
      console.log('[Archive] Phase 3: Fetching active contests...');
      const qActive = query(collection(db, 'contests'), where('is_active', '==', true));
      const activeSnaps = await getDocs(qActive);
      console.log('[Archive] Active contests found:', activeSnaps.size);

      console.log('[Archive] Phase 4: Fetching all photos...');
      const photosSnap = await getDocs(collection(db, 'photos'));
      console.log('[Archive] Photos to delete:', photosSnap.size);

      console.log('[Archive] Phase 5: Fetching all votes...');
      const votesSnap = await getDocs(collection(db, 'votes'));
      console.log('[Archive] Votes to delete:', votesSnap.size);

      // Build write operations list
      const writeOps: Array<(batch: any) => void> = [];

      // Deactivate contests
      activeSnaps.docs.forEach(d => {
        writeOps.push(batch => batch.update(d.ref, { is_active: false }));
      });

      // Disable voting and clear old rules in global settings
      writeOps.push(batch => batch.set(doc(db, 'settings', 'global'), { votingOpen: false, rulesMarkdown: '' }, { merge: true }));

      // Create next contest if provided
      if (nextName) {
        const newContestRef = doc(collection(db, 'contests'));
        writeOps.push(batch => batch.set(newContestRef, {
          name: nextName,
          is_active: true,
          created_at: nowString
        }));
      }

      // Write winners to archived_winners
      winners.forEach(winner => {
        const winnerRef = doc(collection(db, 'archived_winners'));
        writeOps.push(batch => batch.set(winnerRef, winner));
      });

      // Update user_stats
      for (const [discordName, stats] of Array.from(statsByDiscordName.entries())) {
        const statRef = doc(db, 'user_stats', discordName);
        writeOps.push(batch => batch.set(statRef, {
          archived_submissions: increment(stats.subs),
          archived_votes: increment(stats.votes)
        }, { merge: true }));
      }

      // Delete all photos
      photosSnap.docs.forEach(pSnap => {
        writeOps.push(batch => batch.delete(pSnap.ref));
      });

      // Delete all votes
      votesSnap.docs.forEach(vSnap => {
        writeOps.push(batch => batch.delete(vSnap.ref));
      });

      // Execute all writes in chunked batches
      const BATCH_SIZE = 400;
      const totalBatches = Math.ceil(writeOps.length / BATCH_SIZE);
      console.log(`[Archive] Phase 6: Committing ${writeOps.length} write ops in ${totalBatches} batch(es)...`);

      for (let i = 0; i < writeOps.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`[Archive] Committing batch ${batchIndex}/${totalBatches}...`);
        const batch = writeBatch(db);
        const chunk = writeOps.slice(i, i + BATCH_SIZE);
        chunk.forEach(op => op(batch));
        await batch.commit();
        console.log(`[Archive] Batch ${batchIndex}/${totalBatches} committed ✓`);
      }

      console.log('[Archive] ✅ All batches committed successfully!');
      toast.success('Contest safely archived!');
      onArchived();
      setConfirming(false);
      setNextName('');
    } catch (e: any) {
      console.error('[Archive] ❌ FAILED:', e);
      console.error('[Archive] Error code:', e?.code);
      console.error('[Archive] Error message:', e?.message);
      const msg = e?.message || e?.code || 'Unknown error';
      toast.error(`Archive failed: ${msg}`);
    } finally {
      setLoading(false);
      setLoading(false);
    }
  };

  const handleDestroy = async () => {
    if (!activeContest) return;
    setLoading(true);
    try {
      toast.loading('Permanently destroying test contest...', { id: 'destroy' });
      const batch = writeBatch(db);
      
      // Delete contest
      batch.delete(doc(db, 'contests', activeContest.id));
      
      // Delete categories
      const catIds = categories.map(c => String(c.id));
      if (catIds.length > 0) {
        const catSnap = await getDocs(query(collection(db, 'categories'), where('contest_id', '==', activeContest.id)));
        catSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete photos for these categories
        for (let i = 0; i < catIds.length; i += 10) {
          const chunk = catIds.slice(i, i + 10);
          const photoSnap = await getDocs(query(collection(db, 'photos'), where('category_id', 'in', chunk)));
          photoSnap.docs.forEach(p => batch.delete(p.ref));
        }
      }
      
      await batch.commit();
      toast.success('Test contest completely destroyed.', { id: 'destroy' });
      setConfirming(null);
      onArchived();
      
      // Attempt window reload if possible so UI resyncs completely
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to destroy contest: ' + e.message, { id: 'destroy' });
    } finally {
      setLoading(false);
    }
  };

  if (confirming === 'archive') {
    return (
      <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/30 space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle size={24} />
          <h4 className="font-bold">Are you absolutely sure?</h4>
        </div>
        <p className="text-xs text-red-400/80 leading-relaxed">
          This action will immediately archive the current contest. Winners will be saved to the Hall of Fame, user statistics preserved, and all current photos and votes will be permanently deleted. This cannot be undone. Are you sure you want to proceed?
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => setConfirming(null)} className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</Button>
          <Button onClick={handleArchive} disabled={loading} variant="destructive" className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Archiving...' : 'Yes, Archive Now'}
          </Button>
        </div>
      </div>
    );
  }

  if (confirming === 'destroy') {
    return (
      <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/30 space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <Trash2 size={24} />
          <h4 className="font-bold">Destroy Test Contest</h4>
        </div>
        <p className="text-xs text-red-400/80 leading-relaxed font-bold">
          This will vaporize the current active contest completely. NO winners will be saved, and NO user statistics will be tracked. All current categories and photos will be erased. Use this ONLY for cleaning up test contests!
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => setConfirming(null)} className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</Button>
          <Button onClick={handleDestroy} disabled={loading} variant="destructive" className="flex-1 bg-red-500 hover:bg-red-600 text-white">
            {loading ? 'Destroying...' : 'Yes, Nuke It'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <p className="text-xs text-white/60">Finalize this contest by saving winners, storing participant stats, and clearing the database for the next round.</p>
      <Input
        placeholder="Next Contest Name (Optional)"
        value={nextName}
        onChange={(e) => setNextName(e.target.value)}
        className="bg-white/5 border-white/10"
      />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button
          onClick={() => setConfirming('archive')}
          disabled={loading}
          variant="destructive"
          className="w-full bg-fivem-orange/20 text-fivem-orange hover:bg-fivem-orange/30 hover:text-white border border-fivem-orange/30"
          title="Save winners and preserve statistics"
        >
          Archive Contest
        </Button>
        <Button
          onClick={() => setConfirming('destroy')}
          disabled={loading}
          variant="destructive"
          className="w-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20"
          title="Delete current contest completely without archiving"
        >
          Destroy Test Contest
        </Button>
      </div>
    </div>
  );
}

export function CreateContestManager({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState('');
  const [submissionsCloseDate, setSubmissionsCloseDate] = useState('');
  const [votingEndDate, setVotingEndDate] = useState('');
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
        created_at: new Date().toISOString(),
        ...(submissionsCloseDate ? { submissions_close_date: new Date(submissionsCloseDate).toISOString() } : {}),
        ...(votingEndDate ? { voting_end_date: new Date(votingEndDate).toISOString() } : {})
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

      <div className="space-y-2">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">1. Contest Title</label>
        <Input
          placeholder="e.g. Cyberpunk Nights V2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/10 h-14 text-lg font-display"
        />
      </div>

      <div className="space-y-4">
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

        {/* Builder Box */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 space-y-3">
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-widest font-bold">Add Category</p>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0 static-emoji-wrapper">
              <Button variant="outline" className="h-10 w-12 bg-white/5 border-white/10 text-xl flex items-center justify-center p-0 rounded-xl" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
                {catEmoji}
              </Button>
              {showEmojiPicker && (
                <div className="absolute top-12 left-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[300px]">
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
            <Input placeholder="Category Name..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/10 flex-1 h-10 text-xs sm:text-sm font-bold" />
          </div>
          <textarea
            rows={2}
            placeholder="Description..."
            value={catDesc}
            onChange={e => setCatDesc(e.target.value)}
            onInput={(e: any) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.max(68, e.target.scrollHeight)}px`;
            }}
            style={{ fieldSizing: 'content' } as any}
            className="w-full min-h-[68px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white/90 outline-none focus:border-fivem-orange/50 transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
          />
          <Button variant="secondary" onClick={addCategory} className="w-full bg-white/10 hover:bg-white/20 text-white h-10 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer">
            <Plus size={16} /> Add Category
          </Button>
        </div>
      </div>

      <div className="space-y-2">
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

      <div className="space-y-4">
        <label className="text-xs font-mono text-fivem-orange uppercase tracking-wider font-bold">4. Schedule</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-white/50">Submissions Close Date/Time (Optional)</label>
            <Input type="datetime-local" value={submissionsCloseDate} onChange={(e) => setSubmissionsCloseDate(e.target.value)} className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50">Voting End Date/Time (Optional)</label>
            <Input type="datetime-local" value={votingEndDate} onChange={(e) => setVotingEndDate(e.target.value)} className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
          </div>
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

