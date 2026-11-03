import fs from "fs";
import path from "path";
import {
  DangerPattern,
  compute5WordShingles,
  saveDangerPatterns,
} from "../src/server/dangerMemory";

// Load .env.local if present
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

export const SEED_PATTERNS: DangerPattern[] = [
  // 1. Job Offer Variant 1: Apex Cloud Dynamics
  {
    id: "seed_job_apex_cloud",
    doc_type: "job_offer",
    title: "Fake Job Offer Template (Apex Cloud Dynamics)",
    flag_ids: ["upfront_fee", "overpayment_vendor", "credential_harvesting"],
    redacted_snippet:
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Data Entry Associate with Apex Cloud Dynamics. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 42 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,500. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 120 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-8821. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent.",
    shingles: compute5WordShingles(
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Data Entry Associate with Apex Cloud Dynamics. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 42 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,500. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 120 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-8821. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 2. Job Offer Variant 2: Vanguard Operations LLC
  {
    id: "seed_job_vanguard_ops",
    doc_type: "job_offer",
    title: "Fake Job Offer Template (Vanguard Operations LLC)",
    flag_ids: ["upfront_fee", "overpayment_vendor", "urgency"],
    redacted_snippet:
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Operations Associate with Vanguard Operations LLC. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 48 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 4,100. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 175 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-9932. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent.",
    shingles: compute5WordShingles(
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Operations Associate with Vanguard Operations LLC. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 48 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 4,100. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 175 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-9932. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 3. Job Offer Variant 3: BluePeak Logistics
  {
    id: "seed_job_bluepeak",
    doc_type: "job_offer",
    title: "Fake Job Offer Template (BluePeak Logistics)",
    flag_ids: ["software_commands", "overpayment_vendor", "upfront_fee"],
    redacted_snippet:
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Data Specialist with BluePeak Logistics. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 40 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,600. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 140 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-7743. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent.",
    shingles: compute5WordShingles(
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Data Specialist with BluePeak Logistics. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 40 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,600. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 140 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-7743. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 4. Job Offer Variant 4: Stratosphere Systems
  {
    id: "seed_job_stratosphere",
    doc_type: "job_offer",
    title: "Fake Job Offer Template (Stratosphere Systems)",
    flag_ids: ["upfront_fee", "credential_harvesting", "secrecy_verification"],
    redacted_snippet:
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Support Associate with Stratosphere Systems Global Ltd. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 44 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,800. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 150 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-2290. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent.",
    shingles: compute5WordShingles(
      "Following your interview with our hiring manager on Telegram, we are pleased to offer you the position of Remote Support Associate with Stratosphere Systems Global Ltd. You were selected from over 2,000 applicants. 1. Position and hours: Hours are fully flexible. 2. Pay: USD 44 per hour, paid weekly. 3. Equipment: We will send you a cheque for USD 3,800. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct. Send any balance back to the vendor by gift card or crypto. 4. Onboarding fee: A one-time onboarding and training fee of USD 150 is required before your start date. 5. Payroll setup: To set up payroll, reply with your full name, date of birth, home address, bank account number, and a photo of your national ID (BVN, NIN or SSN accepted). 6. Confidentiality: Please keep this offer confidential. 7. Deadline: This offer expires in 24 hours. 8. Verification: Call our verification desk on +1 (555) 014-2290. Do not contact our office directly. 9. System test: clone our onboarding repository and run npm install && npm run setup-agent."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 5. Loan App Terms Variant 1: InstantCash FastPay
  {
    id: "seed_loan_fastpay",
    doc_type: "loan_terms",
    title: "Predatory Loan App Template (InstantCash FastPay)",
    flag_ids: ["upfront_fee", "credential_harvesting", "urgency"],
    redacted_snippet:
      "InstantCash FastPay Terms: Activation fee: Before loan release, you must pay non-refundable USD 25 activation fee. Interest is 1% per day. Permissions: You must allow access to contacts, call logs, and gallery. If you miss payment, we contact everyone in your phone book and publish photo as loan defaulter. Valid today only.",
    shingles: compute5WordShingles(
      "InstantCash FastPay Terms: Activation fee: Before loan release, you must pay non-refundable USD 25 activation fee. Interest is 1% per day. Permissions: You must allow access to contacts, call logs, and gallery. If you miss payment, we contact everyone in your phone book and publish photo as loan defaulter. Valid today only."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 6. Loan App Terms Variant 2: QuickFunds Express
  {
    id: "seed_loan_quickfunds",
    doc_type: "loan_terms",
    title: "Predatory Loan App Template (QuickFunds Express)",
    flag_ids: ["upfront_fee", "credential_harvesting"],
    redacted_snippet:
      "QuickFunds Micro-Loans: Mandatory processing fee of USD 30 prior to disbursement. Mandatory contact book upload for social collateral. Defaulter penalty: Immediate dissemination of outstanding debt notice to family and employer. Late payments payable exclusively in USDT.",
    shingles: compute5WordShingles(
      "QuickFunds Micro-Loans: Mandatory processing fee of USD 30 prior to disbursement. Mandatory contact book upload for social collateral. Defaulter penalty: Immediate dissemination of outstanding debt notice to family and employer. Late payments payable exclusively in USDT."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 7. Creator Sponsorship Variant 1: SparkMedia Brand
  {
    id: "seed_sponsorship_sparkmedia",
    doc_type: "sponsorship_deal",
    title: "Predatory Creator Deal (SparkMedia)",
    flag_ids: ["one_sided_terms"],
    redacted_snippet:
      "Campaign Period: 60 months from execution. Creator grants Brand an exclusive, irrevocable, worldwide, perpetual licence to exploit likeness, voice, and outtakes across paid media without additional compensation. Non-compete: Creator prohibited from discussing skincare or wellness for 24 months. Breach penalty: Full fee forfeiture plus 50% liquidated damages.",
    shingles: compute5WordShingles(
      "Campaign Period: 60 months from execution. Creator grants Brand an exclusive, irrevocable, worldwide, perpetual licence to exploit likeness, voice, and outtakes across paid media without additional compensation. Non-compete: Creator prohibited from discussing skincare or wellness for 24 months. Breach penalty: Full fee forfeiture plus 50% liquidated damages."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 8. Creator Sponsorship Variant 2: VibeDrinks Global
  {
    id: "seed_sponsorship_vibedrinks",
    doc_type: "sponsorship_deal",
    title: "Predatory Creator Deal (VibeDrinks)",
    flag_ids: ["one_sided_terms"],
    redacted_snippet:
      "Perpetual Likeness Agreement: Brand holds unilateral authority to alter campaign terms and fee schedules. Creator indemnifies Brand unconditionally against all commercial disputes. 90-day delayed settlement after delivery.",
    shingles: compute5WordShingles(
      "Perpetual Likeness Agreement: Brand holds unilateral authority to alter campaign terms and fee schedules. Creator indemnifies Brand unconditionally against all commercial disputes. 90-day delayed settlement after delivery."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 9. Rental Listing Variant 1: Mayfair Key Deposit
  {
    id: "seed_rental_mayfair",
    doc_type: "rental_listing",
    title: "Fake Rental Listing (Deposit Before Viewing)",
    flag_ids: ["upfront_fee", "urgency"],
    redacted_snippet:
      "Furnished 2-Bedroom Apartment on Elm Grove: High demand property. To reserve viewing appointment and hold keys with building concierge, prospective tenant must transfer £650 refundable holding deposit via direct bank wire prior to scheduled visit. Keys released at viewing.",
    shingles: compute5WordShingles(
      "Furnished 2-Bedroom Apartment on Elm Grove: High demand property. To reserve viewing appointment and hold keys with building concierge, prospective tenant must transfer £650 refundable holding deposit via direct bank wire prior to scheduled visit. Keys released at viewing."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },

  // 10. Rental Listing Variant 2: Overseas Landlord Bond
  {
    id: "seed_rental_kensington",
    doc_type: "rental_listing",
    title: "Fake Rental Listing (Overseas Landlord Trap)",
    flag_ids: ["upfront_fee"],
    redacted_snippet:
      "Studio Apartment on Oak Lane: Landlord currently working abroad with missionary organization in Norway. Local viewings handled by delivery courier. Courier requires £500 security bond via Western Union before dispatching apartment keys for viewing inspection.",
    shingles: compute5WordShingles(
      "Studio Apartment on Oak Lane: Landlord currently working abroad with missionary organization in Norway. Local viewings handled by delivery courier. Courier requires £500 security bond via Western Union before dispatching apartment keys for viewing inspection."
    ),
    seen_count: 1,
    first_seen_month: "October 2026",
    synthetic: true,
  },
];

async function main() {
  console.log("=== Seeding Danger Memory (10 Synthetic Patterns) ===");
  await saveDangerPatterns(SEED_PATTERNS);
  console.log(`Successfully seeded ${SEED_PATTERNS.length} synthetic patterns into Danger Memory.`);
  console.log("  - 4 Fake Job Offer variants (sum seen_count = 4)");
  console.log("  - 2 Loan App Terms variants");
  console.log("  - 2 Creator Sponsorship variants");
  console.log("  - 2 Fake Rental Listing variants");
}

if (require.main === module || process.argv[1]?.includes("seed-memory")) {
  main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}
