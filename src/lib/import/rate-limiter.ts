import { createAdminClient } from '../supabase/server';
import type { RateLimitStatus } from './types';

const API_SOURCE = 'jsearch';
const MONTHLY_LIMIT = 200;
const NEAR_LIMIT_THRESHOLD = 180;

/**
 * Returns the current calendar month in 'YYYY-MM' format.
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns an ISO timestamp for the end of the current month (start of next month).
 */
function getMonthEndTimestamp(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Resets the rate limit counter if the stored month_year differs from the current month.
 * This ensures the counter resets at the start of each new calendar month.
 */
export async function resetIfNewMonth(): Promise<void> {
  const supabase = createAdminClient();
  const currentMonthYear = getCurrentMonthYear();

  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('id, month_year')
    .eq('api_source', API_SOURCE)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row exists yet — create one with current month
    await supabase.from('api_rate_limits').insert({
      api_source: API_SOURCE,
      request_count: 0,
      month_year: currentMonthYear,
      limit_max: MONTHLY_LIMIT,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  if (error) {
    // Database unreachable — fail open silently
    console.warn('[RateLimiter] Failed to check month reset:', error.message);
    return;
  }

  if (data && data.month_year !== currentMonthYear) {
    // New month — reset the counter
    await supabase
      .from('api_rate_limits')
      .update({
        request_count: 0,
        month_year: currentMonthYear,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
  }
}

/**
 * Checks the current rate limit status. Resets the counter if a new month has started.
 * Fails open with a warning if the database is unreachable.
 */
export async function checkRateLimit(): Promise<RateLimitStatus> {
  try {
    // Ensure the counter is reset if a new month has started
    await resetIfNewMonth();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('api_rate_limits')
      .select('request_count, limit_max, month_year')
      .eq('api_source', API_SOURCE)
      .single();

    if (error) {
      // Fail open — allow request but warn
      console.warn('[RateLimiter] Database unreachable, failing open:', error.message);
      return {
        currentCount: 0,
        limit: MONTHLY_LIMIT,
        remaining: MONTHLY_LIMIT,
        isExhausted: false,
        isNearLimit: false,
        resetsAt: getMonthEndTimestamp(),
      };
    }

    const currentCount = data.request_count ?? 0;
    const limit = data.limit_max ?? MONTHLY_LIMIT;
    const remaining = Math.max(0, limit - currentCount);
    const isExhausted = currentCount >= limit;
    const isNearLimit = currentCount >= NEAR_LIMIT_THRESHOLD && !isExhausted;

    return {
      currentCount,
      limit,
      remaining,
      isExhausted,
      isNearLimit,
      resetsAt: getMonthEndTimestamp(),
    };
  } catch (err) {
    // Fail open — allow request but warn
    console.warn('[RateLimiter] Unexpected error, failing open:', err);
    return {
      currentCount: 0,
      limit: MONTHLY_LIMIT,
      remaining: MONTHLY_LIMIT,
      isExhausted: false,
      isNearLimit: false,
      resetsAt: getMonthEndTimestamp(),
    };
  }
}

/**
 * Increments the monthly request count by 1.
 * Should be called after each successful API request to the external service.
 */
export async function incrementRequestCount(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const currentMonthYear = getCurrentMonthYear();

    // Upsert: if the row exists, increment; if not, create with count 1
    const { data: existing } = await supabase
      .from('api_rate_limits')
      .select('id, request_count')
      .eq('api_source', API_SOURCE)
      .single();

    if (existing) {
      await supabase
        .from('api_rate_limits')
        .update({
          request_count: (existing.request_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('api_rate_limits').insert({
        api_source: API_SOURCE,
        request_count: 1,
        month_year: currentMonthYear,
        limit_max: MONTHLY_LIMIT,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Fail open — log but don't block the operation
    console.warn('[RateLimiter] Failed to increment request count:', err);
  }
}
