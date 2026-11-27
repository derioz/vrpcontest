"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ShaderBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

// The glows are soft gradients, so a quarter-size canvas stretched over the window
// looks the same and paints about a sixteenth as many pixels.
const RENDER_SCALE = 0.25;
// They drift slowly enough that 30 frames a second is indistinguishable from 60.
const FRAME_MS = 1000 / 30;
// Movement is defined per 60 Hz step, so speed does not depend on the frame rate.
const STEP_MS = 1000 / 60;

export function ShaderBackground({ className, children }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Orbs / Wave nodes
    const nodes = [
      { x: width * 0.2, y: height * 0.3, radius: 350, color: 'rgba(234, 88, 12, 0.15)', vx: 0.3, vy: 0.2 },
      // Seasonal theme swaps the amber orb for evergreen.
      { x: width * 0.8, y: height * 0.6, radius: 450, color: document.documentElement.dataset.season === 'christmas' ? 'rgba(26, 77, 58, 0.12)' : 'rgba(245, 158, 11, 0.12)', vx: -0.2, vy: 0.3 },
      { x: width * 0.5, y: height * 0.8, radius: 400, color: 'rgba(234, 88, 12, 0.18)', vx: 0.4, vy: -0.3 },
      { x: width * 0.1, y: height * 0.9, radius: 300, color: 'rgba(185, 28, 28, 0.08)', vx: -0.3, vy: -0.2 },
    ];

    let time = 0;

    const step = () => {
      time += 0.015;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      nodes.forEach((node, idx) => {
        node.x += Math.sin(time + idx) * node.vx * 1.5;
        node.y += Math.cos(time + idx) * node.vy * 1.5;

        // Interactive mouse influence
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          node.x -= (dx / dist) * 0.6;
          node.y -= (dy / dist) * 0.6;
        }
      });
    };

    const draw = () => {
      // Dark background base
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, width, height);

      // Render fluid radial shader nodes
      nodes.forEach((node) => {
        const radGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius);
        radGrad.addColorStop(0, node.color);
        radGrad.addColorStop(0.6, node.color.replace('0.15', '0.04').replace('0.18', '0.05').replace('0.12', '0.03'));
        radGrad.addColorStop(1, 'rgba(7, 7, 10, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Positions stay in window pixels; the transform maps them onto the small canvas.
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(height * RENDER_SCALE));
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      draw();
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    let last = performance.now();
    const tick = (now: number) => {
      animationFrameId = requestAnimationFrame(tick);
      const elapsed = now - last;
      if (elapsed < FRAME_MS - 2) return;
      last = now;
      // Capped so a tab returning from the background does not jump.
      const steps = Math.min(4, Math.max(1, Math.round(elapsed / STEP_MS)));
      for (let i = 0; i < steps; i++) step();
      draw();
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // With reduced motion the glows are a still image: no loop at all.
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 h-full w-full pointer-events-none z-0 transition-opacity duration-1000"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default ShaderBackground;
