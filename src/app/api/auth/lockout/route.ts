import { createAdminClient } from "@/lib/supabase/server";

/**
 * Account lockout API route.
 *
 * Handles checking, incrementing, and resetting the failed login attempt
 * counter for account lockout after 5 consecutive failures (15-minute lock).
 *
 * Uses the admin client to bypass RLS since lockout state must be managed
 * server-side regardless of the user's auth status.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

interface LockoutRequestBody {
  email: string;
  action: "check" | "increment" | "reset";
}

export async function POST(request: Request) {
  let body: LockoutRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { email, action } = body;

  if (!email || !action) {
    return Response.json(
      { error: "Missing required fields: email and action" },
      { status: 400 }
    );
  }

  if (!["check", "increment", "reset"].includes(action)) {
    return Response.json(
      { error: "Invalid action. Must be 'check', 'increment', or 'reset'" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch the profile by email
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, failed_login_attempts, locked_until")
    .eq("email", email)
    .single();

  if (fetchError || !profile) {
    // Return a generic response to avoid revealing whether the email exists
    return Response.json(
      { locked: false, remainingMs: 0, failedAttempts: 0 },
      { status: 200 }
    );
  }

  switch (action) {
    case "check": {
      return handleCheck(profile);
    }
    case "increment": {
      return handleIncrement(supabase, profile);
    }
    case "reset": {
      return handleReset(supabase, profile);
    }
  }
}

function handleCheck(profile: {
  failed_login_attempts: number;
  locked_until: string | null;
}) {
  const { locked, remainingMs } = getLockoutStatus(profile.locked_until);

  return Response.json({
    locked,
    remainingMs,
    failedAttempts: profile.failed_login_attempts,
    ...(locked && {
      message: `Account is locked. Try again in ${formatRemainingTime(remainingMs)}.`,
    }),
  });
}

async function handleIncrement(
  supabase: ReturnType<typeof createAdminClient>,
  profile: {
    id: string;
    failed_login_attempts: number;
    locked_until: string | null;
  }
) {
  // If already locked and lock hasn't expired, just return locked status
  const { locked, remainingMs } = getLockoutStatus(profile.locked_until);
  if (locked) {
    return Response.json({
      locked: true,
      remainingMs,
      failedAttempts: profile.failed_login_attempts,
      message: `Account is locked. Try again in ${formatRemainingTime(remainingMs)}.`,
    });
  }

  const newAttemptCount = profile.failed_login_attempts + 1;
  const shouldLock = newAttemptCount >= MAX_FAILED_ATTEMPTS;

  const updateData: {
    failed_login_attempts: number;
    locked_until?: string;
    updated_at: string;
  } = {
    failed_login_attempts: newAttemptCount,
    updated_at: new Date().toISOString(),
  };

  if (shouldLock) {
    const lockUntil = new Date(
      Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
    );
    updateData.locked_until = lockUntil.toISOString();
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id);

  if (updateError) {
    return Response.json(
      { error: "Failed to update login attempts" },
      { status: 500 }
    );
  }

  const lockoutRemainingMs = shouldLock
    ? LOCKOUT_DURATION_MINUTES * 60 * 1000
    : 0;

  return Response.json({
    locked: shouldLock,
    remainingMs: lockoutRemainingMs,
    failedAttempts: newAttemptCount,
    ...(shouldLock && {
      message: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
    }),
  });
}

async function handleReset(
  supabase: ReturnType<typeof createAdminClient>,
  profile: { id: string }
) {
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    return Response.json(
      { error: "Failed to reset login attempts" },
      { status: 500 }
    );
  }

  return Response.json({
    locked: false,
    remainingMs: 0,
    failedAttempts: 0,
  });
}

/**
 * Determines whether the account is currently locked and returns remaining lockout time.
 */
function getLockoutStatus(lockedUntil: string | null): {
  locked: boolean;
  remainingMs: number;
} {
  if (!lockedUntil) {
    return { locked: false, remainingMs: 0 };
  }

  const lockExpiry = new Date(lockedUntil).getTime();
  const now = Date.now();
  const remainingMs = lockExpiry - now;

  if (remainingMs <= 0) {
    // Lock has expired
    return { locked: false, remainingMs: 0 };
  }

  return { locked: true, remainingMs };
}

/**
 * Formats remaining lockout time into a human-readable string.
 */
function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} and ${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
