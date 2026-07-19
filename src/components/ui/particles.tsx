/**
 * MagicUI Particles — ambient floating canvas particles with mouse interaction
 * Adapted from https://magicui.design/docs/components/particles
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
  refresh?: boolean;
  vx?: number;
  vy?: number;
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

function hexToRgb(hex: string): number[] {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function Particles({
  className = "",
  quantity = 50,
  staticity = 50,
  ease = 50,
  size = 0.4,
  color = "#ea580c",
  refresh = false,
  vx = 0,
  vy = 0,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mousePosition = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const canvasSize = useRef({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const [rgb, setRgb] = useState(hexToRgb(color));

  useEffect(() => {
    setRgb(hexToRgb(color));
  }, [color]);

  const resizeCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      circles.current = [];
      canvasSize.current.w = canvasContainerRef.current.offsetWidth;
      canvasSize.current.h = canvasContainerRef.current.offsetHeight;
      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [dpr]);

  const circleParams = useCallback((): Circle => {
    const x = Math.floor(Math.random() * canvasSize.current.w);
    const y = Math.floor(Math.random() * canvasSize.current.h);
    const translateX = 0;
    const translateY = 0;
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = 0;
    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
    const dx = (Math.random() - 0.5) * 0.1;
    const dy = (Math.random() - 0.5) * 0.1;
    const magnetism = 0.1 + Math.random() * 4;
    return { x, y, translateX, translateY, size: pSize, alpha, targetAlpha, dx, dy, magnetism };
  }, [size]);

  const drawCircle = useCallback(
    (circle: Circle, update = false) => {
      if (context.current) {
        const { x, y, translateX, translateY, size: s, alpha } = circle;
        context.current.translate(translateX, translateY);
        context.current.beginPath();
        context.current.arc(x, y, s, 0, 2 * Math.PI);
        context.current.fillStyle = `rgba(${rgb.join(",")},${alpha})`;
        context.current.fill();
        context.current.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (!update) {
          circles.current.push(circle);
        }
      }
    },
    [dpr, rgb]
  );

  const clearContext = useCallback(() => {
    if (context.current) {
      context.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
    }
  }, []);

  const drawParticles = useCallback(() => {
    clearContext();
    const particleCount = quantity;
    for (let i = 0; i < particleCount; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  }, [clearContext, quantity, circleParams, drawCircle]);

  const remapValue = useCallback(
    (value: number, start1: number, end1: number, start2: number, end2: number) => {
      const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
      return remapped > 0 ? remapped : 0;
    },
    []
  );

  const animate = useCallback(() => {
    clearContext();
    circles.current.forEach((circle, i) => {
      // Ease towards alpha
      const edgeAlpha = circle.x > canvasSize.current.w || circle.x < 0 || circle.y > canvasSize.current.h || circle.y < 0 ? 0 : circle.targetAlpha;
      circle.alpha += (edgeAlpha - circle.alpha) * 0.08;

      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;

      // Mouse magnetism
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      drawCircle(circle, true);

      // Recycle when off-screen
      if (
        circle.x < -10 ||
        circle.x > canvasSize.current.w + 10 ||
        circle.y < -10 ||
        circle.y > canvasSize.current.h + 10
      ) {
        circles.current.splice(i, 1);
        const newCircle = circleParams();
        drawCircle(newCircle);
      }
    });
    window.requestAnimationFrame(animate);
  }, [clearContext, drawCircle, circleParams, ease, staticity, vx, vy]);

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    resizeCanvas();
    drawParticles();
    const animId = requestAnimationFrame(animate);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas, drawParticles, animate]);

  useEffect(() => {
    // Re-init on refresh
    resizeCanvas();
    drawParticles();
  }, [refresh, resizeCanvas, drawParticles]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = e.clientX - rect.left - w / 2;
      const y = e.clientY - rect.top - h / 2;
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    }
  }, []);

  return (
    <div
      className={cn("pointer-events-auto", className)}
      ref={canvasContainerRef}
      aria-hidden="true"
      onMouseMove={onMouseMove}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
