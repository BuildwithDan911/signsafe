import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redisClient: Redis | null = null;

// Keep unit tests deterministic and offline; production and development still
// use Upstash whenever its credentials are configured.
if (redisUrl && redisToken && process.env.NODE_ENV !== "test") {
  try {
    redisClient = new Redis({
      url: redisUrl.replace(/['"]/g, ""),
      token: redisToken.replace(/['"]/g, ""),
    });
  } catch (err) {
    console.warn("[store] Failed to initialize Upstash Redis, falling back to disk cache:", err);
  }
}

const CACHE_DIR = path.join(process.cwd(), ".cache");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function storeGet<T>(key: string): Promise<T | null> {
  if (redisClient) {
    try {
      const data = await redisClient.get<T>(key);
      if (data !== null && data !== undefined) {
        return data;
      }
    } catch (err) {
      console.warn(`[store] Redis get error for key ${key}:`, err);
    }
  }

  // Disk fallback
  try {
    ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (fileData.expiresAt && fileData.expiresAt < Date.now()) {
        fs.unlinkSync(filePath);
        return null;
      }
      return fileData.value as T;
    }
  } catch (err) {
    console.warn(`[store] Disk cache get error for key ${key}:`, err);
  }

  return null;
}

export async function storeSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 2592000 // default 30 days
): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(key, value, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn(`[store] Redis set error for key ${key}:`, err);
    }
  }

  // Disk fallback
  try {
    ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    const payload = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
  } catch (err) {
    console.warn(`[store] Disk cache set error for key ${key}:`, err);
  }
}

export async function recordDailyCredits(amount: number): Promise<number> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `signsafe:credits:${dateKey}`;

  if (redisClient) {
    try {
      const total = await redisClient.incrby(key, amount);
      await redisClient.expire(key, 86400 * 7); // keep 7 days
      return total;
    } catch (err) {
      console.warn("[store] Redis incrby error:", err);
    }
  }

  // Disk fallback
  try {
    const current = (await storeGet<number>(key)) || 0;
    const nextTotal = current + amount;
    await storeSet(key, nextTotal, 86400 * 7);
    return nextTotal;
  } catch {
    return amount;
  }
}

export async function getDailyCreditsUsed(): Promise<number> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `signsafe:credits:${dateKey}`;
  const total = await storeGet<number>(key);
  return total || 0;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetSeconds: number;
}

export async function checkRateLimit(
  ip: string,
  limit: number = 5,
  windowSeconds: number = 3600,
  keyPrefix: string = "ratelimit:check:"
): Promise<RateLimitResult> {
  const safeIp = ip.trim() || "127.0.0.1";
  const key = `${keyPrefix}${safeIp}`;
  const now = Date.now();

  if (redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      let ttl = await redisClient.ttl(key);
      if (ttl < 0) ttl = windowSeconds;
      return {
        allowed: count <= limit,
        count,
        remaining: Math.max(0, limit - count),
        resetSeconds: ttl,
      };
    } catch (err) {
      console.warn(`[store] Redis rate limit error for key ${key}:`, err);
    }
  }

  // Disk cache fallback
  try {
    ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    let data: { count: number; expiresAt: number } = {
      count: 0,
      expiresAt: now + windowSeconds * 1000,
    };

    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (parsed.expiresAt && parsed.expiresAt > now) {
          data = parsed;
        }
      } catch {
        // file unreadable, reset
      }
    }

    data.count += 1;
    if (!data.expiresAt || data.expiresAt <= now) {
      data.expiresAt = now + windowSeconds * 1000;
    }

    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");

    const resetSeconds = Math.max(1, Math.ceil((data.expiresAt - now) / 1000));
    return {
      allowed: data.count <= limit,
      count: data.count,
      remaining: Math.max(0, limit - data.count),
      resetSeconds,
    };
  } catch (err) {
    console.warn(`[store] Disk rate limit error for key ${key}:`, err);
    return {
      allowed: true,
      count: 1,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }
}

export async function resetRateLimit(
  ip: string,
  keyPrefix: string = "ratelimit:check:"
): Promise<void> {
  const safeIp = ip.trim() || "127.0.0.1";
  const key = `${keyPrefix}${safeIp}`;
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn(`[store] Redis del error for key ${key}:`, err);
    }
  }
  try {
    ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[store] Disk del error for key ${key}:`, err);
  }
}

