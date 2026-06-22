"use client";

import { motion } from "framer-motion";

interface OrbConfig {
  color: string;
  size: string;
  x: string;
  y: string;
  delay: number;
  blur?: string;
}

const defaultOrbs: OrbConfig[] = [
  // Large orbs — subtle background washes, spread far apart
  { color: "bg-[var(--orb-pink)]", size: "h-56 w-56", x: "left-[-10%]", y: "top-[-10%]", delay: 0, blur: "blur-[80px]" },
  { color: "bg-[var(--orb-blue)]", size: "h-52 w-52", x: "right-[-8%]", y: "bottom-[-8%]", delay: 2, blur: "blur-[75px]" },
  // Medium-large orbs — spread across the viewport
  { color: "bg-[var(--orb-lavender)]", size: "h-40 w-40", x: "left-[50%]", y: "top-[2%]", delay: 1.5, blur: "blur-[60px]" },
  { color: "bg-[var(--orb-pink)]", size: "h-36 w-36", x: "left-[3%]", y: "bottom-[25%]", delay: 4, blur: "blur-[55px]" },
  { color: "bg-[var(--orb-blue)]", size: "h-36 w-36", x: "right-[5%]", y: "top-[40%]", delay: 1, blur: "blur-[55px]" },
  { color: "bg-[var(--orb-lavender)]", size: "h-32 w-32", x: "left-[75%]", y: "bottom-[5%]", delay: 3.2, blur: "blur-[50px]" },
  // Medium orbs — mid-ground pops, well separated
  { color: "bg-[var(--orb-blue)]", size: "h-28 w-28", x: "left-[25%]", y: "top-[70%]", delay: 4.5, blur: "blur-[44px]" },
  { color: "bg-[var(--orb-pink)]", size: "h-24 w-24", x: "left-[65%]", y: "top-[60%]", delay: 3, blur: "blur-[40px]" },
  { color: "bg-[var(--orb-lavender)]", size: "h-24 w-24", x: "left-[85%]", y: "top-[12%]", delay: 2.2, blur: "blur-[38px]" },
  { color: "bg-[var(--orb-blue)]", size: "h-20 w-20", x: "left-[10%]", y: "top-[15%]", delay: 5, blur: "blur-[34px]" },
  { color: "bg-[var(--orb-pink)]", size: "h-20 w-20", x: "left-[45%]", y: "bottom-[35%]", delay: 1.8, blur: "blur-[32px]" },
  // Small orbs — tighter glows, scattered
  { color: "bg-[var(--orb-lavender)]", size: "h-14 w-14", x: "left-[38%]", y: "top-[28%]", delay: 3.8, blur: "blur-2xl" },
  { color: "bg-[var(--orb-pink)]", size: "h-12 w-12", x: "left-[18%]", y: "top-[50%]", delay: 2.5, blur: "blur-xl" },
  { color: "bg-[var(--orb-blue)]", size: "h-12 w-12", x: "right-[30%]", y: "bottom-[55%]", delay: 5.5, blur: "blur-xl" },
  { color: "bg-[var(--orb-lavender)]", size: "h-10 w-10", x: "left-[60%]", y: "top-[80%]", delay: 1.2, blur: "blur-lg" },
  { color: "bg-[var(--orb-pink)]", size: "h-10 w-10", x: "left-[80%]", y: "top-[55%]", delay: 4.2, blur: "blur-lg" },
  { color: "bg-[var(--orb-blue)]", size: "h-8 w-8", x: "left-[5%]", y: "top-[80%]", delay: 6, blur: "blur-lg" },
  // Tiny orbs — crisp dots
  { color: "bg-[var(--orb-pink)]", size: "h-6 w-6", x: "left-[92%]", y: "top-[68%]", delay: 5.8, blur: "blur-md" },
  { color: "bg-[var(--orb-blue)]", size: "h-6 w-6", x: "left-[28%]", y: "top-[8%]", delay: 3.5, blur: "blur-md" },
  { color: "bg-[var(--orb-lavender)]", size: "h-5 w-5", x: "left-[70%]", y: "bottom-[72%]", delay: 4.5, blur: "blur-sm" },
  { color: "bg-[var(--orb-pink)]", size: "h-4 w-4", x: "left-[52%]", y: "top-[88%]", delay: 2.8, blur: "blur-sm" },
  { color: "bg-[var(--orb-blue)]", size: "h-4 w-4", x: "left-[90%]", y: "top-[25%]", delay: 6.5, blur: "blur-sm" },
  { color: "bg-[var(--orb-lavender)]", size: "h-3 w-3", x: "left-[42%]", y: "top-[42%]", delay: 3.8, blur: "blur-[4px]" },
];

interface FloatingOrbsProps {
  orbs?: OrbConfig[];
  showDots?: boolean;
  /** More particles for hero/fun pages */
  density?: "normal" | "high";
}

