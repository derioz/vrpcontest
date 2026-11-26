/**
 * Motion for the moments of submitting an entry: the upload's real stages and the confirmation.
 * Everything has a reduced-motion path that keeps the information and drops the movement.
 */
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from './ui/button';

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type UploadStage = 'preparing' | 'uploading' | 'saving';

const STAGES: { id: UploadStage; label: string }[] = [
  { id: 'preparing', label: 'Preparing your screenshot' },
  { id: 'uploading', label: 'Uploading the full-size image' },
  { id: 'saving', label: 'Saving your entry' },
];

/** One segment per real step of the upload. No percentage, because the upload does not report one. */
export function UploadStages({ stage }: { stage: UploadStage }) {
  const reduce = useReducedMotion();
  const current = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {STAGES.map((s, i) => (
          <div key={s.id} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-0 origin-left rounded-full bg-fivem-orange"
              initial={{ scaleX: 0 }}
              // The running step creeps toward full but only completes when the step really ends.
              animate={{ scaleX: i < current ? 1 : i === current ? 0.85 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : i === current
                    ? { duration: 8, ease: EASE_OUT }
                    : { duration: 0.35, ease: EASE_OUT }
              }
            />
          </div>
        ))}
      </div>
      <p role="status" className="text-xs font-medium text-white/70">
        {STAGES[current].label} ({current + 1} of {STAGES.length})
      </p>
    </div>
  );
}

interface EntryConfirmationProps {
  image: string;
  categoryName: string;
  censored: boolean;
  onDone: () => void;
}

/** The one authored moment: the submitted shot comes up out of the dark, then a check is drawn. */
export function EntryConfirmation({ image, categoryName, censored, onDone }: EntryConfirmationProps) {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.2 : 0.4, delay: reduce ? 0 : delay, ease: EASE_OUT },
  });

  return (
    <div className="space-y-5 text-center">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <motion.img
          src={image}
          alt="Your submitted screenshot"
          className="h-full w-full object-contain"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'brightness(0.15)' }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'brightness(1)' }}
          transition={{ duration: reduce ? 0.2 : 0.7, ease: EASE_OUT }}
        />
      </div>

      <div role="status" className="space-y-2">
        <motion.h3 {...rise(0.45)} className="flex items-center justify-center gap-2.5 font-display text-2xl font-black text-white">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <motion.path
              d="M4 12.5l5 5L20 6.5"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.6, ease: EASE_OUT }}
            />
          </svg>
          You're entered
        </motion.h3>
        <motion.p {...rise(0.55)} className="text-sm leading-relaxed text-white/70">
          Your photo is in {categoryName}.
          {censored && ' It stays pixelated in the gallery until voting opens.'}
        </motion.p>
      </div>

      <motion.div {...rise(0.65)}>
        <Button
          autoFocus
          onClick={onDone}
          className="h-11 w-full cursor-pointer rounded-xl bg-fivem-orange font-display font-bold text-white hover:bg-orange-500"
        >
          Done
        </Button>
      </motion.div>
    </div>
  );
}
