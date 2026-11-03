# SignSafe Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Vercel · Upstash Redis

## How a check flows

```
Browser                     Our Server (/api/...)           Clocked API
──────                      ─────────────────────           ───────────
1. Upload / Paste / Link
   ──► /api/read            Read PDF/DOCX/TXT/link
                             Our own file checks:
                             - hidden text, metadata,
                               macros, email domains
   ◄── SignDoc in session

2. Scan page calls each step in order:

   ──► /api/check/guard      ──► POST /injection ──►        Guard
   ◄── injection banner      ◄── verdict, evidence

   ──► /api/check/inspect    ──► POST /script ──►           Inspect
   ◄── hidden code card      ◄── verdict, category

   ──► /api/check/protect    ──► POST /pii ──►              Protect
   ◄── privacy chip          ◄── anonymized text, entities

   ──► /api/check/extract    ──► POST /extract ──►          Extract
   ◄── facts panel           ◄── field values

   ──► /api/check/decide     ──► POST /decide ──►           Decide
   ◄── colour, score, flags  ◄── selected labels + probs

   ──► /api/check/danger-memory  ──► POST /compare ──►      Compare
   ◄── "Seen before" card    ◄── template match

   ──► /api/check/fill       ──► POST /fill ──►             Fill
   ◄── quotes, explanations  ◄── extracts + generates

   ──► /api/check/verify-explanations ──► POST /grounding   Verify
   ◄── "Checked ✓" badges    ◄── claim verdicts

3. Follow-up questions       (no API call — our templates)

4. Results page
   ──► /api/check/ask        ──► Rerank + Fill + Verify     Rerank
   ──► /api/check/promises   ──► Fill (image) + Verify      Fill image
   ──► /api/check/fair       ──► Fill + Verify              Fill
   ──► /api/check/compare    ──► Compare + Decide           Compare

5. Share link
   ──► /api/share/create     Save redacted data to store
   ──► /api/share/[id]       Poll / toggle / rescore
```

## Key directories

```
src/
├── app/
│   ├── page.tsx              Home page (upload, samples, Judge Mode)
│   ├── scan/page.tsx         Live check pipeline with progress
│   ├── results/page.tsx      Seal, score, cards, ask, promises, fair version
│   ├── changes/page.tsx      Compare two versions
│   ├── share/[id]/page.tsx   Fair-deal collaboration
│   └── api/                  All server routes (one per Clocked step)
├── server/
│   ├── clocked.ts            Clocked API client (fetch, cache, retries, queue)
│   ├── store.ts              Upstash Redis or local JSON file cache
│   ├── dangerMemory.ts       Danger memory (shingles, Jaccard, compare)
│   └── errors.ts             Consistent API error formatting
├── lib/
│   ├── score.ts              Pure scoring function (unit-tested)
│   ├── signals.ts            Signal library loader
│   ├── clauses.ts            Clause splitter for Rerank
│   └── types.ts              SignDoc and shared types
├── components/
│   ├── NotarySeal.tsx         Embossed SVG seal with press animation
│   ├── MarkerHighlight.tsx    Hand-drawn marker highlight
│   ├── CountUp.tsx            Animated counter
│   └── DangerMemoryCard.tsx   "Seen before" template match card
└── data/
    └── signals.json           Signal library (red flags, giveaways, green)
```

## Security rules

1. The API key lives only on the server (`process.env.CLOCKED_API_KEY` in `src/server/`).
2. `.env.local` is gitignored. A pre-commit hook scans for leaked secrets.
3. Document text is data, never instructions. Guard-flagged spans are quarantined.
4. Original text is never stored. Only Protect-redacted text is saved (share links, danger memory).
5. Links are fetched with SSRF protection (private/metadata IPs blocked, 3 redirect limit).
6. Rate limit: 5 live checks per hour per IP. Daily credit cap. Kill switch via `LIVE_CHECKS_ENABLED`.

## Caching

Every Clocked response is cached by a SHA-256 hash of the endpoint + request body. The same hash
is used as the `Idempotency-Key` header. A cache hit returns `credits: 0, cached: true` with no
Clocked call. Upstash Redis in production, local JSON files in development.
