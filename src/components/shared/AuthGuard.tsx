"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side auth guard that verifies the user session on mount.
 * Redirects to login if no valid session exists (handles back-button after logout).
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // No valid session — redirect to login
        router.replace("/login");
        return;
      }

      setAuthenticated(true);
      setChecking(false);
    }

    checkAuth();

    // Also listen for auth state changes (e.g., session expiry)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          router.replace("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
