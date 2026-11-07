---
name: hackathon-ai-product-builder
description: >-
  Comprehensive playbook and battle-tested runbook for building, debugging,
  deploying, and demoing production-grade AI web applications (such as SignSafe)
  using Clocked AI, Gemini, or multi-step LLM pipelines. Use this skill when
  designing AI audit pipelines, diagnosing production LLM API edge cases (Zod
  schema nullability, rate limits, session leaks, serverless PDF parsing),
  crafting authentic demo artifacts ("professional deceit"), or editing winning
  hackathon demo videos.
---

# Hackathon AI Product Builder: The SignSafe Playbook

This skill captures the end-to-end engineering, debugging, and storytelling processes developed while building **SignSafe**—an institutional-grade contract auditor powered by Clocked AI.

---

## 1. Architectural Philosophy: The Sequential State Machine

When building high-trust AI applications (legal, financial, security), **never rely on a single monolithic prompt**. A monolithic prompt produces hallucinations, loses attribution, and cannot recover when one sub-task fails.

### The 8-Step Pipeline Pattern
Break the audit into discrete, deterministic stages linked by clear TypeScript interfaces:

```
[Ingest] ➔ [Guard] ➔ [Inspect] ➔ [Protect] ➔ [Fair / Score] ➔ [Promise vs Paper] ➔ [Ask / Wizard] ➔ [Verify / Redline]
```

1. **Ingest (`/api/read`, `/api/read-link`)**: Normalizes PDFs, DOCX, links, or text into a standard `SignDoc` schema with extracted emails, scripts, and hidden text.
2. **Guard (`/api/check/guard`)**: Sanitizes white-text prompt injections and prompt tampering before LLMs ever see the document.
3. **Inspect (`/api/check/inspect`)**: Checks file-level signals (VBA macros, shell command lines, free webmail impersonation).
4. **Protect (`/api/check/protect`)**: Identifies PII (bank accounts, national IDs, addresses) and creates redacted representations to preserve user privacy.
5. **Fair / Scoring (`/api/check/fair`, `/api/check/decide`)**: Evaluates clauses against fair market benchmarks (0–100 risk score and color-coded Notary Seal).
6. **Promise vs Paper (`/api/check/promises`)**: Vision + text alignment comparing external chat/email recaps against the formal written agreement to detect contradictions.
7. **Ask / Follow-Up Wizard (`/api/check/ask`)**: Generates tailored clarifying questions based on ambiguous or high-risk clauses.
8. **Verify / Redline (`/api/check/verify-explanations`, `/api/check/fill`)**: Verifies every quotation against the original text and synthesizes ready-to-send negotiation counter-clauses.

---

## 2. Production Debugging & Battle-Tested Fixes

During production rollout on Vercel with real-time Clocked API calls, five critical edge cases were discovered and solved:

### A. The "Nullable Quote" Zod Schema Trap
* **The Failure**: When Clocked's `/fill` or explanation endpoints encounter an inferred or omitted clause, the model frequently returns `quote: null` instead of an empty string or omitting the field. A strict Zod schema with `quote: z.string().optional()` throws an HTTP 400 validation error (`Invalid input: expected string, received null`), breaking Step 8.
* **The Solution**: Always use `.nullish()` or `.nullable().optional()` on AI-generated quote and explanation fields:
  ```typescript
  export const VerifyExplanationsSchema = z.object({
    items: z.array(
      z.object({
        id: z.string(),
        quote: z.string().nullish(), // Accepts string, null, or undefined
        why: z.string().nullish().default(""),
      })
    ),
  });
  ```

### B. Rate Limit Deadlocks & Per-Step Retry
* **The Failure**: Production rate limiters (e.g. 5 or 20 checks/hour) can lock out testers or judges during rapid demoing. Furthermore, retrying a single failed step in the UI must NOT re-run the entire pipeline from Step 1, or it burns remaining credits.
* **The Solution**:
  1. Implement a dedicated, secure reset endpoint (`/api/check/reset-rate-limit`) that can clear IP buckets during demo testing.
  2. Implement granular step retries in the frontend state machine:
     ```typescript
     const retrySingleStep = async (stepId: string) => {
       if (stepId === "verify") {
         // Re-run ONLY the verification step without re-triggering Guard/Extract
         await runVerificationOnly();
       }
     };
     ```
  3. When an HTTP 429 occurs, halt pipeline execution immediately with a friendly banner and a 1-click reset button.

### C. Judge Mode & Fixture Session Leaks
* **The Failure**: Testing with canned "Judge Mode" samples leaves records in `sessionStorage` (e.g. `signsafe_judge_mode`, `signsafe_fixture`). When a user later uploads a brand-new live document, the app mistakenly runs in offline replay mode, marking steps as "cached" and skipping live AI execution.
* **The Solution**: On every document entry point (`handleFileUpload`, `handlePastedText`, `handleLinkFetch`), explicitly wipe all replay flags:
  ```typescript
  sessionStorage.removeItem("signsafe_judge_mode");
  sessionStorage.removeItem("signsafe_fixture");
  ```

