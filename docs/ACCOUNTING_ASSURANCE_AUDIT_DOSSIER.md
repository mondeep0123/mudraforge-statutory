# MudraForge Accounting Assurance & Statutory Audit Defense Dossier

This document serves as the authoritative, permanent reference manual and verification catalog for the enterprise Accounts Payable (AP) reconciliation, numerical hygiene, and statutory assurance capabilities implemented in `@mudraforge/statutory`.

External technical, financial, and tax audits (e.g. Big-4 accounting firms, statutory auditors, tax counsel) frequently probe automated financial platforms for theoretical shortcuts, unhandled edge cases, and legal misinterpretations. This dossier establishes the legal ground truth, mathematical definitions, error boundaries, and corresponding automated regression tests (Tests 120 through 146 in `packages/statutory/test.js`) that guarantee deterministic audit defensibility.

---

## 1. Architectural Philosophy: From Statutory Calculation to Accounting Assurance

A statutory calculation engine that merely implements standalone formulas (e.g. `turnover * 0.001`) fails when exposed to real enterprise ERP exports. Raw corporate accounting data is inherently messy: it contains parenthesized credits, trailing minus signs, inconsistent currency formatting, conflicting tax allocations, multi-state branch structures, and varying payment appropriation policies.

MudraForge implements **Transaction-Level Accounting Assurance**:

```
Messy Accounting Ingestion (Zoho Books / Tally Daybooks / GSTR-2B)
    ↓
Four-State Numeric Classification & Integer-Paise Normalization (Zero Drift)
    ↓
Epistemic Uncertainty Gate (ISO Mod-36 Checksums, Duplicate Billing, Defective Tax Splits)
    ↓
4-Way Decoupled Jurisdictional Evaluation (Tax Classification, Jurisdiction, Eligibility, Routing)
    ↓
Statutory Provisos & Accounting Math (Rule 37 Proportional Allocation, Rule 88B ECL Audit)
    ↓
Actionable Exception Register & Executive Audit Memorandum (isAuthorizedToDisburse: false)
```

---

## 2. Numerical Hygiene & Input Boundary Hardening

### 2.1 Four-State Numeric Classification Model
Standard JavaScript type coercion (`Number(x) || 0`) introduces catastrophic statutory failures: malformed strings (e.g. `"₹ 10,00,000"`, `"#VALUE!"`) silently evaluate to `NaN` and collapse to `0`, preventing mandatory tax deductions and creating massive penal exposure under Section 40(a)(ia).

MudraForge's `cleanNumericAmount(val, options)` classifies every numeric input into one of four distinct states:

| Input State | Example | Engine Behavior | Statutory Rationale |
|---|---|---|---|
| **Valid Numeric** | `100000`, `"₹ 10,00,000"`, `"(₹ 50,000)"` | Deterministic float or integer paise | Legitimate transaction amount. |
| **Valid Zero** | `0`, `"0"`, `"₹ 0.00"` | Returns `0` (or `0` paise) | Explicit non-taxable base or zero-rated voucher. |
| **Missing Optional** | `undefined`, `null`, `""` (when optional) | Returns `options.defaultValue` | Unused optional fields (e.g. surcharge, cess). |
| **Missing Mandatory** | `undefined`, `null`, `""` (when mandatory) | Throws `MissingMandatoryParameterError` | Essential statutory threshold inputs cannot be guessed. |
| **Malformed Representation** | `"100 200"`, `"1,,000"`, `"#VALUE!"` | Throws `MalformedNumericInputError` | Prevents corrupt ERP exports from silently distorting tax calculations. |

