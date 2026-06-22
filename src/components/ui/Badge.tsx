"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Animate entrance */
  animate?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
  success: "bg-[var(--success-bg)] text-[var(--success-text)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
  error: "bg-[var(--error-bg)] text-[var(--error-text)]",
  info: "bg-[var(--info-bg)] text-[var(--info-text)]",
  accent: "bg-[var(--accent-light)] text-[var(--accent)]",
};

export default function Badge({
  children,
  variant = "default",
  animate = false,
  className = "",
}: BadgeProps) {
  const Component = animate ? motion.span : "span";
  const animateProps = animate
    ? { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 } }
    : {};

  return (
    <Component
      className={`badge-pill inline-flex items-center gap-1 ${variantClasses[variant]} ${className}`}
      {...animateProps}
    >
      {children}
    </Component>
  );
}
