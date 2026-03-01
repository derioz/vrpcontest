import React, { useState, useRef, useEffect } from 'react'; import { toast } from 'sonner';
import { Category } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { AlertCircle, X, Plus, Bold, Italic, Heading, List, Link as LinkIcon, Smile } from 'lucide-react';
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

export function EditContestManager({ activeContest, currentRules, currentCategories, onUpdated }: { activeContest: any, currentRules: string, currentCategories: Category[], onUpdated: () => void }) {
  const formatDateForInput = (isoString?: string) => isoString ? new Date(isoString).toISOString().slice(0, 16) : '';
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

      <div className="space-y-2 relative z-30">
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

      <div className="space-y-4 relative z-20">
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
        onClick={handleUpdate}
        disabled={loading}
        className="w-full h-12 bg-white/10 hover:bg-fivem-orange hover:text-white text-white font-display text-sm tracking-wide rounded-xl mt-4 transition-all relative z-0"
      >
        {loading ? 'Saving Changes...' : 'Save Contest Changes'}
      </Button>
    </div >
  );
}

export function ArchiveContest({ onArchived }: { onArchived: () => void }) {
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

      <div className="space-y-2 relative z-30">
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

      <div className="space-y-4 relative z-20">
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
