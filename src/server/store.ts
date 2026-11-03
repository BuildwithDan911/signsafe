import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redisClient: Redis | null = null;

if (redisUrl && redisToken) {
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
  value: any,
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
