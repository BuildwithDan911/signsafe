/**
 * Validates required environment variables at import time.
 * Import this module from src/app/layout.tsx so missing config fails fast
 * at build/boot rather than surfacing per-request errors in production.
 */

const required: Record<string, string | undefined> = {
  CLOCKED_API_KEY: process.env.CLOCKED_API_KEY,
  SHARE_SECRET: process.env.SHARE_SECRET,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value || value.length === 0)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      "Set them in .env.local (development) or your platform's env settings (production)."
  );
}

export const env = {
  CLOCKED_API_KEY: required.CLOCKED_API_KEY!,
  CLOCKED_BASE_URL: process.env.CLOCKED_BASE_URL || "https://clocked.rezolve.ai/clocked",
  DAILY_CREDIT_CAP: parseInt(process.env.DAILY_CREDIT_CAP || "3000", 10),
  LIVE_CHECKS_ENABLED: process.env.LIVE_CHECKS_ENABLED === "true",
  MOCK_MODE: process.env.MOCK_MODE === "true",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  SHARE_SECRET: required.SHARE_SECRET!,
} as const;
