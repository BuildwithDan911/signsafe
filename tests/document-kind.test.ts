import { describe, expect, it } from "vitest";
import { isClearlyUnrelatedText } from "../src/lib/document-kind";

describe("conservative contract-text intake check", () => {
  it("rejects substantial unrelated prose before it can be scored", () => {
    const unrelated = `A guide to planning a weekend garden. Choose plants that fit the amount of sunlight in your yard. Water seedlings regularly and check the soil before adding more water. Keep tools clean, store them in a dry place, and make a seasonal plan for pruning and composting. Many gardeners find it useful to keep notes about weather, growth, and harvest dates. This article shares general ideas for people who enjoy spending time outdoors and growing herbs, vegetables, or flowers at home.`;
    expect(isClearlyUnrelatedText(unrelated)).toBe(true);
  });

  it("allows a realistic employment offer with party, pay, and role details", () => {
    const offer = `Employment Offer. This letter confirms that the Employer offers Morgan Lee the position of Operations Analyst. The Employee will start on October 5. Annual salary is $78,000, paid twice monthly. The parties agree that employment is subject to the benefits and termination terms described below. Please sign and return this offer.`;
    expect(isClearlyUnrelatedText(offer)).toBe(false);
  });

  it("allows a service agreement with ordinary clause language", () => {
    const services = `This Services Agreement is between Client and Consultant. Consultant shall provide the listed services and deliverables for the fee stated in the schedule. Invoices are payable within thirty days. Either party may terminate on written notice. Each party remains responsible for its own obligations and liability under this agreement.`;
    expect(isClearlyUnrelatedText(services)).toBe(false);
  });

  it("allows ordinary tenancy terms, including rent and a deposit", () => {
    const tenancy = `Residential Tenancy Agreement. The Landlord rents the premises to the Tenant for twelve months. Monthly rent is due on the first day of each month. The Tenant will pay a refundable security deposit, held and returned according to applicable law. The parties will sign this agreement before the tenancy begins.`;
    expect(isClearlyUnrelatedText(tenancy)).toBe(false);
  });

  it("allows substantial contracts in non-English scripts or with common accented legal text", () => {
    const spanish = `Contrato de servicios entre las partes. El cliente pagará los honorarios acordados y el contratista prestará los servicios descritos. La terminación requiere aviso por escrito y las obligaciones de confidencialidad seguirán vigentes después de la fecha de finalización. Este contrato se firma en dos ejemplares y entra en vigor en la fecha indicada por ambas partes.`;
    expect(isClearlyUnrelatedText(spanish)).toBe(false);
    expect(isClearlyUnrelatedText("本契約の当事者は、記載された条件に従いサービスを提供し、対価を支払うものとする。".repeat(8))).toBe(false);
  });

  it("allows short contract excerpts even when they lack document headings", () => {
    expect(isClearlyUnrelatedText("The consultant shall deliver the report by Friday." )).toBe(false);
  });
});
