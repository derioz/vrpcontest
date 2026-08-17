/**
 * ContestRulesSection — Redesigned Full-Width Premium Rules & Guidelines
 *
 * Spans the full stage with high-impact key rule highlight pillars,
 * glassmorphic card architecture, BorderBeam accents, and comprehensive
 * Markdown rendering for contest rules.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  ShieldCheck,
  Camera,
  Flame,
  CheckCircle2,
  Sparkles,
  Trophy,
  ArrowUp
} from 'lucide-react';
import { BorderBeam } from './ui/border-beam';
import { GlowLine } from './ui/glowline';

interface ContestRulesSectionProps {
  rulesMarkdown: string;
}

export function ContestRulesSection({ rulesMarkdown }: ContestRulesSectionProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="rules" className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28">
      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-white/10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 backdrop-blur-md mb-3 text-xs font-mono font-bold text-fivem-orange uppercase tracking-widest">
            <ShieldCheck size={13} className="text-fivem-orange animate-pulse" />
            <span>Official Competition Protocol</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-2">
            Contest Rules & <span className="bg-gradient-to-r from-fivem-orange via-orange-400 to-amber-300 bg-clip-text text-transparent">Guidelines</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed">
            Please read the official competition standards carefully before submitting your entries. High-resolution captures, strict fair play, and community verification are strictly enforced.
          </p>
        </div>

        <button
          type="button"
          onClick={scrollToTop}
          className="flex items-center gap-2 self-start md:self-end px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 cursor-pointer shadow-md"
        >
          <ArrowUp size={13} className="text-fivem-orange" />
          <span>Back to Top</span>
        </button>
      </div>

      {/* ── 4 Quick-Reference Pillar Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
        <div className="relative p-5 rounded-2xl bg-[#0d0d14]/90 border border-white/10 shadow-lg flex flex-col justify-between overflow-hidden group hover:border-fivem-orange/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-fivem-orange/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-fivem-orange/15 border border-fivem-orange/30 flex items-center justify-center mb-3.5 text-fivem-orange">
              <Camera size={20} />
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Standard 01</span>
            <h3 className="text-base font-bold font-display text-white mb-1.5">1080p+ Full HD Minimum</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              All entries must meet or exceed 1920x1080 resolution. Clear, uncompressed in-game screenshots only.
            </p>
          </div>
        </div>

        <div className="relative p-5 rounded-2xl bg-[#0d0d14]/90 border border-white/10 shadow-lg flex flex-col justify-between overflow-hidden group hover:border-amber-400/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-3.5 text-amber-300">
              <Flame size={20} />
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Standard 02</span>
            <h3 className="text-base font-bold font-display text-white mb-1.5">In-Game Authenticity</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Pure GTA V / FiveM in-game captures. No real-life photographs, external watermarks, or AI generation.
            </p>
          </div>
        </div>

        <div className="relative p-5 rounded-2xl bg-[#0d0d14]/90 border border-white/10 shadow-lg flex flex-col justify-between overflow-hidden group hover:border-emerald-400/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mb-3.5 text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Standard 03</span>
            <h3 className="text-base font-bold font-display text-white mb-1.5">Fair Play & Discord Sync</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              1 photo per user across each active category. Verified Discord authentication ensures anti-fraud vote integrity.
            </p>
          </div>
        </div>

        <div className="relative p-5 rounded-2xl bg-[#0d0d14]/90 border border-white/10 shadow-lg flex flex-col justify-between overflow-hidden group hover:border-purple-400/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 blur-2xl rounded-full pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/30 flex items-center justify-center mb-3.5 text-purple-300">
              <Trophy size={20} />
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">Standard 04</span>
            <h3 className="text-base font-bold font-display text-white mb-1.5">5 Round Co-Champions</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              The highest voted photo in each of the 5 categories earns Grand Champion status and server loading screen fame.
            </p>
          </div>
        </div>
      </div>

      {/* ── Wide Glassmorphic Rules Canvas ── */}
      <div className="relative p-7 sm:p-10 md:p-14 rounded-3xl bg-gradient-to-b from-[#0e0e16]/95 via-[#0a0a10]/95 to-[#08080c]/98 border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Border Beam subtle light trace */}
        <BorderBeam size={260} duration={15} colorFrom="#ea580c" colorTo="#fb923c" borderWidth={1.5} />

        {/* Ambient Radial Lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-fivem-orange/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Subtle Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ffffff 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {rulesMarkdown ? (
          <div className="relative z-10 prose prose-invert prose-orange max-w-none text-sm sm:text-base leading-relaxed space-y-5 prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-2xl sm:prose-h1:text-3xl lg:prose-h1:text-4xl prose-h1:text-white prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4 prose-h1:mt-0 prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:text-fivem-orange prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base sm:prose-h3:text-lg prose-h3:text-amber-300 prose-h3:mt-6 prose-p:text-white/80 prose-p:whitespace-pre-wrap prose-p:leading-relaxed prose-li:text-white/80 prose-li:my-2 prose-strong:text-white prose-strong:font-bold prose-em:text-amber-200 prose-a:text-fivem-orange prose-a:underline hover:prose-a:text-amber-400 prose-a:transition-colors prose-blockquote:border-l-4 prose-blockquote:border-fivem-orange prose-blockquote:bg-white/[0.03] prose-blockquote:p-4 sm:prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:text-white/90 prose-blockquote:not-italic prose-blockquote:shadow-sm prose-code:bg-white/10 prose-code:text-amber-300 prose-code:px-2.5 prose-code:py-1 prose-code:rounded-lg prose-code:font-mono prose-code:text-xs prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-white/15 prose-th:bg-white/5 prose-th:p-3 sm:prose-th:p-4 prose-th:text-white prose-th:font-display prose-td:border prose-td:border-white/10 prose-td:p-3 sm:prose-td:p-4 prose-td:text-white/80 prose-hr:border-white/10 prose-hr:my-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {rulesMarkdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <FileText size={56} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold font-display text-white/60 mb-2">No Rules Published Yet</h3>
            <p className="text-white/35 max-w-sm text-sm">Contest administrators have not posted specific rules for this round yet. Check back soon.</p>
          </div>
        )}

        {/* Bottom divider line */}
        <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-fivem-orange" />
            <span>Vital RP Official Photo Contest Governance</span>
          </div>
          <span>Updated dynamically by contest administration</span>
        </div>
      </div>
    </section>
  );
}

export default ContestRulesSection;
