/**
 * shadcn/ui — Skeleton component (Radix UI compatible)
 * Documentation Reference: https://ui.shadcn.com/docs/components/radix/skeleton
 *
 * Use to show a placeholder while content is loading.
 */

import React from "react";
import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-white/[0.08] border border-white/[0.04]", className)}
      {...props}
    />
  );
}

export { Skeleton };
export default Skeleton;
