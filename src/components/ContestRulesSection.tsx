/**
 * ContestRulesSection — Premium Rules & Guidelines
 *
 * Clean, unique design with numbered rule cards featuring interactive
 * MagicCard hover effects, a markdown rules canvas with BorderBeam,
 * and an animated "scroll to top" action.
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  ShieldCheck,
  Camera,
  Flame,
  Trophy,
  Sparkles,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Scale,
} from 'lucide-react';
import { BorderBeam } from './ui/border-beam';
import { MagicCard } from './ui/magic-card';
import { cn } from '../lib/utils';

interface ContestRulesSectionProps {
  rulesMarkdown: string;
}

/* ── Quick rule data ── */
const QUICK_RULES = [
  {
    icon: Camera,
    number: '01',
    title: '1080p+ Resolution',
    desc: 'All entries must meet or exceed 1920×1080. Clear, uncompressed in-game screenshots only.',
    color: 'orange' as const,
  },
  {
    icon: Flame,
    number: '02',
    title: 'In-Game Authenticity',
    desc: 'Pure GTA V / FiveM captures only. No real-life photos, external watermarks, or AI-generated images.',
    color: 'amber' as const,
  },
  {
    icon: Scale,
    number: '03',
    title: 'Fair Play & Integrity',
    desc: 'One submission per category per user. Discord-verified authentication ensures anti-fraud vote integrity.',
    color: 'emerald' as const,
  },
  {
    icon: Trophy,
    number: '04',
    title: '5 Round Champions',
    desc: 'The highest-voted photo per category wins Champion status, custom badges, and server loading screen fame.',
    color: 'violet' as const,
  },
];

const COLOR_MAP = {
  orange: {
    iconBg: 'bg-orange-500/10',
    iconBorder: 'border-orange-500/25',
    iconText: 'text-orange-400',
    numText: 'text-orange-500/50',
    gradient: 'rgba(234,88,12,0.12)',
    hoverBorder: 'hover:border-orange-500/30',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/25',
    iconText: 'text-amber-400',
    numText: 'text-amber-500/50',
    gradient: 'rgba(245,158,11,0.12)',
    hoverBorder: 'hover:border-amber-500/30',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/25',
    iconText: 'text-emerald-400',
    numText: 'text-emerald-500/50',
    gradient: 'rgba(16,185,129,0.12)',
    hoverBorder: 'hover:border-emerald-500/30',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconBorder: 'border-violet-500/25',
    iconText: 'text-violet-400',
    numText: 'text-violet-500/50',
    gradient: 'rgba(139,92,246,0.12)',
    hoverBorder: 'hover:border-violet-500/30',
  },
};

