/**
 * A cheap ceiling, not a security boundary.
 *
 * Two jobs: keep one bored visitor from eating the day's free quota, and keep
 * the site inside its provider's per-minute limits. In-memory and per
 * instance, so a site on several instances gets a looser limit than the number
 * suggests — pass your own `check` backed by Redis if that matters.
 */
export interface RateLimit {
  check(key: string): boolean | Promise<boolean>;
}

export function memoryRateLimit(max = 8, windowMs = 60_000): RateLimit {
  const hits = new Map<string, number[]>();

  return {
    check(key: string) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);

      if (hits.size > 500) {
        for (const [k, times] of hits) {
          if (!times.some((t) => now - t < windowMs)) hits.delete(k);
        }
      }
      return recent.length <= max;
    },
  };
}
