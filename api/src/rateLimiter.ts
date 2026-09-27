export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  now: () => number = Date.now,
) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let checks = 0;

  return (key: string): boolean => {
    const time = now();

    if (++checks % 256 === 0) {
      for (const [bucketKey, bucket] of buckets) {
        if (time >= bucket.resetAt) buckets.delete(bucketKey);
      }
    }

    const bucket = buckets.get(key);
    if (!bucket || time >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: time + windowMs });
      return true;
    }

    if (bucket.count >= maxRequests) return false;
    bucket.count++;
    return true;
  };
}