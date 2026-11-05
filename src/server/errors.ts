import { NextResponse } from "next/server";

export function formatApiError(err: unknown): { response: NextResponse; status: number } {
  const msg = err instanceof Error ? err.message : String(err) || "Unknown error";
  let status = 500;
  let clientMessage = msg;

  if (msg.includes("Out of credits") || msg.includes("402")) {
    status = 402;
    clientMessage = "SignSafe is currently out of credits. Try Judge Mode to replay recorded runs without credits.";
  } else if (msg.includes("Clocked key problem") || msg.includes("401") || msg.includes("403")) {
    status = 401;
    clientMessage = "Clocked API key issue or unauthorized. Please verify the API key.";
  } else if (msg.includes("Payload too large") || msg.includes("413")) {
    status = 413;
    clientMessage = "The document or text is too large to check. Please submit a shorter excerpt or smaller file.";
  } else if (msg.includes("Idempotency conflict") || msg.includes("409")) {
    status = 409;
    clientMessage = "An in-progress request conflict occurred. Please retry in a moment.";
  } else if (msg.includes("Rate limit exceeded") || msg.includes("429")) {
    status = 429;
    clientMessage = "Rate limit reached: at most 5 live checks per hour. You can view Judge Mode to explore recorded runs.";
  } else if (msg.includes("Live checks are currently disabled") || msg.includes("503") || msg.includes("disabled")) {
    status = 503;
    clientMessage = "Live checks are temporarily paused. You can explore recorded runs in Judge Mode.";
  } else if (msg.includes("400") || msg.includes("Bad Request") || msg.includes("Missing required")) {
    status = 400;
    clientMessage = `Bad request: ${msg}`;
  }

  const response = NextResponse.json(
    {
      error: clientMessage,
      code: status,
      details: msg,
    },
    { status }
  );

  return { response, status };
}
