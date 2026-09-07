import React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '../../lib/utils';

/**
 * AvatarSkeleton
 * Circular placeholder reserving exact dimensions for Discord / DiceBear avatars.
 */
export function AvatarSkeleton({
  size = 'sm',
  className,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-[34px] h-[34px]',
    lg: 'w-11 h-11',
  }[size];

  return (
    <Skeleton
      className={cn(
        'rounded-full shrink-0 aspect-square bg-white/[0.08] border border-white/[0.06]',
        sizeClass,
        className
      )}
    />
  );
}

/**
 * UserRowSkeleton
 * Placeholder row for voter popovers and "See Everyone" dialogs.
 */
export function UserRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5',
        className
      )}
    >
      <AvatarSkeleton size="sm" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="w-28 sm:w-36 h-3.5 rounded-md bg-white/[0.08]" />
        <Skeleton className="w-16 h-2.5 rounded-md bg-white/[0.04]" />
      </div>
    </div>
  );
}

/**
 * VoteListSkeleton
 * Renders multiple UserRowSkeleton items inside voter popovers and modals.
 */
export function VoteListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1.5" aria-busy="true" aria-label="Loading voter list">
      {Array.from({ length: count }).map((_, i) => (
        <UserRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * StatsCardSkeleton
 * Compact skeleton for the 3 top stat boxes (Ideas, Votes, Voters) to eliminate fake 0s.
 */
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center my-0.5', className)}>
      <Skeleton className="w-10 sm:w-12 h-6 rounded-lg bg-white/[0.08]" />
    </div>
  );
}

/**
 * SuggestionLimitSkeleton
 * Inline numeric skeleton for the "X of Y remaining" allowance indicator.
 */
export function SuggestionLimitSkeleton({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center align-middle', className)}>
      <Skeleton className="w-12 h-3.5 rounded-md bg-white/[0.09]" />
    </span>
  );
}

/**
 * SuggestionCardSkeleton
 * Realistic placeholder matching the full dimensions and layout of real suggestion cards.
 */
export function SuggestionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative rounded-3xl border border-white/10 bg-[#0a0a0d]/90 p-4 sm:p-6 backdrop-blur-xl shadow-lg flex gap-4 sm:gap-6 items-start',
        className
      )}
      aria-hidden="true"
    >
      {/* Left: Reddit-Style Vertical Vote Capsule Placeholder */}
      <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 shrink-0 gap-1 sm:gap-1.5">
        {/* Upvote Arrow Button Skeleton */}
        <Skeleton className="w-8 h-8 rounded-xl bg-white/[0.06]" />
        {/* Score Skeleton */}
        <div className="py-1 px-1 flex items-center justify-center">
          <Skeleton className="w-5 h-4 rounded bg-white/[0.09]" />
        </div>
        {/* Downvote Arrow Button Skeleton */}
        <Skeleton className="w-8 h-8 rounded-xl bg-white/[0.06]" />
      </div>

      {/* Right: Main Content Area */}
      <div className="flex-1 min-w-0 space-y-3 pt-0.5">
        {/* Top Header Row: Category Title & Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-6 sm:h-7 w-48 sm:w-64 rounded-xl bg-white/[0.09]" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full bg-white/[0.05] shrink-0" />
        </div>

        {/* Description Placeholder: 2 natural lines */}
        <div className="space-y-2 py-0.5">
          <Skeleton className="h-3.5 sm:h-4 w-full rounded-md bg-white/[0.06]" />
          <Skeleton className="h-3.5 sm:h-4 w-4/5 sm:w-2/3 rounded-md bg-white/[0.04]" />
        </div>

        {/* Footer Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          {/* Left: Author Avatar, Name & Timestamp */}
          <div className="flex items-center gap-2.5">
            <AvatarSkeleton size="xs" />
            <Skeleton className="w-24 sm:w-28 h-3 rounded bg-white/[0.07]" />
            <span className="text-white/20 text-xs select-none">•</span>
            <Skeleton className="w-14 sm:w-16 h-3 rounded bg-white/[0.04]" />
          </div>

          {/* Right: Upvotes / Downvotes / Share Buttons Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-20 sm:w-24 h-6 sm:h-7 rounded-xl bg-white/[0.04] border border-white/5" />
            <Skeleton className="w-20 sm:w-24 h-6 sm:h-7 rounded-xl bg-white/[0.04] border border-white/5" />
            <Skeleton className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SuggestionFeedSkeleton
 * Renders 4–5 realistic cards with subtle opacity pacing for the main suggestions feed.
 */
export function SuggestionFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading category suggestions"
      role="feed"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SuggestionCardSkeleton
          key={i}
          className={cn(i >= 3 && 'hidden sm:flex', i === 4 && 'hidden lg:flex')}
        />
      ))}
    </div>
  );
}
