"use client";

import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ShaderBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function ShaderBackground({ className, children }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let isRunning = true;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (!isRunning) {
          isRunning = true;
          render();
        }
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Orbs / Wave nodes
    const nodes = [
      { x: width * 0.2, y: height * 0.3, radius: 350, color: 'rgba(234, 88, 12, 0.15)', vx: 0.3, vy: 0.2 },
      { x: width * 0.8, y: height * 0.6, radius: 450, color: 'rgba(245, 158, 11, 0.12)', vx: -0.2, vy: 0.3 },
      { x: width * 0.5, y: height * 0.8, radius: 400, color: 'rgba(234, 88, 12, 0.18)', vx: 0.4, vy: -0.3 },
      { x: width * 0.1, y: height * 0.9, radius: 300, color: 'rgba(185, 28, 28, 0.08)', vx: -0.3, vy: -0.2 },
    ];

    let time = 0;

    const render = () => {
      if (!isRunning) return;

      time += prefersReducedMotion ? 0.002 : 0.015;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Dark background base
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, width, height);

      // Render fluid radial shader nodes
      nodes.forEach((node, idx) => {
        if (!prefersReducedMotion) {
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
        }

        const radGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius);
        radGrad.addColorStop(0, node.color);
        radGrad.addColorStop(0.6, node.color.replace('0.15', '0.04').replace('0.18', '0.05').replace('0.12', '0.03'));
        radGrad.addColorStop(1, 'rgba(7, 7, 10, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default ShaderBackground;
