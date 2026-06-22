"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Whether the card has a hover lift effect */
  hover?: boolean;
  /** Whether the card is slightly elevated with more shadow */
  elevated?: boolean;
  /** Optional rotation for decorative tilted cards */
  rotate?: number;
  /** Additional className */
  className?: string;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, hover = false, elevated = false, rotate, className = "", ...motionProps }, ref) => {
    const baseClasses = "glass-card";
    const hoverClasses = hover ? "glass-card-hover" : "";
    const elevatedShadow = elevated
      ? "shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
      : "";

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${hoverClasses} ${elevatedShadow} ${className}`}
        style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";
export default GlassCard;
