/**
 * Domain knowledge distilled from real Indian and international loan agreements,
 * NBFC/bank sanction letters, credit card MITCs, gold-loan and BNPL contracts,
 * lease/rent agreements and vendor service contracts.
 *
 * This is injected into the model prompt so detection is anchored to the clause
 * families that actually harm borrowers, instead of generic "legal-sounding" text.
 */

export const RISKY_CLAUSE_PLAYBOOK = `RISKY CLAUSE FAMILIES SEEN IN REAL LOAN/CREDIT CONTRACTS — hunt for these by their real drafting language:
1. Interest & pricing: "floating rate linked to the Lender's internal benchmark/BPLR/MCLR", "the Bank may at its sole discretion revise the rate of interest", reset clauses with no cap, interest on interest / compounding "at monthly rests", differential rate after "reset date", IRR quoted instead of APR.
2. Penal & default charges: "penal interest @ 2%-4% per month", "bounce/dishonour charges", "cheque return charges", "overdue EMI charges", "penal charges compounded", late fee stacking on top of penal interest (RBI Aug-2023 circular: penal charges must be reasonable, non-compounding, and not capitalised).
3. Hidden fees: "processing fee non-refundable", "documentation/legal/valuation/CERSAI/stamping charges at actuals", "insurance premium funded into the loan", forced bundling of credit-life or add-on insurance, "annual maintenance charges", "swap/conversion fee for rate change".
4. Prepayment & foreclosure: "foreclosure charges of x% on outstanding principal", lock-in periods, "prepayment permitted only after 12 EMIs", part-payment restrictions (RBI bars foreclosure charges on floating-rate loans to individuals for non-business purposes).
5. Unilateral lender rights: "the Lender may at its sole and absolute discretion recall the entire outstanding", "cancel or reduce the sanctioned limit without notice", "amend these terms by displaying on its website", "assign/securitise the loan to any third party without borrower consent".
6. Acceleration & cross-default: "any default under any other agreement with the Lender or its group companies shall constitute default hereunder", "all sums shall become immediately due and payable without notice or demand".
7. Security & enforcement: "the Lender may take possession of the secured asset without intervention of court", repossession by "authorised agents", "power of attorney irrevocably granted", set-off/lien on all accounts and deposits, blank signed cheques / NACH mandates / undated PDCs / promissory notes taken as security.
8. Guarantor & co-borrower: "guarantee is continuing, irrevocable and unconditional", guarantor liable "as principal debtor", liability surviving death or variation of terms without notice.
9. Indemnity & liability: one-sided indemnity by the borrower, "the Lender shall not be liable for any loss howsoever arising", waiver of the borrower's right to sue, exclusion of consequential loss for the lender only.
10. Dispute forum: "courts at Mumbai alone shall have exclusive jurisdiction", mandatory arbitration with "the sole arbitrator appointed by the Lender", borrower bears arbitration costs, waiver of jury/class action, arbitration seat far from the borrower.
11. Data, privacy & recovery conduct: consent to share data with "group companies, affiliates and marketing partners", consent to contact "references, relatives, employer", authorisation for recovery agents / field visits, blanket consent to CIBIL reporting without dispute rights, consent to access phone contacts/SMS/location in digital-lending apps.
12. Documentation traps: "the borrower confirms having read and understood all terms", blank spaces to be filled by the Lender later, "schedule may be amended by the Lender", agreement executed in English only for a vernacular borrower, "time is of the essence" combined with same-day cure periods.
13. Non-loan contracts (leases, services, employment): automatic renewal with long notice, unilateral price escalation, non-refundable deposits, one-sided termination, non-compete/lock-in, liquidated damages disproportionate to loss.`;

