import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use sessionStorage so the session is cleared on page refresh/tab close
        // Users must re-login after refreshing the page
        persistSession: true,
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      },
    }
  );
}
