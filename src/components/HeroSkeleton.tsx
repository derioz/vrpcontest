import React from 'react';
import { Skeleton } from './ui/skeleton';

/**
 * Holds the first screen while the contest loads. It is at least a screen tall so
 * nothing underneath is in view to jump when the real hero replaces it.
 */
export function HeroSkeleton() {
  return (
    <section
      aria-busy="true"
      className="relative min-h-[100svh] overflow-hidden border-b border-white/10 bg-[#050508] pt-20 sm:pt-48 lg:pt-40 pb-16 sm:pb-24"
    >
      <span className="sr-only" role="status">Loading the contest</span>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {/* Contest name and theme */}
        <Skeleton className="h-28 w-4/5 max-w-sm sm:h-16 sm:max-w-2xl lg:h-24 lg:max-w-5xl" />
        <Skeleton className="mt-3 h-8 w-1/2 max-w-sm" />
        <div className="mt-6 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Skeleton className="h-6 w-full max-w-xl" />
            <Skeleton className="mt-2 h-6 w-2/3 max-w-md" />
            <Skeleton className="mt-6 h-16 w-full sm:w-[22rem]" />
            <Skeleton className="mt-6 h-4 w-full max-w-lg" />
            <Skeleton className="mt-8 h-4 w-56" />
            <div className="mt-4 grid max-w-sm grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </div>
          <Skeleton className="hidden aspect-video w-full rounded-2xl lg:block" />
        </div>
      </div>
    </section>
  );
}
