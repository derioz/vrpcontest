/**
 * Aceternity-inspired Lens — magnifying glass hover effect for images
 * Tracks mouse position over a container, renders a circular zoomed region.
 * Only activates on desktop (pointer: fine). Disabled on touch.
 */

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  className?: string;
  hovering?: boolean;
  setHovering?: (hovering: boolean) => void;
}

export function Lens({
  children,
  zoomFactor = 1.5,
  lensSize = 170,
  className,
  hovering: externalHovering,
  setHovering: externalSetHovering,
}: LensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalHovering, setInternalHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Support controlled or uncontrolled hovering state
  const isHovering = externalHovering !== undefined ? externalHovering : internalHovering;
  const onSetHovering = externalSetHovering || setInternalHovering;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition({ x, y });
    },
    []
  );

  // Don't activate lens on touch devices
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => !isTouchDevice && onSetHovering(true)}
      onMouseLeave={() => onSetHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      {/* The magnifying lens overlay */}
      <AnimatePresence>
        {isHovering && !isTouchDevice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.58 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none"
            style={{
              width: lensSize,
              height: lensSize,
              left: position.x - lensSize / 2,
              top: position.y - lensSize / 2,
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow:
                "0 0 0 2px rgba(234, 88, 12, 0.4), 0 8px 32px rgba(0,0,0,0.6), 0 0 60px rgba(234, 88, 12, 0.15)",
            }}
          >
            {/* Zoomed content — renders the same children at higher scale */}
            <div
              style={{
                transform: `scale(${zoomFactor})`,
                transformOrigin: `${position.x}px ${position.y}px`,
                position: "absolute",
                left: -(position.x * zoomFactor - lensSize / 2),
                top: -(position.y * zoomFactor - lensSize / 2),
                width: containerRef.current?.offsetWidth,
                height: containerRef.current?.offsetHeight,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle vignette on hover */}
      <AnimatePresence>
        {isHovering && !isTouchDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.25) 100%)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
