import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ExternalLink, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DiscordRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  reason?: 'not_in_server' | 'missing_role' | 'api_error' | null;
  message?: string | null;
}

export function DiscordRequirementsModal({
  isOpen,
  onClose,
  onRetry,
  reason,
  message,
}: DiscordRequirementsModalProps) {
  if (!isOpen) return null;

  const discordInviteUrl = import.meta.env.VITE_DISCORD_INVITE_URL || 'https://discord.gg/vitalrp';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-red-500/30 bg-[#0d0d0d] shadow-[0_0_50px_rgba(239,68,68,0.2)] text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 blur-[80px] rounded-full pointer-events-none" />

          {/* Fixed Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 pb-2 shrink-0 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert size={24} />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Body with dedicated clearance */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-6 pt-2 custom-scrollbar relative z-10">
            {/* Title */}
            <h3 className="text-xl font-black font-display text-white mb-2 leading-tight">
              Vital RP Access Required
            </h3>

            {/* Message Description */}
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              {message || "You must be a member of Vital RP Discord and possess the Whitelist Approved role to participate and vote in this contest."}
            </p>

          {/* Verification Requirements Checklist */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-6">
            <div className="flex items-center gap-3">
              {reason === 'not_in_server' ? (
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              )}
              <span className={`text-xs font-semibold ${reason === 'not_in_server' ? 'text-red-400 font-bold' : 'text-white/80'}`}>
                Member of Vital RP Discord
              </span>
            </div>

            <div className="flex items-center gap-3">
              {reason === 'missing_role' ? (
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
              ) : reason === 'not_in_server' ? (
                <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              )}
              <span className={`text-xs font-semibold ${reason === 'missing_role' ? 'text-red-400 font-bold' : 'text-white/80'}`}>
                "Whitelist Approved" Role Assigned
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-fivem-orange hover:bg-fivem-orange/90 text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] cursor-pointer text-center"
            >
              Join Vital RP Discord
              <ExternalLink size={14} />
            </a>

            <button
              onClick={onRetry}
              className="py-3 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