export default function FloatingOrbs({ orbs = defaultOrbs, showDots = true, density = "normal" }: FloatingOrbsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Gradient orbs */}
      {orbs.map((orb, i) => {
        // Big ones toned down, everything else stays visible and punchy
        const isBig = i < 2;
        const isMedLarge = i >= 2 && i < 6;
        const isMedium = i >= 6 && i < 11;
        const isSmall = i >= 11 && i < 17;
        const baseOpacity = isBig ? 0.55 : isMedLarge ? 0.68 : isMedium ? 0.76 : isSmall ? 0.82 : 0.88;
        const peakOpacity = isBig ? 0.78 : isMedLarge ? 0.88 : isMedium ? 0.94 : isSmall ? 0.98 : 1;

        return (
          <motion.div
            key={`orb-${i}`}
            className={`absolute rounded-full ${orb.blur || "blur-3xl"} ${orb.size} ${orb.x} ${orb.y} ${orb.color}`}
            animate={{
              y: [0, -18 - i * 1.5, 8 + i, -10 + i, 0],
              x: [0, 8 + i, -5 - i * 0.8, 10 - i, 0],
              scale: [1, 1.04, 0.97, 1.03, 1],
              opacity: [baseOpacity, peakOpacity, baseOpacity * 0.95, peakOpacity * 0.93, baseOpacity],
            }}
            transition={{
              duration: 10 + i * 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            }}
          />
        );
      })}

      {/* Floating dots / particles */}
      {showDots && (
        <>
          {/* Layer 1: Small bright dots */}
          <motion.div
            className="absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-[var(--orb-pink)]"
            animate={{ y: [0, -14, 4, -8, 0], x: [0, 6, -3, 8, 0], opacity: [0.6, 1, 0.7, 0.95, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-[38%] top-[10%] h-1.5 w-1.5 rounded-full bg-[var(--orb-lavender)]"
            animate={{ y: [0, -10, 6, -4, 0], x: [0, -5, 3, -6, 0], opacity: [0.5, 0.95, 0.6, 0.85, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute left-[78%] top-[60%] h-2.5 w-2.5 rounded-full bg-[var(--orb-blue)]"
            animate={{ y: [0, -12, 8, -6, 0], x: [0, 7, -5, 4, 0], opacity: [0.4, 0.9, 0.5, 0.8, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute left-[50%] top-[78%] h-2 w-2 rounded-full bg-[var(--orb-pink)]"
            animate={{ y: [0, -8, 12, -4, 0], x: [0, -4, 6, -8, 0], opacity: [0.5, 0.9, 0.6, 0.8, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
          <motion.div
            className="absolute left-[88%] top-[18%] h-1.5 w-1.5 rounded-full bg-[var(--orb-lavender)]"
            animate={{ y: [0, 10, -6, 8, 0], x: [0, -6, 4, -3, 0], opacity: [0.4, 0.8, 0.5, 0.7, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
          <motion.div
            className="absolute left-[22%] top-[70%] h-2 w-2 rounded-full bg-[var(--orb-blue)]"
            animate={{ y: [0, -6, 10, -12, 0], x: [0, 8, -4, 6, 0], opacity: [0.45, 0.85, 0.5, 0.7, 0.45] }}
            transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />

          {/* Layer 2: Tiny sparkle dots (more subtle) */}
          <motion.div
            className="absolute left-[5%] top-[40%] h-1 w-1 rounded-full bg-[var(--accent)]"
            animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute left-[65%] top-[5%] h-1 w-1 rounded-full bg-[var(--accent)]"
            animate={{ scale: [0, 1, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute left-[92%] top-[45%] h-1 w-1 rounded-full bg-[var(--accent)]"
            animate={{ scale: [0, 1.2, 0], opacity: [0, 0.6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
          />
          <motion.div
            className="absolute left-[30%] top-[90%] h-1 w-1 rounded-full bg-[var(--accent)]"
            animate={{ scale: [0, 1, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />

          {/* High density extras */}
          {density === "high" && (
            <>
              <motion.div
                className="absolute left-[45%] top-[35%] h-3 w-3 rounded-full bg-[var(--orb-pink)] blur-sm"
                animate={{ y: [0, -20, 0, 15, 0], x: [0, -10, 5, -8, 0], opacity: [0.3, 0.6, 0.4, 0.5, 0.3] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <motion.div
                className="absolute left-[15%] top-[85%] h-3 w-3 rounded-full bg-[var(--orb-lavender)] blur-sm"
                animate={{ y: [0, -15, 8, -10, 0], x: [0, 12, -6, 8, 0], opacity: [0.3, 0.55, 0.35, 0.5, 0.3] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
              />
              <motion.div
                className="absolute left-[82%] top-[80%] h-2 w-2 rounded-full bg-[var(--orb-blue)]"
                animate={{ y: [0, 12, -8, 6, 0], x: [0, -8, 4, -6, 0], opacity: [0.4, 0.8, 0.45, 0.65, 0.4] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              />
              <motion.div
                className="absolute left-[60%] top-[50%] h-1 w-1 rounded-full bg-[var(--accent)]"
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 4.2 }}
              />
              <motion.div
                className="absolute left-[3%] top-[15%] h-1 w-1 rounded-full bg-[var(--accent)]"
                animate={{ scale: [0, 1, 0], opacity: [0, 0.9, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
            </>
          )}
        </>
      )}

      {/* Floating ring decorations */}
      <motion.div
        className="absolute left-[8%] top-[45%] h-8 w-8 rounded-full border border-[var(--orb-pink)]"
        animate={{ y: [0, -10, 0, 8, 0], rotate: [0, 180, 360], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[75%] top-[30%] h-6 w-6 rounded-full border border-[var(--orb-lavender)]"
        animate={{ y: [0, 8, 0, -6, 0], rotate: [0, -180, -360], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute left-[50%] top-[88%] h-5 w-5 rounded-full border border-[var(--orb-blue)]"
        animate={{ y: [0, -12, 0, 6, 0], rotate: [0, 90, 180], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
      />
    </div>
  );
}
