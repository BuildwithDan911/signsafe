import fs from "fs";
import path from "path";

// Load .env.local without external deps
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const BASE_URL = process.env.SIGN_SAFE_URL || "http://localhost:3000";

async function postJson(endpoint: string, body: any): Promise<any> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skip-ratelimit": "fixture-recording",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Endpoint ${endpoint} failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

async function postFormData(endpoint: string, formData: FormData): Promise<any> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "x-skip-ratelimit": "fixture-recording",
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Endpoint ${endpoint} failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

async function main() {
  console.log("=== Recording Judge Mode Fixtures ===");
  const fixturesDir = path.join(process.cwd(), "fixtures", "judge");
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const recordedAt = new Date().toISOString();

  // -------------------------------------------------------------
  // Sample 1: Remote Job Offer
  // -------------------------------------------------------------
  console.log("\n[1/3] Processing Sample 1: Remote Job Offer (01_remote_job_offer.docx)...");
  const docxPath = path.join(process.cwd(), "public", "samples", "01_remote_job_offer.docx");
  const docxBuffer = fs.readFileSync(docxPath);
  const docxBlob = new Blob([docxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const formData = new FormData();
  formData.append("file", docxBlob, "01_remote_job_offer.docx");

  console.log(" -> Reading docx via /api/read...");
  const readRes1 = await postFormData("/api/read", formData);
  const doc1 = readRes1.signDoc || readRes1.doc;

  console.log(" -> Checking Guard (/api/check/guard)...");
  const guardRes1 = await postJson("/api/check/guard", {
    text: doc1.text,
    pdfBase64: doc1.pdfBase64,
    sourceType: doc1.sourceType,
  });
  const cleanText1 = guardRes1.cleanText || doc1.text;

  console.log(" -> Checking Inspect (/api/check/inspect)...");
  const inspectRes1 = await postJson("/api/check/inspect", {
    scripts: doc1.scripts || [],
  });

  console.log(" -> Checking Protect (/api/check/protect)...");
  const protectRes1 = await postJson("/api/check/protect", {
    cleanText: cleanText1,
  });

  console.log(" -> Extracting facts (/api/check/extract)...");
  const extractRes1 = await postJson("/api/check/extract", {
    cleanText: cleanText1,
  });

  console.log(" -> Deciding warning signs (/api/check/decide)...");
  const decideRes1 = await postJson("/api/check/decide", {
    cleanText: cleanText1,
    facts: extractRes1.fields || {},
    fileSignals: doc1.fileSignals || [],
    emails: doc1.emails || [],
  });

  console.log(" -> Extracting explanations (/api/check/fill)...");
  const fillRes1 = await postJson("/api/check/fill", {
    cleanText: cleanText1,
    flags: (decideRes1.mergedSignals || []).slice(0, 8),
  });

  console.log(" -> Grounding explanations (/api/check/verify-explanations)...");
  const verifyRes1 = await postJson("/api/check/verify-explanations", {
    cleanText: cleanText1,
    items: fillRes1.items || [],
  });

  console.log(" -> Generating fair version (/api/check/fair)...");
  const quotesToFair1 = (fillRes1.items || [])
    .filter((it: any) => it.quote)
    .map((it: any) => ({ id: it.flagId, title: it.title, quote: it.quote }));
  const fairRes1 = await postJson("/api/check/fair", {
    quotes: quotesToFair1,
    facts: extractRes1.fields || {},
    cleanText: cleanText1,
  });

  // Calculate score for Sample 1 with "Yes" answered to fee question
  const { calculateScore } = await import("../src/lib/score");
  const scoreResult1 = calculateScore({
    mergedSignals: decideRes1.mergedSignals || [],
    guardInjection: Boolean(guardRes1.injection === true || guardRes1.verdict === "injection"),
    inspectMalicious: Boolean(inspectRes1.hasMalicious),
    confirmedSignalIds: ["UPFRONT_PAYMENT"],
    greenSignalsCount: decideRes1.greenSignals?.length || 0,
  });

  const totalCredits1 =
    (guardRes1.meta?.credits || 0) +
    (inspectRes1.meta?.credits || 0) +
    (protectRes1.meta?.credits || 0) +
    (extractRes1.meta?.credits || 0) +
    (decideRes1.meta?.credits || 0) +
    (fillRes1.meta?.credits || 0) +
    (verifyRes1.meta?.credits || 0) +
    (fairRes1.meta?.credits || 0);

  const sample1Fixture = {
    sampleId: "job_offer",
    title: "Remote Job Offer",
    recordedAt,
    totalCredits: totalCredits1,
    doc: doc1,
    cleanText: cleanText1,
    guard: guardRes1,
    inspect: inspectRes1,
    protect: protectRes1,
    extract: extractRes1,
    decide: decideRes1,
    followUpAnswers: { UPFRONT_PAYMENT: "yes" },
    confirmedIds: ["UPFRONT_PAYMENT"],
    fill: fillRes1,
    verify: verifyRes1,
    fair: fairRes1,
    scoreResult: scoreResult1,
  };

  fs.writeFileSync(
    path.join(fixturesDir, "job_offer.json"),
    JSON.stringify(sample1Fixture, null, 2),
    "utf-8"
  );
  console.log(" -> Saved fixtures/judge/job_offer.json (Total credits:", totalCredits1, ")");

  // -------------------------------------------------------------
  // Sample 2: Freelance Contract + Chat Promises
  // -------------------------------------------------------------
  console.log("\n[2/3] Processing Sample 2: Freelance Contract (02_freelance_design_contract.md)...");
  const mdPath = path.join(process.cwd(), "public", "samples", "02_freelance_design_contract.md");
  const mdText = fs.readFileSync(mdPath, "utf-8");

  console.log(" -> Reading markdown via /api/read...");
  const readRes2 = await postJson("/api/read", {
    text: mdText,
    fileName: "02_freelance_design_contract.md",
    sourceType: "paste",
  });
  const doc2 = readRes2.signDoc || readRes2.doc;

  console.log(" -> Checking Guard (/api/check/guard)...");
  const guardRes2 = await postJson("/api/check/guard", {
    text: doc2.text,
    sourceType: doc2.sourceType,
  });
  const cleanText2 = guardRes2.cleanText || doc2.text;

  console.log(" -> Checking Inspect (/api/check/inspect)...");
  const inspectRes2 = await postJson("/api/check/inspect", {
    scripts: doc2.scripts || [],
  });

  console.log(" -> Checking Protect (/api/check/protect)...");
  const protectRes2 = await postJson("/api/check/protect", {
    cleanText: cleanText2,
  });

  console.log(" -> Extracting facts (/api/check/extract)...");
  const extractRes2 = await postJson("/api/check/extract", {
    cleanText: cleanText2,
  });

  console.log(" -> Deciding warning signs (/api/check/decide)...");
  const decideRes2 = await postJson("/api/check/decide", {
    cleanText: cleanText2,
    facts: extractRes2.fields || {},
    fileSignals: doc2.fileSignals || [],
    emails: doc2.emails || [],
  });

  console.log(" -> Extracting explanations (/api/check/fill)...");
  const fillRes2 = await postJson("/api/check/fill", {
    cleanText: cleanText2,
    flags: (decideRes2.mergedSignals || []).slice(0, 8),
  });

  console.log(" -> Grounding explanations (/api/check/verify-explanations)...");
  const verifyRes2 = await postJson("/api/check/verify-explanations", {
    cleanText: cleanText2,
    items: fillRes2.items || [],
  });

  console.log(" -> Generating fair version (/api/check/fair)...");
  const quotesToFair2 = (fillRes2.items || [])
    .filter((it: any) => it.quote)
    .map((it: any) => ({ id: it.flagId, title: it.title, quote: it.quote }));
  const fairRes2 = await postJson("/api/check/fair", {
    quotes: quotesToFair2,
    facts: extractRes2.fields || {},
    cleanText: cleanText2,
  });

  console.log(" -> Asking 'When do I get paid?' (/api/check/ask)...");
  const askRes2 = await postJson("/api/check/ask", {
    question: "When do I get paid?",
    cleanText: cleanText2,
  });

  console.log(" -> Checking chat promises with screenshot (/api/check/promises)...");
  const pngPath = path.join(process.cwd(), "public", "samples", "02_chat_promises.png");
  const pngBuffer = fs.readFileSync(pngPath);
  const pngDataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  const promisesRes2 = await postJson("/api/check/promises", {
    cleanText: cleanText2,
    images: [pngDataUrl],
  });

  // Calculate score for Sample 2 (amber, liability clause, plus broken promise)
  const scoreResult2 = calculateScore({
    mergedSignals: decideRes2.mergedSignals || [],
    guardInjection: Boolean(guardRes2.injection === true || guardRes2.verdict === "injection"),
    inspectMalicious: Boolean(inspectRes2.hasMalicious),
    confirmedSignalIds: [],
    greenSignalsCount: decideRes2.greenSignals?.length || 0,
    brokenPromisesCount: promisesRes2.brokenCount || 1,
  });

  const totalCredits2 =
    (guardRes2.meta?.credits || 0) +
    (inspectRes2.meta?.credits || 0) +
    (protectRes2.meta?.credits || 0) +
    (extractRes2.meta?.credits || 0) +
    (decideRes2.meta?.credits || 0) +
    (fillRes2.meta?.credits || 0) +
    (verifyRes2.meta?.credits || 0) +
    (fairRes2.meta?.credits || 0) +
    (askRes2.meta?.credits || 0) +
    (promisesRes2.meta?.credits || 0);

  const sample2Fixture = {
    sampleId: "freelance_contract",
    title: "Freelance Contract + Chat Promises",
    recordedAt,
    totalCredits: totalCredits2,
    doc: doc2,
    cleanText: cleanText2,
    guard: guardRes2,
    inspect: inspectRes2,
    protect: protectRes2,
    extract: extractRes2,
    decide: decideRes2,
    followUpAnswers: {},
    confirmedIds: [],
    fill: fillRes2,
    verify: verifyRes2,
    fair: fairRes2,
    scoreResult: scoreResult2,
    ask: {
      question: "When do I get paid?",
      response: askRes2,
    },
    promises: promisesRes2,
  };

  fs.writeFileSync(
    path.join(fixturesDir, "freelance_contract.json"),
    JSON.stringify(sample2Fixture, null, 2),
    "utf-8"
  );
  console.log(" -> Saved fixtures/judge/freelance_contract.json (Total credits:", totalCredits2, ")");

  // -------------------------------------------------------------
  // Sample 3: Tenancy Compare (v1 vs v2)
  // -------------------------------------------------------------
  console.log("\n[3/3] Processing Sample 3: Tenancy Compare (04_tenancy_v1.md vs 04_tenancy_v2.md)...");
  const tenancyV1Path = path.join(process.cwd(), "public", "samples", "04_tenancy_v1.md");
  const tenancyV2Path = path.join(process.cwd(), "public", "samples", "04_tenancy_v2.md");
  const v1Text = fs.readFileSync(tenancyV1Path, "utf-8");
  const v2Text = fs.readFileSync(tenancyV2Path, "utf-8");

  console.log(" -> Comparing versions via /api/check/compare...");
  const compareRes3 = await postJson("/api/check/compare", {
    text1: v1Text,
    text2: v2Text,
  });

  const totalCredits3 = compareRes3.meta?.credits || 0;

  const sample3Fixture = {
    sampleId: "tenancy_compare",
    title: "Tenancy Agreement: What Changed?",
    recordedAt,
    totalCredits: totalCredits3,
    text1: v1Text,
    text2: v2Text,
    compare: compareRes3,
  };

  fs.writeFileSync(
    path.join(fixturesDir, "tenancy_compare.json"),
    JSON.stringify(sample3Fixture, null, 2),
    "utf-8"
  );
  console.log(" -> Saved fixtures/judge/tenancy_compare.json (Total credits:", totalCredits3, ")");

  console.log("\n=== Fixture Recording Complete! ===");
}

main().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
