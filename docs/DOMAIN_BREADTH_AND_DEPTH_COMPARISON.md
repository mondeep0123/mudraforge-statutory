# MudraForge Statutory Substrate: Breadth & Depth Analysis
## Public Package Seed vs. Full Sovereign Operating Engine

> **Document Version**: `1.0.0`  
> **Package**: `@mudraforge/statutory` (v2.4.0)  
> **Enterprise Sovereign Engine**: MudraForge Adesha Sovereign Runtime  
> **Specification**: Google Open Knowledge Format (OKF v0.2)  

---

## 1. Executive Overview

This document provides the authoritative architectural matrix comparing the **Breadth** (regulatory domains covered) and **Depth** (granularity, operative provisos, evidence attestation, and mathematical enforcement) between:

1. **The Public Package (`@mudraforge/statutory`)**: The lightweight, zero-dependency, offline-capable starter seed published for public AI agents and developer workflows.
2. **The Full Sovereign Engine (Adesha Runtime)**: The private enterprise financial operating substrate governing live Accounts Payable (AP), Treasury, and General Ledger writebacks on the MudraForge Cloudflare Global Anycast Edge.

---

## 2. Breadth Matrix: Regulatory Domains

This matrix delineates what is **natively bundled in the base package** (zero network calls, completely offline), what is **available to pull immediately via edge sync (`npx @mudraforge/statutory sync`)**, and what is **scheduled for upcoming expansion packs** from the enterprise sovereign engine (Adesha Runtime):

| # | Regulatory Domain | Base Package (Offline Clone / No Sync) | Edge Synced (`npx ... sync`) | Future Cloud Expansion (Internal Sovereign Engine) | Availability & Status in Package |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Direct Tax (TDS / TCS)** | Included: 3 core sections (194Q, 194J, 206C(1H) sunset) + 2 CBDT circulars + Form 26Q/16A schemas | Expanded withholding suite (194C contractors, 194I rent, 194H commission, Act 2025 Table 8 crosswalk) | Section 197 TRACES certificate quota vault, advance challan netting, automated double-entry JVs | **Bundled in Base**<br>*(Expanded via Sync)* |
| **2** | **MSME & Working Capital** | Included: Sections 15 & 16 (15/45-day clock, 3x RBI interest, Sec 43B(h), Trader Exclusion OM, Schedule III disclosure) | Live quarterly RBI repo rate tables & MSEFC state facilitation rules | Multi-interval monthly compounding calculator (`calculateMultiIntervalMsmeInterest`), Sec 23 Form 3CD addback | **Bundled in Base**<br>*(Expanded via Sync)* |
| **3** | **Indirect Tax (GST & ITC)** | Included: CGST Section 17(5) blocked credit negative list + Circular 172 employer obligations + GSTR-2B Table 4(B) | Section 16(2) 4-way matching rules & 180-day reversal calculation guidelines | Real-time Rule 48(4) IRN hash verification, Rule 89(5) Inverted Duty Structure (IDS) refund engine | **Bundled in Base**<br>*(Expanded via Sync)* |
| **4** | **Financial Reporting (Ind AS)** | Not bundled in base | Baseline Ind AS 115 & 116 accounting summaries | **Full Indian Accounting Standards (Ind AS) Suite**: Ind AS 115 (5-step, variable constraint), Ind AS 116 (ROU/lease liability), Ind AS 103 (PPA/goodwill/NCI), Ind AS 109 (3-stage ECL), Ind AS 12 (DTA/DTL) | **Planned: Ind AS Expansion Pack** |
| **5** | **Corporate Governance (MCA)** | Not bundled in base | Companies Act Section 188 threshold guidance | **Full Companies Act 2013 Suite**: Section 188 (RPT audit committee & voting ban), Section 180 (borrowing limits), Section 185/186 (inter-corporate loans), Section 68 (25% buybacks) | **Planned: MCA Expansion Pack** |
| **6** | **Capital Markets (SEBI LODR)** | Not bundled in base | Regulation 30 materiality guidelines | **SEBI LODR Suite**: Regulation 30 Materiality Triad calculator (2% turnover / 2% net worth / 50% PAT), 24-hr stock exchange disclosure timer, Regulation 23 listed RPTs | **Planned: SEBI Expansion Pack** |
| **7** | **Cross-Border & FEMA** | Included: IRC 901/904 FTC pass-through baskets + Indian Form 67 & US IRS Schedule K-3 | Foreign vendor DTAA treaty checklists (TRC, No-PE, electronic Form 10F) | Supreme Court *Engineering Analysis* SaaS royalty defense, Form 15CA/CB vs Form 145/146 automated dual-act router | **Bundled in Base**<br>*(Expanded via Sync)* |
| **8** | **M&A Restructuring & Succession** | Not bundled in base | Section 50B slump sale checklist | **Restructuring Engine**: Section 50B undertaking test, Section 281 AO clearance NOC, Section 313 successor liability, CGST 85, Notification 12/2017 0% GST going concern | **Planned: M&A Expansion Pack** |
| **9** | **Strategic Corporate Tax Planning** | Not bundled in base | Section 115BAA overview | **Strategic Tax Playbook**: Section 115BAA vs MAT credit cliff, Section 80JJAA 30% employment deduction, Section 79 loss continuity, Section 68/115BBE cash credit defense | **Planned: Strategic Tax Pack** |
| **10**| **Customs & Foreign Trade Policy** | Not bundled in base | Customs valuation basics | **Customs & Trade Suite**: Section 65 MOOWR duty deferral, EPCG, Advance Authorization, Section 74 fraud penalties, IGST Section 13(8)(b) intermediary traps | **Planned: Customs Pack** |
| **11**| **Finance Operations & SOPs** | Not bundled in base | Standard 3-way match guidelines | **Enterprise Treasury Controls**: P2P 3-way match, O2C, 13-week cash forecasting, penny drop validation, maker-checker segregation of duties | **Planned: Finance Ops Pack** |