### 2.2 Integer-Paise Arithmetic & Max Safe Integer Boundary
To eliminate floating-point drift across cumulative annual purchases and multi-invoice allocations:
- **Integer Representation**: All intermediate thresholds, allocations, and variances are converted to integer paise using `toIntegerPaise(amount)`.
- **Ceiling Boundary**: Values exceeding `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991 paise = ₹90,071,992,547,409.91) are rejected fail-closed to prevent IEEE 754 precision degradation.
- **Sub-Paisa Rounding**: Half-up rounding (`roundToPaisa(amount)`) is applied consistently.

### 2.3 Accounting Format Ingestion
- **Parenthesized Negatives**: Accounting conventions representing negative balances as `(₹ 50,000.00)` or `INR (25,000)` are parsed as negative numbers.
- **Trailing Minus**: ERP formats such as `50,000.00-` are normalized to `-50000.00`.
- **Ledger-Aware CR Credits**: Credit indicators (`CR`) are not blindly negated; credit balances are preserved as positive balances unless `{ interpretCreditAsNegative: true }` is explicitly requested by the ledger parser.

---

## 3. Four-Way Decoupled Jurisdictional Matrix

Enterprise ERP workflows cannot rely on a single binary eligibility flag (`ELIGIBLE` vs `INELIGIBLE`). Real tax assurance requires decoupling four orthogonal decisions on every transaction:

```
                                 Transaction Evaluation
                                           │
         ┌──────────────────┬──────────────┴─────┬─────────────────┐
         ▼                  ▼                    ▼                 ▼
 1. Tax Determination  2. Recipient          3. ITC           4. Operational
    (IGST Act Sec 5/10)   Jurisdiction          Eligibility      Routing
                          (CGST Sec 25(4))      (Sec 16/17(5))   (ERP Action)
