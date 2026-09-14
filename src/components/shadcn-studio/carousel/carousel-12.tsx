'use client'

import * as React from 'react'
import { motion, PanInfo } from 'motion/react'
import { EyeOff, Sparkles, Trophy, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Camera } from 'lucide-react'
import { Carousel, CarouselNext, CarouselPrevious } from '../../ui/carousel'
import { Button } from '../../ui/button'
import { cn } from '../../../lib/utils'

export interface RadialCarouselItem {
  id?: string
  image: string
  title: string
  category: string
  voteCount?: number
  isPixelated?: boolean
  isDisqualified?: boolean
  onClick?: () => void
  rawPhoto?: any
  emoji?: string
  isPlaceholder?: boolean
}

export const MINIMAL_PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14141d"/>
      <stop offset="50%" stop-color="#0b0b10"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="640" cy="360" r="320" fill="url(#glow)"/>
  
  <!-- Subtle Framing Grid & Center Focus Reticle -->
  <line x1="640" y1="260" x2="640" y2="280" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>
  <line x1="640" y1="440" x2="640" y2="460" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>
  <line x1="540" y1="360" x2="560" y2="360" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>
  <line x1="720" y1="360" x2="740" y2="360" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-linecap="round"/>
  
  <!-- Minimalist Corner Viewfinder Brackets -->
  <path d="M 60 100 L 60 60 L 100 60" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 1220 100 L 1220 60 L 1180 60" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 60 620 L 60 660 L 100 660" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 1220 620 L 1220 660 L 1180 660" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round"/>
</svg>
`)}`;

const Images: RadialCarouselItem[] = [
  {
    image: MINIMAL_PLACEHOLDER_IMAGE,
    title: 'Submit your photo to be featured',
    category: 'Competition',
    isPlaceholder: true
  }
]

// 16:9 vertical 3D cylinder arc parameters
const VERTICAL_STEP_Y = 115 // vertical pixel offset per step
const THETA_X = 24 // angular pitch step around X-axis (degrees)

const SPRING = { type: 'spring' as const, stiffness: 280, damping: 26, mass: 0.85 }

function arcStyle(offset: number) {
  const abs = Math.abs(offset)

  return {
    y: offset * VERTICAL_STEP_Y,
    rotateX: -offset * THETA_X,
    scale: Math.max(0.62, 1 - abs * 0.14),
    opacity: abs > 2 ? 0 : Math.max(0.18, 1 - abs * 0.38),
    zIndex: 20 - abs
  }
}

export interface RadialCarouselProps {
  items?: RadialCarouselItem[]
  className?: string
  onItemClick?: (item: RadialCarouselItem) => void
  isVotingOpen?: boolean
  censorSubmissions?: boolean
}

