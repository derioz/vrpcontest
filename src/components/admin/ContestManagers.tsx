import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Category, Photo } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import {
  AlertCircle, X, Plus, Bold, Italic, Heading, List,
  Link as LinkIcon, Smile, Trash2, ServerCrash, Trophy, Sparkles,
  Layers, CheckCircle2, Rocket, Edit3
} from 'lucide-react';
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
      <button onClick={() => insertText('**', '**')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Bold">
        <Bold size={16} />
      </button>
      <button onClick={() => insertText('*', '*')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Italic">
        <Italic size={16} />
      </button>
      <button onClick={() => insertText('# ', '')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Heading">
        <Heading size={16} />
      </button>
      <button onClick={() => insertText('- ', '')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="List">
        <List size={16} />
      </button>
      <button onClick={() => insertText('[Link Name](', ')')} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Link">
        <LinkIcon size={16} />
      </button>
      <div className="relative static-emoji-wrapper">
        <button onClick={(e) => { e.preventDefault(); setShowEmoji(!showEmoji); }} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Emoji">
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
  const [setupTab, setSetupTab] = useState<'general' | 'categories' | 'rules'>('general');
  
  const [title, setTitle] = useState(activeContest?.name || '');
  const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false);
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
    if (!catName.trim() || !catDesc.trim()) {
      toast.error('Please enter category name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName.trim(), desc: catDesc.trim(), emoji: catEmoji }]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
    toast.success(`Added "${catName.trim()}" category`);
  };

  const removeCategory = (id: string | number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.info('Category removed');
  };

  const handleUpdate = async () => {
    if (!activeContest) return;
    if (!title.trim()) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName.trim() && catDesc.trim()) {
      finalCategories.push({ id: Date.now(), name: catName.trim(), desc: catDesc.trim(), emoji: catEmoji });
    }

    if (finalCategories.length === 0) return toast.error('At least one category is required');

    setLoading(true);
    try {
      const batch = writeBatch(db);

      const updates: any = {};
      if (title.trim() !== activeContest.name) updates.name = title.trim();

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
        ].map((tab) => {
          const isActive = setupTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSetupTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all cursor-pointer flex items-center gap-2 shrink-0 select-none flex-1 justify-center",
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

            {/* Title Input with Emoji Picker */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0 static-emoji-wrapper">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowTitleEmojiPicker(!showTitleEmojiPicker); }}
                  className="w-12 h-12 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md text-white shrink-0"
                  title="Select Title Emoji"
                >
                  {/\p{Extended_Pictographic}/u.test(title.trim().slice(0, 2))
                    ? title.trim().slice(0, 2)
                    : '🏆'}
                </button>
                {showTitleEmojiPicker && (
                  <div className="absolute top-14 left-0 z-[999999] shadow-2xl bg-[#0d0d12] border border-white/20 rounded-2xl overflow-hidden p-1 min-w-[320px]">
                    <Picker
                      data={data}
                      theme="dark"
                      onEmojiSelect={(e: any) => {
                        setTitle(prev => `${e.native} ${prev.replace(/^\p{Extended_Pictographic}\s*/u, '')}`);
                        setShowTitleEmojiPicker(false);
                      }}
                      previewPosition="none"
                      navPosition="bottom"
                    />
                  </div>
                )}
              </div>

              <Input
                placeholder="e.g. 🏆 Cyberpunk Nights V2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/15 h-12 text-base font-bold text-white font-display rounded-2xl focus:border-fivem-orange focus:ring-1 focus:ring-fivem-orange/50 flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CATEGORIES ── */}
      {setupTab === 'categories' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 02 · Categories</span>
              <h3 className="text-lg font-bold text-white font-display">Manage Contest Categories ({categories.length})</h3>
            </div>
            <span className="text-xs text-white/40 font-mono">In-Place Editable</span>
          </div>

          {/* Categories Cards List (Fully Editable in Place) */}
          {categories.length > 0 && (
            <div className="space-y-3">
              {categories.map((c, i) => (
                <div key={c.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 transition-all hover:border-fivem-orange/40 group/cat shadow-sm relative">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0 static-emoji-wrapper">
                      <button
                        onClick={(e) => { e.preventDefault(); setEditingEmojiIdx(editingEmojiIdx === i ? null : i); }}
                        className="w-11 h-11 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 flex items-center justify-center text-xl transition-all shrink-0 cursor-pointer shadow-md text-white"
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

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-mono text-fivem-orange font-bold px-2 py-1 rounded-lg bg-fivem-orange/10 border border-fivem-orange/20 shrink-0">
                        #{i + 1}
                      </span>
                      <input
                        value={c.name}
                        onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, name: e.target.value } : cat))}
                        placeholder="Category Name (e.g. Wildlife)"
                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-fivem-orange transition-all font-display"
                      />
                    </div>

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
                <Button variant="outline" className="h-11 w-12 bg-white/20 hover:bg-white/30 border-white/30 text-xl flex items-center justify-center p-0 rounded-2xl cursor-pointer text-white shadow-md" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
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
          <div className="border-b border-white/10 pb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 03 · Contest Rules</span>
            <h3 className="text-lg font-bold text-white font-display">Rules Editor & Split Live Preview</h3>
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

      // 1. Compute winners
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

      // 2. Compute user stats to preserve
      const statsByDiscordName = new Map<string, { subs: number, votes: number }>();
      allPhotos.forEach(p => {
        const current = statsByDiscordName.get(p.discord_name) || { subs: 0, votes: 0 };
        current.subs += 1;
        current.votes += (p.vote_count || 0);
        statsByDiscordName.set(p.discord_name, current);
      });

      // 3. Import increment helper
      const { increment } = await import('firebase/firestore');

      const qActive = query(collection(db, 'contests'), where('is_active', '==', true));
      const activeSnaps = await getDocs(qActive);
      const photosSnap = await getDocs(collection(db, 'photos'));
      const votesSnap = await getDocs(collection(db, 'votes'));

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
      for (let i = 0; i < writeOps.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = writeOps.slice(i, i + BATCH_SIZE);
        chunk.forEach(op => op(batch));
        await batch.commit();
      }

      toast.success('Contest safely archived!');
      onArchived();
    } catch (e) {
      console.error("Archive Error:", e);
      toast.error('Failed to archive contest');
    } finally {
      setLoading(false);
      setConfirming(null);
    }
  };

  const handleHardDestroy = async () => {
    setLoading(true);
    try {
      const qActive = query(collection(db, 'contests'), where('is_active', '==', true));
      const activeSnaps = await getDocs(qActive);
      const photosSnap = await getDocs(collection(db, 'photos'));
      const votesSnap = await getDocs(collection(db, 'votes'));

      const writeOps: Array<(batch: any) => void> = [];

      activeSnaps.docs.forEach(d => {
        writeOps.push(batch => batch.delete(d.ref));
      });

      writeOps.push(batch => batch.set(doc(db, 'settings', 'global'), { votingOpen: false, rulesMarkdown: '' }, { merge: true }));

      photosSnap.docs.forEach(pSnap => {
        writeOps.push(batch => batch.delete(pSnap.ref));
      });

      votesSnap.docs.forEach(vSnap => {
        writeOps.push(batch => batch.delete(vSnap.ref));
      });

      const BATCH_SIZE = 400;
      for (let i = 0; i < writeOps.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = writeOps.slice(i, i + BATCH_SIZE);
        chunk.forEach(op => op(batch));
        await batch.commit();
      }

      toast.success('Contest completely destroyed.');
      onArchived();
    } catch (e) {
      console.error("Destroy Error:", e);
      toast.error('Failed to destroy contest');
    } finally {
      setLoading(false);
      setConfirming(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Archive Modal Alert Confirmation */}
      {confirming === 'archive' && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-white">Confirm Safe Archive</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                This will lock winners into the Hall of Fame archive, preserve user historical statistics, and clear all current photos and votes.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={loading} className="text-xs text-white/60 hover:text-white cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleArchive} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs cursor-pointer">
              {loading ? 'Archiving...' : 'Yes, Archive Contest'}
            </Button>
          </div>
        </div>
      )}

      {/* Destroy Confirmation */}
      {confirming === 'destroy' && (
        <div className="p-5 rounded-2xl bg-red-900/30 border border-red-500/50 space-y-4">
          <div className="flex items-start gap-3">
            <ServerCrash className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-red-300">Permanent Hard Destroy</p>
              <p className="text-xs text-red-200/60 mt-1 leading-relaxed">
                This permanently erases the active contest without archiving winners. Use only for test contests.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={loading} className="text-xs text-white/60 hover:text-white cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleHardDestroy} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer">
              {loading ? 'Destroying...' : 'Yes, Permanently Destroy'}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <p className="text-sm font-bold text-white">Safe Contest Archive</p>
          <p className="text-xs text-white/40">Saves champions to Hall of Fame, increments stats, and prepares clean round.</p>
        </div>
        <Button
          onClick={() => setConfirming('archive')}
          disabled={loading || confirming !== null}
          className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 text-xs font-bold px-5 h-10 rounded-xl transition-all cursor-pointer"
        >
          Archive Active Contest
        </Button>
      </div>
    </div>
  );
}

export function CreateContestManager({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState('');
  const [categories, setCategories] = useState<{ id: number, name: string, desc: string, emoji?: string }[]>([]);

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEmoji, setCatEmoji] = useState('✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingEmojiIdx, setEditingEmojiIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addCategory = () => {
    if (!catName.trim() || !catDesc.trim()) {
      toast.error('Please enter category name and description');
      return;
    }
    setCategories(prev => [...prev, { id: Date.now(), name: catName.trim(), desc: catDesc.trim(), emoji: catEmoji }]);
    setCatName('');
    setCatDesc('');
    setCatEmoji('✨');
    toast.success(`Added "${catName.trim()}" category`);
  };

  const removeCategory = (id: number) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.info('Category removed');
  };

  const handleLaunch = async () => {
    if (!title.trim()) return toast.error('Contest title is required');

    let finalCategories = [...categories];
    if (catName.trim() && catDesc.trim()) {
      finalCategories.push({ id: Date.now(), name: catName.trim(), desc: catDesc.trim(), emoji: catEmoji });
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
        name: title.trim(),
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
    <div className="space-y-6 p-6 sm:p-8 bg-[#09090d]/95 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Decorative Top Accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <Rocket size={20} />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white font-display">New Contest Round Setup</h3>
          <p className="text-xs text-white/40">Deploy a new photo contest round with custom categories and rules.</p>
        </div>
      </div>

      {/* Step 1: Title */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <span>1. Contest Title</span>
        </label>
        <Input
          placeholder="e.g. 🏆 Cyberpunk Nights V2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/15 h-12 text-base font-bold text-white font-display rounded-2xl focus:border-emerald-400"
        />
      </div>

      {/* Step 2: Categories (Fully in-place editable!) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <span>2. Contest Categories ({categories.length})</span>
          </label>
          {categories.length > 0 && (
            <span className="text-[11px] text-emerald-400/80 font-mono flex items-center gap-1">
              <Edit3 size={12} /> Click any field below to edit
            </span>
          )}
        </div>

        {/* Current Categories List with in-place editing */}
        {categories.length > 0 && (
          <div className="space-y-3 mb-4">
            {categories.map((c, i) => (
              <div key={c.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 transition-all hover:border-emerald-500/40 group/cat shadow-sm relative">
                <div className="flex items-center gap-3">
                  {/* Category Emoji Selector */}
                  <div className="relative shrink-0 static-emoji-wrapper">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setEditingEmojiIdx(editingEmojiIdx === i ? null : i); }}
                      className="w-11 h-11 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center text-xl transition-all shrink-0 cursor-pointer shadow-md text-white"
                      title="Change Category Emoji"
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

                  {/* Category Name Input */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      #{i + 1}
                    </span>
                    <input
                      value={c.name}
                      onChange={(e) => setCategories(prev => prev.map((cat, idx) => idx === i ? { ...cat, name: e.target.value } : cat))}
                      placeholder="Category Name (e.g. Action Shots)"
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-emerald-400 transition-all font-display"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeCategory(c.id)}
                    className="p-2.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl border border-transparent hover:border-red-500/30 transition-all shrink-0 cursor-pointer"
                    title="Remove Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Category Description Textarea */}
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
                    className="w-full min-h-[68px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/90 outline-none focus:border-emerald-400 transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Builder Box */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 space-y-3">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Plus size={12} className="text-emerald-400" /> Add Category to Round
          </p>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0 static-emoji-wrapper">
              <Button variant="outline" className="h-11 w-12 bg-white/20 hover:bg-white/30 border-white/30 text-xl flex items-center justify-center p-0 rounded-2xl cursor-pointer text-white shadow-md" onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}>
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
            <Input placeholder="Category Name (e.g. Wildlife)..." value={catName} onChange={e => setCatName(e.target.value)} className="bg-white/5 border-white/15 flex-1 h-11 text-sm font-bold text-white rounded-xl" />
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
            className="w-full min-h-[68px] bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400 transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
          />
          <Button variant="secondary" onClick={addCategory} className="w-full bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 text-emerald-300 h-11 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Plus size={16} /> Add Category
          </Button>
        </div>
      </div>

      {/* Step 3: Rules */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">3. Contest Rules (Markdown)</label>
          <span className="text-[10px] text-white/40 font-mono">Optional · Can be edited anytime</span>
        </div>
        <div className="flex flex-col">
          <MarkdownToolbar text={rules} textareaRef={textareaRef} onTextChange={setRules} />
          <textarea
            ref={textareaRef}
            placeholder="Define the rules for this new contest..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="w-full min-h-[140px] bg-black/50 border border-white/10 rounded-b-2xl p-4 text-xs font-mono leading-relaxed outline-none focus:border-emerald-400 transition-colors resize-y placeholder:text-white/20 text-white"
          />
        </div>
      </div>

      {/* Launch Action */}
      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-display font-black text-base tracking-wide rounded-2xl mt-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
      >
        {loading ? 'Initializing Core Systems...' : '🚀 Launch New Contest Round'}
      </Button>
    </div>
  );
}
