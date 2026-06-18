import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Returns the role-appropriate dashboard path for a given user role.
 */
function getDashboardPath(role: string | undefined): string {
  if (role === "hr_user") return "/hr";
  return "/applicant";
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are not configured, allow the request through
  // to avoid crashing the middleware
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session to keep it alive.
  // IMPORTANT: Do not remove this line. It refreshes the user's session
  // and ensures the auth token is valid for server components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define auth pages (login/register)
  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/register" ||
    pathname.startsWith("/register");

  // Define role-specific route prefixes
  const isApplicantRoute = pathname.startsWith("/applicant");
  const isHrRoute = pathname.startsWith("/hr");

  // --- Unauthenticated user handling ---
  if (!user) {
    // Allow access to auth pages and root
    if (isAuthPage || pathname === "/") {
      return supabaseResponse;
    }
    // Redirect unauthenticated users to login for all protected routes
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // --- Authenticated user handling ---
  const role = user.user_metadata?.role as string | undefined;
  const dashboardPath = getDashboardPath(role);

  // Redirect authenticated users away from auth pages to their dashboard
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  // Redirect root path to role-appropriate dashboard
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  // Enforce role-based access on protected routes
  if (isApplicantRoute && role !== "applicant") {
    // Non-applicant trying to access /applicant/* → redirect to their dashboard
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  if (isHrRoute && role !== "hr_user") {
    // Non-HR user trying to access /hr/* → redirect to their dashboard
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  // Add cache-control headers to prevent browser from caching protected pages
  // This ensures back-button after logout triggers a fresh request to middleware
  supabaseResponse.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  supabaseResponse.headers.set("Pragma", "no-cache");
  supabaseResponse.headers.set("Expires", "0");

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