const RadialCarousel: React.FC<RadialCarouselProps> = ({
  items,
  className,
  onItemClick,
  isVotingOpen = false,
  censorSubmissions = false
}) => {
  const slides = items && items.length > 0 ? items : Images
  const total = slides.length
  const [active, setActive] = React.useState(0)
  const isDragging = React.useRef(false)
  const lastWheelTime = React.useRef(0)

  // Keep active index in bounds if slides length changes
  React.useEffect(() => {
    if (active >= total && total > 0) {
      setActive(0)
    }
  }, [total, active])

  const go = React.useCallback(
    (dir: 1 | -1) => {
      if (total <= 0) return
      setActive((i) => (i + dir + total) % total)
    },
    [total]
  )

  // Keyboard navigation (Supports Up/Down as primary and Left/Right as fallback)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  // Vertical drag swipe
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 35
    if (info.offset.y > threshold) {
      go(-1)
    } else if (info.offset.y < -threshold) {
      go(1)
    }
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  // Smooth mouse wheel navigation with debounce
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now()
    if (now - lastWheelTime.current < 260) return
    if (Math.abs(e.deltaY) > 25) {
      lastWheelTime.current = now
      go(e.deltaY > 0 ? 1 : -1)
    }
  }

  if (total === 0) return null

  return (
    <Carousel
      className={cn('flex w-full flex-col items-center gap-3 py-2 select-none relative', className)}
    >
      {/* 3D Vertical Perspective Viewport */}
      <div
        className="relative w-full h-[360px] sm:h-[420px] md:h-[450px] flex items-center justify-center overflow-visible"
        style={{ perspective: 1100 }}
        onWheel={handleWheel}
      >
        {slides.map((slide, i) => {
          // Shortest signed offset around the loop
          const raw = (i - active + total) % total
          const offset = raw > total / 2 ? raw - total : raw
          const { y, rotateX, scale, opacity, zIndex } = arcStyle(offset)
          const isCenter = offset === 0

          const isPixelated = slide.isPixelated ?? (censorSubmissions && !isVotingOpen)

          return (
            <motion.div
              key={slide.id || i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none touch-none"
              style={{
                width: 'clamp(280px, 42vw, 440px)',
                zIndex,
                transformStyle: 'preserve-3d'
              }}
              animate={{ y, rotateX, scale, opacity }}
              transition={SPRING}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDragStart={() => {
                isDragging.current = true
              }}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (isDragging.current) return
                if (isCenter) {
                  if (slide.onClick) {
                    slide.onClick()
                  } else if (onItemClick) {
                    onItemClick(slide)
                  }
                } else {
                  setActive(i)
                }
              }}
              aria-label={`View ${slide.title}`}
            >
              {/* 16:9 Widescreen Card Frame */}
              <div
                className={cn(
                  'relative w-full aspect-[16/9] overflow-hidden rounded-2xl transition-all duration-300',
                  isCenter
                    ? 'shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(234,88,12,0.35)] ring-2 ring-fivem-orange/70 border border-white/20'
                    : 'shadow-xl border border-white/10 opacity-75 hover:opacity-100 hover:border-white/25'
                )}
              >
                {/* 16:9 Image */}
                <img
                  src={slide.image || MINIMAL_PLACEHOLDER_IMAGE}
                  alt={slide.title}
                  className={cn(
                    'size-full object-cover transition-transform duration-700 select-none',
                    isCenter && 'scale-100 group-hover:scale-105',
                    slide.isDisqualified && 'grayscale-[50%] opacity-70'
                  )}
                  draggable={false}
                  loading="lazy"
                />

                {/* Minimal Placeholder Center Viewfinder & Category Icon */}
                {slide.isPlaceholder && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-10">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm flex items-center justify-center mb-2.5 shadow-inner transition-transform group-hover:scale-105">
                      {slide.emoji ? (
                        <span className="text-2xl sm:text-3xl select-none">{slide.emoji}</span>
                      ) : (
                        <Camera size={24} className="text-white/40" />
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-white/50 uppercase">
                      No Submissions Yet
                    </span>
                  </div>
                )}

                {/* Pixelated / Voting Closed Badge */}
                {isPixelated && (
                  <div className="absolute top-2.5 left-2.5 bg-amber-500/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/50 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-amber-300 font-bold z-20 shadow-md">
                    <EyeOff size={11} className="text-amber-300" />
                    <span>Pixelated until voting</span>
                  </div>
                )}

                {/* Vote Count Badge (When Voting is Open or Votes exist) */}
                {typeof slide.voteCount === 'number' && slide.voteCount > 0 && (
                  <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-white font-bold z-20 shadow-md">
                    <Trophy size={11} className="text-amber-400" />
                    <span>{slide.voteCount} {slide.voteCount === 1 ? 'vote' : 'votes'}</span>
                  </div>
                )}

                {/* Gradient Veil */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

                {/* Active-only / Focused Widescreen Label Bar */}
                <motion.div
                  className="absolute inset-x-0 bottom-0 px-4 pb-3.5 pt-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-end justify-between gap-3 pointer-events-none"
                  animate={{ opacity: isCenter ? 1 : 0.4, y: isCenter ? 0 : 6 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-fivem-orange/30 border border-fivem-orange/40 text-fivem-orange text-[9px] font-bold font-mono tracking-wider uppercase">
                        {slide.category}
                      </span>
                    </div>
                    <p className="text-white text-xs sm:text-sm leading-snug font-bold font-display truncate drop-shadow-md">
                      {slide.title}
                    </p>
                  </div>

                  {isCenter && (
                    <span className="text-[10px] font-mono text-white/50 tracking-wider hidden sm:inline-flex items-center gap-1 shrink-0">
                      <Sparkles size={11} className="text-fivem-orange" />
                      {slide.isPlaceholder ? 'Click to enter' : 'Click to inspect'}
                    </span>
                  )}
                </motion.div>

                {/* Active Ring Aura */}
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30"
                  animate={{ opacity: isCenter ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </motion.div>
          )
        })}

        {/* Top and Bottom Floating Navigation Chevrons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-black/80 hover:bg-fivem-orange hover:text-white border border-white/20 text-white shadow-2xl z-30 cursor-pointer transition-all active:scale-95"
          onClick={() => go(-1)}
          aria-label="Previous slide up"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-black/80 hover:bg-fivem-orange hover:text-white border border-white/20 text-white shadow-2xl z-30 cursor-pointer transition-all active:scale-95"
          onClick={() => go(1)}
          aria-label="Next slide down"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>

        {/* Vertical Indicator Dots & Pill on the side */}
        <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 py-2 px-1 z-30 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                'rounded-full transition-all duration-300 cursor-pointer',
                idx === active
                  ? 'w-1.5 h-6 bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.7)]'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </Carousel>
  )
}

export default RadialCarousel
