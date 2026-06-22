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
  { color: "bg-[var(--orb-pink)]", size: "h-72 w-72", x: "left-[-10%]", y: "top-[-12%]", delay: 0 },
  { color: "bg-[var(--orb-blue)]", size: "h-56 w-56", x: "left-[25%]", y: "bottom-[-8%]", delay: 1.5 },
  { color: "bg-[var(--orb-lavender)]", size: "h-44 w-44", x: "right-[2%]", y: "bottom-[15%]", delay: 3 },
  { color: "bg-[var(--orb-pink)]", size: "h-28 w-28", x: "left-[55%]", y: "top-[5%]", delay: 2, blur: "blur-2xl" },
  { color: "bg-[var(--orb-blue)]", size: "h-24 w-24", x: "left-[8%]", y: "top-[55%]", delay: 4, blur: "blur-2xl" },
  { color: "bg-[var(--orb-lavender)]", size: "h-32 w-32", x: "right-[15%]", y: "top-[-5%]", delay: 1, blur: "blur-2xl" },
  { color: "bg-[var(--orb-pink)]", size: "h-16 w-16", x: "left-[70%]", y: "bottom-[35%]", delay: 5, blur: "blur-xl" },
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
      {orbs.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className={`absolute rounded-full ${orb.blur || "blur-3xl"} ${orb.size} ${orb.x} ${orb.y} ${orb.color}`}
          animate={{
            y: [0, -25 - i * 6, 10 + i * 4, -15 + i * 3, 0],
            x: [0, 12 + i * 3, -8 - i * 2, 15 - i * 4, 0],
            scale: [1, 1.1 - i * 0.01, 0.95 + i * 0.01, 1.05, 1],
            opacity: [0.45, 0.65, 0.4, 0.55, 0.45],
          }}
          transition={{
            duration: 14 + i * 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}

      {/* Floating dots / particles */}
      {showDots && (
        <>
          {/* Layer 1: Small bright dots */}
          <motion.div
            className="absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-[var(--orb-pink)]"
            animate={{ y: [0, -14, 4, -8, 0], x: [0, 6, -3, 8, 0], opacity: [0.5, 1, 0.6, 0.9, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-[38%] top-[10%] h-1.5 w-1.5 rounded-full bg-[var(--orb-lavender)]"
            animate={{ y: [0, -10, 6, -4, 0], x: [0, -5, 3, -6, 0], opacity: [0.4, 0.9, 0.5, 0.8, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute left-[78%] top-[60%] h-2.5 w-2.5 rounded-full bg-[var(--orb-blue)]"
            animate={{ y: [0, -12, 8, -6, 0], x: [0, 7, -5, 4, 0], opacity: [0.3, 0.8, 0.4, 0.7, 0.3] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute left-[50%] top-[78%] h-2 w-2 rounded-full bg-[var(--orb-pink)]"
            animate={{ y: [0, -8, 12, -4, 0], x: [0, -4, 6, -8, 0], opacity: [0.4, 0.85, 0.5, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
          <motion.div
            className="absolute left-[88%] top-[18%] h-1.5 w-1.5 rounded-full bg-[var(--orb-lavender)]"
            animate={{ y: [0, 10, -6, 8, 0], x: [0, -6, 4, -3, 0], opacity: [0.3, 0.7, 0.4, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
          <motion.div
            className="absolute left-[22%] top-[70%] h-2 w-2 rounded-full bg-[var(--orb-blue)]"
            animate={{ y: [0, -6, 10, -12, 0], x: [0, 8, -4, 6, 0], opacity: [0.35, 0.75, 0.4, 0.6, 0.35] }}
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
                animate={{ y: [0, -20, 0, 15, 0], x: [0, -10, 5, -8, 0], opacity: [0.2, 0.5, 0.3, 0.4, 0.2] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <motion.div
                className="absolute left-[15%] top-[85%] h-3 w-3 rounded-full bg-[var(--orb-lavender)] blur-sm"
                animate={{ y: [0, -15, 8, -10, 0], x: [0, 12, -6, 8, 0], opacity: [0.2, 0.45, 0.25, 0.4, 0.2] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
              />
              <motion.div
                className="absolute left-[82%] top-[80%] h-2 w-2 rounded-full bg-[var(--orb-blue)]"
                animate={{ y: [0, 12, -8, 6, 0], x: [0, -8, 4, -6, 0], opacity: [0.3, 0.7, 0.35, 0.55, 0.3] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              />
              <motion.div
                className="absolute left-[60%] top-[50%] h-1 w-1 rounded-full bg-[var(--accent)]"
                animate={{ scale: [0, 1.5, 0], opacity: [0, 0.9, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 4.2 }}
              />
              <motion.div
                className="absolute left-[3%] top-[15%] h-1 w-1 rounded-full bg-[var(--accent)]"
                animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
            </>
          )}
        </>
      )}

      {/* Floating ring decorations */}
      <motion.div
        className="absolute left-[8%] top-[45%] h-8 w-8 rounded-full border border-[var(--orb-pink)]"
        animate={{ y: [0, -10, 0, 8, 0], rotate: [0, 180, 360], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[75%] top-[30%] h-6 w-6 rounded-full border border-[var(--orb-lavender)]"
        animate={{ y: [0, 8, 0, -6, 0], rotate: [0, -180, -360], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute left-[50%] top-[88%] h-5 w-5 rounded-full border border-[var(--orb-blue)]"
        animate={{ y: [0, -12, 0, 6, 0], rotate: [0, 90, 180], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
      />
    </div>
  );
}
