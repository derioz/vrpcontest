"use client";

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Lock, LogIn } from 'lucide-react';
import { VITAL_RP_LOGO_URL } from '../../config';

interface AdminRouteGuardProps {
  user: any;
  onNavigateHome: () => void;
  onOpenSignIn: () => void;
}

export function AdminRouteGuard({ user, onNavigateHome, onOpenSignIn }: AdminRouteGuardProps) {
  return (
    <div className="min-h-screen w-full bg-[#07070a] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background glows */}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full rounded-lg bg-[#0c0c14]/95 border border-white/10 p-6 sm:p-8 text-center"
      >
        {/* Brand Banner */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={VITAL_RP_LOGO_URL}
            alt="Vital RP Logo"
            className="w-10 h-10 rounded-md object-contain"
          />
          <div className="text-left">
            <span className="text-sm font-bold font-display text-white tracking-wide block">
              Vital RP Contest
            </span>
            <span className="text-xs tabular-nums text-white/55   block">
              Staff Portal
            </span>
          </div>
        </div>

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={32} />
        </div>

        {/* Title & Description */}
        <h1 className="text-xl font-bold font-display text-white mb-2">
          Staff Access Required
        </h1>
        <p className="text-xs text-white/60 leading-relaxed mb-6">
          The Vital RP Admin Dashboard is strictly restricted to verified contest administrators and staff members.
        </p>

        {/* User identification info */}
        {user ? (
          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-left mb-6 space-y-1.5 tabular-nums">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/55">Signed In As</span>
              <span className="text-white font-bold">{user.displayName || 'User'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/55">Discord ID</span>
              <span className="text-fivem-orange select-all truncate max-w-[180px]">{user.discordId || 'None'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/55">Staff Status</span>
              <span className="text-red-400 font-bold">Unauthorized</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-center mb-6">
            <p className="text-xs text-white/50">
              You are not currently signed in. Sign in with an authorized Discord staff account to proceed.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button data-btn="secondary"
            type="button"
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 rounded-md bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Site</span>
          </button>

          {!user && (
            <button data-btn="primary"
              type="button"
              onClick={onOpenSignIn}
              className="w-full py-2.5 px-4 rounded-md bg-fivem-orange text-white text-xs font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
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