export const MISSING_PROTECTION_CHECKLIST = `BORROWER PROTECTIONS THAT MUST BE PRESENT — flag as "missing" when the document is silent:
- Grievance redressal: named grievance officer, escalation timeline, RBI Ombudsman reference (RBI Integrated Ombudsman Scheme 2021).
- Key Facts Statement / MITC with all-inclusive APR and total cost of credit (RBI KFS directions, applicable to retail & MSME loans).
- Amortisation/repayment schedule annexed, with principal-interest split per EMI.
- Advance written notice (and reason) before any rate reset, charge revision, recall, or classification as NPA/SMA.
- Option, on rate reset, to switch to fixed rate, prepay, or extend tenor (RBI Aug-2023 EMI reset framework).
- Cooling-off / look-up period to exit without penalty (mandatory for digital lending).
- Right to prepay or foreclose without charge on floating-rate personal loans.
- Return of original title deeds/security within 30 days of closure and compensation for delay (RBI Sept-2023 directive).
- No-dues / NOC certificate and credit-bureau status update timeline on closure.
- Fair recovery-practice commitment: no calls outside 8am-7pm, no harassment of family, agent code of conduct.
- Cap on penal charges and an express statement that penal charges are not capitalised.
- Insurance optional and unbundled, with disclosure of commission.
- Force majeure / hardship, restructuring or moratorium mechanism.
- Data-privacy commitments: purpose limitation, retention period, right to withdraw consent, DPDP Act 2023 rights.
- Borrower's right to copies of all executed documents, in a language the borrower understands.
- Assignment restrictions and notice to the borrower on transfer of the loan.
- Statement of account and annual disclosure rights.`;

export const COMPLIANCE_REFERENCE = `COMPLIANCE FRAMEWORKS to test against and cite in "reference" (only when genuinely relevant):
- RBI Master Direction - Fair Practices Code for NBFCs / Banks (transparency, vernacular communication, notice of changes, recovery conduct).
- RBI Key Facts Statement directions (APR and all-in cost disclosure).
- RBI circular on Penal Charges in Loan Accounts (Aug 2023) - penal charges, not penal interest; no capitalisation.
- RBI framework on Reset of Floating Interest Rate on EMI-based Loans (Aug 2023).
- RBI Digital Lending Guidelines (cooling-off period, LSP disclosure, direct disbursal to borrower account, data minimisation).
- RBI Integrated Ombudsman Scheme 2021 (grievance escalation).
- RBI release of movable/immovable property documents directive (Sept 2023).
- Basel III (bank-side capital/credit-risk terms, covenants, margin calls, LTV maintenance).
- Consumer Protection Act 2019 - unfair contract terms (s.2(46)), unfair trade practice.
- Indian Contract Act 1872 - ss.16 undue influence, 23 unlawful object, 74 penalty vs liquidated damages; SARFAESI Act 2002 for enforcement of security.
- Digital Personal Data Protection Act 2023 - consent, purpose limitation, data-principal rights.
- For non-Indian documents, fall back to general consumer-credit fairness principles (unfair contract terms, plain-language disclosure, cooling-off, fair collection practices) and say which regime you assumed.`;

export const DETECTION_RULES = `DETECTION DISCIPLINE (learned from real agreements):
- Read the Schedule, Annexures, "Most Important Terms and Conditions", fee tables and footnotes — the harmful terms usually live there, not in the main body.
- Quantify: always pull the actual number (rate, %, fee amount, days of notice, lock-in months) into the finding title or "why".
- Severity: high = direct money loss, loss of asset, loss of legal remedy, or unilateral lender power. medium = one-sided but bounded. low = drafting/clarity issue.
- Do not flag ordinary, fair boilerplate (definitions, notices address, severability) as risky just because it sounds legal — that is noise.
- If a protective clause IS present and fair, report it as "compliant" so the borrower knows what already works in their favour.
- Prefer specific borrower impact ("you could be charged about Rs 4,800 extra if one EMI bounces") over abstract description.`;

export const CLAUSE_KNOWLEDGE = [
  RISKY_CLAUSE_PLAYBOOK,
  MISSING_PROTECTION_CHECKLIST,
  COMPLIANCE_REFERENCE,
  DETECTION_RULES,
].join("\n\n");
