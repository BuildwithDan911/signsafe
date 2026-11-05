import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Validates an unknown request body against a Zod schema.
 * Returns { data } on success or { error: NextResponse } (400) on failure.
 */
export function validateBody<T>(schema: z.ZodType<T>, body: unknown): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: "Invalid request body",
          issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const SourceTypeSchema = z.enum(["pdf", "docx", "text", "paste", "link", "photo"]);

export const ScriptItemSchema = z.object({
  origin: z.enum(["macro", "macro-strings", "command", "page-script"]),
  code: z.string(),
});

export const DealContextSchema = z
  .object({
    party: z.string().optional(),
    role: z.string().optional(),
    dealType: z.string().optional(),
    transaction: z.string().optional(),
    roughValue: z.string().optional(),
    relationship: z.string().optional(),
    other: z.string().optional(),
    skipped: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Per-route schemas
// ---------------------------------------------------------------------------

export const ReadLinkSchema = z.object({
  url: z.string().url("Must be a valid HTTP/HTTPS URL"),
});

export const ReadJsonSchema = z.object({
  text: z.string().optional(),
  sourceType: SourceTypeSchema.optional(),
  fileName: z.string().optional(),
  photoBase64: z.string().optional(),
});

export const CompareSchema = z.object({
  text1: z.string().min(1, "text1 is required"),
  text2: z.string().min(1, "text2 is required"),
});

export const GuardSchema = z.object({
  text: z.string().min(1, "text is required"),
  pdfBase64: z.string().optional(),
  pdfPageCount: z.number().int().nonnegative().optional(),
  sourceType: SourceTypeSchema.optional(),
});

export const InspectSchema = z.object({
  scripts: z.array(ScriptItemSchema).optional(),
});

export const TextBodySchema = z.object({
  cleanText: z.string().optional(),
  text: z.string().optional(),
});

export const DecideSchema = z.object({
  cleanText: z.string().optional(),
  facts: z.record(z.string(), z.any()).optional(),
  fileSignals: z.array(z.any()).optional(),
  emails: z.array(z.any()).optional(),
  dealContext: DealContextSchema.optional(),
});

export const FlagInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  meaning: z.string().optional(),
  askThem: z.string().optional(),
  verifyYourself: z.string().optional(),
  weight: z.number().optional(),
  contextReason: z.string().optional(),
});

export const ClarificationFlagInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  meaning: z.string().optional(),
  weight: z.number().optional(),
});

export const FillSchema = z.object({
  cleanText: z.string().optional(),
  flags: z.array(FlagInputSchema).optional(),
  clarificationFlags: z.array(ClarificationFlagInputSchema).optional(),
  dealContext: DealContextSchema.optional(),
});

export const VerifyExplanationsSchema = z.object({
  cleanText: z.string(),
  items: z
    .array(
      z.object({
        flagId: z.string(),
        why: z.string(),
        quote: z.string().optional(),
      })
    )
    .optional(),
});

export const AskSchema = z.object({
  question: z.string().min(1, "question is required"),
  cleanText: z.string().optional(),
  clauses: z.array(z.any()).optional(),
});

export const PromisesSchema = z.object({
  cleanText: z.string(),
  chatText: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const QuoteItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  quote: z.string().min(10, "quote must be at least 10 characters"),
});

export const FairSchema = z.object({
  quotes: z.array(QuoteItemSchema).optional(),
  facts: z.record(z.string(), z.any()).optional(),
  cleanText: z.string().optional(),
});

export const ShareCreateSchema = z.object({
  anonymizedText: z.string().optional(),
  cleanText: z.string().optional(),
  entities: z.array(z.any()).optional(),
  fairClauses: z.array(z.any()).optional(),
  flags: z.array(z.any()).optional(),
  scoreResult: z.any().optional(),
  checksRun: z.array(z.any()).optional(),
  totalCredits: z.number().optional(),
  docType: z.string().optional(),
  fileName: z.string().optional(),
  brokenPromises: z.array(z.any()).optional(),
});

export const SharePatchSchema = z.object({
  token: z.string(),
  fixId: z.string(),
  accepted: z.boolean(),
});

export const DangerMemoryContributeSchema = z.object({
  redactedSnippet: z.string().optional(),
  cleanText: z.string().optional(),
  docType: z.string().optional(),
  flagIds: z.array(z.string()).optional(),
  entities: z.array(z.any()).optional(),
});
