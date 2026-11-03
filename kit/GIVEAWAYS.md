# SignSafe Giveaways Library (v1.1): small tells that a document isn't legit

> This is the companion to `RED_FLAGS.md`. RED_FLAGS covers **what the clauses say**: scam wording, predatory funding terms, and consumer/creator traps. GIVEAWAYS covers **the small tells around the document**: its format, its metadata, who sent it, where it came from, and what doesn't line up. These are the things that look fine at a glance but that people who were nearly scammed say tipped them off.
> **Scope:** international and general. It covers offer and appointment letters, employment contracts, T&Cs, freelance and contractor agreements, sponsorship and brand deals, tenancy agreements, NDAs, invoices, and grant or funding offers.
> **Evidence:** every scenario is paraphrased from a real public post or report and linked. Every source is an official body or a platform trust & safety page, with a few security vendors marked as such. No example data is real user data. This is not legal advice.
> Severity: 🔴 **red** = stop, verify independently before going further · 🟠 **amber** = weak on its own; ask questions, and treat **2+ ambers as red**.
> **Detect:** 📄 = SignSafe can see it from the document itself (text, layout, file type, metadata) · 📎 = needs context the user pastes or provides (email header, the job advert, the official company website/registry details, an earlier invoice, the chat history).

Signal count: **Format & metadata 7 · Sender identity 9 · Money asks 10 · Pressure 5 · Wording 8 · Inconsistencies 5 · Platform behaviour 8 · Total: 52** (SI9 and PR5 were added in v1.1 from the MEXC × AP Collective "Spot the AI Trap" quiz)

---

## Key lesson from real cases (read first)