### D. Serverless PDF Ingestion: Why Browser OCR Workers Fail
* **The Failure**: Standard PDF text extractors (like `pdf-parse` v2) can fail in headless serverless environments (e.g. missing `standardFontDataUrl` or worker threads). In response, client-side fallbacks using `pdfjs-dist/build/pdf.worker.mjs` fail with 404s because Next.js bundlers do not copy the worker file as a standalone asset.
* **The Solution**:
  1. Build a resilient server-side fallback parser that extracts text directly from uncompressed and Flate-compressed PDF streams using regex matching on `(...) Tj` operations and `zlib.inflateSync`.
  2. For client-side OCR fallbacks, load the worker script from an external reliable CDN:
     ```typescript
     pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
     ```

### E. Early Credit-Saving Guardrails (Non-Contract Detection)
* **The Failure**: Users occasionally paste recipes, shopping lists, or random guides. Feeding these to high-cost legal models wastes API credits and produces nonsensical risk scores.
* **The Solution**: Use rule-based and semantic pre-screening (`isClearlyUnrelatedText`). If a document contains zero legal/contractual tokens (parties, payment terms, termination, governing law), return an HTTP 422 `NO_CONTRACT_TEXT` error with an informative alert, saving credits.

---

## 3. Demo Craft: Designing "Professional Deceit"

Judges and users easily spot cartoonish scams (e.g. *"Kindly wire $5,000 for your secret inheritance"*). The most compelling AI demos feature **professional deceit**—agreements that appear completely authentic and courteous on the surface, but contain subtle legal traps that an unassisted human would overlook.

### The Winning Two-Artifact Setup
1. **The Contract (`02_freelance_design_contract.md`)**:
   - Structured as a legitimate agency agreement (Larkspur Studio Ltd & Amara Bello).
   - Looks clean and standard, earning a "Caution / Fair" score (~65/100).
   - **Hidden Traps**:
     - *Payment Terms*: Net-60 days (buried in Clause 3).
     - *Portfolio Rights*: Silent / omitted (Clause 6 transfers all IP with zero display carve-out).
     - *Liability*: Uncapped for the freelancer, capped at £100 for the client (Clause 8).

2. **The Chat Screenshot (`02_chat_promises.png`)**:
   - Rendered as an authentic Dark Mode Slack DM between the Creative Director and the freelancer.
   - Polite, executive tone: *"Hi Amara! Fantastic connecting... whole team is thrilled..."*
   - Explicitly recaps 3 commercial terms that **contradict** the contract:
     - Promises *14-day payment*.
     - Promises *100% portfolio showcase rights*.
     - Promises *balanced mutual liability protections*.

### Why This Wins:
When the user uploads the chat into **Step 6 (Promise vs Paper)**, the AI flags the exact contradictions. This clearly demonstrates vision OCR, clause alignment, and cross-document reasoning in one unified storyline.

---

## 4. The 75-Second Hackathon Demo Playbook

When raw recordings run long (10–15 minutes) because every feature was demonstrated, apply the **"Hero Story + Rapid Montage"** cut:

```
[0:00 - 0:10] Hook & Problem  (10s)
[0:10 - 0:40] The Hero Journey: Contract + Chat Contradiction  (30s)
[0:40 - 0:55] Rapid Montage: PDF Scam + Recipe Rejection + Compare  (15s)
[0:55 - 1:15] Results & Redline Action: Notary Seal & Counter-Offer  (20s)
```

### Video Editing Rules:
1. **Speed Up Loading**: Accelerate pipeline processing bars to 200%–300%.
2. **Cut Out Navigation**: Never show file open dialogs, cursor wandering, or typing. Jump straight to results.
3. **Focus on the "Aha!" Moment**: Spend the most time on the red discrepancy flags in **Promise vs Paper** and the ready-to-copy **Negotiation Redline**.

---

## 5. Pre-Submission Checklist

Before finalizing any hackathon repository:
- [ ] **Run Secret Scanners**: Ensure `npm run check-secrets` passes (0 API keys, secrets, or tokens committed).
- [ ] **Verify Public Visibility**: Confirm `git remote -v` points to a public repository.
- [ ] **Test Live Deployment**: Run a complete end-to-end scan on the production URL (`https://...`).
- [ ] **Embed Video Link**: Add the recorded demo link (YouTube, Loom, or X) directly to `README.md`.
- [ ] **Double-Check Track Selection**: Ensure all relevant challenge categories/tracks are checked on the submission portal.
