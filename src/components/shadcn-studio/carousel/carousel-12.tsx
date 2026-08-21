'use client'

import * as React from 'react'
import { motion, AnimatePresence, PanInfo } from 'motion/react'
import { EyeOff, Sparkles, Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { Carousel, CarouselNext, CarouselPrevious } from '../../ui/carousel'
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

// 16:9 cylinder arc parameters calibrated for widescreen landscape cards
const R = 340 // cylinder radius (px)
const THETA = 30 // angular step between neighbours (degrees)

const SPRING = { type: 'spring' as const, stiffness: 280, damping: 26, mass: 0.85 }

function arcStyle(offset: number) {
  const rad = (offset * THETA * Math.PI) / 180
  const abs = Math.abs(offset)

  return {
    x: R * Math.sin(rad),
    rotateY: -offset * THETA,
    scale: Math.max(0.52, 1 - abs * 0.15),
    opacity: abs > 2 ? 0 : Math.max(0.15, 1 - abs * 0.35),
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

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      const target = e.target as HTMLElement
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 40
    if (info.offset.x > threshold) {
      go(-1)
    } else if (info.offset.x < -threshold) {
      go(1)
    }
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  if (total === 0) return null

  return (
    <Carousel className={cn('flex w-full flex-col items-center gap-4 py-2 select-none relative', className)}>
      {/* 3D Perspective Viewport */}
      <div
        className="relative w-full h-[220px] sm:h-[260px] md:h-[290px] flex items-center justify-center overflow-visible"
        style={{ perspective: 1100 }}
      >
        {slides.map((slide, i) => {
          // Shortest signed offset around the loop
          const raw = (i - active + total) % total
          const offset = raw > total / 2 ? raw - total : raw
          const { x, rotateY, scale, opacity, zIndex } = arcStyle(offset)
          const isCenter = offset === 0

          const isPixelated = slide.isPixelated ?? (censorSubmissions && !isVotingOpen)

          return (
            <motion.div
              key={slide.id || i}
              className="absolute cursor-pointer select-none touch-none"
              style={{
                width: 'clamp(280px, 42vw, 420px)',
                marginLeft: 'calc(-1 * clamp(280px, 42vw, 420px) / 2)',
                zIndex,
                transformStyle: 'preserve-3d'
              }}
              animate={{ x, rotateY, scale, opacity }}
              transition={SPRING}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
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
                    ? 'shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(234,88,12,0.3)] ring-2 ring-fivem-orange/70 border border-white/20'
                    : 'shadow-lg border border-white/10 opacity-80 hover:opacity-100 hover:border-white/25'
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
      </div>

      {/* Navigation Controls and Indicator Dots */}
      <div className="flex items-center justify-between w-full max-w-sm px-4 pt-1 z-30">
        <CarouselPrevious
          className="static top-auto left-auto translate-y-0 h-8 w-8 bg-black/60 hover:bg-fivem-orange border-white/20 text-white"
          onClick={() => go(-1)}
          disabled={false}
        />

        {/* Dynamic Dot Indicators */}
        <div className="flex items-center gap-1.5 max-w-[200px] overflow-x-auto py-1 px-2 no-scrollbar">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                idx === active
                  ? 'w-6 bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.7)]'
                  : 'w-1.5 bg-white/25 hover:bg-white/50'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <CarouselNext
          className="static top-auto right-auto translate-y-0 h-8 w-8 bg-black/60 hover:bg-fivem-orange border-white/20 text-white"
          onClick={() => go(1)}
          disabled={false}
        />
      </div>
    </Carousel>
  )
}

export default RadialCarousel
