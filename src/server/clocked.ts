import "server-only";
import crypto from "crypto";
import { storeGet, storeSet, recordDailyCredits, getDailyCreditsUsed } from "./store";

export type ClockedEndpoint =
  | "injection"
  | "script"
  | "pii"
  | "extract"
  | "decide"
  | "fill"
  | "grounding"
  | "compare"
  | "rerank"
  | "pipeline";

export interface ClockedMeta {
  credits: number;
  modelMs: number;
  costUsd?: number;
  costBasis?: string;
  transport?: string;
  cached: boolean;
}

export interface ClockedResponse<T = any> {
  data: T;
  meta: ClockedMeta;
}

// In-process sequential queue to guarantee 1 concurrent request at a time
let queueTail: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queueTail.then(task, task);
  queueTail = result.catch(() => {});
  return result;
}

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalStringify).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify(record[k])).join(",") +
    "}"
  );
}

function createDeterministicUUID(endpoint: string, canonicalBody: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${endpoint}:${canonicalBody}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export async function callClocked<T = any>(
  endpoint: ClockedEndpoint,
  body: Record<string, any>,
  options: { bypassCache?: boolean; customKey?: string } = {}
): Promise<ClockedResponse<T>> {
  const apiKey = process.env.CLOCKED_API_KEY;
  if (!apiKey) {
    throw new Error("Clocked key problem: CLOCKED_API_KEY is missing on server.");
  }

  if (process.env.MOCK_MODE === "true") {
    throw new Error("Mock mode: Live calls are disabled by MOCK_MODE.");
  }

  if (process.env.LIVE_CHECKS_ENABLED !== "true") {
    throw new Error("Live checks are paused: LIVE_CHECKS_ENABLED is not true.");
  }

  const dailyCap = parseInt(process.env.DAILY_CREDIT_CAP || "3000", 10);
  const creditsUsedToday = await getDailyCreditsUsed();
  if (creditsUsedToday >= dailyCap) {
    throw new Error(`Daily credit cap reached (${creditsUsedToday}/${dailyCap} credits).`);
  }

  const baseUrl = (process.env.CLOCKED_BASE_URL || "https://clocked.rezolve.ai/clocked").replace(/\/$/, "");
  const canonicalBody = canonicalStringify(body);
  const requestHash = crypto
    .createHash("sha256")
    .update(`${endpoint}:${canonicalBody}`)
    .digest("hex");
  const cacheKey = `clocked:cache:${requestHash}`;

  // Check 30-day cache first
  if (!options.bypassCache) {
    const cached = await storeGet<ClockedResponse<T>>(cacheKey);
    if (cached) {
      return {
        data: cached.data,
        meta: {
          ...cached.meta,
          credits: 0,
          cached: true,
          transport: "cache",
        },
      };
    }
  }

  const idempotencyKey = options.customKey || createDeterministicUUID(endpoint, canonicalBody);
  const url = `${baseUrl}/${endpoint}`;

  // Execute inside the sequential queue
  return enqueue(async () => {
    let attempts = 0;
    const retryDelays = [2000, 5000, 10000];
    let currentKey = idempotencyKey;

    while (true) {
      attempts++;
      let response: Response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": currentKey,
          },
          body: canonicalBody,
        });
      } catch (fetchErr: any) {
        if (attempts <= 3) {
          await new Promise((r) => setTimeout(r, retryDelays[attempts - 1]));
          continue;
        }
        throw new Error(`Network failure calling Clocked /${endpoint}: ${fetchErr.message}`);
      }

      // Handle response headers
      const creditsHeader = response.headers.get("x-clocked-credits");
      const modelMsHeader = response.headers.get("x-clocked-model-ms");
      const costUsdHeader = response.headers.get("x-clocked-cost-usd");
      const costBasisHeader = response.headers.get("x-clocked-cost-basis");
      const transportHeader = response.headers.get("x-clocked-transport");

      const credits = creditsHeader ? parseInt(creditsHeader, 10) : 0;
      const modelMs = modelMsHeader ? parseInt(modelMsHeader, 10) : 0;
      const costUsd = costUsdHeader ? parseFloat(costUsdHeader) : undefined;
      const costBasis = costBasisHeader || undefined;
      const transport = transportHeader || undefined;

      // Handle 429 and 5xx retries
      if (response.status === 429 || response.status >= 500) {
        if (attempts <= 3) {
          const delay = retryDelays[attempts - 1] || 10000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      let jsonBody: any = null;
      try {
        jsonBody = await response.json();
      } catch {
        jsonBody = null;
      }

      // Handle retryAsNew requirement from errors.txt
      if (jsonBody && jsonBody.retryAsNew && attempts <= 3) {
        currentKey = crypto.randomUUID();
        continue;
      }

      // Handle specific error codes
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Clocked key problem");
        }
        if (response.status === 402) {
          throw new Error("Out of credits");
        }
        if (response.status === 409) {
          throw new Error(`Idempotency conflict (409) on /${endpoint}`);
        }
        if (response.status === 413) {
          throw new Error(`Payload too large (413) for /${endpoint}`);
        }
        const errorMsg = jsonBody?.detail || jsonBody?.message || JSON.stringify(jsonBody) || `HTTP ${response.status}`;
        throw new Error(`Clocked /${endpoint} error (${response.status}): ${errorMsg}`);
      }

      // Success
      const meta: ClockedMeta = {
        credits,
        modelMs,
        costUsd,
        costBasis,
        transport,
        cached: false,
      };

      const result: ClockedResponse<T> = {
        data: jsonBody,
        meta,
      };

      // Record credits used today
      if (credits > 0) {
        await recordDailyCredits(credits);
      }

      // Cache successful response for 30 days
      await storeSet(cacheKey, result, 2592000);

      return result;
    }
  });
}
