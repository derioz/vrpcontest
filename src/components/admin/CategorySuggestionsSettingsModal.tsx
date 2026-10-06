/**
 * CategorySuggestionsSettingsModal.tsx
 * Admin modal allowing comprehensive customization of the Category Suggestions page:
 * 1. Hero Section: Title prefix, month highlight with gradient, title suffix, theme badge,
 *    description, guidelines, disclaimer, and 1-click monthly presets.
 * 2. Countdown Clock: Target date/time picker, timezone selector, quick duration jumpers,
 *    custom labels, completion message, and live mechanical/card countdown preview.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Clock,
  Calendar,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Timer,
  ChevronRight,
  Sliders,
  Settings2,
  CalendarClock,
  Eye,
  CheckCircle2,
  X,
  Type,
  AlignLeft,
  CalendarDays,
  ShieldAlert,
  Flame,
  Info
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CategorySuggestionsPageSettings, CountdownSettings } from '../../types';
import {
  setDynamicCategorySuggestionDeadline,
  CATEGORY_SUGGESTION_DEADLINE,
  CATEGORY_SUGGESTION_DEADLINE_LABEL
} from '../../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { AnimatedSwitch } from '../ui/animated-switch';
import { toast } from '../ui/toast';
import { cn } from '../../lib/utils';

export interface CategorySuggestionsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: CategorySuggestionsPageSettings) => void;
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

// Quick Month Presets
interface MonthPreset {
  key: string;
  shortLabel: string;
  monthName: string;
  highlight: string;
  badge: string;
  description: string;
  guideline: string;
  disclaimer: string;
}

const MONTH_PRESETS: MonthPreset[] = [
  {
    key: 'jan',
    shortLabel: 'Jan',
    monthName: 'January',
    highlight: 'January’s',
    badge: 'January Theme',
    description: 'Suggest and vote on photo contest categories for January’s Vital RP loading screen. Keep your ideas winter-themed, fresh-start, frosty, or celebratory for the new year.',
    guideline: 'Keep suggestions relevant to January and the winter season.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the January theme.'
  },
  {
    key: 'feb',
    shortLabel: 'Feb',
    monthName: 'February',
    highlight: 'February’s',
    badge: 'February Theme',
    description: 'Suggest and vote on photo contest categories for February’s Vital RP loading screen. Keep ideas tailored to romantic vibes, deep winter nights, and neon cityscapes.',
    guideline: 'Keep suggestions relevant to February and late winter.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the February theme.'
  },
  {
    key: 'mar',
    shortLabel: 'Mar',
    monthName: 'March',
    highlight: 'March’s',
    badge: 'March Theme',
    description: 'Suggest and vote on photo contest categories for March’s Vital RP loading screen. Think early spring thawing, rainy city lights, and emerging adventures across San Andreas.',
    guideline: 'Keep suggestions relevant to March and early spring.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the March theme.'
  },
  {
    key: 'apr',
    shortLabel: 'Apr',
    monthName: 'April',
    highlight: 'April’s',
    badge: 'April Theme',
    description: 'Suggest and vote on photo contest categories for April’s Vital RP loading screen. Keep your ideas spring-inspired, blooming nature, sunny days, or playful themes.',
    guideline: 'Keep suggestions relevant to April and mid-spring.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the April theme.'
  },
  {
    key: 'may',
    shortLabel: 'May',
    monthName: 'May',
    highlight: 'May’s',
    badge: 'May Theme',
    description: 'Suggest and vote on photo contest categories for May’s Vital RP loading screen. Think warm sunshine, outdoor meets, high-speed coastal cruising, and spring vibes.',
    guideline: 'Keep suggestions relevant to May.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the May theme.'
  },
  {
    key: 'jun',
    shortLabel: 'Jun',
    monthName: 'June',
    highlight: 'June’s',
    badge: 'June Theme',
    description: 'Suggest and vote on photo contest categories for June’s Vital RP loading screen. Kick off summer with beach sunsets, open-road getaways, and festival nightlife.',
    guideline: 'Keep suggestions relevant to June and kickoff to summer.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the June theme.'
  },
  {
    key: 'jul',
    shortLabel: 'Jul',
    monthName: 'July',
    highlight: 'July’s',
    badge: 'July Theme',
    description: 'Suggest and vote on photo contest categories for July’s Vital RP loading screen. Showcase peak summer heat, fireworks, off-road expeditions, and shoreline parties.',
    guideline: 'Keep suggestions relevant to July and peak summer.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the July theme.'
  },
  {
    key: 'aug',
    shortLabel: 'Aug',
    monthName: 'August',
    highlight: 'August’s',
    badge: 'August Theme',
    description: 'Suggest and vote on photo contest categories for August’s Vital RP loading screen. Golden hours, late summer heatwaves, desert runs, and rooftop views.',
    guideline: 'Keep suggestions relevant to August.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the August theme.'
  },
  {
    key: 'sep',
    shortLabel: 'Sep',
    monthName: 'September',
    highlight: 'September’s',
    badge: 'September Theme',
    description: 'Suggest and vote on photo contest categories for September’s Vital RP loading screen. Early autumn transitions, moody skies, back-to-business hustle, and mountain passes.',
    guideline: 'Keep suggestions relevant to September and early autumn.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the September theme.'
  },
  {
    key: 'oct',
    shortLabel: 'Oct',
    monthName: 'October',
    highlight: 'October’s',
    badge: 'October Theme',
    description: 'Suggest and vote on photo contest categories for October’s Vital RP loading screen. Keep your ideas seasonal, spooky, fall-inspired, Halloween-themed, or otherwise fitting for the month.',
    guideline: 'Keep suggestions relevant to October.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the October theme.'
  },
  {
    key: 'nov',
    shortLabel: 'Nov',
    monthName: 'November',
    highlight: 'November’s',
    badge: 'November Theme',
    description: 'Suggest and vote on photo contest categories for November’s Vital RP loading screen. Golden foliage, cozy autumn aesthetic, Thanksgiving gratitude, and misty forests.',
    guideline: 'Keep suggestions relevant to November and late autumn.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the November theme.'
  },
  {
    key: 'dec',
    shortLabel: 'Dec',
    monthName: 'December',
    highlight: 'December’s',
    badge: 'December Theme',
    description: 'Suggest and vote on photo contest categories for December’s Vital RP loading screen. Winter holidays, snowy peaks, cozy downtown holiday lights, and festive gatherings.',
    guideline: 'Keep suggestions relevant to December and the holiday season.',
    disclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the December theme.'
  }
];

// Header Label Quick Templates
const LABEL_PRESETS = [
  'Submission & Voting Window',
  'Suggestions Close In',
  'Category Voting Closes In',
  'Proposals Closing In',
  'Theme Decisions Announced In',
  'Categories Locking In',
];

// Completion Message Quick Templates
const COMPLETED_MESSAGE_PRESETS = [
  '⚠️ Category Submissions Closed. Community voting has ended and the final results are in.',
  '⚠️ Suggestion window has expired. Staff is reviewing final rankings for the upcoming photo contest.',
  '🎉 Category suggestions have concluded! Stay tuned for the official photo contest launch.',
  '🏆 Voting has closed. The top voted theme categories will be featured on the upcoming loading screen!',
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
  return '-04:00';
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
      month: 'short',
      day: 'numeric',
    });

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
      eventDateLabel: `${dateLabel} • ${timeLabel} ${tzShort}`,
      eventTimeLabel: timeLabel,
      eventTzLabel: tzShort,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_PAGE_SETTINGS: CategorySuggestionsPageSettings = {
  heroTitlePrefix: 'Help Shape',
  heroMonthHighlight: 'October’s',
  heroTitleSuffix: 'Loading Screen',
  heroThemeBadge: 'October Theme',
  heroDescription: 'Suggest and vote on photo contest categories for October’s Vital RP loading screen. Keep your ideas seasonal, spooky, fall-inspired, Halloween-themed, or otherwise fitting for the month.',
  heroGuideline: 'Keep suggestions relevant to October.',
  heroDisclaimer: 'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the October theme.',
  countdownSettings: {
    enabled: true,
    mode: 'custom',
    targetDate: '2026-10-15T23:59:59-04:00',
    label: 'Submission & Voting Window',
    eventDateLabel: 'Oct. 15 • Midnight EST',
    eventTimeLabel: '11:59 PM',
    eventTzLabel: 'EST',
    completedMessage: '⚠️ Category Submissions Closed. Community voting has ended and the final results are in.',
    autoGenerateLabels: true,
    timeZone: 'America/New_York',
  }
};

export function CategorySuggestionsSettingsModal({
  isOpen,
  onClose,
  onSettingsSaved
}: CategorySuggestionsSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'hero' | 'countdown'>('hero');

  // Hero Fields
  const [heroTitlePrefix, setHeroTitlePrefix] = useState('Help Shape');
  const [heroMonthHighlight, setHeroMonthHighlight] = useState('October’s');
  const [heroTitleSuffix, setHeroTitleSuffix] = useState('Loading Screen');
  const [heroThemeBadge, setHeroThemeBadge] = useState('October Theme');
  const [heroDescription, setHeroDescription] = useState(
    'Suggest and vote on photo contest categories for October’s Vital RP loading screen. Keep your ideas seasonal, spooky, fall-inspired, Halloween-themed, or otherwise fitting for the month.'
  );
  const [heroGuideline, setHeroGuideline] = useState('Keep suggestions relevant to October.');
  const [heroDisclaimer, setHeroDisclaimer] = useState(
    'Staff reserves the right to deny or remove suggestions that are inappropriate, off-topic, or do not fit the October theme.'
  );

  // Countdown Fields
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [timeZone, setTimeZone] = useState('America/New_York');
  const [datetimeLocal, setDatetimeLocal] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return toDatetimeLocalValue(d, 'America/New_York');
  });
  const [countdownLabel, setCountdownLabel] = useState('Submission & Voting Window');
  const [autoGenerateLabels, setAutoGenerateLabels] = useState(true);
  const [customDateLabel, setCustomDateLabel] = useState('Oct. 15 • Midnight EST');
  const [customTimeLabel, setCustomTimeLabel] = useState('11:59 PM');
  const [customTzLabel, setCustomTzLabel] = useState('EST');
  const [completedMessage, setCompletedMessage] = useState(
    '⚠️ Category Submissions Closed. Community voting has ended and the final results are in.'
  );

  // Loading & Saving States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  // Clock tick for live countdown preview
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current Firestore settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getDoc(doc(db, 'settings', 'global')).then((docSnap) => {
      if (!isMounted) return;
      setLoading(false);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const cs: CategorySuggestionsPageSettings | undefined = data?.categorySuggestionsSettings;
        if (cs) {
          if (cs.heroTitlePrefix !== undefined) setHeroTitlePrefix(cs.heroTitlePrefix);
          if (cs.heroMonthHighlight !== undefined) setHeroMonthHighlight(cs.heroMonthHighlight);
          if (cs.heroTitleSuffix !== undefined) setHeroTitleSuffix(cs.heroTitleSuffix);
          if (cs.heroThemeBadge !== undefined) setHeroThemeBadge(cs.heroThemeBadge);
          if (cs.heroDescription !== undefined) setHeroDescription(cs.heroDescription);
          if (cs.heroGuideline !== undefined) setHeroGuideline(cs.heroGuideline);
          if (cs.heroDisclaimer !== undefined) setHeroDisclaimer(cs.heroDisclaimer);

          if (cs.countdownSettings) {
            const cds = cs.countdownSettings;
            if (typeof cds.enabled === 'boolean') setCountdownEnabled(cds.enabled);
            if (cds.timeZone) setTimeZone(cds.timeZone);
            if (cds.label) setCountdownLabel(cds.label);
            if (typeof cds.autoGenerateLabels === 'boolean') setAutoGenerateLabels(cds.autoGenerateLabels);
            if (cds.eventDateLabel) setCustomDateLabel(cds.eventDateLabel);
            if (cds.eventTimeLabel) setCustomTimeLabel(cds.eventTimeLabel);
            if (cds.eventTzLabel) setCustomTzLabel(cds.eventTzLabel);
            if (cds.completedMessage) setCompletedMessage(cds.completedMessage);

            if (cds.targetDate) {
              try {
                const d = new Date(cds.targetDate);
                if (!isNaN(d.getTime())) {
                  setDatetimeLocal(toDatetimeLocalValue(d, cds.timeZone || 'America/New_York'));
                }
              } catch {}
            }
          }
        }
      }
    }).catch((err) => {
      if (isMounted) {
        console.error('Error loading category suggestions settings:', err);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Compute ISO string and timezone offset
  const tzOffset = useMemo(() => {
    return getTimezoneOffsetForDate(datetimeLocal, timeZone);
  }, [datetimeLocal, timeZone]);

  const targetIsoString = useMemo(() => {
    if (!datetimeLocal) return '';
    const formatted = datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal;
    return `${formatted}${tzOffset}`;
  }, [datetimeLocal, tzOffset]);

  const targetTimestampMs = useMemo(() => {
    try {
      return new Date(targetIsoString).getTime();
    } catch {
      return 0;
    }
  }, [targetIsoString]);

  // Auto labels
  const autoLabels = useMemo(() => {
    if (!targetIsoString) return null;
    return computeAutoLabels(targetIsoString, timeZone);
  }, [targetIsoString, timeZone]);

  const effectiveEventDateLabel = autoGenerateLabels
    ? autoLabels?.eventDateLabel || customDateLabel || 'Midnight EST'
    : customDateLabel || 'Midnight EST';

  // Live countdown calculation for modal preview
  const previewRemaining = useMemo(() => {
    const diff = Math.max(0, targetTimestampMs - nowMs);
    const isPast = targetTimestampMs > 0 && targetTimestampMs <= nowMs;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      diff,
      isPast
    };
  }, [targetTimestampMs, nowMs]);

  // Quick Preset Handlers
  const handleApplyMonthPreset = (preset: MonthPreset) => {
    setHeroMonthHighlight(preset.highlight);
    setHeroThemeBadge(preset.badge);
    setHeroDescription(preset.description);
    setHeroGuideline(preset.guideline);
    setHeroDisclaimer(preset.disclaimer);

    // Also suggest a default end of month target date
    const now = new Date();
    // Target end of that month in the current or next year
    const monthIndex = MONTH_PRESETS.findIndex((m) => m.key === preset.key);
    let targetYear = now.getFullYear();
    if (monthIndex < now.getMonth()) {
      targetYear += 1;
    }
    const endOfMonth = new Date(targetYear, monthIndex + 1, 0, 23, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(endOfMonth, timeZone));

    toast.info(`Applied ${preset.monthName} Template`, {
      description: 'Hero text and deadline suggested. You can customize further before saving.'
    });
  };

  const handleAddDuration = (hoursToAdd: number) => {
    const now = new Date();
    const target = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
  };

  const handleSetThisSunday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = (7 - day) % 7;
    const target = new Date(now);
    target.setDate(now.getDate() + (diff === 0 ? 7 : diff));
    target.setHours(23, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
  };

  const handleSetThisFriday = () => {
    const now = new Date();
    const day = now.getDay();
    let diff = (5 - day) % 7;
    if (diff <= 0) diff += 7;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    target.setHours(17, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
  };

  const handleSetEndOfMonth = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0, 0);
    setDatetimeLocal(toDatetimeLocalValue(target, timeZone));
  };

  const handleResetToDefaults = () => {
    setHeroTitlePrefix(DEFAULT_PAGE_SETTINGS.heroTitlePrefix || 'Help Shape');
    setHeroMonthHighlight(DEFAULT_PAGE_SETTINGS.heroMonthHighlight || 'October’s');
    setHeroTitleSuffix(DEFAULT_PAGE_SETTINGS.heroTitleSuffix || 'Loading Screen');
    setHeroThemeBadge(DEFAULT_PAGE_SETTINGS.heroThemeBadge || 'October Theme');
    setHeroDescription(DEFAULT_PAGE_SETTINGS.heroDescription || '');
    setHeroGuideline(DEFAULT_PAGE_SETTINGS.heroGuideline || '');
    setHeroDisclaimer(DEFAULT_PAGE_SETTINGS.heroDisclaimer || '');

    setCountdownEnabled(true);
    setTimeZone('America/New_York');
    setCountdownLabel('Submission & Voting Window');
    setAutoGenerateLabels(true);
    setCustomDateLabel('Sept. 12 • Midnight EST');
    setCompletedMessage('⚠️ Category Submissions Closed. Community voting has ended and the final results are in.');

    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setDatetimeLocal(toDatetimeLocalValue(d, 'America/New_York'));

    toast.info('Form reset to default values.');
  };

  // Save to Firestore
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const countdownSettingsObj: CountdownSettings = {
        enabled: countdownEnabled,
        mode: 'custom',
        targetDate: targetIsoString,
        label: countdownLabel.trim() || 'Submission & Voting Window',
        eventDateLabel: effectiveEventDateLabel,
        eventTimeLabel: autoLabels?.eventTimeLabel || customTimeLabel || '11:59 PM',
        eventTzLabel: autoLabels?.eventTzLabel || customTzLabel || 'EST',
        completedMessage: completedMessage.trim(),
        autoGenerateLabels,
        timeZone,
        updatedAt: new Date().toISOString()
      };

      const payload: CategorySuggestionsPageSettings = {
        heroTitlePrefix: heroTitlePrefix.trim(),
        heroMonthHighlight: heroMonthHighlight.trim(),
        heroTitleSuffix: heroTitleSuffix.trim(),
        heroThemeBadge: heroThemeBadge.trim(),
        heroDescription: heroDescription.trim(),
        heroGuideline: heroGuideline.trim(),
        heroDisclaimer: heroDisclaimer.trim(),
        countdownSettings: countdownSettingsObj,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'settings', 'global'), {
        categorySuggestionsSettings: payload
      }, { merge: true });

      // Update runtime memory deadline
      setDynamicCategorySuggestionDeadline(
        countdownSettingsObj.targetDate,
        countdownSettingsObj.eventDateLabel,
        countdownSettingsObj.enabled
      );

      if (onSettingsSaved) {
        onSettingsSaved(payload);
      }

      setSaveSuccess(true);
      toast.success('Category Suggestions Page Updated!', {
        description: `Active Title: "${heroTitlePrefix} ${heroMonthHighlight} ${heroTitleSuffix}"`
      });

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving category suggestions settings:', err);
      toast.error('Failed to save settings', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-[#0c0d12] border border-white/10 text-white shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
                <span>Category Suggestions Customizer</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Staff Admin
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60 font-medium">
                Change the monthly theme title, hero descriptions, and edit the live countdown clock for category suggestions.
              </DialogDescription>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-all cursor-pointer border border-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-white/5 bg-black/20">
          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
              activeTab === 'hero'
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-white/60 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <Type size={14} />
            <span>Hero Section & Monthly Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('countdown')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer",
              activeTab === 'countdown'
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-white/60 hover:text-white hover:bg-white/[0.05]"
            )}
          >
            <Clock size={14} />
            <span>Countdown Clock & Deadline</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: HERO SECTION */}
          {activeTab === 'hero' && (
            <div className="space-y-6">
              {/* Quick Monthly Presets Strip */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-orange-400" />
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                      1-Click Monthly Theme Presets
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    Click any month to auto-fill title, badge & description
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                  {MONTH_PRESETS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleApplyMonthPreset(m)}
                      className={cn(
                        "px-2 py-2 rounded-xl text-xs font-bold font-mono transition-all text-center border cursor-pointer",
                        heroMonthHighlight.toLowerCase().includes(m.monthName.toLowerCase())
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/5"
                      )}
                      title={`Load ${m.monthName} template`}
                    >
                      {m.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Hero Preview Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/40 border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye size={13} className="text-orange-400" />
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-white/60">
                      Live Hero Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Updates in real-time
                  </span>
                </div>

                {/* Simulated Hero Element */}
                <div className="p-4 rounded-xl bg-black/60 border border-white/5 space-y-3">
                  {/* Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Community Suggestions Open</span>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                      <Sparkles size={10} className="text-amber-400" />
                      <span>{heroThemeBadge || 'Monthly Theme'}</span>
                    </div>
                  </div>

                  {/* Headline Preview */}
                  <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white leading-tight">
                    {heroTitlePrefix || 'Help Shape'}{' '}
                    <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                      {heroMonthHighlight || 'October’s'}
                    </span>{' '}
                    {heroTitleSuffix || 'Loading Screen'}
                  </h2>

                  {/* Description Preview */}
                  <p className="text-white/80 text-xs leading-relaxed max-w-2xl">
                    {heroDescription || 'Suggest and vote on photo contest categories...'}
                  </p>

                  {/* Guidelines Preview */}
                  {heroGuideline && (
                    <p className="text-xs font-bold text-amber-400/90 tracking-wide">
                      {heroGuideline}
                    </p>
                  )}

                  {/* Disclaimer Preview */}
                  {heroDisclaimer && (
                    <p className="text-[10px] text-white/45 italic leading-relaxed">
                      {heroDisclaimer}
                    </p>
                  )}
                </div>
              </div>

              {/* Title & Theme Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Title Prefix</span>
                  </label>
                  <input
                    type="text"
                    value={heroTitlePrefix}
                    onChange={(e) => setHeroTitlePrefix(e.target.value)}
                    placeholder="Help Shape"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                  />
                  <span className="text-[10px] text-white/40 font-mono">e.g. "Help Shape" or "Vote for"</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>Month / Theme Highlight</span>
                  </label>
                  <input
                    type="text"
                    value={heroMonthHighlight}
                    onChange={(e) => setHeroMonthHighlight(e.target.value)}
                    placeholder="November’s"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-orange-500/40 text-orange-300 font-bold text-xs focus:outline-none focus:border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                  />
                  <span className="text-[10px] text-white/40 font-mono">Styled with the vibrant gradient</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Title Suffix</span>
                  </label>
                  <input
                    type="text"
                    value={heroTitleSuffix}
                    onChange={(e) => setHeroTitleSuffix(e.target.value)}
                    placeholder="Loading Screen"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                  />
                  <span className="text-[10px] text-white/40 font-mono">e.g. "Loading Screen" or "Themes"</span>
                </div>
              </div>

              {/* Theme Badge */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Theme Badge Label</span>
                </label>
                <input
                  type="text"
                  value={heroThemeBadge}
                  onChange={(e) => setHeroThemeBadge(e.target.value)}
                  placeholder="November Theme"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                />
                <span className="text-[10px] text-white/40 font-mono">Displays in the golden pill in the hero section</span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <AlignLeft size={12} />
                  <span>Hero Description / Guidelines</span>
                </label>
                <textarea
                  rows={3}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  placeholder="Suggest and vote on photo contest categories for next month..."
                  className="w-full p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50 leading-relaxed"
                />
              </div>

              {/* Guideline Note & Staff Disclaimer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Theme Relevance Guideline Note
                  </label>
                  <input
                    type="text"
                    value={heroGuideline}
                    onChange={(e) => setHeroGuideline(e.target.value)}
                    placeholder="Keep suggestions relevant to November."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                  />
                  <span className="text-[10px] text-white/40 font-mono">Shown in bold amber text below description</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white/60 uppercase tracking-wider">
                    Staff Moderation Disclaimer
                  </label>
                  <input
                    type="text"
                    value={heroDisclaimer}
                    onChange={(e) => setHeroDisclaimer(e.target.value)}
                    placeholder="Staff reserves the right to deny or remove..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                  />
                  <span className="text-[10px] text-white/40 font-mono">Shown in subtle italicized note</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COUNTDOWN CLOCK */}
          {activeTab === 'countdown' && (
            <div className="space-y-6">
              {/* Enable/Disable Master Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Timer size={16} className={countdownEnabled ? "text-orange-400" : "text-white/40"} />
                    <span className="text-sm font-bold font-display uppercase tracking-wider text-white">
                      Category Suggestions Countdown Timer
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    When enabled, shows the live ticking clock and enforces the submission and voting deadline.
                  </p>
                </div>

                <AnimatedSwitch
                  checked={countdownEnabled}
                  onCheckedChange={setCountdownEnabled}
                />
              </div>

              {/* Real-time Clock Preview Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0e0f17] to-[#07070a] border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-orange-400" />
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                      {countdownLabel || 'Submission & Voting Window'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/25">
                    {effectiveEventDateLabel}
                  </span>
                </div>

                {countdownEnabled ? (
                  !previewRemaining.isPast ? (
                    <div className="grid grid-cols-4 gap-2.5 text-center my-3">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="block text-2xl sm:text-3xl font-black font-mono text-white">
                          {previewRemaining.days}
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">Days</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="block text-2xl sm:text-3xl font-black font-mono text-white">
                          {previewRemaining.hours}
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">Hours</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="block text-2xl sm:text-3xl font-black font-mono text-white">
                          {previewRemaining.minutes}
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">Mins</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                        <span className="block text-2xl sm:text-3xl font-black font-mono text-orange-400 animate-pulse">
                          {previewRemaining.seconds}
                        </span>
                        <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mt-0.5">Secs</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-5 text-center bg-amber-500/5 rounded-xl border border-amber-500/20 my-2">
                      <p className="text-sm font-bold text-amber-400 font-display uppercase tracking-wider">
                        Countdown Timer Expired
                      </p>
                      <p className="text-xs text-white/60 font-mono mt-1 px-4">
                        {completedMessage}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-5 text-center bg-white/[0.02] rounded-xl border border-white/5 my-2">
                    <p className="text-sm font-bold text-emerald-400 font-display uppercase tracking-wider">
                      Timer Disabled
                    </p>
                    <p className="text-xs text-white/50 font-mono mt-1">
                      Suggestions & voting remain open with no countdown countdown card displayed.
                    </p>
                  </div>
                )}

                <p className="text-[10px] font-mono text-white/40 text-center mt-2">
                  Target Timestamp: <span className="text-white/60">{targetIsoString || 'None configured'}</span>
                </p>
              </div>

              {/* Target Date & Time + Timezone Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date & Time Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock size={13} className="text-orange-400" />
                    <span>Target Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={datetimeLocal}
                    onChange={(e) => setDatetimeLocal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-400/50"
                  />
                  <span className="text-[10px] text-white/40 font-mono">
                    Local system input converted to selected timezone offset ({tzOffset})
                  </span>
                </div>

                {/* Timezone Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-orange-400" />
                    <span>Timezone</span>
                  </label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111218] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-400/50 cursor-pointer"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-white/40 font-mono">
                    Vital RP server operates primarily on Eastern Time (ET)
                  </span>
                </div>
              </div>

              {/* Quick Duration Jumpers (Just like Photo Contest Voting!) */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={12} className="text-amber-400" />
                  <span>Quick Duration Jumpers</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddDuration(1)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    +1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDuration(12)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    +12 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDuration(24)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    +24 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDuration(72)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDuration(168)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={handleSetThisSunday}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    This Sunday
                  </button>
                  <button
                    type="button"
                    onClick={handleSetEndOfMonth}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-mono text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    End of Month
                  </button>
                </div>
              </div>

              {/* Header Label & Presets */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider">
                  Countdown Header Label
                </label>
                <input
                  type="text"
                  value={countdownLabel}
                  onChange={(e) => setCountdownLabel(e.target.value)}
                  placeholder="Submission & Voting Window"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {LABEL_PRESETS.map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setCountdownLabel(lbl)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border cursor-pointer",
                        countdownLabel === lbl
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                          : "bg-white/[0.03] text-white/60 hover:text-white border-white/5"
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Badges (Auto vs Custom) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold font-display uppercase tracking-wider text-white">
                      Auto-Compute Display Badges
                    </span>
                    <p className="text-[11px] text-white/50">
                      Format date badge automatically from the chosen timestamp
                    </p>
                  </div>
                  <AnimatedSwitch
                    checked={autoGenerateLabels}
                    onCheckedChange={setAutoGenerateLabels}
                  />
                </div>

                {!autoGenerateLabels && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-mono text-white/60 uppercase">Date Badge</label>
                      <input
                        type="text"
                        value={customDateLabel}
                        onChange={(e) => setCustomDateLabel(e.target.value)}
                        placeholder="Sept. 12 • Midnight EST"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-white/60 uppercase">Time Label</label>
                      <input
                        type="text"
                        value={customTimeLabel}
                        onChange={(e) => setCustomTimeLabel(e.target.value)}
                        placeholder="11:59 PM"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-white/60 uppercase">TZ Label</label>
                      <input
                        type="text"
                        value={customTzLabel}
                        onChange={(e) => setCustomTzLabel(e.target.value)}
                        placeholder="EST"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Expiration Message */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider">
                  Expiration / Completed Message
                </label>
                <textarea
                  rows={2}
                  value={completedMessage}
                  onChange={(e) => setCompletedMessage(e.target.value)}
                  placeholder="⚠️ Category Submissions Closed. Community voting has ended..."
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-orange-400/50 leading-relaxed"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMPLETED_MESSAGE_PRESETS.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCompletedMessage(msg)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border cursor-pointer truncate max-w-xs",
                        completedMessage === msg
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                          : "bg-white/[0.03] text-white/60 hover:text-white border-white/5"
                      )}
                      title={msg}
                    >
                      {msg.slice(0, 42)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/10 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/10 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer",
                saveSuccess
                  ? "bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25"
              )}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>Published Live!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save & Publish Live</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CategorySuggestionsSettingsModal;