```

### 3.1 Decision Taxonomy

#### 1. Tax Determination (`taxClassification`)
- `INTRASTATE_CORRECT`: Supplier state equals POS state; local CGST + SGST charged correctly.
- `INTERSTATE_CORRECT`: Supplier state differs from POS state; IGST charged correctly.
- `ERRONEOUS_INTRASTATE_LEVY`: Supplier state differs from POS, but supplier erroneously charged local CGST/SGST.
- `ERRONEOUS_INTERSTATE_LEVY`: Supplier state equals POS, but supplier erroneously charged IGST.
- `INDETERMINATE`: Missing Place of Supply or conflicting tax split.

#### 2. Recipient Jurisdiction (`recipientJurisdiction`)
- `FILING_GSTIN_MATCHES_POS`: The filing entity's registered state matches the Place of Supply.
- `REGISTERED_DISTINCT_PERSON_BRANCH`: Recipient's corporate enterprise maintains a valid distinct-person GSTIN under Section 25(4) in the POS state.
- `UNREGISTERED_IN_POS_STATE`: Recipient has no GST registration in the POS state.
- `INDETERMINATE`: Missing recipient or POS state code.

#### 3. ITC Eligibility (`itcEligibility`)
- `ELIGIBLE_NORMAL`: Valid tax invoice, populated in GSTR-2B, no statutory blocks.
- `ELIGIBLE_IN_BRANCH_RETURN`: Valid tax credit, but must be claimed in the branch GSTIN's GSTR-3B.
- `INELIGIBLE_STRANDED_LOCAL_LEVY`: Mandatory local supply under Section 12(3)/12(4) (e.g. hotel, catering) in a state where recipient is unregistered.
- `INELIGIBLE_BLOCKED_SEC_17_5`: Blocked under Section 17(5) (motor vehicles, outdoor catering, employee personal perks).
- `INELIGIBLE_DEFECTIVE_INVOICE`: Defective tax split or erroneous jurisdiction.
- `INELIGIBLE_PORTAL_FLAGGED`: Flagged ineligible by GSTN portal in Form GSTR-2B (e.g. Section 16(4) time-bar).
- `PROVISIONAL_PENDING_FILING`: Missing in current GSTR-2B, credit restricted under Section 16(2)(aa) and Rule 36(4).
- `INDETERMINATE`: Requires human review.

#### 4. Operational Routing (`operationalRouting`)
- `CLAIM_IN_CURRENT_GSTR3B_TABLE_4A5`: Avail in current tax period return.
- `ROUTE_TO_BRANCH_GSTIN`: Route accounting voucher to branch entity for inclusion in their state return.
- `BOOK_AS_EXPENSE_NO_ITC`: Absorb tax component as business operating expense; do not avail in ECL.
- `REPORT_IN_GSTR3B_TABLE_4B1_PERMANENT_REVERSAL`: Report permanent non-reclaimable reversal.
- `REQUEST_VENDOR_CREDIT_NOTE_AMENDMENT`: Issue commercial dispute notice demanding credit note and reissue.
- `WITHHOLD_CLAIM_PENDING_SUPPLIER_GSTR1`: Withhold claim until vendor files Form GSTR-1/IFF.
- `PHYSICAL_GOODS_RECEIPT_VERIFICATION_PENDING`: In GSTR-2B but missing in books (unrecorded AP or transit).
- `MANUAL_HUMAN_INVESTIGATION_REQUIRED`: Escalate to senior tax auditor.

---

## 4. Rule 37 Proportional Reversal & Rule 88B(3) ECL Audit

### 4.1 Section 16(2) Second Proviso & Rule 37 Payment Appropriation
Section 16(2) second proviso requires a recipient to pay the supplier the value of supply along with tax within 180 days from the invoice date. Failure to pay triggers mandatory ITC reversal.

MudraForge implements three payment appropriation models:
1. **`PROPORTIONATE` (Default Statutory Baseline)**:
   $$\text{Unpaid Ratio} = \frac{\text{Balance Due}}{\text{Total Invoice Amount}}$$
   $$\text{Reversal ITC} = \text{Total ITC} \times \text{Unpaid Ratio}$$
2. **`VALUE_FIRST` (Contractual Preference)**:
   Payments satisfy the taxable base first; remaining balance is attributed to unpaid tax.
3. **`TAX_FIRST` (Tax Compliance Priority)**:
   Payments satisfy tax liability first. Note: Failure to pay taxable consideration still triggers proportional reversal under Rule 37(1).

### 4.2 Statutory Exemptions from Rule 37
- **Proviso 1 to Rule 37(1) — Reverse Charge (RCM)**: RCM supplies under Section 9(3)/9(4) are statutorily exempt because tax is paid directly to the Government, not the supplier.
- **Proviso 2 to Rule 37(1) — Schedule I Deemed Supplies**: Supplies without consideration between distinct or related persons are statutorily exempt.

### 4.3 Rule 88B(3) Electronic Credit Ledger Audit & Section 50(1) Interest
Under Section 50(1) read with Rule 88B(3) (inserted retrospectively w.e.f. 1 July 2017), interest is levied **only when ITC has been wrongly availed and utilized**.

- **ECL Closing Balance Check**: If the minimum daily closing balance in the taxpayer's Electronic Credit Ledger (`minimumEclBalanceInr`) remained equal to or greater than the unreversed ITC throughout the default window:
  $$\text{Wrongful Utilization} = \max(0, \text{Unreversed ITC} - \text{Minimum ECL Balance}) = ₹0.00$$
  $$\text{Statutory Interest} = ₹0.00$$
- **Dipped Balance**: If the ECL balance dipped below the unreversed ITC, 18% annual interest is computed strictly on the utilized portion for the days elapsed past 180:
  $$\text{Interest} = \text{Utilized Amount} \times \frac{0.18}{365} \times (\text{Days Elapsed} - 180)$$
- **Unavailable History**: If closing ledger balances are missing, the engine refuses to guess, issuing an advisory requiring human verification of ledger statements.

---

## 5. Epistemic Uncertainty & Fail-Closed Governance

When financial or legal evidence is incomplete, automated accounting engines must never fabricate certainty. MudraForge marks transactions as `REQUIRES_HUMAN_VERIFICATION` under five statutory conditions:

1. **`INVALID_SUPPLIER_GSTIN_CHECKSUM`**: Supplier GSTIN fails ISO Mod-36 check digit calculation. Prevents claiming credits on invalid or fraudulent registrations.
2. **`AMBIGUOUS_DUPLICATE_INVOICE_MATCH`**: Multiple candidate records share the identical supplier GSTIN and invoice number. Prevents guessing between duplicate billing and amended vouchers.
3. **`CONTRADICTORY_TAX_SPLIT`**: Voucher contains concurrent CGST/SGST and IGST. Defective on its face under Section 31.
4. **`MISSING_POS_DATA`**: Place of Supply is omitted or indeterminate in both Books and GSTR-2B.
5. **`MISSING_ECL_HISTORY`**: Electronic Credit Ledger closing balances are omitted when evaluating delayed interest.

---

## 6. The Complete Verification Matrix: Tests 120 through 146

Every statutory capability and defensive boundary is continuously verified by deterministic regression tests in `packages/statutory/test.js`:

| Test # | Test Title | Statutory / Accounting Provision | Ground Truth Verified |
|---|---|---|---|
| **120** | Numerical Input Resilience & Currency Sanitization | Enterprise ERP Ingestion Standards | Normalizes `"₹ 10,00,000"`, `"1,23,456.78"`, whitespace, and non-finite inputs. |
| **121** | Excel Date Serial & Diverse Date Normalization | RFC 4180 / Microsoft Excel Standards | Normalizes Excel serial numbers (`45453` -> `2024-06-10`) and Indian date formats (`10/06/2024`). |
| **122** | Accounting Negative Formats: Parens, Minus & CR | GAAP / Ind AS Presentation Rules | Correctly identifies `(₹ 50,000.00)` as negative and preserves `50,000.00 CR` ledger credits. |
| **123** | Zero-Argument & Empty Destructuring Robustness | Safe API Contract Standards | Invocations with `{}` or zero arguments execute safely without unhandled TypeErrors. |
| **124** | UTF-8 BOM & European Delimiter Parsing | RFC 4180 CSV Ingestion | Strips UTF-8 BOM (`\uFEFF`) and automatically detects semicolon (`;`) and tab (`\t`) delimiters. |
| **125** | Parenthesized Negative Vouchers & Return Netting | CBDT Circular 13/2021 Question 4 | Parenthesized `(₹ 10,00,000)` return voucher reduces rolling purchase base to ₹45L, preventing wrongful Section 194Q alerts. |
| **126** | StatutoryClient Programmatic Parity for Daybooks | Package Architecture Parity | Verifies full client parity for `parseTallyDaybookCsv`, `reconcile194QDaybook`, XML, and reports. |
| **127** | Strict Malformed Numeric & Integer-Paise Precision | Financial Computation Integrity | Enforces 4-state classification, `Number.MAX_SAFE_INTEGER` bounds, and fractional sub-paisa rules. |
| **128** | Mandatory Parameter Enforcement across Calculators | Statutory Defensive Architecture | Asserts 12 core statutory calculators throw `MissingMandatoryParameterError` on incomplete data. |
| **129** | Real-World Tally Ingestion: Dual Columns & Quotes | TallyPrime Export Specifications | Dual Debit/Credit column netting, Particulars header lookup, blank-row filtering, and RFC 4180 quotes. |
| **130** | StatutoryClient Arithmetic and Precision Parity | Package Architecture Parity | Exposes `cleanNumericAmount`, `toIntegerPaise`, `fromIntegerPaise`, `roundToPaisa` on `StatutoryClient`. |
| **131** | Zoho Books Bills CSV Parsing | Zoho Books Export Specifications | Parses Zoho bill CSVs, extracting Section 17(5) categories, RCM flags, and Schedule I deemed supplies. |
| **132** | Zoho API JSON & GSTR-2B JSON Ingestion | GST Portal API Schema / Zoho REST API | Parses B2B invoices, CDNR credit/debit notes netting, date normalization, and item tax rollups. |
| **133** | 2-Way Reconciliation MATCHED_ELIGIBLE | CGST Act Section 16(2) | Fuzzy alphanumeric key matching resolves separator variance (`INV/2024-25/001` vs `INV-2024-25-001`). |
| **134** | Statutory Dispositions: Missing 2B, Books, Mismatch | CGST Act Sec 16(2)(aa) & Rule 36(4) | Categorizes `MISSING_IN_GSTR2B` (provisional restricted), `MISMATCH_AMOUNT_VALUE`, and `MISSING_IN_BOOKS`. |
| **135** | Section 17(5) Blocked Credit & POS Mismatch | CGST Act Sec 17(5) & IGST Act Sec 12 | Isolates blocked motor vehicle ITC for GSTR-3B Table 4(B)(1) and disallows out-of-state local tax. |
| **136** | Rule 37 180-Day Aging & Section 50(1) Delayed Interest | CGST Act Sec 16(2) 2nd Proviso & Rule 37 | Unpaid bill >180 days triggers Table 4(B)(2) reversal + 18% delayed interest exposure for overdue days. |
| **137** | StatutoryClient Parity & Executive Report Generation | Client API & Audit Memorandum | Verifies programmatic methods and renders executive Markdown audit memorandum with health matrix. |
| **138** | CLI Integration — reconcile-gstr2b | Command Line Interface | Executes CLI command `reconcile-gstr2b` with JSON pipeline and report output. |
| **139** | Multi-State POS Triangulation & Branch Routing | CGST Act Sec 25(4) & IGST Act Sec 12(3) | Routes distinct-person vouchers to branch GSTIN; absorbs stranded hotel local CGST/SGST as expense. |
| **140** | Rule 37 Exceptions, Proportional Netting & Rule 88B | Rule 37(1) Provisos & Rule 88B(3) | Validates RCM & Schedule 1 exemptions, 50% partial payment netting, and 0% interest on unutilized ECL. |
| **141** | GSTR-2B GSTN Ineligible Flag & Goods-In-Transit | CGST Act Sec 16(4) & Sec 16(2)(b) | Captures portal `itcavl: "N"` flag; classifies recent unrecorded invoices (<15 days) as goods in transit. |
| **142** | Zoho Books Vendor Credits Netting | Accounting Double-Entry Principles | Parses native `vendor_credits` array, performing negative taxable and tax netting against gross AP. |
| **143** | Explicit Uncertainty Routing (REQUIRES_HUMAN) | Audit Governance & Epistemic Honesty | Fails closed on invalid GSTIN checksum, contradictory tax splits, and duplicate invoice candidates. |
| **144** | Payment Appropriation Policies & Dipped ECL Math | Rule 37(1) & Rule 88B(3) Math | Verifies `VALUE_FIRST` vs `PROPORTIONATE` reversal math and computes 18% interest on dipped ECL balances. |
| **145** | Decoupled Jurisdictional Decisions Structure | Architectural Assurance | Asserts transaction-level 4-way decisions structure (`taxClassification`, `recipientJurisdiction`, etc.). |
| **146** | 50-Transaction Synthetic E2E Batch Test | Comprehensive Enterprise AP Simulation | 47 bills and 45 GSTR-2B records across 9 compliance groups evaluated in an end-to-end stress run. |
| **147** | Chronological Rule 88B(3) ECL Ledger History | CGST Act Section 50(1) & Rule 88B(3) | Evaluates day-by-day movements across 5 trajectories: zero dip, temporary dip, multiple dips/recoveries, partial dip, and post-utilization reversal. |
| **148** | Evidence Provenance Integrity & Audit Trail | Forensic Audit Reproducibility | Attaches cryptographic `evidenceProvenance` object with SHA-256 derived signature (`MF-PROV-...`), source references, 4-way decisions, and pinned Merkle root. |
| **149** | Section 12(3) Lodging vs Section 12(7) Event Management | IGST Act Place of Supply Triangulation | Distinguishes immovable lodging (property location -> stranded expense) from B2B event organizing (recipient location -> mandatory IGST / vendor credit note demand). |
| **150** | Zoho Books API Contract Hardening | Enterprise API Resilience | Validates pagination `page_context` retention, null/empty record resilience, and fail-closed handling of Zoho API error codes (e.g. Code 14). |
| **151** | Property-Based Fuzz Testing (500 Transactions) | Invariant Enforcement & Stress Resilience | Generates 500 randomized transactions, asserting double-entry accounting conservation, zero floating-point drift, and immutable `isAuthorizedToDisburse: false`. |

---

## 7. The 50-Transaction Synthetic E2E Batch Specification (Test 146)

Test 146 constructs an end-to-end multi-scenario corporate portfolio evaluating 47 Zoho purchase bills and 45 GST Portal GSTR-2B records across 9 orthogonal compliance groups:

| Group | Invoice Range | Transaction Character | Statutory Grounding | Resulting Engine Disposition |
|---|---|---|---|---|
| **Group 1** | 01–20 | Clean matched bills alternating intrastate (Maharashtra `27`) and interstate (Karnataka `29`). | CGST Act Section 16(2) | `MATCHED_ELIGIBLE` (Table 4A5 credit) |
| **Group 2** | 21–25 | Bangalore supplier (`29`) charging Karnataka local tax where recipient has a distinct-person branch in `29`. | CGST Act Section 25(4) | `MATCHED_ROUTABLE_TO_BRANCH_GSTIN` (`ROUTE_TO_BRANCH_GSTIN`) |
| **Group 3** | 26–30 | Chennai hotel (`33`) charging Tamil Nadu local tax where recipient has no branch in `33`. | IGST Act Section 12(3) | `MATCHED_INELIGIBLE_STRANDED_LOCAL_CGST_SGST` (`BOOK_AS_EXPENSE_NO_ITC`) |
| **Group 4** | 31–35 | Invoices dated 210 days ago, 50% paid balance remaining. | Rule 37(1) & Rule 88B(3) | `MATCHED_ELIGIBLE` with `rule37OverdueCount: 5`, proportional Table 4(B)(2) reversal, and ₹0.00 interest due to ₹10L ECL balance. |
| **Group 5** | 36–38 | Goods Transport Agency (GTA) freight invoices unpaid past 180 days. | Rule 37(1) Proviso 1 (RCM) | `MATCHED_ELIGIBLE` with `EXEMPT_RCM_SUPPLY` (zero reversal required). |
| **Group 6** | 39–41 | Invoices flagged `itcavl: false` by GSTN with reason `TIME_BARRED_SEC_16_4`. | CGST Act Section 16(4) | `GSTR2B_INELIGIBLE_FLAGGED_BY_GSTN` (`REPORT_IN_GSTR3B_TABLE_4B1_PERMANENT_REVERSAL`) |
| **Group 7** | 42–44 | Fresh invoices dated 5 days prior to audit date, absent in GSTR-2B. | CGST Act Section 16(2)(aa) | `MISSING_IN_GSTR2B_TIMING` (`PROVISIONAL_PENDING_NEXT_GSTR2B`) |
| **Group 8** | 45–47 | Invoices present in GSTR-2B dated 3 days ago, absent in Zoho Books. | CGST Act Section 16(2)(b) | `MISSING_IN_BOOKS` (`PHYSICAL_GOODS_RECEIPT_VERIFICATION_PENDING`) |
| **Group 9** | 48–50 | Corrupted checksum (48), contradictory tax split (49), missing Place of Supply (50). | Fail-Closed Governance | `REQUIRES_HUMAN_VERIFICATION` (with discrete `uncertaintyReason` codes). |

---

## 8. Advanced Accounting Assurance & Forensic Integrity (Tests 147–151)

### A. Chronological Rule 88B(3) ECL Simulation
Under Explanation (1) to Rule 88B of the CGST Rules, wrongful utilization of input tax credit occurs **only when and to the extent that** the balance in the Electronic Credit Ledger (ECL) dips below the unreversed ITC amount. MudraForge models this day-by-day:
- **Trajectory 1 (Zero Dip)**: ECL balance remains above unreversed ITC -> 0% interest throughout.
- **Trajectory 2 (Temporary Dip)**: ECL dips below unreversed ITC for a 10-day window -> interest is calculated strictly for those 10 days on the dipped amount.
- **Trajectory 3 (Multiple Dips & Recoveries)**: Sum of day-weighted interest across each distinct dip interval.
- **Trajectory 4 (Partial Utilization)**: If the ECL balance remains positive (e.g. ₹3,00,000 against ₹5,00,000 unreversed ITC), interest is quantified strictly on the ₹2,00,000 shortfall.
- **Trajectory 5 (Post-Utilization Reversal)**: If the taxpayer reverses the ITC prior to assessment, interest calculation terminates on the exact reversal date.

### B. Cryptographic Evidence Provenance (`MF-PROV-...`)
Every reconciliation item now bears an immutable, self-contained `evidenceProvenance` object:
```json
{
  "provenanceId": "MF-PROV-3A7F8B12C4E9D021",
  "provenanceTimestamp": "2024-08-10T14:30:00.000Z",
  "source": { "sourceSystem": "ZOHO_BOOKS", "billNumber": "INV-2024-001" },
  "externalEvidence": { "sourceSystem": "GST_PORTAL_GSTR2B", "presentInGstr2b": true },
  "matchingMethod": "EXACT",
  "statutoryBasis": {
    "governingStatute": "Central Goods and Services Tax Act, 2017 / Integrated Goods and Services Tax Act, 2017",
    "primarySection": "CGST Act Section 16(2)"
  },
  "jurisdictionDecisions": {
    "taxClassification": "INTRASTATE_CORRECT",
    "recipientJurisdiction": "FILING_GSTIN_MATCHES_POS",
    "itcEligibility": "ELIGIBLE_NORMAL",
    "operationalRouting": "CLAIM_IN_CURRENT_GSTR3B_TABLE_4A5"
  },
  "uncertaintyAssessment": { "isCertain": true, "uncertaintyReason": "NONE" },
  "governanceTrail": {
    "requiresHumanReview": false,
    "merkleSubstrateRoot": "sha256-2e402bb02fe71939c79b9f11ad737d20faac21daf8e27417cb13ec1933511c19",
    "isAuthorizedToDisburse": false
  }
}
```

### C. Section 12(3) vs Section 12(7) Place of Supply Triangulation
- **Section 12(3)(a) Immovable Lodging**: Accommodation in hotels, guest houses, or campsites strictly fixes the Place of Supply at the property location. If the recipient has no GST registration in that state, the CGST/SGST is legally stranded and absorbed as an operating expense (`BOOK_AS_EXPENSE_NO_ITC`).
- **Section 12(7)(a)(i) B2B Event Management**: Organization of conferences, exhibitions, or corporate events provided to a registered person fixes the Place of Supply at the **location of the recipient**. If a local vendor charges venue state CGST/SGST, it is an `ERRONEOUS_INTRASTATE_LEVY`. The engine flags this as a defective invoice and instructs the AP team to demand a vendor credit note and corrected IGST invoice (`REQUEST_VENDOR_CREDIT_NOTE_AMENDMENT`).

### D. Zoho Books API Contracts & Property-Based Fuzz Testing
- **API Pagination**: Preserves `page_context` (`page`, `per_page`, `has_more_page`, `total`) for multi-page batch ingestion.
- **Fail-Closed API Errors**: Throws explicit, actionable errors upon encountering Zoho API error codes (e.g. Code 14 invalid parameter).
- **500-Transaction Fuzz Invariants**: Validates that double-entry balance, disposition categorization, and disbursement lock (`isAuthorizedToDisburse: false`) hold across 500 randomized transactions.

---

## 9. Preserving Audit Defensibility in Production

To prove compliance to external auditors, execute the automated verification pipeline:

```bash
# 1. Full statutory test suite (asserts all 151 tests pass)
npm test

# 2. Excel Add-in verification suite (asserts 25 custom functions pass)
npm -C packages/excel-addin test

# 3. OKF v0.2 Schema, Circular, and Form validator
npm run validate

# 4. Cryptographic Merkle Root integrity check (asserts 117/117 files match pinned hash)
npm run manifest:check
```
