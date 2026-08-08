import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, X, Copy, ExternalLink, Send, Check, ShieldCheck, MessageSquare, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export function BugReportModal({ isOpen, onClose, user }: BugReportModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);

  const DISCORD_HANDLE = 'mcspace';
  const DISCORD_ID = '150580708144840704';
  const DISCORD_DM_URL = `https://discord.com/users/${DISCORD_ID}`;

  const handleCopyHandle = () => {
    navigator.clipboard.writeText(DISCORD_HANDLE);
    setCopiedHandle(true);
    toast.success(`Copied @${DISCORD_HANDLE} to clipboard!`);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error('Please enter a summary and description of the bug');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bug_reports'), {
        title,
        description,
        contactEmail,
        reportedBy: user?.displayName || user?.email || 'Anonymous Visitor',
        userId: user?.uid || null,
        status: 'Open',
        createdAt: serverTimestamp(),
      });

      toast.success('Bug report submitted to Damon! Thank you.');
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Error logging bug report:', err);
      toast.error('Could not send bug report. You can DM Damon directly on Discord!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
          {/* Backdrop trigger */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0a0a0d] p-6 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.9)] z-10 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer border border-white/10"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-fivem-orange/15 border border-fivem-orange/30 text-fivem-orange shadow-[0_0_16px_rgba(234,88,12,0.2)]">
                <Bug size={22} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black font-display text-white">Report Bug / Contact Creator</h3>
                <p className="text-xs text-white/40 font-mono mt-0.5">Direct link to Lead Developer Damon</p>
              </div>
            </div>

            {/* ── DAMON'S DISCORD PROFILE SHOWCASE CARD ── */}
            <div className="relative overflow-hidden rounded-2xl border border-fivem-orange/30 bg-gradient-to-br from-[#121218] via-[#0e0e14] to-[#08080c] p-5 shadow-lg">
              {/* Top ambient banner glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fivem-orange via-amber-400 to-fivem-orange" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                {/* Profile info */}
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src="https://r2.fivemanage.com/image/be70Qnvx8DT5.png"
                      alt="Damon"
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-fivem-orange/60 bg-black/60 p-1 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0e0e14] shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Online" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-display text-white">Damon</span>
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-fivem-orange bg-fivem-orange/15 px-2 py-0.5 rounded-md border border-fivem-orange/30">
                        <ShieldCheck size={10} /> Creator
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white/60">@{DISCORD_HANDLE}</span>
                    <span className="text-[10px] text-white/30 font-mono mt-0.5">ID: {DISCORD_ID}</span>
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleCopyHandle}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                    title="Copy Discord Handle"
                  >
                    {copiedHandle ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/60" />}
                    <span>{copiedHandle ? 'Copied!' : 'Copy Tag'}</span>
                  </button>

                  <a
                    href={DISCORD_DM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 hover:from-orange-500 hover:to-fivem-orange text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)] cursor-pointer"
                    title="Open Direct DM on Discord"
                  >
                    <MessageSquare size={14} />
                    <span>Open DM</span>
                    <ExternalLink size={12} className="opacity-70" />
                  </a>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-white/20 font-mono text-[10px] uppercase tracking-widest">
              <div className="flex-1 h-px bg-white/10" />
              <span>Or Submit Quick Report Form</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Quick Bug Form */}
            <form onSubmit={handleSubmitBug} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Issue Summary / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Photo upload button not responding on Safari"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-fivem-orange transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Bug Description & Reproduction Steps</label>
                <textarea
                  rows={3}
                  placeholder="Describe what happened, what page you were on, and how to reproduce it..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-fivem-orange transition-colors resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-white/40 mb-1">Your Discord / Contact Info (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. YourUsername#1234 or email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-fivem-orange transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={14} className="text-fivem-orange" />
                <span>{isSubmitting ? 'Submitting Report...' : 'Submit Bug Report'}</span>
              </button>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
