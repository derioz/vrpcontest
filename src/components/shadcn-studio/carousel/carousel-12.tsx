'use client'

import * as React from 'react'
import { motion, PanInfo } from 'motion/react'
import { EyeOff, Sparkles, Trophy, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
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
}

const Images: RadialCarouselItem[] = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-42.png',
    title: 'Mountain Sunrise',
    category: 'Nature'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-41.png',
    title: 'Ocean Waves',
    category: 'Seascape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-40.png',
    title: 'Forest Path',
    category: 'Woodland'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-39.png',
    title: 'Desert Dunes',
    category: 'Landscape'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-38.png',
    title: 'City Lights',
    category: 'Urban'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-74.png',
    title: 'Autumn Colors',
    category: 'Seasonal'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/gallery/image-75.png',
    title: 'Winter Frost',
    category: 'Weather'
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
                  src={slide.image}
                  alt={slide.title}
                  className={cn(
                    'size-full object-cover transition-transform duration-700 select-none',
                    isCenter && 'scale-100 group-hover:scale-105',
                    slide.isDisqualified && 'grayscale-[50%] opacity-70'
                  )}
                  draggable={false}
                  loading="lazy"
                />

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
                      Click to inspect
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
