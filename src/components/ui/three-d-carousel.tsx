'use client';
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface CarouselItem {
  id?: string;
  src: string;
  title?: string;
  subtitle?: string;
  badge?: string | number;
  onClick?: () => void;
}

interface ThreeDCarouselProps {
  items?: (string | CarouselItem)[];
  radius?: number;
  cardW?: number;
  cardH?: number;
  className?: string;
  onItemClick?: (item: CarouselItem, index: number) => void;
}

const FALLBACK =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ' +
  'width="180" height="240"><rect width="100%" height="100%" ' +
  'fill="%23111116"/><text x="50%" y="50%" dominant-baseline="middle"' +
  ' text-anchor="middle" fill="%23ea580c" font-size="14" font-family="sans-serif">Vital RP Entry</text></svg>';

const CARD_W = 180;
const CARD_H = 240;
const RADIUS = 230;
const TILT_SENSITIVITY = 10;
const DRAG_SENSITIVITY = 0.5;
const INERTIA_FRICTION = 0.95;
const AUTOSPIN_SPEED = 0.08;
const IDLE_TIMEOUT = 2000;

interface CardProps {
  item: CarouselItem;
  transform: string;
  cardW: number;
  cardH: number;
  onClick?: () => void;
}

const Card = React.memo(({ item, transform, cardW, cardH, onClick }: CardProps) => (
  <div
    className="absolute cursor-pointer select-none"
    style={{
      width: cardW,
      height: cardH,
      transform,
      transformStyle: 'preserve-3d',
      willChange: 'transform',
    }}
    onClick={onClick}
  >
    <div
      className="w-full h-full rounded-2xl overflow-hidden bg-[#0e0e14]/90 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)] hover:border-fivem-orange/60 hover:shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all duration-300 hover:scale-105 relative group"
      style={{ backfaceVisibility: 'hidden' }}
    >
      <img
        src={item.src}
        alt={item.title || 'Contest entry'}
        width={cardW}
        height={cardH}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
        draggable="false"
        onError={(e) => {
          e.currentTarget.src = FALLBACK;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Info overlay */}
      {(item.title || item.badge !== undefined) && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          {item.title && (
            <span className="text-[11px] font-bold text-white truncate max-w-[110px] drop-shadow-md font-display">
              {item.title}
            </span>
          )}
          {item.badge !== undefined && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-fivem-orange font-bold">
              <span>❤️</span>
              <span>{item.badge}</span>
            </div>
          )}
        </div>
      )}

      {/* Hover glow ring */}
      <div className="absolute inset-0 rounded-2xl border-2 border-fivem-orange opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  </div>
));

Card.displayName = 'Card';

/**
 * SeraUI 3D Carousel Component
 * Reference: https://seraui.com/docs/3d-carousel
 */
export const ThreeDCarousel = React.memo(
  ({
    items = [],
    radius = RADIUS,
    cardW = CARD_W,
    cardH = CARD_H,
    className,
    onItemClick,
  }: ThreeDCarouselProps) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const wheelRef = useRef<HTMLDivElement>(null);

    const rotationRef = useRef(0);
    const tiltRef = useRef(0);
    const targetTiltRef = useRef(0);
    const velocityRef = useRef(0);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef(0);
    const initialRotationRef = useRef(0);
    const lastInteractionRef = useRef(Date.now());
    const animationFrameRef = useRef<number | null>(null);

    const normalizedItems: CarouselItem[] = useMemo(() => {
      return items.map((it) => (typeof it === 'string' ? { src: it } : it));
    }, [items]);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!parentRef.current || isDraggingRef.current) return;

        lastInteractionRef.current = Date.now();
        const parentRect = parentRef.current.getBoundingClientRect();
        const mouseY = e.clientY - parentRect.top;
        const normalizedY = (mouseY / parentRect.height - 0.5) * 2;

        targetTiltRef.current = -normalizedY * TILT_SENSITIVITY;
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }, []);

    useEffect(() => {
      const animate = () => {
        if (!isDraggingRef.current) {
          // Apply inertia
          if (Math.abs(velocityRef.current) > 0.01) {
            rotationRef.current += velocityRef.current;
            velocityRef.current *= INERTIA_FRICTION;
          } else if (Date.now() - lastInteractionRef.current > IDLE_TIMEOUT) {
            rotationRef.current += AUTOSPIN_SPEED;
          }
        }

        tiltRef.current += (targetTiltRef.current - tiltRef.current) * 0.1;

        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotateX(${tiltRef.current}deg) rotateY(${rotationRef.current}deg)`;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    const handleDragStart = useCallback((clientX: number) => {
      lastInteractionRef.current = Date.now();
      isDraggingRef.current = true;
      velocityRef.current = 0;
      dragStartRef.current = clientX;
      initialRotationRef.current = rotationRef.current;
    }, []);

    const handleDragMove = useCallback((clientX: number) => {
      if (!isDraggingRef.current) return;
      lastInteractionRef.current = Date.now();

      const deltaX = clientX - dragStartRef.current;
      const newRotation = initialRotationRef.current + deltaX * DRAG_SENSITIVITY;

      velocityRef.current = newRotation - rotationRef.current;
      rotationRef.current = newRotation;
    }, []);

    const handleDragEnd = useCallback(() => {
      isDraggingRef.current = false;
      lastInteractionRef.current = Date.now();
    }, []);

    const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX);
    const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
    const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);

    const cards = useMemo(
      () =>
        normalizedItems.map((item, idx) => {
          const count = Math.max(normalizedItems.length, 1);
          const angle = (idx * 360) / count;
          return {
            key: item.id || `card-${idx}`,
            item,
            index: idx,
            transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
          };
        }),
      [normalizedItems, radius]
    );

    if (normalizedItems.length === 0) return null;

    return (
      <div
        ref={parentRef}
        className={cn(
          'w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing relative select-none',
          className
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleDragEnd}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            perspective: 1500,
            perspectiveOrigin: 'center',
            width: Math.max(cardW * 1.5, radius * 2.2),
            height: Math.max(cardH * 1.8, radius * 1.5),
          }}
        >
          <div
            ref={wheelRef}
            className="relative"
            style={{
              width: cardW,
              height: cardH,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              position: 'absolute',
              left: '50%',
              top: '50%',
              marginLeft: -cardW / 2,
              marginTop: -cardH / 2,
            }}
          >
            {cards.map((card) => (
              <Card
                key={card.key}
                item={card.item}
                transform={card.transform}
                cardW={cardW}
                cardH={cardH}
                onClick={() => {
                  if (card.item.onClick) card.item.onClick();
                  if (onItemClick) onItemClick(card.item, card.index);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ThreeDCarousel.displayName = 'ThreeDCarousel';
export default ThreeDCarousel;
