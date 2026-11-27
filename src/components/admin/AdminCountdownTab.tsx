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
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Timer,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CountdownSettings, CategorySuggestionsPageSettings } from '../../types';
import { CountdownClock } from '../ui/countdown-clock';
import { AdminHeader } from './AdminHeader';
import { useConfirm } from './confirm';
import { toast } from '../ui/toast';
import { Button as KitButton, Panel, Row, Segmented, fieldClass } from './kit';
import { AnimatedSwitch } from '../ui/animated-switch';
import { CategorySuggestionsSettingsModal } from './CategorySuggestionsSettingsModal';
import { setDynamicCategorySuggestionDeadline } from '../../config';
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

const SUGGESTION_LABEL_PRESETS = [
  'Submission & Voting Window',
  'Suggestions Close In',
  'Category Voting Closes In',
  'Proposals Closing In',
  'Theme Decisions Announced In',
  'Categories Locking In',
];

// Completion Message Quick Templates
const COMPLETED_MESSAGE_PRESETS = [
  'Official deadline has arrived. Submissions closed. Community voting underway.',
  'Community voting has concluded. Winners will be announced in the Hall of Fame shortly!',
  '🎉 The countdown has concluded! Stay tuned for official results and winner showcases.',
  '🏆 Contest concluded. Check the Hall of Fame for winning entries!',
];