---

## 3. Depth Matrix: Granularity, Invariants & Execution

"Depth" measures the progression from declarative metadata to active legal interpretation, external government portal attestation, and deterministic arithmetic calculation:

```
Level 1: Declarative Schema (Section Code, Titles, Baseline Rates)
   ↓
Level 2: Official Provisos & Executive Circulars (CBDT, CBIC, MSME OMs)
   ↓
Level 3: Compliance Return Schemas (Form 26Q, Schedule III, GSTR-2B)
   ↓
Level 4: External Portal Attestation (TRACES Certificates, UDYAM Validations)
   ↓
Level 5: Deterministic Mathematical Execution (Excess Math, Compound Interest, Journal Vouchers)
```

### Detailed Depth Breakdown by Domain

### 1. Direct Tax & Corporate Withholding (TDS / TCS)
* **Public Starter Seed**:
  - Reaches **Level 3**.
  - **Provisions**: Section 194Q, 194J, 206C(1H) sunset.
  - **Thresholds**: ₹50 Lakh annual purchase limit, ₹10 Crore prior turnover.
  - **Rates**: 0.1% base rate, 2% FTS rate, 10% professional rate, 5% Section 206AA non-PAN penalty cap.
  - **Circulars**: CBDT Circular 13/2021 (threshold calculation, advance netting), CBDT Circular 23/2017 (GST unbundling).
  - **Forms**: Form 26Q quarterly TDS return schema, Form 16A certificate schema, Vendor PAN / 206AB declaration template.
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Full Statutory Spectrum**: Table 8 of Income-tax Act, 2025 (Section 392 Rent, 393 Goods, 394 Contractors, 395 Professional/FTS, 397 Non-PAN).
  - **TRACES Lower Deduction Vault**: Automatically ingests, validates, and tracks Section 197 / Section 395 lower withholding certificates; enforces monetary ceilings and tracks consumed quota.
  - **Advance Netting & Challan Reconciliation**: Matches credits against Challan ITNS 281 tax deposits under Rule 30.
  - **Deterministic Output**: Generates balanced double-entry Journal Vouchers (JVs) debiting expense/inventory, debiting GST ITC, crediting TDS Payable, and crediting AP.

