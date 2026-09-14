/**
 * AdminCountdownTab.tsx
 * Robust, feature-rich countdown timer manager for the Vital RP Photo Contest platform.
 * Allows administrators to schedule custom future target dates and times,
 * select timezones (Eastern EDT/EST, Central, Mountain, Pacific, UTC),
 * jump quickly via duration presets (+1h, +12h, +24h, +1w, End of Month),
 * preview the mechanical flip clock live in real time,
 * and link/sync directly with active contest submission and voting deadlines.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Calendar,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Timer,
  ChevronRight,
  Flame,
  ShieldAlert,
  Volume2,
  RefreshCw,
  Sliders,
  Settings2,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Radio,
  CalendarClock,
  CheckCircle2,
  Copy,
  Info,
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CountdownSettings } from '../../types';
import { CountdownClock } from '../ui/countdown-clock';
import { AdminHeader } from './AdminHeader';
import { AnimatedSwitch } from '../ui/animated-switch';
import { ShimmerButton } from '../ui/shimmer-button';
import { cn } from '../../lib/utils';

export interface AdminCountdownTabProps {
  activeContest?: {
    id: string;
    name: string;
    submissions_close_date?: string;
    voting_end_date?: string;
  } | null;
  initialSettings?: CountdownSettings | null;
  onSettingsSaved?: (newSettings: CountdownSettings) => void;
}

// Predefined Timezone Configurations
interface TimezoneOption {
  value: string;
  label: string;
  code: string;
  description: string;
}

const TIMEZONE_OPTIONS: TimezoneOption[] = [
  {
    value: 'America/New_York',
    label: 'Eastern Time (ET / America/New_York)',
    code: 'EST',
    description: 'Vital RP Standard Time (UTC-4 EDT / UTC-5 EST)',
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (CT / America/Chicago)',
    code: 'CST',
    description: 'Central Daylight/Standard Time (UTC-5 / UTC-6)',
  },
  {
    value: 'America/Denver',
    label: 'Mountain Time (MT / America/Denver)',
    code: 'MST',
    description: 'Mountain Daylight/Standard Time (UTC-6 / UTC-7)',
  },
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (PT / America/Los_Angeles)',
    code: 'PST',
    description: 'Pacific Daylight/Standard Time (UTC-7 / UTC-8)',
  },
  {
    value: 'UTC',
    label: 'UTC (Universal Coordinated Time)',
    code: 'UTC',
    description: 'Coordinated Universal Time (Zero Offset)',
  },
];

// Header Label Quick Templates
const LABEL_PRESETS = [
  'Submissions Close In',
  'Voting Begins In',
  'Voting Closes In',
  'Winners Announced In',
  'Next Contest Starts In',
  'Grand Finale In',
];

// Completion Message Quick Templates
const COMPLETED_MESSAGE_PRESETS = [
  '⚠️ Official deadline has arrived. Submissions closed. Community voting underway.',
  '⚠️ Community voting has concluded. Winners will be announced in the Hall of Fame shortly!',
  '🎉 The countdown has concluded! Stay tuned for official results and winner showcases.',
  '🏆 Contest concluded. Check the Hall of Fame for winning entries!',
];

/**
 * Converts a Date to YYYY-MM-DDTHH:mm string in the given timezone for <input type="datetime-local">
 */