1. **Polish proves nothing.** Forged letterheads, stamps and real executives' signatures turn up again and again. In one case, the holder of a fake Nigerian Presidency appointment letter had already moved into an office before the Presidency said it was fake ([X](https://x.com/TejuDuru/status/2107045467943027061)). In another, a "clean" PDF with a stamp and HR signature was exposed only because the HR email bounced ([X](https://x.com/Not_Man/status/2117006671289741537)). The FTC describes offers on corporate stationery as "cut-and-paste fakes" ([FTC](https://www.ftc.gov/business-guidance/blog/2023/08/job-scammers-go-even-lower-way-they-hire)).
2. **The grammar tell is dying.** AI now writes clean text, so the strongest tell is **the ask itself**: money, a changed account, a sign-in, an install, or a rush ([X](https://x.com/chams_builds/status/2109611287441183150)). SignSafe should weight asks and inconsistencies above spelling.
3. **The user's .docx example is real but amber.** People do get legitimate Word offers ([X](https://x.com/apply4forme/status/2113589922431209659), [Ars forum](https://arstechnica.com/civis/threads/e-mail-offer-letter-as-good-as-a-printed-offer.543168/)). It becomes red when combined with other tells: a free-mail sender, macros, metadata that names someone else, or a link to a form ([CUNY CSI alert](https://csitoday.com/2024/06/caution-phishing-scam-alert/)).
4. **Scoring rule suggestion.** Any single 🔴 means "Don't sign yet: verify". Two or more 🟠 also mean "Don't sign yet". Exactly one 🟠 means "Ask first".

---

## Group FM: Document format & metadata

### FM1. Editable .docx "offer" or "contract" from a supposedly large organisation · 🟠
- **What it means:** Big employers, agencies and brands usually send a locked PDF or an e-signature envelope from their HR/contract system. An editable Word file from "HR" is not proof of a scam, but anyone could have typed it.
- **Seen:** Students at a US college got Gmail messages with a .docx "job offer" that led to a Google Form harvesting their details ([CUNY CSI](https://csitoday.com/2024/06/caution-phishing-scam-alert/)). Counterpoint: a recruiter on X said a Word offer alone isn't proof, so check the sender domain ([X](https://x.com/apply4forme/status/2113589922431209659)).
- **Source:** [CUNY CSI security alert](https://csitoday.com/2024/06/caution-phishing-scam-alert/) · [FBI IC3 PSA (non-company email, fake offers)](https://www.ic3.gov/PSA/2020/PSA200121)
- **Detect:** 📄 (file type)
- **Endpoint:** **Inspect** (file type, macros, metadata), then **Decide** (combined with other signals)

### FM2. Macro-enabled file or "Enable Content to view" · 🔴
- **What it means:** A real contract never needs you to enable macros or editing to read it. A `.docm`, a `vbaProject.bin` inside the file, or a banner saying "enable content to decrypt" is a malware delivery trick.
- **Seen:** Fake job offers spoofing a real staffing company led to a Word file with malicious macros. Enabling them installed the More_eggs backdoor ([Proofpoint](https://www.proofpoint.com/us/threat-insight/post/fake-jobs-campaigns-delivering-moreeggs-backdoor-fake-job-offers)). One Reddit tip: "Anytime an email says 'open the document' rather than 'refer to the attached', run" ([Reddit](https://www.reddit.com/r/recruitinghell/comments/zzbrda/i_need_help_i_think_im_getting_scammedi_got_this/)).
- **Source:** [Microsoft Learn: macros from the internet are blocked by default](https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked)
- **Detect:** 📄
- **Endpoint:** **Inspect** (macros in .docx/.docm). Also **Guard** on any "enable content" text in the document.

### FM3. "Contract" sent as .exe/.scr/.js, a shortcut, or a password-protected ZIP/RAR · 🔴
- **What it means:** Contracts are documents, not programs. Password-protected archives exist to get past antivirus scanning.
- **Seen:** A YouTuber said many sponsorship proposals came with an .exe "contract" and asks for personal data, and they had fallen for some before ([Reddit](https://www.reddit.com/r/youtubers/comments/1mmirdi/how_to_filter_scam_sponsorship_proposals/)).
- **Source:** [Google TAG: fake sponsorships delivering cookie-theft malware to creators](https://blog.google/threat-analysis-group/phishing-campaign-targets-youtube-creators-cookie-theft-malware/) · [Montgomery County Police (password-protected and .exe/.scr/.js files)](https://www.montgomerycountymd.gov/montgomery-county-police-department/how-do-i/frauds-scams/job-offer-scams)
- **Detect:** 📄 if uploaded, 📎 if only the email mentions it
- **Endpoint:** **Inspect** (rejects non-document types). Flag it before any other analysis.

### FM4. Metadata doesn't match the claimed issuer · 🟠 (🔴 if it names another company or person)
- **What it means:** Document properties (author, last modified by, company, template path, revision count, created and modified times) are often left from the scammer's own machine or template. Examples: author "Sarah K" on a letter from "Shell plc HR"; a template path from another company; created two minutes before it was sent; revision 1 on a "standard contract".
- **Seen:** A fake Graylog offer letter was traced through its metadata back to the scammer's own Office 365 tenant ([Graylog](https://graylog.org/post/scammers-use-graylog-name-in-fraudulent-job-offers/)).
- **Source:** [Montgomery County Police ("file properties may contain suspicious author names, software used, or unusual timestamps")](https://www.montgomerycountymd.gov/montgomery-county-police-department/how-do-i/frauds-scams/job-offer-scams) · tool reference: [TryDoku DOCX metadata fields](https://www.trydoku.com/tools/docx-metadata)
- **Detect:** 📄 (`docProps/core.xml`, `app.xml`; PDF Producer/Creator/Author)
- **Endpoint:** **Inspect** reads the metadata. **Verify** checks it against the official company name the user provides.

### FM5. Letterhead is just a pasted logo, with no registration details, address or footer · 🟠
- **What it means:** Real company paper normally carries the legal name, registered address and, in many countries, a company or registration number. A logo with nothing else is easy to fake.
- **Seen:** An "HR Team" sent a PDF offer with no company registration number, then asked for a work-permit "handling charge" ([X](https://x.com/velai___/status/2115415048239947982)). A Reddit "interview questions" document had only a logo, with no company name or address ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)).
- **Source:** [Indeed: missing company details](https://www.indeed.com/career-advice/finding-a-job/how-to-know-if-a-job-is-a-scam) · [GOV.UK DBS: check the company on Companies House](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams)
- **Detect:** 📄
- **Endpoint:** **Extract** (legal name, registration number, address, or "not stated"), then **Decide**

### FM6. Signature or stamp is a pasted image, or a real executive's signature copied · 🟠
- **What it means:** A signature image dropped on top of the text, or the same image reused across documents, proves nothing. Scammers often copy the names of real employees from the company website or LinkedIn.
- **Seen:** A fake offer was "signed" by two real employees listed on the Finnish company's website. The interview had run entirely over Telegram ([Reddit](https://www.reddit.com/r/Scams/comments/1dvbmkm/fake_job_offer_check_scam/)). A forged signature appeared on a fake Excise Commissioner appointment letter ([X](https://x.com/thegoanonline/status/2108840124239020356)).
- **Source:** [FBI IC3 PSA 2022 (spoofed logos; real employees' identities used)](https://www.ic3.gov/PSA/2022/PSA220201) · [FTC ("cut-and-paste fakes")](https://www.ftc.gov/business-guidance/blog/2023/08/job-scammers-go-even-lower-way-they-hire)
- **Detect:** 📄 (image object over the signature line; no cryptographic signature)
- **Endpoint:** **Inspect** (images, signature fields). **Verify** checks that the signatory is in the user-provided official contact list.

### FM7. Patchwork formatting: mixed fonts, leftover template text, find-and-replace errors · 🟠
- **What it means:** The document was assembled from pieces, for example two fonts in one paragraph, another company's name left in, "[INSERT]" left over, or doubled words from find-and-replace.
- **Seen:** A university "admission letter" said "admission to admission", which looked like AI or template output ([X](https://x.com/Saj_QauAh/status/2109153729530536227)). A rental "agency" email had odd bolding and red caps-lock text ([Reddit](https://www.reddit.com/r/Scams/comments/1mq7zlh/canada_landlord_is_abroad_wants_to_send_me_key_in/)).
- **Source:** [Michigan AG (poor spelling, unusual formatting)](https://www.michigan.gov/consumerprotection/protect-yourself/consumer-alerts/scams/work-from-home-and-employment-scams)
- **Detect:** 📄
- **Endpoint:** **Inspect** (font runs, styles) and **Decide** (template leftovers). Low weight on its own, because AI now produces clean text.

---

## Group SI: Sender identity

### SI1. Free webmail for an "organisation" (gmail, yahoo, outlook, hotmail, zohomail, proton) · 🔴 for a large or government body, 🟠 for a small business
- **What it means:** Large companies, agencies and governments send from their own domain. "HR Team <hrdept.xyzcorp@gmail.com>" is a classic tell.
- **Seen:** "HR Team" wrote from Gmail ([X](https://x.com/velai___/status/2115415048239947982)). The fake brand "Night Sterling" pitched creators from `zohomailcloud.ca` and sent malware as its "app" ([X](https://x.com/codewithyousaf/status/2111123848443863341)).
- **Source:** [FBI IC3 PSA 2020](https://www.ic3.gov/PSA/2020/PSA200121) · [Ohio AG](https://ohioattorneygeneral.gov/Media/Newsletters/Consumer-Advocate/October-2025/Job-hunters-Beware-of-opportunities-that-seem-too)
- **Detect:** 📄 if an email address is printed in the document, 📎 if only in the email header
- **Endpoint:** **Extract** (all emails and domains) and **Verify** (against the official domain the user provides)

### SI2. Lookalike or variant domain · 🔴
- **What it means:** The domain is almost right. Examples: one letter swapped (rn for m, capital I for lowercase l), an extra word (`-llc`, `-careers`, `-jobs`, `-hr`), or a new TLD (`.careers`, `.co`, `.work`). It was often registered days earlier.
- **Seen:**
  - An invoice phish used a capital "I" in place of an "l" and demanded payment to new bank details within 24 hours ([X](https://x.com/strategicreset/status/2117003157721252294)).
  - A recruiter wrote from `firstname.lastname@<company>.careers`, using the real CHRO's name. The domain had been registered a couple of days earlier ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)).
  - An HR worker said scammers cloned "companynamecareer.com" as "companynamejobs.com" ([Reddit](https://www.reddit.com/r/Scams/comments/1ivamw3/job_offer_letter_scam/)).
- **Source:** [FBI IC3 PSA 2020 (abccompany.com vs abccompanyllc.com)](https://www.ic3.gov/PSA/2020/PSA200121) · [FBI Boston BEC (lawfirm.com vs lawflrm.com)](https://www.fbi.gov/contact-us/field-offices/boston/news/press-releases/fbi-warns-of-dramatic-increase-in-business-e-mail-compromise-scams)
- **Detect:** 📄 the domain in the text · 📎 the official domain and the domain's registration date
- **Endpoint:** **Verify** (edit distance and confusable letters vs the official domain) and **Compare**

### SI3. Reply-To or bounce mismatch · 🔴
- **What it means:** The "From" address looks right, but replies go somewhere else, or the stated address bounces and someone answers from a different one.
- **Seen:** A fake offer was exposed when the HR email bounced and the "company" replied from a different address ([X](https://x.com/Not_Man/status/2117006671289741537)).
- **Source:** [FBI Boston BEC alert (Reply-To redirection, lookalike sender)](https://www.fbi.gov/contact-us/field-offices/boston/news/press-releases/fbi-warns-of-dramatic-increase-in-business-e-mail-compromise-scams)
- **Detect:** 📎 (raw email header pasted by the user)
- **Endpoint:** **Extract** (header fields) and **Compare** (From vs Reply-To vs Return-Path vs the domain in the document)

### SI4. Real person, wrong role or wrong channel · 🟠
- **What it means:** The names are real employees, but the roles don't fit. A CHRO doesn't book junior interviews, and a Chief Product Officer doesn't call accountants. Or the person is real, but their contact details are not the company's.
- **Seen:** In the scam above, the person due to call was listed on LinkedIn as the company's Chief Product Officer ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)).
- **Source:** [FBI IC3 PSA 2022 (identities of real employees used)](https://www.ic3.gov/PSA/2022/PSA220201) · [LinkedIn Help: recognize and report scams](https://www.linkedin.com/help/linkedin/answer/a1336387/recognize-and-report-scams)
- **Detect:** 📎 (official staff or contact info)
- **Endpoint:** **Verify** (signatory name, title and email vs the user-provided official info)

### SI5. No named human: signed "HR Team", "Recruitment Department" or "Grants Committee" · 🟠
- **What it means:** A legitimate offer or contract names an accountable person. Anonymous sign-offs let scammers reuse the same template.
- **Seen:** One Reddit user received two "offers" that ended with just "Best regards" and no name. The sender never said where they saw the application ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)).
- **Source:** [GOV.UK DBS ("no point of contact" is a red flag)](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams)
- **Detect:** 📄
- **Endpoint:** **Extract** (signatory name and title, or "not stated")

### SI6. Wrong or invented legal entity name · 🔴
- **What it means:** The name is close to the real company but not the registered entity. Examples: "Mitsui & Co. Recruitment Program", "Amazon Hiring Ltd", "LLC" for a UK firm, or a name not found on the official registry (Companies House, CAC, ASIC, SEC/state register).
- **Seen:** Reddit users flag a recurring "Mitsui & Co. Recruitment Program" template sent to entry-level job seekers ([Reddit](https://www.reddit.com/r/interviews/comments/1g480jv/how_to_tell_if_your_offer_is_a_scam/)).
- **Source:** [GOV.UK: check the employer's exact legal name on the register / Certificates of Sponsorship](https://www.gov.uk/uk-visa-sponsorship-employers/certificates-of-sponsorship) · [Citizens Advice: check if something might be a scam](https://www.citizensadvice.org.uk/consumer/scams/check-if-something-might-be-a-scam/)
- **Detect:** 📄 the name · 📎 the official registry entry
- **Endpoint:** **Extract** and **Verify** (exact legal name vs the user-provided registry printout)

### SI7. Registration, licence or reference number missing, malformed, or belonging to someone else · 🟠 (🔴 if it belongs to another entity)
- **What it means:** A company number with the wrong length or format, or one that belongs to a different company. Also a "licence number" on a recruitment, tenancy or lending document that doesn't resolve.
- **Seen:** A PDF offer with no company registration number came with a work-permit handling charge ([X](https://x.com/velai___/status/2115415048239947982)).
- **Source:** [GOV.UK DBS (check Companies House)](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams) · [Investor.gov (verify registration before paying)](https://www.investor.gov/protect-your-investments/fraud/types-fraud/advance-fee-fraud)
- **Detect:** 📄 presence and format · 📎 ownership
- **Endpoint:** **Extract** (number with position) and **Verify**

### SI8. Unsolicited: you never applied, pitched or entered · 🔴 when combined with any money or data ask
- **What it means:** An offer, grant, prize, sponsorship or "new landlord" letter arrives without you starting the process.
- **Seen:**
  - A direct offer letter with no application, call or interview, followed by a ₹983 "processing fee" ([X](https://x.com/rtffanboy/status/2110028840357748913)).
  - A $30/hour offer to a high-school student who didn't remember applying ([Reddit](https://www.reddit.com/r/recruitinghell/comments/zzbrda/i_need_help_i_think_im_getting_scammedi_got_this/)).
  - Fake "new landlord" letters after a building is sold ([X](https://x.com/rentyfic/status/2116320583239495908)).
- **Source:** [BBB (offer without interview)](https://x.com/BBBWesternVA/status/2115079562858033268) · [FTC: government grant scams (agencies don't contact you out of the blue)](https://consumer.ftc.gov/articles/government-grant-scams)
- **Detect:** 📄 wording ("you have been selected", "we found your CV") · 📎 the user confirms they didn't apply
- **Endpoint:** **Decide** (label: "unsolicited selection")

### SI9. The document gives you its own "verification" route · 🔴
- **What it means:** The letter, invoice or alert tells you to confirm it by calling a number, opening a link or emailing a "verification desk" that the document itself supplies. A real organisation sends you to a channel you already have: the official website, the app, or the number on your card or contract.
- **Seen:** The quiz's "bank alert" card is a trap because it says "call +1 555 0142 now". The lesson is to call the number on the back of your card instead ([quiz](https://ai-safety-score.apcollective.site/)). A quiz player's rule: "Verify on a channel YOU open, never one that contacted you" ([X](https://x.com/OxAnuj/status/2116166652668907878)).
- **Source:** [YouTube Help (verify a brand deal at a publicly listed number)](https://support.google.com/youtube/answer/16281336?hl=en) · [Report Fraud: mandate fraud (use contact details already on file)](https://www.reportfraud.police.uk/mandate-fraud/) · [MEXC Verify (official channel checker)](https://www.mexc.com/learn/article/protecting-yourself-from-common-scams/2)
- **Detect:** 📄 (a "to verify/confirm, contact…" phrase plus a phone, link or email in the document) · 📎 to compare it with the official contact
- **Endpoint:** **Extract** (verification contact) and **Verify** (vs the official contact the user provides). A mismatch is 🔴.

---

## Group MA: Money and data asks (extends RED_FLAGS 1.2 / 1.4 / 1.9 / 1.10 / 1.12)

### MA1. "We'll send a cheque, you buy equipment from our vendor" · 🔴 (a job-specific form of 1.9)
- **What it means:** The "employer" sends a cheque or e-cheque for laptops or software, and you pay their "preferred supplier" with your own money. The cheque bounces days later. The giveaway in the text is named brands or model numbers plus a specific vendor.
- **Seen:**
  - An emailed check for hardware arrived after a Telegram-only interview ([Reddit](https://www.reddit.com/r/Scams/comments/1dvbmkm/fake_job_offer_check_scam/)).
  - A check for a "software license and training" bounced after the victim had signed the offer ([Reddit](https://www.reddit.com/r/Scams/comments/1lwz3wn/job_offer_scam_i_fell_for/)).
  - A text out of nowhere led to a check for equipment, with part to be sent back ([X](https://x.com/legitwfh/status/2112886191817466192)).
- **Source:** [FTC: job scams](https://consumer.ftc.gov/articles/job-scams) · [FTC business blog ("preferred supplier", model numbers)](https://www.ftc.gov/business-guidance/blog/2023/08/job-scammers-go-even-lower-way-they-hire)
- **Detect:** 📄
- **Endpoint:** **Decide** (label linked to 1.9) and **Extract** (vendor, amount, model numbers)

### MA2. Pay-to-start fee dressed up as admin · 🔴 (a job-specific form of 1.2)
- **What it means:** The fee has an admin name: "processing", "registration", "medicals", "uniform", "training", "background or DBS check", "work-permit handling" or "visa or Certificate of Sponsorship". Genuine employers pay these costs. A UK sponsor must not pass the Certificate of Sponsorship fee on to the worker.
- **Seen:**
  - An attached "Appointment Letter" by email or WhatsApp, then a "Processing/Medicals/Uniform Fee" ([X](https://x.com/kojosec/status/2110009669464772948)).
  - A WhatsApp-only offer with a registration fee ([X](https://x.com/devglobaljobs/status/2112514167420666061)).
  - A jobseeker paid for a DBS check and the contact went silent ([GOV.UK DBS case study](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams)).
- **Source:** [GOV.UK Certificates of Sponsorship](https://www.gov.uk/uk-visa-sponsorship-employers/certificates-of-sponsorship) · [GOV.UK DBS 7 signs](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams) · [Citizens Advice](https://www.citizensadvice.org.uk/consumer/scams/check-if-something-might-be-a-scam/)
- **Detect:** 📄
- **Endpoint:** **Decide** (same label as 1.2) and **Extract** (fee name, amount, payee)

### MA3. Grant or funding "release / verification / due-diligence / legal" fee · 🔴 (a grant/investor form of 1.2)
- **What it means:** You must pay before the grant is released or the investment closes. Real investors pay their own due diligence, and agreed costs come out of the closing proceeds.
- **Seen:**
  - A startup was told to "contribute £2k" towards an investor's due-diligence checks, refundable if no term sheet followed ([Reddit](https://www.reddit.com/r/startups/comments/y8sdi0/due_diligence_payment/)).
  - Fake government youth-fund and bursary letters with a registration fee and government logos ([X](https://x.com/Mike_Kutola/status/2115832226277716323)).
  - Grant "verification fee" warnings ([X](https://x.com/dassah_9/status/2116245275735896418)).
- **Source:** [Investor.gov: advance fee fraud](https://www.investor.gov/protect-your-investments/fraud/types-fraud/advance-fee-fraud) · [FTC: government grant scams](https://consumer.ftc.gov/articles/government-grant-scams) · journalism: [Krebs on Security, fake investor, $30M](https://krebsonsecurity.com/2020/10/promising-infusions-of-cash-fake-investor-john-bernard-walked-away-with-30m/)
- **Detect:** 📄
- **Endpoint:** **Decide** (1.2 label) and **Extract**

### MA4. Brand deal or "ambassador" offer where you pay for the product, shipping or kit · 🔴
- **What it means:** A "free" collab requires you to pay shipping, customs, a "discount" or an ambassador fee. Real gifted collaborations don't charge the creator.
- **Seen:** Aspiring influencers paid for "free" products from brands that DM'd them, and reported it to BBB ([BBB Scam Alert](https://www.bbb.org/article/scams/18288-scam-alert-instagram-users-fall-for-phony-offers-from-brands)).
- **Source:** [BBB Scam Alert: phony sponsorships](https://www.bbb.org/article/scams/18288-scam-alert-instagram-users-fall-for-phony-offers-from-brands) · security vendor: [F-Secure scam encyclopedia 3.2](https://www.f-secure.com/en/partners/illuminate-research/scam-encyclopedia/scams/3-2-modeling-influencer-brand-ambassador-gaming-sponsorship-scam)
- **Detect:** 📄
- **Endpoint:** **Decide** (label: "creator pays the brand")

### MA5. "Enrol in our bank account / open an account for payroll" or move money through your account · 🔴
- **What it means:** The job requires you to open an account through their link, or to receive and forward money. This is money-mule recruitment or identity harvesting.
- **Seen:** A job description PDF required the new hire to "enroll in a bank account for payroll functions". A second "company" used almost identical wording ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)).
- **Source:** [FBI El Paso (using your own bank to transfer their money)](https://www.fbi.gov/contact-us/field-offices/elpaso/news/press-releases/fbi-warns-cyber-criminals-are-using-fake-job-listings-to-target-applicants-personally-identifiable-information) · [Scamwatch (transferring money or receiving packages for others)](https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams)
- **Detect:** 📄
- **Endpoint:** **Decide**

### MA6. SSN, BVN, NIN, passport or bank details collected inside the offer itself, before an interview or background-check portal · 🔴 (a timing form of 1.10)
- **What it means:** Identity numbers belong in tax, I-9 or onboarding systems after hiring, not in fields on an offer letter or an emailed form.
- **Seen:**
  - A DocuSign "offer letter" had fields asking for SSN and date of birth again. An HR commenter said this is not how onboarding works ([Reddit](https://www.reddit.com/r/Scams/comments/1ivamw3/job_offer_letter_scam/)).
  - SSN asked for before ever speaking to a person ([X](https://x.com/legitwfh/status/2112886191817466192)).
- **Source:** [FBI IC3 PSA 2020 (PII and bank details are collected only after hiring)](https://www.ic3.gov/PSA/2020/PSA200121) · [FBI El Paso](https://www.fbi.gov/contact-us/field-offices/elpaso/news/press-releases/fbi-warns-cyber-criminals-are-using-fake-job-listings-to-target-applicants-personally-identifiable-information)
- **Detect:** 📄 (form fields and labels)
- **Endpoint:** **Extract** (requested-data fields with positions) and **Decide**

### MA7. Rent or deposit before viewing; "landlord abroad will post the keys" · 🔴
- **What it means:** You pay first and see the property later, or never. A variant routes the payment through a real-sounding agency name to look safe.
- **Seen:**
  - A Vancouver "landlord" in Spain said Keller Williams would collect the first month's rent and damage deposit, then he would post the lease and key ([Reddit](https://www.reddit.com/r/Scams/comments/1mq7zlh/canada_landlord_is_abroad_wants_to_send_me_key_in/)).
  - A landlord rented the same flat to three families ([X](https://x.com/empress_md/status/2113275270081757551)).
- **Source:** [FTC: rental listing scams](https://consumer.ftc.gov/articles/rental-listing-scams) · Competition Bureau tips via [X](https://x.com/TheDoderoGroup/status/2112946217499984317)
- **Detect:** 📄 (payment-before-access sequence in the lease or email)
- **Endpoint:** **Decide** and **Extract** (payee, amount, condition)

### MA8. Invoice bank details changed, or the account name doesn't match the supplier · 🔴 (a document-level form of 1.12)
- **What it means:** The new invoice looks identical, but the sort code or IBAN changed, the account holder is a person or different firm, or the bank is in another country. This can come from the supplier's real, hacked mailbox.
- **Seen:**
  - A bank-change email came from the real thread and still was fraud. UK Finance cites £41.3m lost to invoice and mandate scams in 2025 ([X](https://x.com/BankrolledInc/status/2114026324193165373)).
  - Report Fraud UK: £101m stolen via fake invoices in a year ([X](https://x.com/tsecrime/status/2112853904517919094)).
- **Source:** [Report Fraud (formerly Action Fraud): mandate fraud](https://www.reportfraud.police.uk/mandate-fraud/) · [FBI Boston BEC](https://www.fbi.gov/contact-us/field-offices/boston/news/press-releases/fbi-warns-of-dramatic-increase-in-business-e-mail-compromise-scams)
- **Detect:** 📄 the account-name vs supplier-name mismatch · 📎 the earlier invoice for the change
- **Endpoint:** **Compare** (new vs previous invoice, bank fields) and **Extract**

### MA9. Official-looking solicitation disguised as an invoice · 🟠 (🔴 if it uses government-like names)
- **What it means:** It looks like a bill for trademark renewal, a directory listing or a domain. In small print it says "this is not a bill" or "solicitation". The names sound like government bodies ("U.S. Trademark Office Services").
- **Seen:** The USPTO publishes real examples of misleading "invoices" sent to trademark owners using public filing data ([USPTO examples](https://www.uspto.gov/trademarks/protect/examples-fraudulent-misleading-solicitations)).
- **Source:** [USPTO: non-USPTO solicitations](https://www.uspto.gov/patents/basics/using-legal-services/scam-prevention/non-uspto-solicitations) · [Minnesota AG: fake invoices targeted at businesses](https://www.ag.state.mn.us/consumer/Publications/FakeInvoices.asp)
- **Detect:** 📄 (fine print, issuer name)
- **Endpoint:** **Extract** (issuer, "not a bill" text with position) and **Decide**

### MA10. Free "test" work that is really the deliverable · 🟠
- **What it means:** A freelancer or contractor is asked for a large unpaid "trial", or the agreement makes payment depend on a "test" with no defined scope.
- **Seen:** Upwork's own example is a high-rate client demanding a significant amount of free work as a "test" ([Upwork](https://support.upwork.com/hc/en-us/articles/35088484250003-Recognize-red-flags-and-avoid-scams)).
- **Source:** [Upwork: recognize red flags and avoid scams](https://support.upwork.com/hc/en-us/articles/35088484250003-Recognize-red-flags-and-avoid-scams)
- **Detect:** 📄
- **Endpoint:** **Decide** and **Extract** (unpaid scope)

---

## Group PR: Pressure (extends RED_FLAGS 1.1)

### PR1. Hired with no interview, or after one text-only chat · 🔴
- **What it means:** No real employer hires sight unseen. The document may say "following your successful interview" when no interview happened, or give no interview date or interviewer name.
- **Seen:** People report being hired after a single interview, never seeing anyone, with text-only interviews ([Reddit](https://www.reddit.com/r/interviews/comments/1g480jv/how_to_tell_if_your_offer_is_a_scam/)). Also a direct offer with no application or call ([X](https://x.com/rtffanboy/status/2110028840357748913)).
- **Source:** [GOV.UK DBS #4](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams) · [Indeed](https://www.indeed.com/career-advice/finding-a-job/how-to-know-if-a-job-is-a-scam)
- **Detect:** 📄 when no interview is referenced · 📎 when the user's history is needed
- **Endpoint:** **Decide** and **Extract** (interview date and interviewer, or "not stated")

### PR2. "Interview now, by chat," at odd hours · 🟠
- **What it means:** Moving from email straight to a chat-only interview, outside business hours, with the camera off or no video.
- **Seen:** A "company" ran a Teams chat interview at 8:30pm ET with an "HR" impersonator ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)). A fake Graylog interview ran over Skype chat with no video ([Graylog](https://graylog.org/post/scammers-use-graylog-name-in-fraudulent-job-offers/)).
- **Source:** [FBI IC3 PSA 2020 (interviews not via secure video)](https://www.ic3.gov/PSA/2020/PSA200121)
- **Detect:** 📎 (chat or email timestamps)
- **Endpoint:** **Extract** from the pasted chat, then **Decide**

### PR3. Sign first, details later · 🟠
- **What it means:** You're asked to sign or accept the offer before you've seen the duties, pay terms or employer details. The "real" onboarding then happens on another app.
- **Seen:** The victim signed the offer letter, was moved to Telegram, and then received the cheque ([Reddit](https://www.reddit.com/r/Scams/comments/1lwz3wn/job_offer_scam_i_fell_for/)).
- **Source:** [FBI El Paso (contract to sign that asks for PII)](https://www.fbi.gov/contact-us/field-offices/elpaso/news/press-releases/fbi-warns-cyber-criminals-are-using-fake-job-listings-to-target-applicants-personally-identifiable-information) · [Indeed](https://www.indeed.com/career-advice/finding-a-job/how-to-know-if-a-job-is-a-scam)
- **Detect:** 📄 (missing terms plus a signature block)
- **Endpoint:** **Extract** (which core terms are "not stated"), then **Decide**

### PR4. Too much flexibility: "choose full or part time, start whenever, any hours" · 🟠
- **What it means:** Real roles have fixed hours, a start date and a manager. Endless flexibility is bait.
- **Seen:** Offers that let you "choose full- or part-time", with daily or weekly pay ([Reddit](https://www.reddit.com/r/interviews/comments/1g480jv/how_to_tell_if_your_offer_is_a_scam/)).
- **Source:** [Scamwatch (high pay, flexible, little effort)](https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams)
- **Detect:** 📄
- **Endpoint:** **Decide**

### PR5. "Don't use the old number, email or account" · 🔴
- **What it means:** The document or email cuts you off from the channel you could check with. Examples: "our old email is no longer monitored", "don't call the office, they don't handle this", "my old phone is broken". It often comes with a new payee (see 1.12) or a new contact (SI9).
- **Seen:** The quiz's voice-clone card: "this is my new number… send $400… Don't call the old one, it's broken." The lesson is to call the old number anyway ([quiz](https://ai-safety-score.apcollective.site/)). One player nearly sent 200 USDT to a cloned voice of their brother, then called his real number. He was asleep and there was no emergency ([X](https://x.com/Callme_Seth22/status/2116913912876589277)).
- **Source:** [Report Fraud: mandate fraud](https://www.reportfraud.police.uk/mandate-fraud/) · [FBI Boston BEC (verify by a trusted, out-of-band number)](https://www.fbi.gov/contact-us/field-offices/boston/news/press-releases/fbi-warns-of-dramatic-increase-in-business-e-mail-compromise-scams)
- **Detect:** 📄
- **Endpoint:** **Decide** (label: "steers you away from the usual contact"), then **Extract** the new contact

---

## Group WD: Wording

### WD1. Generic salutation where your name should be ("Dear Candidate", "Hello dear", "Dear Beneficiary") · 🟠
- **What it means:** A personal offer, contract or grant letter that doesn't name you was probably mass-sent.
- **Seen:** "Who opens an e-mail to a child with 'Hello dear [name]'? Nobody" ([Reddit](https://www.reddit.com/r/recruitinghell/comments/zzbrda/i_need_help_i_think_im_getting_scammedi_got_this/)). An SQL "offer" didn't address the person by name at all ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)).
- **Source:** [Docusign: fraud resources (generic greetings)](https://www.docusign.com/safety/fraud-resources)
- **Detect:** 📄
- **Endpoint:** **Extract** (addressee name, or "not stated")

### WD2. Vague duties, no job location, no hours, no reporting line · 🟠
- **What it means:** The document says what you'll be paid but not what you'll do, where, or for whom.
- **Seen:** Reddit users note that entry-level "Analyst/Coordinator" titles are common bait because they are vague ([Reddit](https://www.reddit.com/r/interviews/comments/1g480jv/how_to_tell_if_your_offer_is_a_scam/)).
- **Source:** [GOV.UK DBS #1](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams) · [VA VSAFE (vague language)](https://vsafe.gov/va-toolkit/va-fraud-prevention-kit/employment-business-and-job-opportunities/)
- **Detect:** 📄
- **Endpoint:** **Extract** (duties, location, hours and manager, each marked "not stated" if absent) and **Decide**

### WD3. Pay well above market for the role, or paid daily or weekly · 🟠
- **What it means:** Entry-level pay far above market, an exact figure with no band, or daily or weekly pay for office work.
- **Seen:** $30/hour for a high-schooler ([Reddit](https://www.reddit.com/r/recruitinghell/comments/zzbrda/i_need_help_i_think_im_getting_scammedi_got_this/)). High salary for an entry role with daily or weekly pay ([Reddit](https://www.reddit.com/r/interviews/comments/1g480jv/how_to_tell_if_your_offer_is_a_scam/)).
- **Source:** [GOV.UK DBS #3](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams) · [Michigan AG](https://www.michigan.gov/consumerprotection/protect-yourself/consumer-alerts/scams/work-from-home-and-employment-scams) · [Upwork](https://support.upwork.com/hc/en-us/articles/35088484250003-Recognize-red-flags-and-avoid-scams)
- **Detect:** 📄 the pay and frequency · 📎 the market rate
- **Endpoint:** **Extract** (pay, frequency), then **Decide**

### WD4. Robotic, over-formal or copy-pasted text · 🟠 (low weight)
- **What it means:** Phrases like "Your candidacy is suitable for…" or "In conclusion…", or text lifted wholesale from a real job ad.
- **Seen:** A Reddit comment flagged exactly that robotic tone ([Reddit](https://www.reddit.com/r/recruitinghell/comments/zzbrda/i_need_help_i_think_im_getting_scammedi_got_this/)). The Graylog scam pasted text from real job descriptions ([Graylog](https://graylog.org/post/scammers-use-graylog-name-in-fraudulent-job-offers/)).
- **Source:** [Montgomery County Police (unnatural phrasing, template manipulation)](https://www.montgomerycountymd.gov/montgomery-county-police-department/how-do-i/frauds-scams/job-offer-scams)
- **Detect:** 📄
- **Endpoint:** **Decide**. Keep the weight low, because AI hides this ([X](https://x.com/chams_builds/status/2109611287441183150)).

### WD5. The duties are moving money or goods · 🔴
- **What it means:** The work is to receive payments, reship packages, "process" transfers, or do app "optimisation" or "rating" tasks that need top-ups.
- **Seen:** A top Reddit comment lists "no money-mule, no reshipping, no crypto pay" as hard rules ([Reddit](https://www.reddit.com/r/Scams/comments/1lwz3wn/job_offer_scam_i_fell_for/)).
- **Source:** [FBI IC3 PSA 2024 (task scams, crypto to employer)](https://www.ic3.gov/PSA/2024/PSA240604) · [Scamwatch](https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams)
- **Detect:** 📄
- **Endpoint:** **Decide**

### WD6. Standard terms missing · 🟠
- **What it means:** The letter or agreement has no start date, notice period, governing law, employer address, payment schedule or termination clause. These are things any real HR or legal template includes.
- **Seen:** Offers with a logo but no company name or address ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)).
- **Source:** [Indeed (missing company details)](https://www.indeed.com/career-advice/finding-a-job/how-to-know-if-a-job-is-a-scam) · [GOV.UK DBS #1](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams)
- **Detect:** 📄
- **Endpoint:** **Extract** (checklist of fields; each absent one marked "not stated")

### WD7. "You have been selected or approved" for a grant, award or appointment you didn't apply for · 🔴
- **What it means:** Pre-approval language with government or brand logos ("Federal Grant Committee", "Presidential Youth Fund").
- **Seen:** Fake government jobs, youth funds and bursaries using official logos ([X](https://x.com/Mike_Kutola/status/2115832226277716323)). Tamil Nadu police warned about lottery and scholarship "selections" with fees ([X](https://x.com/PradiptaMoney/status/2106974161297871119)).
- **Source:** [FTC: government grant scams](https://consumer.ftc.gov/articles/government-grant-scams)
- **Detect:** 📄
- **Endpoint:** **Decide** (combined with 1.6 fake authority)

### WD8. Lease or letter doesn't name the legal owner, or names someone else · 🟠
- **What it means:** A tenancy agreement signed by an "agent" or "caretaker", or a "new landlord" letter, with no proof they own or manage the property.
- **Seen:** Fake "new landlord" letters telling tenants to redirect rent ([X](https://x.com/rentyfic/status/2116320583239495908)). The same flat let to three families ([X](https://x.com/empress_md/status/2113275270081757551)).
- **Source:** [FTC: rental listing scams](https://consumer.ftc.gov/articles/rental-listing-scams)
- **Detect:** 📄 who is named · 📎 the property or ownership record
- **Endpoint:** **Extract** (landlord, owner and agent names) and **Verify**

---

## Group IN: Inconsistencies

### IN1. Company name differs across letterhead, body, signature, email and payee · 🔴
- **What it means:** The letterhead says one name, the body another, and the payee or email domain a third. This is often left over from reusing a template.
- **Seen:** The email domains didn't match the companies applied to ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)). A second scam's sender domain didn't match its company ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)).
- **Source:** [FBI IC3 PSA 2020](https://www.ic3.gov/PSA/2020/PSA200121)
- **Detect:** 📄
- **Endpoint:** **Extract** (every entity mention with positions), then **Decide** (or **Compare** across sections)

### IN2. Address is missing, residential or virtual, or in a different country from the claimed base · 🟠
- **What it means:** "London HQ" with a +234 or +1 VoIP number and no street address, or a registered address that is a mail drop.
- **Seen:** A document with a logo but no address ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)).
- **Source:** [Bitdefender (missing address or phone; addresses can be spoofed)](https://www.bitdefender.com/en-us/blog/hotforsecurity/spot-job-scam-10-signs-fake-job-offer) · [GOV.UK DBS #7 (domain or base outside the country)](https://www.gov.uk/government/news/new-year-jobseekers-urged-to-watch-out-for-7-signs-of-job-scams)
- **Detect:** 📄 presence and country codes · 📎 the official address
- **Endpoint:** **Extract** and **Verify**

### IN3. Role or offer isn't on the official careers site, or the advert and the offer differ · 🟠
- **What it means:** The job, sponsorship programme or grant doesn't appear on the organisation's own site. Or the title, pay or location in the offer differs from the advert.
- **Seen:** An HR worker received many calls to verify offers from a cloned careers site ([Reddit](https://www.reddit.com/r/Scams/comments/1ivamw3/job_offer_letter_scam/)).
- **Source:** [FBI IC3 PSA 2020 (jobs on boards but not the company site)](https://www.ic3.gov/PSA/2020/PSA200121) · [VA VSAFE](https://vsafe.gov/va-toolkit/va-fraud-prevention-kit/employment-business-and-job-opportunities/)
- **Detect:** 📎 (the advert and the official listing)
- **Endpoint:** **Compare** (advert vs offer) and **Verify**

### IN4. Same template, different "companies" · 🟠
- **What it means:** Two offers from supposedly unrelated firms share identical layout, clauses or odd sentences.
- **Seen:** Two "uncannily similar" offers for different companies ([Reddit](https://www.reddit.com/r/Scams/comments/1bzyfa2/been_looking_for_work_got_two_emails_that_look/)). A second scam had "almost identical language about the bank account" ([Reddit](https://www.reddit.com/r/recruitinghell/comments/1mhv8yn/these_scams_are_getting_sophisticated/)).
- **Source:** [FTC ("cut-and-paste fakes")](https://www.ftc.gov/business-guidance/blog/2023/08/job-scammers-go-even-lower-way-they-hire)
- **Detect:** 📎 (a second document)
- **Endpoint:** **Compare**. A future option is a SignSafe-held library of known scam templates (synthetic copies only).

### IN5. Price or rent far out of line for what is offered · 🟠
- **What it means:** Rent well below market for the area, a sponsorship fee far above the channel's size, or a "grant" larger than the programme could give.
- **Seen:** Competition Bureau tips: rent far below market, a deposit before viewing, and a landlord who can't meet ([X](https://x.com/TheDoderoGroup/status/2112946217499984317)). A fake sponsorship site showed the creator's real stats to seem credible ([X](https://x.com/30anerds/status/2113344896891269285)).
- **Source:** [FTC: rental listing scams](https://consumer.ftc.gov/articles/rental-listing-scams)
- **Detect:** 📄 the amount · 📎 the market rate
- **Endpoint:** **Extract**, then **Decide**

---

## Group PB: Platform behaviour

### PB1. Interview or onboarding only on Telegram, WhatsApp, Signal or Hangouts · 🔴
- **What it means:** The document or email tells you to "contact our HR on Telegram @…" or WhatsApp only. Indeed says it never offers jobs through WhatsApp, Telegram or text.
- **Seen:** A full "interview" on Telegram led to an offer, W-4, I-9 and a cheque ([Reddit](https://www.reddit.com/r/Scams/comments/1dvbmkm/fake_job_offer_check_scam/)). A WhatsApp-only offer with a fee ([X](https://x.com/devglobaljobs/status/2112514167420666061)).
- **Source:** [VA VSAFE](https://vsafe.gov/va-toolkit/va-fraud-prevention-kit/employment-business-and-job-opportunities/) · [Indeed](https://www.indeed.com/help/job-seekers/articles/28360944766221-text-messages-or-phone-calls-claiming-to-be-indeed-it-might-be-a-scam) · [Scamwatch](https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams)
- **Detect:** 📄 if the handle or number is in the document · 📎 otherwise
- **Endpoint:** **Extract** (handles, numbers, app names), then **Decide**

### PB2. Pushed off the platform before a contract (Upwork, Fiverr, LinkedIn) · 🔴
- **What it means:** The client wants to move to email, Telegram or direct payment before the contract exists. On Upwork this breaks the rules and removes payment protection.
- **Seen:** A victim was moved to Telegram right after signing ([Reddit](https://www.reddit.com/r/Scams/comments/1lwz3wn/job_offer_scam_i_fell_for/)).
- **Source:** [Upwork: circumvention](https://support.upwork.com/hc/en-us/articles/360052511133-Circumvention-and-why-it-s-against-the-rules) · [Upwork: red flags](https://support.upwork.com/hc/en-us/articles/35088484250003-Recognize-red-flags-and-avoid-scams)
- **Detect:** 📄 (contract or chat says "pay outside", "contact me at") · 📎 (chat)
- **Endpoint:** **Decide**

### PB3. "Sign in with Google or Microsoft to view the offer or contract" · 🔴
- **What it means:** The document is behind a login page that steals your password and 2FA codes. Some sites even show your real channel stats to seem legit.
- **Seen:**
  - A fake "Amazon Music" sponsorship site asked creators to "verify" with Google ([X, Malwarebytes](https://x.com/30anerds/status/2113344896891269285)).
  - The same scam ran under Hollyland, Nike and Spotify branding ([X, ESET](https://x.com/stratbyabdullah/status/2109712114982302132)).
  - A creator lost their account this way ([X](https://x.com/violetadaze/status/2110106800834199951)).
- **Source:** [YouTube Help: channel security tips](https://support.google.com/youtube/answer/16281336?hl=en)
- **Detect:** 📄 (link text, "sign in to view" wording)
- **Endpoint:** **Extract** (links), **Guard**, **Decide**

### PB4. Spoofed e-signature envelope · 🔴
- **What it means:** A "Docusign" email not from `docusign.net`/`docusign.com`, links to other domains, no access code, or a request for a password.
- **Seen:** Docusign's own June 2025 alert describes spoofed envelopes that lead to credential pages ([Docusign alert](https://www.docusign.com/trust/alerts/fraud-alert-spoofed-docusign-emails-june-1-2025)).
- **Source:** [Docusign: fraud resources](https://www.docusign.com/safety/fraud-resources)
- **Detect:** 📎 (email or header) · 📄 if links are in the uploaded file
- **Endpoint:** **Extract** (link domains) and **Verify**

### PB5. "Clone this repo or run this test project" as part of hiring · 🔴
- **What it means:** The "technical assessment" runs malicious code on your machine (the "Contagious Interview" pattern).
- **Seen:** Fake job offers inviting developers to a GitHub repo that ran malicious code ([X](https://x.com/Adefola_/status/2108858328050778467), [X](https://x.com/tudoratu/status/2117260304509698329)).
- **Source:** [Montgomery County Police ("attachments, e.g. coding challenges, that contain malware")](https://www.montgomerycountymd.gov/montgomery-county-police-department/how-do-i/frauds-scams/job-offer-scams)
- **Detect:** 📄 (instructions and links in the document)
- **Endpoint:** **Extract** (links and commands), then **Decide**

### PB6. Install an "app" or "software" to start the deal · 🔴
- **What it means:** Sponsorship or job onboarding requires installing a tool, "VPN", "game build" or "editor" to review the product.
- **Seen:** The "Night Sterling" collab "app" was malware ([X](https://x.com/codewithyousaf/status/2111123848443863341)).
- **Source:** [Google TAG](https://blog.google/threat-analysis-group/phishing-campaign-targets-youtube-creators-cookie-theft-malware/) · [YouTube Help](https://support.google.com/youtube/answer/16281336?hl=en)
- **Detect:** 📄
- **Endpoint:** **Decide** and **Extract** (download links)

### PB7. Document is just a link to a Google Form, shared drive or "portal" not on the official site · 🟠
- **What it means:** Instead of an attached contract, you get a link to "fill your onboarding details".
- **Seen:** A .docx led to a Google Form harvesting details ([CUNY CSI](https://csitoday.com/2024/06/caution-phishing-scam-alert/)).
- **Source:** [VA VSAFE (application link not on the official site)](https://vsafe.gov/va-toolkit/va-fraud-prevention-kit/employment-business-and-job-opportunities/)
- **Detect:** 📄
- **Endpoint:** **Extract** (link domains) and **Verify** (vs the official domain)

### PB8. Offer arrives by social DM (X, Instagram, TikTok, LinkedIn InMail from a thin profile) · 🟠
- **What it means:** Cold DMs offering moderator, ambassador or recruiter jobs.
- **Seen:** An unsolicited X DM offering moderator work ended in a wallet drain ([X](https://x.com/web3smoosh/status/2107393190357610558)).
- **Source:** [Indeed (never offers jobs via social media)](https://www.indeed.com/help/job-seekers/articles/28360944766221-text-messages-or-phone-calls-claiming-to-be-indeed-it-might-be-a-scam) · [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a1336387/recognize-and-report-scams)
- **Detect:** 📎
- **Endpoint:** **Decide** (on pasted DM text)

---

## Reconciliation with RED_FLAGS.md (no duplicates)

These RED_FLAGS patterns already cover the following giveaways, so they are **not** repeated as new signals. SignSafe should keep one Decide label per RED_FLAGS ID and simply add the new trigger wording and document types below to that label's description.

| RED_FLAGS ID | Giveaway it already covers | New trigger wording or doc types to add to that label | Real scenario |
|---|---|---|---|
| 1.1 Sign/pay-now pressure | 24-hour signing window; "pay today to hold the flat"; "pay within 24 hours" on invoices | Offer letters, tenancy, invoices | [X](https://x.com/strategicreset/status/2117003157721252294), [X](https://x.com/TheDoderoGroup/status/2112946217499984317) |
| 1.2 Upfront fee | Processing, registration or handling fees | Extended by **MA2**, **MA3** (job, visa, grant, investor wording) | [X](https://x.com/rtffanboy/status/2110028840357748913) |
| 1.4 Hard-to-reverse payment | Crypto pay or crypto top-ups for "tasks"; gift cards | Job task scams ([IC3 2024](https://www.ic3.gov/PSA/2024/PSA240604)) | [Reddit](https://www.reddit.com/r/Scams/comments/1lwz3wn/job_offer_scam_i_fell_for/) |
| 1.5 Secrecy | "Don't contact our office, this is a confidential remote team"; NDA demanded before any job details | NDAs, offer letters | not stated: no specific case found this session |
| 1.6 Fake authority | Fake Presidency or ministry appointment letters; government logos on grants | Appointment letters, grants | [X](https://x.com/TejuDuru/status/2107045467943027061), [X](https://x.com/Mike_Kutola/status/2115832226277716323) |
| 1.9 Overpayment | Cheque for equipment, send part back | Extended by **MA1** | [Reddit](https://www.reddit.com/r/Scams/comments/1dvbmkm/fake_job_offer_check_scam/) |
| 1.10 Credentials or device access | SSN, BVN or ID before signing | Extended by **MA6** (timing), **PB3** (sign-in to view) | [Reddit](https://www.reddit.com/r/Scams/comments/1ivamw3/job_offer_letter_scam/) |
| 1.12 Changing payee | "Our bank details have changed" | Extended by **MA8** (account-name mismatch, Compare to previous invoice) | [X](https://x.com/BankrolledInc/status/2114026324193165373) |
| 1.2 (note) | A **tiny** fee ("$1.99 to release your parcel") is bait to harvest card details, not to profit from the fee | Invoices, grant and prize letters; keep 🔴 even for small amounts | [quiz](https://ai-safety-score.apcollective.site/), [X](https://x.com/Bijon_BB/status/2116757586972385518) |
| 1.12 / PB2 (note) | "Pay outside the app/platform for X% off" to a personal account; the discount is the bait | Freelance, marketplace, rental | [quiz](https://ai-safety-score.apcollective.site/) |
| 1.13 Hidden AI injection | White or hidden text in DOCX/PDF | Unchanged; **Guard** also scans DOCX hidden runs and comments found by **Inspect** | n/a |

Category 2 (funding terms) and Category 3 (consumer and creator traps) are about clauses, not authenticity, so they don't overlap with this file. A fake sponsorship deal (MA4, PB3, PB6) can **also** contain 3.3 perpetual likeness and 3.5 exclusivity. Run both libraries.

---

## Endpoint map (which Clocked endpoint catches what)

> Correction 3 Nov (from the saved docs): Inspect (`/script`) only classifies script text that we send it. File type, macro presence, metadata and fonts are read by SignSafe's own code. BUILD_BRIEF.md has the final mapping.

| Endpoint | Signals |
|---|---|
| **Our own file checks** (file type, macros present, metadata, hidden runs: done in our code, NOT by an API) | FM1, FM2, FM3, FM4, FM6, FM7 |
| **Inspect** (classifies script or command TEXT we pull out: VBA macro source, page scripts, "run this" commands. It does not open files or read metadata) | FM2 (macro code), PB5, PB6 |
| **Extract** (facts with positions; "not stated" when absent) | SI9, PR5, FM5, SI1, SI3, SI5, SI6, SI7, MA1–MA3, MA6–MA10, PR1, PR3, WD1–WD3, WD6, WD8, IN1, IN2, IN5, PB1, PB3–PB7 |
| **Decide** (multiselect labels + Sign Score) | PR5, FM1, FM7, SI8, MA1–MA7, MA9, MA10, PR1–PR4, WD2–WD5, WD7, IN1, IN5, PB1–PB3, PB5, PB6, PB8 |
| **Verify** (against official company info the user provides) | SI9, FM4, FM6, SI1, SI2, SI4, SI6, SI7, WD8, IN2, IN3, PB4, PB7 |
| **Compare** (two docs, or doc vs header/advert/old invoice) | SI2, SI3, MA8, IN1, IN3, IN4 |
| **Guard** (hidden instructions) | FM2 ("enable content" lures), PB3, and RED_FLAGS 1.13 |

**What SignSafe should ask the user to paste when a 📎 signal is in play:**
1. The raw email header (for SI1–SI3, PB4).
2. The official website or domain and registry printout (for SI2, SI4, SI6, SI7, IN2).
3. The original advert or listing (for IN3).
4. A previous invoice from the same supplier (for MA8).
5. The chat log (for PR2, PB1, PB2, PB8).

---

## Green signals (pull the score toward green; not giveaways)

The quiz scores "Safe" cards as carefully as "Trap" cards. SignSafe should too, so that a "yellow to green" result means something. Each green below is the opposite of a trap card in the quiz ([quiz](https://ai-safety-score.apcollective.site/)).

| Green signal | Quiz card it comes from |
|---|---|
| You started it, and the document says so (ticket, application or reference number you recognise) | "Re: your ticket #48213 from Monday… reply with the transaction ID" |
| It asks for nothing sensitive (no codes, passwords, ID numbers or fees) | "Landed safe!… I'll call you tonight" (asks for nothing) |
| It sends you to a channel you already use, not a link or number it supplies | "Not you? Open the app and tap Secure account" |
| It states what it will never ask for | "We never ask you to click a link to cancel" |
| No deadline, or a reasonable one | "Quick one before standup… No rush." |
| It waits for your OK and changes nothing by itself | "Want the link to review? I won't switch anything." |

Greens lower the score but **never cancel a 🔴**.

---

## UX lesson: people see the red flag and still go ahead

**What the quiz and its players show:**
- **Players spotted the tells and still nearly fell.** "Even when the warning signs are right in front of us" ([X](https://x.com/Bijon_BB/status/2116757586972385518)). "It sounded so real and I was seconds away from confirming" ([X](https://x.com/TheOnlyHero11/status/2116515397453168925)).
- **The trick is the context, not a fake document.** "They fake the timing, the tone, the urgency you were already primed for. Your brain completes the pattern for them" ([X](https://x.com/OxAnuj/status/2116166652668907878)).
- **The quiz puts you on a clock**, and its "Speedrunner" type's blind spot is "Speed is exactly what tricksters count on." People ignore flags because they are rushed, hopeful (they need the job or the deal), or the sender feels familiar.
- **Over-flagging has a cost too.** The "Bouncer" type "blocks the real stuff too." This is why SignSafe should be yellow-to-green, not a wall of red.

**UX ideas for SignSafe:**
1. **"Did they ask you to…?" check-in.** A short yes/no list next to the document, because the riskiest asks often sit in the chat, not the file:
   - pay anything first?
   - share a code, password, BVN, SSN or ID?
   - move to WhatsApp or Telegram, or off the platform?
   - sign in to see the document?
   - install an app or run code?
   - keep it secret?
   - not use the old contact?
   - decide today?

   Each "yes" maps to an existing ID (1.2, 1.10, PB1/PB2, PB3, PB5/PB6, 1.5, PR5, 1.1).
2. **Name the flag the user has already seen.** When they've ticked "yes", say "You told us they asked for a fee. That's the #1 sign in real cases", rather than a generic warning.
3. **A pause button, not a block.** For any 🔴, suggest one concrete check on a channel the user opens themselves (SI9), plus a ready-to-send question from RED_FLAGS' "What to ask them" column.
4. **Show greens as well as reds**, so a clean, legitimate offer visibly earns green and users trust the yellows.
5. **Trusted-contact check.** Ask "Is the contact in this document the same one you had before?" and compare against what the user pastes (SI9, PR5, MA8).

---

## Source notes
- FTC `consumer.ftc.gov` and `ftc.gov` pages returned 404 to automated fetches from our box on 2026-11-03, including the FTC homepage. That looks like bot blocking rather than missing pages. The URLs come from current search-index results. **Open them in a browser to confirm before shipping.**
- Scamwatch, Upwork and Krebs returned 403 (bot blocking) to curl but showed up normally in search.
- Action Fraud has been replaced by **Report Fraud** (reportfraud.police.uk) for UK reporting.
- Vendor and journalism sources (Proofpoint, Graylog, Bitdefender, F-Secure, Krebs, TryDoku, Malwarebytes and ESET via X) are labelled as such. Official sources are FBI/IC3, FTC, BBB, GOV.UK (DBS, Home Office), Citizens Advice, Report Fraud, Scamwatch, Investor.gov, USPTO, state AGs, VA VSAFE, and the platform help pages of LinkedIn, Indeed, Upwork, YouTube and Docusign.
- Not found this session (left as "not stated"): Fiverr's trust & safety page, a specific NDA-scam case, and a Citizens Advice page specific to rental scams.