export function ContestRulesSection({ rulesMarkdown }: ContestRulesSectionProps) {
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="rules" className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28">

      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-fivem-orange/25 bg-fivem-orange/8 backdrop-blur-md mb-4 text-[11px] font-mono font-bold text-fivem-orange uppercase tracking-widest">
              <ShieldCheck size={13} className="text-fivem-orange" />
              <span>Official Protocol</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight text-white mb-3">
              Rules &{' '}
              <span className="bg-gradient-to-r from-fivem-orange via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Guidelines
              </span>
            </h2>
            <p className="text-white/50 text-sm sm:text-base leading-relaxed max-w-xl">
              Review the official competition standards before submitting your entries.
            </p>
          </motion.div>
        </div>

        <motion.button
          type="button"
          onClick={scrollToTop}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 self-start md:self-end px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 text-white/50 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ArrowUp size={13} className="text-fivem-orange" />
          <span>Back to Top</span>
        </motion.button>
      </div>

      {/* ── Quick Rule Cards (2×2 grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
        {QUICK_RULES.map((rule, i) => {
          const c = COLOR_MAP[rule.color];
          const Icon = rule.icon;
          return (
            <motion.div
              key={rule.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <MagicCard
                gradientColor={c.gradient}
                gradientSize={200}
                className={cn(
                  'p-5 sm:p-6 rounded-2xl bg-white/[0.015] border border-white/[0.07] cursor-default',
                  c.hoverBorder,
                  'transition-colors duration-300'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center',
                    c.iconBg, c.iconBorder
                  )}>
                    <Icon size={18} className={c.iconText} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] font-mono font-bold tracking-widest', c.numText)}>
                        {rule.number}
                      </span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold font-display text-white mb-1">
                      {rule.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                </div>
              </MagicCard>
            </motion.div>
          );
        })}
      </div>

      {/* ── Full Rules Canvas ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative rounded-2xl sm:rounded-3xl bg-[#09090d]/95 border border-white/[0.07] overflow-hidden"
      >
        {/* BorderBeam accent */}
        <BorderBeam size={220} duration={18} colorFrom="#ea580c" colorTo="#fb923c" borderWidth={1.5} />

        {/* Ambient glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-fivem-orange/[0.06] blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/6 w-60 h-60 bg-violet-500/[0.04] blur-[90px] rounded-full pointer-events-none" />

        {/* Content */}
        {rulesMarkdown ? (
          <>
            <div
              className={cn(
                'relative z-10 p-6 sm:p-8 md:p-10 lg:p-12 transition-all duration-500',
                !isRulesExpanded && 'max-h-[420px] overflow-hidden'
              )}
            >
              {/* Fade overlay when collapsed */}
              {!isRulesExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090d] via-[#09090d]/90 to-transparent z-20 pointer-events-none" />
              )}

              <div className="prose prose-invert prose-orange max-w-none text-sm sm:text-base leading-relaxed space-y-4
                prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-xl sm:prose-h1:text-2xl lg:prose-h1:text-3xl prose-h1:text-white prose-h1:border-b prose-h1:border-white/[0.08] prose-h1:pb-4 prose-h1:mt-0
                prose-h2:text-lg sm:prose-h2:text-xl prose-h2:text-fivem-orange prose-h2:mt-8 prose-h2:mb-3
                prose-h3:text-base prose-h3:text-amber-300 prose-h3:mt-5
                prose-p:text-white/70 prose-p:leading-relaxed
                prose-li:text-white/70 prose-li:my-1.5
                prose-strong:text-white prose-strong:font-semibold
                prose-em:text-amber-200/90
                prose-a:text-fivem-orange prose-a:underline hover:prose-a:text-amber-400 prose-a:transition-colors
                prose-blockquote:border-l-2 prose-blockquote:border-fivem-orange/60 prose-blockquote:bg-white/[0.02] prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:text-white/80 prose-blockquote:not-italic
                prose-code:bg-white/[0.06] prose-code:text-amber-300 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs
                prose-table:border-collapse prose-table:w-full
                prose-th:border prose-th:border-white/10 prose-th:bg-white/[0.03] prose-th:p-3 prose-th:text-white prose-th:font-display
                prose-td:border prose-td:border-white/[0.06] prose-td:p-3 prose-td:text-white/70
                prose-hr:border-white/[0.08] prose-hr:my-8"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rulesMarkdown}
                </ReactMarkdown>
              </div>
            </div>

            {/* Expand / Collapse toggle */}
            <div className="relative z-30 px-6 sm:px-8 pb-5 pt-1 flex justify-center">
              <motion.button
                type="button"
                onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/15 text-white/60 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer group"
              >
                {isRulesExpanded ? (
                  <>
                    <ChevronUp size={14} className="text-fivem-orange group-hover:text-orange-400 transition-colors" />
                    <span>Collapse Rules</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} className="text-fivem-orange group-hover:text-orange-400 transition-colors" />
                    <span>Read Full Rules</span>
                  </>
                )}
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10 px-6">
            <FileText size={48} className="text-white/[0.08] mb-4" />
            <h3 className="text-lg font-bold font-display text-white/50 mb-2">No Rules Published Yet</h3>
            <p className="text-white/30 max-w-sm text-sm">
              Contest administrators have not posted specific rules for this round yet.
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Footer ── */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-white/30 px-1">
        <div className="flex items-center gap-2">
          <Sparkles size={12} className="text-fivem-orange/60" />
          <span>Vital RP Official Photo Contest Governance</span>
        </div>
        <span>Updated dynamically by contest administration</span>
      </div>
    </section>
  );
}

export default ContestRulesSection;