const SUGGESTION_COMPLETED_PRESETS = [
  'Category Submissions Closed. Community voting has concluded and the final results are in.',
  'Suggestion window has expired. Staff is reviewing final rankings for the upcoming photo contest.',
  'Category suggestions have closed. Stay tuned for the official photo contest announcement.',
  'Voting has closed. The winning theme categories will be featured on the upcoming loading screen!',
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
  const confirm = useConfirm();
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
    'Official deadline has arrived. Submissions closed. Community voting underway.'
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

  // Timer target mode: 'contest' = Photo contest, 'suggestions' = Category suggestions
  const [timerTarget, setTimerTarget] = useState<'contest' | 'suggestions'>('contest');
  const [rawContestSettings, setRawContestSettings] = useState<CountdownSettings | null>(null);
  const [rawCategorySuggestionsSettings, setRawCategorySuggestionsSettings] = useState<CategorySuggestionsPageSettings | null>(null);
  const [isHeroCustomizerOpen, setIsHeroCustomizerOpen] = useState(false);

  const applyCountdownToState = useCallback((cs?: CountdownSettings | null, defaultLabel = 'Submissions Close In') => {
    if (!cs) return;
    if (typeof cs.enabled === 'boolean') setEnabled(cs.enabled);
    if (cs.mode) setMode(cs.mode);
    if (cs.timeZone) setTimeZone(cs.timeZone);
    if (cs.label) setLabel(cs.label);
    else setLabel(defaultLabel);
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
  }, []);

  // Subscribe to real-time global settings on Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      setLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cs: CountdownSettings | undefined = data?.countdownSettings;
        const suggSettings: CategorySuggestionsPageSettings | undefined = data?.categorySuggestionsSettings;

        if (cs) setRawContestSettings(cs);
        if (suggSettings) setRawCategorySuggestionsSettings(suggSettings);

        if (timerTarget === 'contest' && cs) {
          applyCountdownToState(cs, 'Submissions Close In');
        } else if (timerTarget === 'suggestions' && suggSettings?.countdownSettings) {
          applyCountdownToState(suggSettings.countdownSettings, 'Submission & Voting Window');
        }
      }
    }, (err) => {
      console.error('Error loading countdown settings from Firestore:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [timerTarget, applyCountdownToState]);

  const handleSwitchTimerTarget = (target: 'contest' | 'suggestions') => {
    setTimerTarget(target);
    setPreviewExpired(false);
    if (target === 'contest') {
      applyCountdownToState(rawContestSettings, 'Submissions Close In');
    } else {
      if (rawCategorySuggestionsSettings?.countdownSettings) {
        applyCountdownToState(rawCategorySuggestionsSettings.countdownSettings, 'Submission & Voting Window');
      } else {
        setLabel('Submission & Voting Window');
        setCompletedMessage('Category Submissions Closed. Community voting has concluded and the final results are in.');
      }
    }
  };

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
      toast.error('No submissions close date found on the currently active contest.');
      return;
    }
    try {
      const d = new Date(activeContest.submissions_close_date);
      setDatetimeLocal(toDatetimeLocalValue(d, timeZone));
      setLabel('Submissions Close In');
      setMode('submissions');
      setPreviewExpired(false);
    } catch {
      toast.error('Invalid submissions close date format in active contest.');
    }
  };

  // Import date from Active Contest Voting End Date
  const handleImportVotingEnd = () => {
    if (!activeContest?.voting_end_date) {
      toast.error('No voting end date found on the currently active contest.');
      return;
    }
    try {
      const d = new Date(activeContest.voting_end_date);
      setDatetimeLocal(toDatetimeLocalValue(d, timeZone));
      setLabel('Voting Closes In');
      setMode('voting');
      setPreviewExpired(false);
    } catch {
      toast.error('Invalid voting end date format in active contest.');
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
        label: label.trim() || (timerTarget === 'suggestions' ? 'Submission & Voting Window' : 'Submissions Close In'),
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

      if (timerTarget === 'suggestions') {
        const newSugSettings: CategorySuggestionsPageSettings = {
          ...rawCategorySuggestionsSettings,
          countdownSettings: newSettings,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'settings', 'global'), {
          categorySuggestionsSettings: newSugSettings,
        }, { merge: true });

        setDynamicCategorySuggestionDeadline(
          newSettings.targetDate,
          newSettings.eventDateLabel,
          newSettings.enabled
        );
      } else {
        // 1. Persist to settings/global for contest
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
    const ok = await confirm({
      title: 'Reset the countdown?',
      body: 'Custom dates and labels are replaced with the defaults for the current contest phase.',
      confirmLabel: 'Reset countdown',
      tone: 'danger',
    });
    if (!ok) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        countdownSettings: {
          enabled: true,
          mode: 'submissions',
          targetDate: activeContest?.submissions_close_date || '2026-08-28T17:59:00-04:00',
          label: 'Submissions Close In',
          autoGenerateLabels: true,
          completedMessage: 'Official deadline has arrived. Submissions closed. Community voting underway.',
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
    <div className="space-y-4">
      {/* ── HEADER ── */}
      <AdminHeader
        title="Countdown"
        subtitle={!enabled ? 'Hidden on the public site.' : timeRemaining.isPast ? 'The target time has passed.' : `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m remaining.`}
        actions={
          <KitButton variant="ghost" onClick={handleResetDefaults} disabled={saving} title="Reset the countdown to the contest phase defaults">
            <RotateCcw size={14} aria-hidden="true" /> Reset Defaults
          </KitButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Which countdown"
          value={timerTarget}
          onChange={(v) => handleSwitchTimerTarget(v)}
          options={[
            { value: 'contest', label: 'Photo contest' },
            { value: 'suggestions', label: 'Category suggestions' },
          ]}
        />
        {timerTarget === 'suggestions' && (
          <KitButton size="sm" onClick={() => setIsHeroCustomizerOpen(true)}>
            <Sliders size={13} aria-hidden="true" /> Edit month title and theme
          </KitButton>
        )}
      </div>

      {/* ── ERROR & SUCCESS NOTIFICATIONS ── */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3"
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
            className="p-4 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Countdown Published:</span> Real-time Firestore sync complete. All site visitors will now see the new target date and countdown!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel
        title="Preview"
        description="As visitors see it."
        actions={
          <KitButton size="sm" aria-pressed={previewExpired} onClick={() => setPreviewExpired(!previewExpired)}>
            {previewExpired ? 'Show running clock' : 'Show finished message'}
          </KitButton>
        }
      >
      <div className="p-4">

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

      </div>
      </Panel>

      {/* ── SECTION 1: VISIBILITY & SOURCE ── */}
      <Panel>
        <Row
          label="Show on the public site"
          description={enabled ? 'The flip clock appears in the homepage banner.' : 'The flip clock is hidden from visitors.'}
        >
          <AnimatedSwitch
            ariaLabel="Show the countdown on the public site"
            checked={enabled}
            onCheckedChange={setEnabled}
            size="md"
          />
        </Row>

        <div role="radiogroup" aria-label="Countdown source" className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-3">
          {([
            { id: 'custom', label: 'Custom deadline', help: 'Pick any date and time below.', choose: () => { setMode('custom'); setPreviewExpired(false); } },
            { id: 'submissions', label: 'Submissions close', help: "Follow the active contest's submission deadline.", choose: handleImportSubmissionsClose },
            { id: 'voting', label: 'Voting closes', help: "Follow the active contest's voting deadline.", choose: handleImportVotingEnd },
          ] as const).map((source) => (
            <button
              key={source.id}
              type="button"
              data-radio-card
              role="radio"
              aria-checked={mode === source.id}
              onClick={source.choose}
              className="p-3 text-left"
            >
              <span className="block text-sm font-semibold text-white">{source.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-white/60">{source.help}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* ── SECTION 2: TARGET DATE, TIMEZONE & QUICK PRESETS ── */}
      <Panel title="Target time">
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/70">Date and time</span>
            <input
              type="datetime-local"
              value={datetimeLocal}
              onChange={(e) => {
                setDatetimeLocal(e.target.value);
                setPreviewExpired(false);
              }}
              className={cn(fieldClass, 'w-full tabular-nums [color-scheme:dark]')}
            />
            <span className="block text-xs text-white/55">Read in the timezone beside it.</span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/70">Timezone</span>
            <select
              value={timeZone}
              onChange={(e) => {
                setTimeZone(e.target.value);
                setPreviewExpired(false);
              }}
              className={cn(fieldClass, 'w-full cursor-pointer')}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <span className="block text-xs text-white/55">
              {getTimezoneOffsetForDate(datetimeLocal, timeZone)}, {TIMEZONE_OPTIONS.find(t => t.value === timeZone)?.description}
            </span>
          </label>
        </div>

        <div className="space-y-3 border-t border-white/[0.07] p-4">
          {([
            {
              title: 'From now',
              presets: [1, 3, 6, 12, 24, 48, 72, 168, 336].map((hours) => ({
                label: hours < 24 ? `+${hours} ${hours === 1 ? 'hour' : 'hours'}` : hours < 168 ? `+${hours / 24} ${hours === 24 ? 'day' : 'days'}` : `+${hours / 168} ${hours === 168 ? 'week' : 'weeks'}`,
                apply: () => handleAddDuration(hours),
              })),
            },
            {
              title: 'Jump to',
              presets: [
                { label: 'Next Friday, 5:59 PM', apply: handleSetThisFriday },
                { label: 'Next Sunday, 11:59 PM', apply: handleSetThisSunday },
                { label: 'End of month, 11:59 PM', apply: handleSetEndOfMonth },
              ],
            },
          ]).map((group) => (
            <div key={group.title} role="group" aria-label={group.title} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <span className="w-20 shrink-0 text-xs font-semibold text-white/70 sm:pt-2">{group.title}</span>
              <div className="flex flex-wrap gap-2">
                {group.presets.map((preset) => (
                  <KitButton key={preset.label} size="sm" onClick={preset.apply}>
                    {preset.label}
                  </KitButton>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── SECTION 4: LABELS, HEADERS & FINISHED MESSAGES ── */}
      <Panel title="Clock text">
        <div className="grid gap-5 p-4 md:grid-cols-2">
          {/* Header Badge Label */}
          <div className="space-y-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/70">Heading above the clock</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Submissions Close In"
                className={cn(fieldClass, 'w-full')}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_PRESETS.map((lp) => (
                <button
                  key={lp}
                  type="button"
                  data-choice
                  aria-pressed={label === lp}
                  onClick={() => setLabel(lp)}
                  className="cursor-pointer px-2.5 py-1 text-xs font-medium"
                >
                  {lp}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Format vs Manual Sub-Labels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/70">Date and time line</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-white/60" aria-hidden="true">Auto-Compute</span>
                <AnimatedSwitch
                  checked={autoGenerateLabels}
                  onCheckedChange={setAutoGenerateLabels}
                  ariaLabel="Compute date and time labels automatically"
                  size="sm"
                />
              </span>
            </div>

            {autoGenerateLabels ? (
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-sm font-semibold text-white">{effectiveEventDateLabel || 'Loading'}</p>
                <p className="text-xs tabular-nums text-white/60">{effectiveEventTimeLabel} {effectiveEventTzLabel}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  aria-label="Date line"
                  value={customDateLabel}
                  onChange={(e) => setCustomDateLabel(e.target.value)}
                  placeholder="Date, e.g. FRIDAY, OCTOBER 31, 2026"
                  className={cn(fieldClass, 'w-full')}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    aria-label="Time line"
                    value={customTimeLabel}
                    onChange={(e) => setCustomTimeLabel(e.target.value)}
                    placeholder="Time, e.g. 5:59 PM"
                    className={cn(fieldClass, 'w-full min-w-0')}
                  />
                  <input
                    type="text"
                    aria-label="Timezone line"
                    value={customTzLabel}
                    onChange={(e) => setCustomTzLabel(e.target.value)}
                    placeholder="Zone, e.g. EST"
                    className={cn(fieldClass, 'w-full min-w-0')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completion Message Banner */}
        <div className="space-y-2 border-t border-white/[0.07] p-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/70">Message when the clock reaches zero</span>
            <textarea
              value={completedMessage}
              onChange={(e) => setCompletedMessage(e.target.value)}
              rows={2}
              placeholder="Shown once the countdown ends"
              className={cn(fieldClass, 'h-auto w-full py-2 leading-relaxed')}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMPLETED_MESSAGE_PRESETS.map((cmp, idx) => (
              <button
                key={idx}
                type="button"
                data-choice
                aria-pressed={completedMessage === cmp}
                onClick={() => setCompletedMessage(cmp)}
                className="max-w-xs cursor-pointer truncate px-2.5 py-1 text-left text-xs font-medium"
                title={cmp}
              >
                Template {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── SECTION 5: CONTEST LINKAGE & AUTOMATION OPTIONS ── */}
      {activeContest && (
        <Panel title="Also update the contest" description={`Writes this time into ${activeContest.name} when you save.`}>
          {([
            { id: 'submissions', label: 'Submissions close date', field: 'submissions_close_date', checked: syncToSubmissionsClose, set: setSyncToSubmissionsClose },
            { id: 'voting', label: 'Voting end date', field: 'voting_end_date', checked: syncToVotingEnd, set: setSyncToVotingEnd },
          ]).map((option) => (
            <label key={option.id} className="flex cursor-pointer items-start gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0 hover:bg-white/[0.03]">
              <input
                type="checkbox"
                checked={option.checked}
                onChange={(e) => option.set(e.target.checked)}
                className="pretty-check mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-white">{option.label}</span>
                <span className="block text-xs text-white/55">Sets <code className="text-white/75">{option.field}</code> on the contest.</span>
              </span>
            </label>
          ))}
        </Panel>
      )}

      {/* ── SAVE BAR: stays in view while editing ── */}
      <div className="sticky bottom-0 z-20 flex flex-col items-stretch gap-3 rounded-lg border border-white/15 bg-[#0c0c10] p-3 shadow-[0_-12px_24px_rgb(0_0_0/0.45)] sm:flex-row sm:items-center">
        <KitButton
          variant={saveSuccess ? 'success' : 'primary'}
          onClick={handleSaveSettings}
          disabled={saving || !targetIsoString}
        >
          {saving ? (
            <>
              <RefreshCw size={14} aria-hidden="true" className="animate-spin" /> Publishing
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 size={14} aria-hidden="true" /> Published
            </>
          ) : (
            <>
              <Save size={14} aria-hidden="true" /> Save & Publish Countdown
            </>
          )}
        </KitButton>
        <p className="hidden text-xs text-white/60 sm:block">Saving updates the public countdown straight away.</p>
      </div>

      {/* Hero & Month Customizer Modal */}
      <CategorySuggestionsSettingsModal
        isOpen={isHeroCustomizerOpen}
        onClose={() => setIsHeroCustomizerOpen(false)}
      />
    </div>
  );
}

export default AdminCountdownTab;
