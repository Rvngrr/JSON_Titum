"use client";

import { motion } from "framer-motion";

/**
 * Decorative floating orbs per DESIGN-SYSTEM.md:
 * - Fixed position, behind all content (-z-10)
 * - Reduced opacity (0.25) with doubled blur (80px)
 * - Hidden on mobile, only 3 orbs (pink, blue, lavender)
 * - Slow subtle animation (20s+), respects prefers-reduced-motion
 * - No dot accents
 */
export default function FloatingOrbs() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-25 hidden md:block"
      aria-hidden="true"
    >
      {/* Pink orb — top right */}
      <motion.div
        className="absolute -top-40 -right-40 h-72 w-72 rounded-full"
        style={{
          background: "radial-gradient(circle, #F8D0E0, #FDDDE6, transparent)",
          filter: "blur(80px)",
        }}
        animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Blue orb — bottom left */}
      <motion.div
        className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full"
        style={{
          background: "radial-gradient(circle, #C4E4F9, #DFF1FB, transparent)",
          filter: "blur(80px)",
        }}
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      {/* Lavender orb — center left */}
      <motion.div
        className="absolute top-1/2 -left-20 h-72 w-72 rounded-full"
        style={{
          background: "radial-gradient(circle, #C9B8F7, #E8DEFF, transparent)",
          filter: "blur(80px)",
        }}
        animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}