function toDatetimeLocalValue(date: Date, timeZone: string): string {
  try {
    const formatted = date.toLocaleString('sv-SE', { timeZone }).replace(' ', 'T').slice(0, 16);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {}
  // Fallback to local
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Calculates timezone offset string (e.g., "-04:00") for a specific date & timezone
 */
function getTimezoneOffsetForDate(dateStr: string, timeZone: string): string {
  try {
    const baseDate = new Date(dateStr.length === 16 ? `${dateStr}:00Z` : dateStr);
    const tzMatch = baseDate.toLocaleString('en-US', { timeZone, timeZoneName: 'longOffset' }).match(/GMT([+-]\d{2}):?(\d{2})?/);
    if (tzMatch) {
      const hours = tzMatch[1];
      const mins = tzMatch[2] || '00';
      return `${hours}:${mins}`;
    }
  } catch {}
  return '-04:00'; // Default to Eastern Time
}

/**
 * Automatically computes human-friendly labels from an ISO target date and timezone
 */
function computeAutoLabels(isoString: string, timeZone: string) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;

    const dateLabel = d.toLocaleDateString('en-US', {
      timeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();

    const timeLabel = d.toLocaleTimeString('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const tzShortMatch = d.toLocaleTimeString('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).split(' ');
    const tzShort = tzShortMatch[tzShortMatch.length - 1] || 'EST';

    return {
      eventDateLabel: dateLabel,
      eventTimeLabel: timeLabel,
      eventTzLabel: tzShort,
    };
  } catch {
    return null;
  }
}

export function AdminCountdownTab({
  activeContest,
  initialSettings,
  onSettingsSaved,
}: AdminCountdownTabProps) {
  // Local form state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [mode, setMode] = useState<'custom' | 'submissions' | 'voting'>('custom');
  const [timeZone, setTimeZone] = useState<string>('America/New_York');
  const [datetimeLocal, setDatetimeLocal] = useState<string>(() => {
    // Default to this coming Friday 5:59 PM or initial setting
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return toDatetimeLocalValue(future, 'America/New_York');
  });

  const [label, setLabel] = useState<string>('Submissions Close In');
  const [autoGenerateLabels, setAutoGenerateLabels] = useState<boolean>(true);
  const [customDateLabel, setCustomDateLabel] = useState<string>('');
  const [customTimeLabel, setCustomTimeLabel] = useState<string>('');
  const [customTzLabel, setCustomTzLabel] = useState<string>('EST');
  const [completedMessage, setCompletedMessage] = useState<string>(
    '⚠️ Official deadline has arrived. Submissions closed. Community voting underway.'
  );

  // Contest sync flags
  const [syncToSubmissionsClose, setSyncToSubmissionsClose] = useState<boolean>(false);
  const [syncToVotingEnd, setSyncToVotingEnd] = useState<boolean>(false);
  const [autoCloseSubmissions, setAutoCloseSubmissions] = useState<boolean>(false);
  const [autoOpenVoting, setAutoOpenVoting] = useState<boolean>(false);

  // Status & loading indicators
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewExpired, setPreviewExpired] = useState<boolean>(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  // Subscribe to real-time global settings on Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      setLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cs: CountdownSettings | undefined = data?.countdownSettings;
        if (cs) {
          if (typeof cs.enabled === 'boolean') setEnabled(cs.enabled);
          if (cs.mode) setMode(cs.mode);
          if (cs.timeZone) setTimeZone(cs.timeZone);
          if (cs.label) setLabel(cs.label);
          if (typeof cs.autoGenerateLabels === 'boolean') setAutoGenerateLabels(cs.autoGenerateLabels);
          if (cs.eventDateLabel) setCustomDateLabel(cs.eventDateLabel);
          if (cs.eventTimeLabel) setCustomTimeLabel(cs.eventTimeLabel);
          if (cs.eventTzLabel) setCustomTzLabel(cs.eventTzLabel);
          if (cs.completedMessage) setCompletedMessage(cs.completedMessage);
          if (typeof cs.autoCloseSubmissions === 'boolean') setAutoCloseSubmissions(cs.autoCloseSubmissions);
          if (typeof cs.autoOpenVoting === 'boolean') setAutoOpenVoting(cs.autoOpenVoting);

          if (cs.targetDate) {
            try {
              const d = new Date(cs.targetDate);
              if (!isNaN(d.getTime())) {
                setDatetimeLocal(toDatetimeLocalValue(d, cs.timeZone || 'America/New_York'));
              }
            } catch {}
          }
        }
      }
    }, (err) => {
      console.error('Error loading countdown settings from Firestore:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 1-second wall clock tick for telemetry readout
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Construct target ISO-8601 string from datetimeLocal + timezone
  const targetIsoString = useMemo(() => {
    if (!datetimeLocal) return '';
    const offset = getTimezoneOffsetForDate(datetimeLocal, timeZone);
    return `${datetimeLocal}:00${offset}`;
  }, [datetimeLocal, timeZone]);

  // Target timestamp in epoch milliseconds
  const targetTimestampMs = useMemo(() => {
    if (!targetIsoString) return 0;
    const ms = new Date(targetIsoString).getTime();
    return isNaN(ms) ? 0 : ms;
  }, [targetIsoString]);

  // Computed Auto Labels
  const autoLabels = useMemo(() => {
    if (!targetIsoString) return null;
    return computeAutoLabels(targetIsoString, timeZone);
  }, [targetIsoString, timeZone]);

  // Effective labels for preview & live site
  const effectiveEventDateLabel = autoGenerateLabels
    ? autoLabels?.eventDateLabel || ''
    : customDateLabel || autoLabels?.eventDateLabel || '';

  const effectiveEventTimeLabel = autoGenerateLabels
    ? autoLabels?.eventTimeLabel || ''
    : customTimeLabel || autoLabels?.eventTimeLabel || '';

  const effectiveEventTzLabel = autoGenerateLabels
    ? autoLabels?.eventTzLabel || 'EST'
    : customTzLabel || 'EST';

  // Real-time breakdown calculation for telemetry strip
  const timeRemaining = useMemo(() => {
    const diff = Math.max(0, targetTimestampMs - currentTimeMs);
    const isPast = targetTimestampMs > 0 && targetTimestampMs <= currentTimeMs;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
      isPast,
    };
  }, [targetTimestampMs, currentTimeMs]);

  // Quick Duration Jumper: set target relative to current time
  const handleAddDuration = (hoursToAdd: number) => {
    const now = new Date();
    const target = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
    setPreviewExpired(false);
  };

  // Quick Preset: This Sunday at 11:59 PM
  const handleSetThisSunday = () => {
    const now = new Date();
    const day = now.getDay();
    // Days until Sunday: 0 is Sunday, so if today is Sunday, add 7 days or use today
    const diff = (7 - day) % 7;
    const target = new Date(now);
    target.setDate(now.getDate() + (diff === 0 ? 7 : diff));
    target.setHours(23, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
    setPreviewExpired(false);
  };

  // Quick Preset: This Friday at 5:59 PM
  const handleSetThisFriday = () => {
    const now = new Date();
    const day = now.getDay();
    // Days until Friday (5)
    let diff = (5 - day) % 7;
    if (diff <= 0) diff += 7;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    target.setHours(17, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
    setPreviewExpired(false);
  };

  // Quick Preset: End of Current Month
  const handleSetEndOfMonth = () => {
    const now = new Date();
    // Day 0 of next month is the last day of current month
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
    setPreviewExpired(false);
  };

  // Import date from Active Contest Submissions Close Date
  const handleImportSubmissionsClose = () => {
    if (!activeContest?.submissions_close_date) {
      alert('No submissions close date found on the currently active contest.');
      return;
    }
    try {
      const d = new Date(activeContest.submissions_close_date);
      setDatetimeLocal(toDatetimeLocalValue(d, timeZone));
      setLabel('Submissions Close In');
      setMode('submissions');
      setPreviewExpired(false);
    } catch {
      alert('Invalid submissions close date format in active contest.');
    }
  };

  // Import date from Active Contest Voting End Date
  const handleImportVotingEnd = () => {
    if (!activeContest?.voting_end_date) {
      alert('No voting end date found on the currently active contest.');
      return;
    }
    try {
      const d = new Date(activeContest.voting_end_date);
      setDatetimeLocal(toDatetimeLocalValue(d, timeZone));
      setLabel('Voting Closes In');
      setMode('voting');
      setPreviewExpired(false);
    } catch {
      alert('Invalid voting end date format in active contest.');
    }
  };

  // Save & Publish to Firestore
  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const newSettings: CountdownSettings = {
        enabled,
        mode,
        targetDate: targetIsoString,
        label: label.trim() || 'Submissions Close In',
        eventDateLabel: effectiveEventDateLabel,
        eventTimeLabel: effectiveEventTimeLabel,
        eventTzLabel: effectiveEventTzLabel,
        completedMessage: completedMessage.trim(),
        autoGenerateLabels,
        autoCloseSubmissions,
        autoOpenVoting,
        timeZone,
        updatedAt: new Date().toISOString(),
      };

      // 1. Persist to settings/global
      await setDoc(doc(db, 'settings', 'global'), {
        countdownSettings: newSettings,
      }, { merge: true });

      // 2. Optionally sync active contest fields if chosen
      if (activeContest?.id) {
        const contestUpdates: Record<string, any> = {};
        if (syncToSubmissionsClose) {
          contestUpdates.submissions_close_date = targetIsoString;
        }
        if (syncToVotingEnd) {
          contestUpdates.voting_end_date = targetIsoString;
        }
        if (Object.keys(contestUpdates).length > 0) {
          await updateDoc(doc(db, 'contests', activeContest.id), contestUpdates);
        }
      }

      if (onSettingsSaved) {
        onSettingsSaved(newSettings);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save countdown settings:', err);
      setErrorMessage(err.message || 'Failed to save countdown settings. Please check Firestore permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Revert back to Contest Phase Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset countdown timer to automatic contest-phase defaults? This will remove custom date overrides.')) {
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        countdownSettings: {
          enabled: true,
          mode: 'submissions',
          targetDate: activeContest?.submissions_close_date || '2026-08-28T17:59:00-04:00',
          label: 'Submissions Close In',
          autoGenerateLabels: true,
          completedMessage: '⚠️ Official deadline has arrived. Submissions closed. Community voting underway.',
          timeZone: 'America/New_York',
          updatedAt: new Date().toISOString(),
        },
      }, { merge: true });

      setEnabled(true);
      setMode('submissions');
      setLabel('Submissions Close In');
      setAutoGenerateLabels(true);
      if (activeContest?.submissions_close_date) {
        setDatetimeLocal(toDatetimeLocalValue(new Date(activeContest.submissions_close_date), 'America/New_York'));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  // Target preview date for CountdownClock component
  const previewTargetDate = previewExpired
    ? new Date(Date.now() - 1000).toISOString()
    : targetIsoString;

  return (
    <div className="space-y-8">
      {/* ── HEADER ── */}
      <AdminHeader
        badge="PRECISION SCHEDULER"
        badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        title="Countdown Timer & Target Schedule"
        subtitle="Set a custom future deadline for the platform countdown flip clock, choose timezones, quick-schedule duration presets, and preview in real time."
        icon={<Clock size={20} className="text-emerald-400" />}
        iconBg="bg-emerald-500/15 border-emerald-500/30"
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-mono transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Reset countdown clock to contest phase defaults"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving || !targetIsoString}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95",
                saveSuccess
                  ? "bg-emerald-500 text-black shadow-emerald-500/30"
                  : "bg-fivem-orange hover:bg-orange-500 text-white shadow-fivem-orange/30 hover:shadow-fivem-orange/50",
                saving && "opacity-60 cursor-wait"
              )}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Published to Live!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save & Publish Countdown</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* ── ERROR & SUCCESS NOTIFICATIONS ── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3"
          >
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error saving settings:</span> {errorMessage}
            </div>
          </motion.div>
        )}

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 shadow-lg shadow-emerald-950/40"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Countdown Published:</span> Real-time Firestore sync complete. All site visitors will now see the new target date and countdown!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIVE TELEMETRY STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <span className={cn(
            "w-3 h-3 rounded-full shrink-0",
            !enabled ? "bg-zinc-600" : timeRemaining.isPast ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"
          )} />
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Status</p>
            <p className="text-xs font-bold font-display text-white truncate">
              {!enabled ? "HIDDEN / DISABLED" : timeRemaining.isPast ? "EXPIRED / ZERO" : "ACTIVE & TICKING"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <Timer size={16} className="text-fivem-orange shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Time Remaining</p>
            <p className="text-xs font-mono font-bold text-fivem-orange truncate">
              {timeRemaining.isPast
                ? "00D 00H 00M 00S"
                : `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <Calendar size={16} className="text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Target Date</p>
            <p className="text-xs font-mono font-bold text-cyan-300 truncate">
              {effectiveEventDateLabel || 'Not configured'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
          <Clock size={16} className="text-purple-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40">Target Time</p>
            <p className="text-xs font-mono font-bold text-purple-300 truncate">
              {effectiveEventTimeLabel ? `${effectiveEventTimeLabel} ${effectiveEventTzLabel}` : 'Not configured'}
            </p>
          </div>
        </div>
      </div>

      {/* ── LIVE MECHANICAL FLIP CLOCK PREVIEW STAGE ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e15] to-[#08080c] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-fivem-orange/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-fivem-orange/10 border border-fivem-orange/25 text-fivem-orange">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                  Hero Countdown Flip Clock — Live Preview
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-widest">
                  Live Interactive
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Exact mechanical sound effects, split-flap 3D cards, and layout as seen by public visitors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewExpired(!previewExpired)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer",
                previewExpired
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white"
              )}
            >
              {previewExpired ? "Simulating Expired Banner" : "Simulate Expired State"}
            </button>
          </div>
        </div>

        {/* Live Clock Component */}
        <div className="w-full flex justify-center py-4">
          <div className="w-full max-w-xl">
            <CountdownClock
              targetDate={previewTargetDate}
              label={label}
              eventDateLabel={effectiveEventDateLabel}
              eventTimeLabel={effectiveEventTimeLabel}
              eventTzLabel={effectiveEventTzLabel}
              completedMessage={completedMessage}
            />
          </div>
        </div>

        {/* Technical Timestamp Diagnostics Readout */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-2">
            <span className="text-white/30">Target ISO:</span>
            <code className="bg-black/60 px-2 py-1 rounded border border-white/10 text-emerald-400">
              {targetIsoString || 'None'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30">Epoch Timestamp:</span>
            <code className="bg-black/60 px-2 py-1 rounded border border-white/10 text-cyan-400">
              {targetTimestampMs || 0}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30">Timezone:</span>
            <span className="text-purple-300 font-bold">{timeZone}</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: MASTER CONTROLS & MODE SELECTOR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enable Hero Clock Toggle Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-fivem-orange">
                {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Hero Clock Visibility
                </h4>
                <p className="text-[11px] text-white/40">Toggle public display on the main page</p>
              </div>
            </div>
            <AnimatedSwitch
              checked={enabled}
              onCheckedChange={setEnabled}
              activeColor="from-emerald-500 to-teal-500"
              glowColor="rgba(16, 185, 129, 0.4)"
              size="md"
            />
          </div>
          <p className="text-xs text-white/60 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
            {enabled
              ? "🟢 The countdown flip clock is actively rendered on the homepage hero banner."
              : "⚪ The countdown flip clock is hidden from public view."}
          </p>
        </div>

        {/* Operating Target Mode Card */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Radio size={16} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Countdown Mode & Target Source
              </h4>
              <p className="text-[11px] text-white/40">Choose whether the deadline is custom or contest-linked</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setMode('custom');
                setPreviewExpired(false);
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer",
                mode === 'custom'
                  ? "bg-purple-500/15 border-purple-500/40 shadow-lg shadow-purple-950/30"
                  : "bg-white/[0.01] border-white/10 hover:border-white/20 text-white/60"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-bold", mode === 'custom' ? "text-purple-300" : "text-white")}>
                  Custom Deadline
                </span>
                {mode === 'custom' && <Check size={14} className="text-purple-400" />}
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                Set any arbitrary future date, hour, and minute via manual controls.
              </p>
            </button>

            <button
              type="button"
              onClick={handleImportSubmissionsClose}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer",
                mode === 'submissions'
                  ? "bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-950/30"
                  : "bg-white/[0.01] border-white/10 hover:border-white/20 text-white/60"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-bold", mode === 'submissions' ? "text-cyan-300" : "text-white")}>
                  Submissions Close
                </span>
                {mode === 'submissions' && <Check size={14} className="text-cyan-400" />}
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                Synchronize directly with active contest submissions deadline.
              </p>
            </button>

            <button
              type="button"
              onClick={handleImportVotingEnd}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer",
                mode === 'voting'
                  ? "bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-950/30"
                  : "bg-white/[0.01] border-white/10 hover:border-white/20 text-white/60"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-xs font-bold", mode === 'voting' ? "text-amber-300" : "text-white")}>
                  Voting Closes
                </span>
                {mode === 'voting' && <Check size={14} className="text-amber-400" />}
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                Synchronize directly with active contest community voting deadline.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: QUICK JUMP DURATION PRESETS ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap size={16} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Quick Duration Jumpers (1-Click Presets)
              </h4>
              <p className="text-[11px] text-white/40">
                Immediately schedule the countdown timer relative to the current moment
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80 uppercase">
            Offset from Now
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAddDuration(1)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            +1 Hour
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(3)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            +3 Hours
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(6)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            +6 Hours
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(12)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            +12 Hours
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(24)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            +24 Hours (Tomorrow)
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(48)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            +48 Hours (2 Days)
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(72)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            +3 Days
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(168)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-purple-500/20 text-white/80 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            +1 Week (7 Days)
          </button>
          <button
            type="button"
            onClick={() => handleAddDuration(336)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-purple-500/20 text-white/80 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            +2 Weeks (14 Days)
          </button>
          <button
            type="button"
            onClick={handleSetThisFriday}
            className="px-3.5 py-2 rounded-xl bg-fivem-orange/10 hover:bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            Next Friday (5:59 PM)
          </button>
          <button
            type="button"
            onClick={handleSetThisSunday}
            className="px-3.5 py-2 rounded-xl bg-fivem-orange/10 hover:bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            Next Sunday (11:59 PM)
          </button>
          <button
            type="button"
            onClick={handleSetEndOfMonth}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            End of Month (11:59 PM)
          </button>
        </div>
      </div>

      {/* ── SECTION 3: PRECISION DATE, TIME & TIMEZONE PICKER ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date & Time Input */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CalendarClock size={16} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Target Date & Time
              </h4>
              <p className="text-[11px] text-white/40">Select the exact target deadline</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
              Deadline Date & Time Picker
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={datetimeLocal}
                onChange={(e) => {
                  setDatetimeLocal(e.target.value);
                  setPreviewExpired(false);
                }}
                className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-fivem-orange transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
            <p className="text-[10px] text-white/40">
              Selected: <span className="text-emerald-400 font-mono font-bold">{datetimeLocal || 'None'}</span> (in {timeZone})
            </p>
          </div>
        </div>

        {/* Timezone Selector */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Settings2 size={16} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Target Timezone
              </h4>
              <p className="text-[11px] text-white/40">
                Determines offset and public display abbreviation
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
              Timezone Region
            </label>
            <select
              value={timeZone}
              onChange={(e) => {
                setTimeZone(e.target.value);
                setPreviewExpired(false);
              }}
              className="w-full px-4 py-3 bg-black/60 border border-white/15 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-fivem-orange transition-all cursor-pointer"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-zinc-900 text-white">
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-white/40">
              Offset: <span className="text-purple-300 font-mono font-bold">{getTimezoneOffsetForDate(datetimeLocal, timeZone)}</span> • Standard: <span className="text-white/70">{TIMEZONE_OPTIONS.find(t => t.value === timeZone)?.description}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: LABELS, HEADERS & FINISHED MESSAGES ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sliders size={16} />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Clock Labels, Header & Finished Banner
            </h4>
            <p className="text-[11px] text-white/40">
              Customize text badges, auto-formatted dates, and completion messages
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Header Badge Label */}
          <div className="space-y-3">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
              Header Badge Text (Above Clock)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Submissions Close In"
              className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-fivem-orange transition-all"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {LABEL_PRESETS.map((lp) => (
                <button
                  key={lp}
                  type="button"
                  onClick={() => setLabel(lp)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer",
                    label === lp
                      ? "bg-fivem-orange/20 border-fivem-orange/40 text-fivem-orange font-bold"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  )}
                >
                  {lp}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Format vs Manual Sub-Labels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                Date & Time Sub-Labels
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-mono">Auto-Compute:</span>
                <AnimatedSwitch
                  checked={autoGenerateLabels}
                  onCheckedChange={setAutoGenerateLabels}
                  activeColor="from-blue-500 to-indigo-600"
                  size="sm"
                />
              </div>
            </div>

            {autoGenerateLabels ? (
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1 text-xs">
                <p className="text-white/50 text-[10px] font-mono uppercase">Automatically Generated From Target:</p>
                <p className="text-white font-mono font-bold text-xs">{effectiveEventDateLabel || 'Loading...'}</p>
                <p className="text-emerald-400 font-mono text-xs">{effectiveEventTimeLabel} {effectiveEventTzLabel}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customDateLabel}
                  onChange={(e) => setCustomDateLabel(e.target.value)}
                  placeholder="Custom Date (e.g. FRIDAY, OCTOBER 31, 2026)"
                  className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-fivem-orange"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customTimeLabel}
                    onChange={(e) => setCustomTimeLabel(e.target.value)}
                    placeholder="Time (e.g. 5:59 PM)"
                    className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-fivem-orange"
                  />
                  <input
                    type="text"
                    value={customTzLabel}
                    onChange={(e) => setCustomTzLabel(e.target.value)}
                    placeholder="TZ (e.g. EST)"
                    className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-fivem-orange"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completion Message Banner */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
            Completed / Expired Message (Displays when clock reaches 00:00:00)
          </label>
          <textarea
            value={completedMessage}
            onChange={(e) => setCompletedMessage(e.target.value)}
            rows={2}
            placeholder="Banner message displayed when countdown expires..."
            className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white text-xs leading-relaxed focus:outline-none focus:border-fivem-orange transition-all"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COMPLETED_MESSAGE_PRESETS.map((cmp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCompletedMessage(cmp)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono border bg-white/5 border-white/10 text-white/60 hover:text-white transition-all cursor-pointer truncate max-w-xs text-left"
                title={cmp}
              >
                Template {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 5: CONTEST LINKAGE & AUTOMATION OPTIONS ── */}
      {activeContest && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Active Contest Synchronization: {activeContest.name}
              </h4>
              <p className="text-[11px] text-white/40">
                Optionally sync this custom target date into the active contest round document
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-black/30 hover:border-white/20 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={syncToSubmissionsClose}
                onChange={(e) => setSyncToSubmissionsClose(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-fivem-orange focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Sync Submissions Close Date</span>
                <span className="text-[11px] text-white/40 block mt-0.5">
                  Update <code className="text-cyan-400">submissions_close_date</code> on <code className="text-white/60">{activeContest.id}</code>
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-black/30 hover:border-white/20 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={syncToVotingEnd}
                onChange={(e) => setSyncToVotingEnd(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-fivem-orange focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Sync Voting End Date</span>
                <span className="text-[11px] text-white/40 block mt-0.5">
                  Update <code className="text-amber-400">voting_end_date</code> on <code className="text-white/60">{activeContest.id}</code>
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Info size={14} className="text-fivem-orange shrink-0" />
          <span>
            Changes to the countdown settings update immediately across all active client sessions via Firestore listeners.
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || !targetIsoString}
            className={cn(
              "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer active:scale-95",
              saveSuccess
                ? "bg-emerald-500 text-black shadow-emerald-500/40"
                : "bg-gradient-to-r from-fivem-orange to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white shadow-fivem-orange/30",
              saving && "opacity-60 cursor-wait"
            )}
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Publishing Changes...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={15} />
                <span>Published to Live!</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save & Publish Countdown</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminCountdownTab;
