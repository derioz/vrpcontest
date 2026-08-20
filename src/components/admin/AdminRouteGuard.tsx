"use client";

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Lock, LogIn } from 'lucide-react';

interface AdminRouteGuardProps {
  user: any;
  onNavigateHome: () => void;
  onOpenSignIn: () => void;
}

export function AdminRouteGuard({ user, onNavigateHome, onOpenSignIn }: AdminRouteGuardProps) {
  return (
    <div className="min-h-screen w-full bg-[#07070a] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-fivem-orange/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full rounded-3xl bg-[#0c0c14]/95 border border-white/10 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center"
      >
        {/* Brand Banner */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src="https://r2.fivemanage.com/image/qePVNvTsc65p.png"
            alt="Vital RP Logo"
            className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(234,88,12,0.4)]"
          />
          <div className="text-left">
            <span className="text-sm font-black font-display text-white tracking-wide block uppercase">
              Vital RP Contest
            </span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">
              Staff Portal
            </span>
          </div>
        </div>

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={32} />
        </div>

        {/* Title & Description */}
        <h1 className="text-xl font-black font-display text-white mb-2">
          Staff Access Required
        </h1>
        <p className="text-xs text-white/60 leading-relaxed mb-6">
          The Vital RP Admin Dashboard is strictly restricted to verified contest administrators and staff members.
        </p>

        {/* User identification info */}
        {user ? (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left mb-6 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Signed In As</span>
              <span className="text-white font-bold">{user.displayName || 'User'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40">Discord ID</span>
              <span className="text-fivem-orange select-all truncate max-w-[180px]">{user.discordId || 'None'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/40">Staff Status</span>
              <span className="text-red-400 font-bold uppercase">Unauthorized</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center mb-6">
            <p className="text-xs text-white/50">
              You are not currently signed in. Sign in with an authorized Discord staff account to proceed.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Return to Site</span>
          </button>

          {!user && (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(234,88,12,0.4)] active:scale-95"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AdminRouteGuard;
