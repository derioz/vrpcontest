import React, { useState, useRef, useEffect } from 'react';
import { toast } from '../ui/toast';
import { Category, Photo } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, setDoc, increment } from 'firebase/firestore';
import {
  AlertCircle, X, Plus, Bold, Italic, Heading, List,
  Link as LinkIcon, Smile, Trash2, ServerCrash, Trophy, Sparkles,
  Layers, CheckCircle2, Rocket, Edit3, Save, Check, FileText,
  Quote, Code, Wand2, Eye, RefreshCw, Undo2, HelpCircle
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const STANDARD_RULES_TEMPLATE = `# 📸 Vital RP Photo Contest Rules & Guidelines

Welcome to the **Vital RP Photo Contest**! Please read the official rules and guidelines before submitting your entries.

---

### 📝 Submission Requirements
- **Resolution:** Screenshots must be at least **1920x1080 (Full HD)** resolution.
- **Original Work:** Photos must be captured in-game by you on **Vital RP**.
- **No AI / Pre-Rendered Art:** AI-generated images or external digital art are strictly prohibited.
- **Category Match:** Ensure your screenshot matches the theme of the category you enter.

---

### 🗳️ Voting & Fair Play
- **1 Vote per Category:** Each verified Discord member may cast one vote per active category.
- **No Vote Manipulation:** Trading votes or using alternate accounts will lead to instant disqualification.
- **Vote Privacy:** All votes are end-to-end encrypted with RSA-2048 until public tallying.

---

### 🏆 Prizes & Recognition
- **1st Place:** Featured permanently in the **Hall of Fame Vault** + Discord Champion Role!
- Winners will be announced immediately following the voting conclusion.

> 💡 **Tip:** Adjust your in-game time and weather for the most cinematic lighting!`;

export const SHORT_RULES_TEMPLATE = `## 🏆 Contest Rules

- **1080p Minimum:** Screenshots must be at least 1920x1080.
- **In-Game Only:** All submissions must be captured on Vital RP.
- **1 Entry per Category:** Submit your best shot for each category.
- **Fair Play:** Vote manipulation or alt accounts result in disqualification.

> ⚠️ Entries that do not follow the rules will be removed.`;

export function MarkdownLivePreview({ markdown }: { markdown: string }) {
  if (!markdown || !markdown.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-white/30 italic space-y-2">
        <FileText size={36} className="text-white/10" />
        <p className="text-xs">Start typing rules on the left to see the live Markdown preview...</p>
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-orange max-w-none text-xs leading-relaxed space-y-3 prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-base prose-h1:text-white prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-2 prose-h2:text-sm prose-h2:text-fivem-orange prose-h3:text-xs prose-h3:text-amber-300 prose-p:text-white/80 prose-p:whitespace-pre-wrap prose-li:text-white/75 prose-strong:text-white prose-strong:font-bold prose-em:text-amber-200 prose-a:text-fivem-orange prose-a:underline hover:prose-a:text-amber-400 prose-blockquote:border-l-2 prose-blockquote:border-fivem-orange prose-blockquote:bg-white/[0.03] prose-blockquote:p-3 prose-blockquote:rounded-r-xl prose-blockquote:text-white/80 prose-blockquote:not-italic prose-code:bg-white/10 prose-code:text-amber-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-table:border-collapse prose-th:border prose-th:border-white/10 prose-th:bg-white/5 prose-th:p-2 prose-th:text-white prose-td:border prose-td:border-white/10 prose-td:p-2 prose-td:text-white/70">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownToolbar({
  text,
  textareaRef,
  onTextChange
}: {
  text: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onTextChange: (t: string) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onTextChange(text + `\n${before}text${after}`);
      return;
    }

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

    onTextChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="flex items-center justify-between gap-1 flex-wrap p-2 bg-white/5 border border-white/10 rounded-t-2xl border-b-0">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => insertText('**', '**')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Bold (**text**)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertText('*', '*')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Italic (*text*)"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertText('# ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-bold text-xs"
          title="Heading 1 (# Heading)"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => insertText('## ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-bold text-xs"
          title="Heading 2 (## Heading)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertText('### ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-bold text-xs"
          title="Heading 3 (### Heading)"
        >
          H3
        </button>
        <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />
        <button
          type="button"
          onClick={() => insertText('- ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Bullet List (- Item)"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertText('1. ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-mono text-xs font-bold"
          title="Numbered List (1. Item)"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => insertText('> ', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Quote / Callout (> Quote)"
        >
          <Quote size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertText('[Link Title](', ')')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Link ([Title](url))"
        >
          <LinkIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertText('\n---\n', '')}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer font-mono text-xs font-bold"
          title="Divider Line (---)"
        >
          —
        </button>
        <button
          type="button"
          onClick={() => insertText('\n> 💡 **Tip:** ', '\n')}
          className="p-1.5 text-white/60 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
          title="Insert Tip Callout"
        >
          💡
        </button>
        <button
          type="button"
          onClick={() => insertText('\n> ⚠️ **Important:** ', '\n')}
          className="p-1.5 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
          title="Insert Warning Callout"
        >
          ⚠️
        </button>

        {/* Emoji Selector */}
        <div className="relative static-emoji-wrapper">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowEmoji(!showEmoji); }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Emoji Picker"
          >
            <Smile size={15} />
          </button>
          {showEmoji && (
            <div className="absolute top-10 left-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-xl overflow-hidden p-1 min-w-[320px]">
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

      {/* Templates & Quick Actions */}
      <div className="flex items-center gap-1.5 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-2 py-1 text-[11px] font-mono text-fivem-orange hover:text-amber-300 hover:bg-fivem-orange/10 rounded-lg border border-fivem-orange/30 transition-all flex items-center gap-1 cursor-pointer"
            title="Quick Templates"
          >
            <Wand2 size={12} />
            <span>Templates</span>
          </button>
          {showTemplates && (
            <div className="absolute top-8 right-0 z-[99999] shadow-2xl bg-[#0e0e14] border border-white/15 rounded-xl p-2 min-w-[200px] space-y-1 backdrop-blur-xl">
              <div className="text-[10px] font-mono text-white/40 uppercase px-2 py-1">Insert Starter Template</div>
              <button
                type="button"
                onClick={() => {
                  onTextChange(STANDARD_RULES_TEMPLATE);
                  setShowTemplates(false);
                  toast.success('Standard rules template loaded');
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Full Official Rules</span>
                <span className="text-[10px] text-emerald-400 font-mono">Detailed</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onTextChange(SHORT_RULES_TEMPLATE);
                  setShowTemplates(false);
                  toast.success('Short rules template loaded');
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Short & Compact</span>
                <span className="text-[10px] text-amber-400 font-mono">Quick</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                type="button"
                onClick={() => {
                  onTextChange('');
                  setShowTemplates(false);
                  toast.info('Rules cleared');
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Clear All Rules</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EditContestManager({
  activeContest,
  currentRules = '',
  currentCategories = [],
  onUpdated = () => {},
  rulesMarkdown,
  categories: propCategories
}: {
  activeContest: any;
  currentRules?: string;
  currentCategories?: Category[];
  onUpdated?: () => void;
  rulesMarkdown?: string;
  categories?: Category[];
}) {
  const effectiveRules = rulesMarkdown ?? currentRules ?? '';
  const effectiveCats = currentCategories && currentCategories.length > 0 ? currentCategories : (propCategories || []);

  const [setupTab, setSetupTab] = useState<'general' | 'categories' | 'rules'>('general');
  
  const [title, setTitle] = useState(activeContest?.name || '');
  const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false);
  const [rules, setRules] = useState(effectiveRules);
  const [categories, setCategories] = useState<{ id: string | number, name: string, desc: string, emoji?: string }[]>(
    effectiveCats.map(c => ({ id: c.id, name: c.name, desc: c.description, emoji: c.emoji }))
  );

  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catEmoji, setCatEmoji] = useState('✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingEmojiIdx, setEditingEmojiIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingRulesOnly, setSavingRulesOnly] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastContestIdRef = useRef<string | null>(activeContest?.id || null);

  // Sync state ONLY when switching active contest round to avoid wiping user's typing on real-time listener updates
  useEffect(() => {
    if (activeContest?.id && activeContest.id !== lastContestIdRef.current) {
      lastContestIdRef.current = activeContest.id;
      setTitle(activeContest.name || '');
      const r = rulesMarkdown ?? currentRules ?? '';
      const cats = currentCategories && currentCategories.length > 0 ? currentCategories : (propCategories || []);
      setRules(r);
      setCategories(cats.map(c => ({ id: c.id, name: c.name, desc: c.description, emoji: c.emoji })));
    }
  }, [activeContest?.id, activeContest?.name, rulesMarkdown, currentRules, currentCategories, propCategories]);

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

  // Dedicated Save Rules Only handler for instant updates
  const handleSaveRulesOnly = async () => {
    setSavingRulesOnly(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { rulesMarkdown: rules || '' }, { merge: true });
      toast.success('Contest rules updated successfully!');
      onUpdated();
    } catch (e) {
      console.error("Save Rules Error:", e);
      toast.error('Failed to save rules');
    } finally {
      setSavingRulesOnly(false);
    }
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

      // Always persist rules to settings/global
      batch.set(doc(db, 'settings', 'global'), { rulesMarkdown: rules || '' }, { merge: true });

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

  const wordCount = rules.trim() ? rules.trim().split(/\s+/).length : 0;
  const charCount = rules.length;
  const isRulesModified = rules !== (rulesMarkdown ?? currentRules ?? '');

  return (
    <div className="space-y-6 relative">
      
      {/* ── SEGMENTED WORKSPACE TABS ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
        {[
          { id: 'general', label: '1. Title & Status', emoji: '📜' },
          { id: 'categories', label: `2. Categories (${categories.length})`, emoji: '🏷️' },
          { id: 'rules', label: '3. Rules & Live Preview', emoji: '📝' },
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
              {tab.id === 'rules' && isRulesModified && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved rules changes" />
              )}
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
            <div className="flex items-center gap-3">
              <Input
                placeholder="e.g. 🏆 Cyberpunk Nights V2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/15 h-12 text-base font-bold text-white font-display rounded-2xl focus:border-fivem-orange flex-1"
              />
              <div className="relative static-emoji-wrapper">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 bg-white/5 hover:bg-white/10 border-white/15 rounded-2xl text-lg flex items-center justify-center cursor-pointer text-white"
                  onClick={() => setShowTitleEmojiPicker(!showTitleEmojiPicker)}
                >
                  <Smile size={18} />
                </Button>
                {showTitleEmojiPicker && (
                  <div className="absolute top-14 right-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-2xl overflow-hidden p-1 min-w-[320px]">
                    <Picker
                      data={data}
                      theme="dark"
                      onEmojiSelect={(e: any) => {
                        setTitle(prev => `${e.native} ${prev}`.trim());
                        setShowTitleEmojiPicker(false);
                      }}
                      previewPosition="none"
                      navPosition="bottom"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CATEGORIES ── */}
      {setupTab === 'categories' && (
        <div className="p-6 rounded-3xl bg-[#09090d]/95 border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fivem-orange">Step 02 · Competition Categories</span>
              <h3 className="text-lg font-bold text-white font-display">Manage Categories</h3>
            </div>
            <span className="text-xs font-mono text-white/40">{categories.length} configured</span>
          </div>

          {/* List of active categories */}
          <div className="space-y-3">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3 group hover:border-white/20 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative static-emoji-wrapper">
                      <button
                        type="button"
                        onClick={() => setEditingEmojiIdx(editingEmojiIdx === idx ? null : idx)}
                        className="text-2xl p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-transform hover:scale-110"
                      >
                        {cat.emoji || '✨'}
                      </button>
                      {editingEmojiIdx === idx && (
                        <div className="absolute top-12 left-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-2xl overflow-hidden p-1 min-w-[320px]">
                          <Picker
                            data={data}
                            theme="dark"
                            onEmojiSelect={(e: any) => {
                              setCategories(prev => prev.map((c, i) => i === idx ? { ...c, emoji: e.native } : c));
                              setEditingEmojiIdx(null);
                            }}
                            previewPosition="none"
                            navPosition="bottom"
                          />
                        </div>
                      )}
                    </div>
                    <Input
                      value={cat.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategories(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c));
                      }}
                      className="bg-white/5 border-white/10 h-10 text-sm font-bold text-white rounded-xl focus:border-fivem-orange flex-1"
                      placeholder="Category Name"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(cat.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl p-2 h-auto cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <textarea
                  rows={2}
                  value={cat.desc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, desc: val } : c));
                  }}
                  placeholder="Category description / criteria..."
                  className="w-full min-h-[50px] bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white/80 outline-none focus:border-fivem-orange transition-colors placeholder:text-white/30 resize-y"
                />
              </div>
            ))}
          </div>

          {/* Add Category Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 space-y-3">
            <h4 className="text-xs font-mono font-bold text-fivem-orange uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} /> Add New Category
            </h4>
            <div className="flex items-center gap-3">
              <div className="relative static-emoji-wrapper">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 bg-white/5 hover:bg-white/10 border-white/15 rounded-xl text-lg flex items-center justify-center cursor-pointer text-white"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {catEmoji}
                </Button>
                {showEmojiPicker && (
                  <div className="absolute top-13 left-0 z-[999999] shadow-2xl bg-fivem-card border border-white/10 rounded-2xl overflow-hidden p-1 min-w-[320px]">
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
              <Input
                placeholder="Category Name (e.g. Wildlife)..."
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="bg-white/5 border-white/15 flex-1 h-11 text-sm font-bold text-white rounded-xl"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Category Description..."
              value={catDesc}
              onChange={e => setCatDesc(e.target.value)}
              className="w-full min-h-[68px] bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-fivem-orange transition-colors placeholder:text-white/30 leading-relaxed font-sans resize-y"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCategory}
              className="w-full bg-fivem-orange/20 hover:bg-fivem-orange hover:text-black border border-fivem-orange/40 text-fivem-orange h-11 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
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
              <h3 className="text-lg font-bold text-white font-display">Rules Editor & Split Live Markdown Preview</h3>
              <p className="text-xs text-white/40 mt-0.5">Rules are formatted in standard Markdown and sync across the main website and submissions page.</p>
            </div>

            {/* Quick Instant Save Button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handleSaveRulesOnly}
                disabled={savingRulesOnly}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {savingRulesOnly ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>{savingRulesOnly ? 'Saving Rules...' : 'Save Rules Now'}</span>
              </Button>
            </div>
          </div>

          {/* Rules Editor & Split Preview Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Editor Side */}
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-fivem-orange uppercase tracking-wider font-bold">
                  Markdown Source Code
                </label>
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                  <span>{wordCount} words</span>
                  <span>·</span>
                  <span>{charCount} chars</span>
                </div>
              </div>
              <MarkdownToolbar
                text={rules}
                textareaRef={textareaRef}
                onTextChange={setRules}
              />
              <textarea
                ref={textareaRef}
                placeholder="Define the rules for this contest in Markdown format..."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full min-h-[340px] flex-1 bg-black/60 border border-white/10 rounded-b-2xl p-4 text-xs font-mono leading-relaxed outline-none focus:border-fivem-orange transition-colors resize-y placeholder:text-white/20 text-white selection:bg-fivem-orange/30"
              />

              {/* Formatting Cheat Sheet Chips */}
              <div className="pt-2 flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-white/40">
                <span className="text-white/30">Quick syntax:</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"># Header 1</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">## Header 2</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">**Bold**</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">*Italic*</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">- List</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">&gt; Quote</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">[Link](url)</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">---</span>
              </div>
            </div>

            {/* Live Formatting Preview Side */}
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Markdown Rendering</span>
                </label>
                <span className="text-[10px] font-mono text-white/30">Matches Contest Rules Display</span>
              </div>
              <div className="w-full min-h-[340px] flex-1 bg-[#050508] border border-white/10 rounded-2xl p-5 text-xs text-white/80 leading-relaxed font-sans overflow-y-auto max-h-[460px] relative shadow-inner">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fivem-orange/5 blur-3xl pointer-events-none rounded-full" />
                <MarkdownLivePreview markdown={rules} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE ALL CHANGES PRIMARY ACTION FOOTER ── */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs font-mono text-white/40 flex items-center gap-2">
          <span>Active Contest: </span>
          <strong className="text-white">{title}</strong>
          {isRulesModified && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Unsaved Rules
            </span>
          )}
        </div>

        <Button
          type="button"
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

export function CreateContestManager({
  onCreated,
  onContestCreated
}: {
  onCreated?: () => void;
  onContestCreated?: () => void;
}) {
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

      // Always persist rules to settings/global
      batch.set(doc(db, 'settings', 'global'), { rulesMarkdown: rules || '' }, { merge: true });

      await batch.commit();

      toast.success(`Successfully deployed ${title}!`);
      setTitle('');
      setCategories([]);
      setCatName('');
      setCatDesc('');
      setCatEmoji('✨');
      setRules('');
      (onCreated || onContestCreated)?.();
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

      {/* Step 3: Rules & Live Preview */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
            3. Contest Rules & Live Markdown Preview
          </label>
          <span className="text-[10px] text-white/40 font-mono">
            Optional · Can be edited anytime after launch
          </span>
        </div>

        {/* Rules Editor & Split Preview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Editor Side */}
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/40 uppercase">Markdown Editor</span>
              <span className="text-[10px] font-mono text-white/30">{rules.length} chars</span>
            </div>
            <MarkdownToolbar
              text={rules}
              textareaRef={textareaRef}
              onTextChange={setRules}
            />
            <textarea
              ref={textareaRef}
              placeholder="Define the rules for this new contest in Markdown format..."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full min-h-[260px] flex-1 bg-black/60 border border-white/10 rounded-b-2xl p-4 text-xs font-mono leading-relaxed outline-none focus:border-emerald-400 transition-colors resize-y placeholder:text-white/20 text-white selection:bg-emerald-500/30"
            />
          </div>

          {/* Live Formatting Preview Side */}
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Markdown Rendering</span>
              </label>
              <span className="text-[10px] font-mono text-white/30">Instant Preview</span>
            </div>
            <div className="w-full min-h-[260px] flex-1 bg-[#050508] border border-white/10 rounded-2xl p-5 text-xs text-white/80 leading-relaxed font-sans overflow-y-auto max-h-[380px] relative shadow-inner">
              <MarkdownLivePreview markdown={rules} />
            </div>
          </div>
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

export function StandaloneRulesEditor({
  rulesMarkdown = '',
  onUpdated = () => {}
}: {
  rulesMarkdown?: string;
  onUpdated?: () => void;
}) {
  const [rules, setRules] = useState(rulesMarkdown);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRules(rulesMarkdown);
  }, [rulesMarkdown]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { rulesMarkdown: rules || '' }, { merge: true });
      toast.success('Contest rules saved successfully!');
      onUpdated();
    } catch (e) {
      console.error("Save Rules Error:", e);
      toast.error('Failed to save contest rules');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = rules.trim() ? rules.trim().split(/\s+/).length : 0;
  const charCount = rules.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} chars</span>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? 'Saving Rules...' : 'Save Rules Now'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col h-full space-y-2">
          <MarkdownToolbar text={rules} textareaRef={textareaRef} onTextChange={setRules} />
          <textarea
            ref={textareaRef}
            placeholder="Define the rules for this contest in Markdown format..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="w-full min-h-[300px] flex-1 bg-black/60 border border-white/10 rounded-b-2xl p-4 text-xs font-mono leading-relaxed outline-none focus:border-fivem-orange transition-colors resize-y placeholder:text-white/20 text-white selection:bg-fivem-orange/30"
          />
        </div>
        <div className="flex flex-col h-full space-y-2">
          <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Markdown Preview</span>
          </label>
          <div className="w-full min-h-[300px] flex-1 bg-[#050508] border border-white/10 rounded-2xl p-5 text-xs text-white/80 leading-relaxed font-sans overflow-y-auto max-h-[420px] relative shadow-inner">
            <MarkdownLivePreview markdown={rules} />
          </div>
        </div>
      </div>
    </div>
  );
}