---

### 2. MSME & Working Capital (Delayed Payments & Section 43B(h))
* **Public Starter Seed**:
  - Reaches **Level 3**.
  - **Provisions**: MSMED Act, 2006 Sections 15 & 16; Income-tax Act Section 43B(h).
  - **Timelines**: Strict 15-day (without contract) or maximum 45-day (with written contract) payment clocks.
  - **Rates**: Mandatory compound penal interest at 3x RBI Bank Rate.
  - **Circulars**: Ministry of MSME OM 1/4(1)/2021-P&G/Policy (strictly excluding retail and wholesale traders under NIC 45, 46, 47 from delayed payment protections).
  - **Forms**: UDYAM registration verification schema, Companies Act Schedule III corporate balance sheet disclosure notes.
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Multi-Interval Compound Interest Calculator** (`calculateMultiIntervalMsmeInterest`): Accurately tracks shifting RBI Bank Rates across multi-quarter delinquencies, compounding on monthly rests.
  - **Section 23 Permanent Disallowance**: Enforces mandatory tax addback in Clause 22 of Tax Audit Form 3CD.
  - **Dispute Interception Engine**: Evaluates formal 15-day defect notifications that legally pause statutory clocks under Section 15.

---

### 3. Indirect Tax (GST & Input Tax Credit)
* **Public Starter Seed**:
  - Reaches **Level 3**.
  - **Provisions**: CGST Act, 2017 Section 17(5) negative list for blocked input tax credit.
  - **Scope**: Motor vehicles, food & beverages, outdoor catering, club memberships, personal consumption.
  - **Circulars**: CBIC Circular 172/04/2022-GST (carving out the statutory employer obligation exception).
  - **Forms**: GSTR-2B vs. GSTR-3B Table 4(B) ineligible ITC reporting schema.
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Section 16(2) 4-Condition Invariant Gate**: Concurrently verifies tax invoice possession, physical GRN receipt, GSTR-2B reflection, and supplier tax remittance.
  - **180-Day Rule Reversal**: Calculates mandatory ITC reversals for invoices unpaid past 180 days with exact 18% annual interest under Section 50.
  - **Rule 48(4) IRN Hash Validation**: Real-time e-invoicing authentication with automated exemptions for Special Economic Zone (SEZ) units.
  - **Rule 89(5) Inverted Duty Structure (IDS)**: Mathematical refund computation formula on inputs vs. output supplies.

---

### 4. Financial Reporting & Indian Accounting Standards (Ind AS)
* **Public Starter Seed**:
  - [Not seeded in starter package]
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5** (Full Corporate Financial Reporting & Ind AS Framework).
  - **Ind AS 115 (Revenue from Contracts with Customers)**:
    - 5-step revenue recognition model.
    - Variable consideration constraint (recognition capped at highly probable non-reversal).
    - Significant financing component discounting ($>1\text{ year}$).
    - Relative Standalone Selling Price (SSP) allocation hierarchy.
  - **Ind AS 116 (Leases)**:
    - Right-of-Use (ROU) asset and Lease Liability discounting at incremental borrowing rate.
    - Low-value asset ($<\$5,000$) and short-term ($<12\text{ months}$) exemption handling.
  - **Ind AS 103 (Business Combinations)**:
    - Acquisition method and Purchase Price Allocation (PPA).
    - Goodwill vs. Capital Reserve computation; Non-Controlling Interest (NCI) fair value measurement.
  - **Ind AS 109 (Financial Instruments)**:
    - Solely Payments of Principal and Interest (SPPI) contractual cash flow test.
    - Classification into Amortised Cost, FVTOCI, or FVTPL.
    - 3-Stage Expected Credit Loss (ECL) impairment modeling.
  - **Ind AS 12 (Income Taxes)**:
    - Balance sheet temporary difference method for Deferred Tax Assets (DTA) and Deferred Tax Liabilities (DTL).

---

