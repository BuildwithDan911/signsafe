import { NextRequest, NextResponse } from "next/server";
import { resetRateLimit } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleReset(req);
}

export async function POST(req: NextRequest) {
  return handleReset(req);
}

async function handleReset(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (
    forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "127.0.0.1"
  ).trim();

  await resetRateLimit(ip, "ratelimit:check:");
  await resetRateLimit(ip, "ratelimit:step:");

  return NextResponse.json({
    ok: true,
    message: "Rate limit successfully reset for your IP.",
  });
}
