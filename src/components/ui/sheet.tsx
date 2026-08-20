"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay asChild {...props}>
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-0 z-[200] bg-black/80 backdrop-blur-md",
        className
      )}
    />
  </SheetPrimitive.Overlay>
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "top" | "bottom" | "left" | "right";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const getMotionVariants = () => {
    switch (side) {
      case "top":
        return {
          initial: { y: "-100%", opacity: 0 },
          animate: { y: "0%", opacity: 1 },
          exit: { y: "-100%", opacity: 0 },
        };
      case "bottom":
        return {
          initial: { y: "100%", opacity: 0 },
          animate: { y: "0%", opacity: 1 },
          exit: { y: "100%", opacity: 0 },
        };
      case "left":
        return {
          initial: { x: "-100%", opacity: 0 },
          animate: { x: "0%", opacity: 1 },
          exit: { x: "-100%", opacity: 0 },
        };
      case "right":
      default:
        return {
          initial: { x: "100%", opacity: 0.9 },
          animate: { x: "0%", opacity: 1 },
          exit: { x: "100%", opacity: 0 },
        };
    }
  };

  const variants = getMotionVariants();

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content asChild {...props}>
        <motion.div
          ref={ref as any}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 34,
            mass: 0.8,
          }}
          className={cn(
            "fixed z-[210] bg-[#09090d]/98 border-white/10 p-6 shadow-[0_0_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl flex flex-col text-white outline-none",
            side === "top" && "inset-x-0 top-0 border-b",
            side === "bottom" && "inset-x-0 bottom-0 border-t",
            side === "left" && "inset-y-0 left-0 h-full w-full sm:w-[440px] md:w-[480px] border-r",
            side === "right" && "inset-y-0 right-0 h-full w-full sm:w-[440px] md:w-[480px] border-l",
            className
          )}
        >
          {children}
          <SheetPrimitive.Close className="absolute right-4 top-4 z-20 rounded-full p-2 bg-white/[0.05] hover:bg-white/15 border border-white/10 text-white/50 hover:text-white transition-all cursor-pointer focus:outline-none active:scale-95">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </motion.div>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-left pr-8 pb-3 border-b border-white/[0.08]",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-white/[0.08] mt-auto",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-black font-display text-white tracking-tight leading-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-xs text-white/50 font-sans leading-relaxed", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