### 5. Corporate Governance & Companies Act, 2013
* **Public Starter Seed**:
  - [Not seeded in starter package]
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Section 188 (Related Party Transactions)**:
    - Arm's length ordinary course of business evaluation.
    - Audit Committee prior approval, Board consent, and public shareholder ordinary resolution (exceeding 10% consolidated turnover or ₹1,000 Crore).
    - Related party voting exclusion enforcement.
  - **Section 180(1)(c) (Borrowing Limits)**:
    - Mathematical cap: Paid-up Capital + Free Reserves + Securities Premium.
  - **Section 185 & 186 (Loans & Investments)**:
    - 60% of paid-up capital/free reserves or 100% of free reserves statutory limits.
  - **Section 68 (Share Buybacks)**:
    - 25% net worth cap and mandatory $\le 2:1$ post-buyback debt-to-equity ratio test.

---

### 6. Capital Markets & Listing Obligations (SEBI LODR)
* **Public Starter Seed**:
  - [Not seeded in starter package]
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Regulation 30 (Materiality Triad)**:
    - Deterministic numerical threshold: lowest of:
      1. $2\%$ of consolidated annual turnover
      2. $2\%$ of consolidated net worth
      3. $50\%$ of 3-year average absolute Profit After Tax (PAT)
  - **24-Hour Stock Exchange Disclosure Clock**:
    - Evaluates unexpected tax demands, vendor litigations, or regulatory notices against the triad threshold and triggers mandatory 24-hour disclosure alarms.
  - **Regulation 23 (Listed RPTs)**:
    - Mandatory prior Audit Committee approval with strict disqualification of all related parties from voting.

---

### 7. Cross-Border & Foreign Exchange Management (FEMA)
* **Public Starter Seed**:
  - Reaches **Level 3**.
  - **Provisions**: US Internal Revenue Code §§ 901 & 904 Foreign Tax Credit limitation baskets (General vs. Passive Category).
  - **Forms**: Indian Form 67 (Rule 128 statement) and US IRS Form 1065 Schedule K-3 dual-reporting schema.
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Supreme Court Jurisprudence**: *Engineering Analysis Centre of Excellence (2021)* classification: automated SaaS and off-the-shelf cloud infrastructure qualify as "Business Profits" under DTAA Article 7 (0% withholding if No Permanent Establishment).
  - **Form 15CA / 15CB vs. Form 145 / 146**: Automated routing based on remittance thresholds and AO orders under Income-tax Act, 2025.
  - **Treaty Conditionality**: Validates Tax Residency Certificates (TRC), No-PE declarations, and electronic Form 10F filings.

---

### 8. Corporate Mergers, Acquisitions & Successor Liability
* **Public Starter Seed**:
  - [Not seeded in starter package]
* **Full Enterprise Engine (Adesha Runtime)**:
  - Reaches **Level 5**.
  - **Slump Sale vs. Itemized Sale (§50B / Act 2025)**:
    - Organic undertaking test (equipment, workforce, operational leases, customer contracts).
    - Prevents accidental collapse into itemized depreciable asset sales (§50).
  - **Section 281 Transfer Voidability**:
    - Intercepts pending tax proceedings and checks Assessing Officer NOC / clearance certificates.
  - **Successor Liability (§313 & CGST §85)**:
    - Joint and several tax liability enforcement on business transfer.
  - **Notification 12/2017 Entry 2**:
    - 0% GST going concern exemption verification.
  - **MAT Credit Protection (§115JAA)**:
    - Flags the non-transferability of seller MAT credit in asset/slump sales.

---

## 4. Architectural Summary: Why the Split Exists

1. **Lightweight Developer Gateway**: Shipping the starter seed via npm keeps package size small (~2 MB) and enables instantaneous installation for any developer or AI agent.
2. **Deterministic Security Boundary**: Proprietary mathematical execution code (`statutory_calculator.js`), banking CAS leases, and ledger writeback engines remain protected behind the MudraForge Cloudflare Anycast API.
3. **Continuous Expansion via Edge Sync**: New regulatory domains (Ind AS, MCA, SEBI, FEMA) are curated and verified against primary gazette notifications, official CBDT/CBIC executive circulars, and independent programmatic test fixtures, deployed to the edge, and pulled on-demand via `npx @mudraforge/statutory sync`.
