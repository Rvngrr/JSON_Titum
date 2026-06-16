"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      aria-label="Log out"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      {loggingOut ? "Logging out..." : "Log Out"}
    </button>
  );
}
