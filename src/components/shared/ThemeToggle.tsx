"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type Theme } from "./ThemeProvider";

const nextTheme: Record<Theme, Theme> = {
  light: "dark",
  dark: "auto",
  auto: "light",
};

const labels: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  auto: "Auto",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme[theme])}
      aria-label={`Theme: ${labels[theme]}. Click to switch.`}
      className="glass-card flex h-8 items-center gap-2 !rounded-[24px] !border-[rgba(255,255,255,0.6)] px-3.5 text-[var(--text-secondary)] shadow-[0_4px_14px_rgba(91,192,190,0.1)] transition-all hover:shadow-[0_6px_20px_rgba(91,192,190,0.25)] hover:text-[var(--accent)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" && (
          <motion.svg
            key="sun"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </motion.svg>
        )}
        {theme === "dark" && (
          <motion.svg
            key="moon"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </motion.svg>
        )}
        {theme === "auto" && (
          <motion.svg
            key="auto"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </motion.svg>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {labels[theme]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
