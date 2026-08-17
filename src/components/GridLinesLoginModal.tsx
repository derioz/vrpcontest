/**
 * Aceternity UI — Simple Login With Grid Lines
 * Documentation Reference: https://ui.aceternity.com/blocks/login-and-signup-sections/simple-login-with-grid-lines
 *
 * Re-engineered for Vital RP Photo Contest platform featuring signature grid lines,
 * corner intersection crosses (+), subtle linear grid pattern, glowing Vital RP heraldry,
 * and high-impact Discord OAuth2 authentication.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shield, CheckCircle2, X, ArrowRight, Loader2 } from 'lucide-react';
import { Dialog, DialogPortal, DialogOverlay } from './ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../lib/utils';
import { BorderBeam } from './ui/border-beam';

interface GridLinesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscordLogin: () => any;
}

export function GridLinesLoginModal({
  isOpen,
  onClose,
  onDiscordLogin,
}: GridLinesLoginModalProps) {
  const [loading, setLoading] = useState(false);

  const handleLoginClick = async () => {
    try {
      setLoading(true);
      await onDiscordLogin();
    } catch (err) {
      console.error('Discord login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/85 backdrop-blur-md" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[160] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300"
        >
          {/* ── Aceternity Grid Lines Container ── */}
          <div className="relative mx-auto w-full rounded-2xl bg-[#09090d] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden">
            {/* Subtle Inner Border Beam Accent */}
            <BorderBeam size={180} duration={12} colorFrom="#ea580c" colorTo="#5865F2" borderWidth={1.5} />

            {/* Corner Cross / Plus Markers (+) */}
            <span className="absolute -top-1.5 -left-1.5 z-20 font-mono text-[11px] text-white/30 select-none leading-none">+</span>
            <span className="absolute -top-1.5 -right-1.5 z-20 font-mono text-[11px] text-white/30 select-none leading-none">+</span>
            <span className="absolute -bottom-1.5 -left-1.5 z-20 font-mono text-[11px] text-white/30 select-none leading-none">+</span>
            <span className="absolute -bottom-1.5 -right-1.5 z-20 font-mono text-[11px] text-white/30 select-none leading-none">+</span>

            {/* Midpoint Grid Intersections */}
            <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-20 font-mono text-[10px] text-white/20 select-none leading-none">+</span>
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-20 font-mono text-[10px] text-white/20 select-none leading-none">+</span>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] text-white/20 select-none leading-none">+</span>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] text-white/20 select-none leading-none">+</span>

            {/* Background Linear Grid Pattern */}
            <div
              className="absolute inset-0 z-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
                maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 40%, transparent 95%)',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 40%, transparent 95%)',
              }}
            />

            {/* Ambient Radial Auras */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-fivem-orange/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none z-0" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-32 bg-gradient-to-t from-[#5865F2]/15 via-purple-500/5 to-transparent blur-3xl pointer-events-none z-0" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-3.5 top-3.5 z-30 p-2 rounded-full bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>

            {/* ── Content Stage ── */}
            <div className="relative z-10 flex flex-col items-center text-center">
              
              {/* Vital RP Logo with Starlight Halo */}
              <div className="relative mb-5 group">
                <div className="absolute -inset-2 bg-gradient-to-r from-fivem-orange/40 via-amber-400/30 to-[#5865F2]/30 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-white/[0.12] to-white/[0.02] border border-white/20 p-2.5 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                  <img
                    src="https://r2.fivemanage.com/image/be70Qnvx8DT5.png"
                    alt="Vital RP Logo"
                    className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(234,88,12,0.8)] transform transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </div>

              {/* Title & Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-fivem-orange/30 bg-fivem-orange/10 backdrop-blur-md mb-2.5 text-[10px] font-mono font-bold text-fivem-orange uppercase tracking-widest">
                <Sparkles size={11} className="text-fivem-orange animate-pulse" />
                <span>Community Sign In</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mb-2">
                Welcome to <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">Vital RP</span>
              </h2>

              <p className="text-xs sm:text-sm text-white/55 leading-relaxed max-w-xs mb-7 font-normal">
                Connect your Discord account to submit contest photography, vote for co-champions, and earn custom victory heraldry.
              </p>

              {/* High-Impact Discord Sign In Button */}
              <button
                type="button"
                onClick={handleLoginClick}
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#5865F2] via-[#4752C4] to-[#5865F2] hover:from-[#6773FF] hover:via-[#5865F2] hover:to-[#4752C4] text-white font-bold p-[1px] transition-all duration-300 shadow-[0_4px_24px_rgba(88,101,242,0.35)] hover:shadow-[0_0_35px_rgba(88,101,242,0.6)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {/* Shimmer Sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                <div className="relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-[11px] bg-gradient-to-b from-white/15 via-transparent to-black/20 backdrop-blur-sm">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-white" />
                      <span className="text-sm uppercase tracking-wider font-extrabold font-display">Connecting to Discord...</span>
                    </>
                  ) : (
                    <>
                      {/* Official Discord SVG */}
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        className="w-5 h-5 fill-white shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-110"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                      </svg>
                      <span className="text-sm uppercase tracking-wider font-black font-display text-white">
                        Continue with Discord
                      </span>
                      <ArrowRight size={15} className="text-white/70 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>

              {/* Security & Verification Benefits Checklist */}
              <div className="mt-6 pt-5 w-full border-t border-white/[0.08] grid grid-cols-1 gap-2 text-left">
                <div className="flex items-center gap-2.5 text-[11px] text-white/60">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Automatic Vital RP Discord membership verification</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-white/60">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Instant 1-click OAuth2 session — no password required</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-white/60">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <span>Cast verified community votes & track winner rankings</span>
                </div>
              </div>

              {/* Footer Trust Marker */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono text-white/30 uppercase tracking-widest">
                <Shield size={11} className="text-fivem-orange/70" />
                <span>Encrypted OAuth2 Protocol</span>
              </div>

            </div>

          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export default GridLinesLoginModal;
