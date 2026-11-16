/**
 * Skeleton placeholder. Renders the Wensity shimmering skeleton primitive, so
 * every placeholder in the app shares one shimmer. Wrap a group in
 * ShimmeringSkeletonWrapper (./shimmering-skeleton-wrapper) to control the
 * speed and colors of everything inside it.
 */

import React from "react";
import { cn } from "../../lib/utils";
import { SkeletonBox } from "./shimmering-skeleton-wrapper";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <SkeletonBox
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-xl border border-white/[0.04]", className)}
      {...props}
    />
  );
}

export { Skeleton };
export default Skeleton;
