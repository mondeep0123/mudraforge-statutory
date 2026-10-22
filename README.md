# @mudraforge/statutory

> **Open Knowledge Format (OKF) — Authoritative Indian & Cross-Border Statutory Substrate**  
> *Zero runtime dependencies. Fully offline-capable local filesystem. Public reference commons for software engineers, tax practitioners, and autonomous AI agents.*

[![npm version](https://img.shields.io/npm/v/@mudraforge/statutory.svg)](https://www.npmjs.com/package/@mudraforge/statutory)
[![CI](https://github.com/mondeep0123/mudraforge-statutory/actions/workflows/ci.yml/badge.svg)](https://github.com/mondeep0123/mudraforge-statutory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edge Network](https://img.shields.io/badge/Edge-Cloudflare%20Global%20Anycast-orange.svg)](https://api.mudraforge.in/api/v1/statutory/docs)
[![Specification: OKF 0.2](https://img.shields.io/badge/Specification-Google%20OKF%20v0.2-green.svg)](https://cloud.google.com/blog)

---

## Published Release & Provenance Ledger

| Item | Value |
|---|---|
| **Package Release** | **`v2.4.0`** (Public Beta) |
| **Knowledge Specification** | **Google Open Knowledge Format (OKF v0.2)** |
| **Regulatory Snapshot** | **CBDT / CBIC / MCA / MSME Snapshot: October 2026** |
| **Integrity Root** | SHA-256 root manifest in [`okf/manifest.json`](./okf/manifest.json) (reproducible byte-level non-tampering proof) |
| **Temporal Framework** | Dual-Act Bridge: *Income-tax Act, 1961* & *Income-tax Act, 2025* |
| **Verification Gate** | 100% Pass across cumulative thresholds, legislative sunsets, and excess math |

> **Note on Cryptographic Scope**: The SHA-256 root hash in `okf/manifest.json` provides mathematical verification of **byte-level integrity** (ensuring local files have not been corrupted, altered, or partially written). A hash certifies that bytes match the published release; it does not by itself constitute legal or statutory authority. Epistemic authority is established strictly via the primary gazette citations, CBDT/CBIC executive circulars, and independent ground-truth tests.

---

## Statutory Authority & Epistemic Boundary

- **Primary Legislation & Official Circulars**: Statutory texts, executive circulars, notifications, and compliance forms in this repository are structured transpositions of official publications issued by the Ministry of Finance (CBDT/CBIC), Ministry of MSME, Ministry of Corporate Affairs (MCA), and the US Internal Revenue Service (IRS). Official government source material is governed by respective open data and statutory frameworks.
- **Open Knowledge Format (OKF)**: The structured JSON schemas, Markdown circulars with YAML frontmatter, temporal validity state machines, and cross-statute relational maps are authored under the Google Open Knowledge Format (OKF v0.2) specification.
- **Deterministic Runtime**: Mathematical execution (cumulative threshold deductions, multi-interval monthly compound interest, double-entry ledger writebacks, and single-use payment leases) is evaluated independently by the MudraForge Adesha Governance Engine on Cloudflare Anycast Edge. Reference metadata published in this package does not constitute formal legal counsel or statutory audit certification.

---

## Published Inventory Metrics

The repository currently publishes a verified starter seed across four regulatory domains, accompanied by official executive guidance and compliance schemas:

- **4 Foundational Regulatory Domains**: Direct Tax (TDS/TCS), Indirect Tax (GST), MSME & Working Capital, International Tax.
- **6 Indexed Core Provisions**: Section 194Q, Section 194J, Section 206C(1H) sunset, CGST Section 17(5), MSMED Act Sections 15 & 16, US Internal Revenue Code §§ 901 & 904.
- **6 Official Executive Circulars & Memoranda**: CBDT Circular 13/2021, CBDT Circular 23/2017, CBDT Circular 03/2020, Finance Act 2025 Sunset Memorandum, CBIC Circular 172/04/2022-GST, Ministry of MSME OM 1/4(1)/2021-P&G/Policy.
- **8 Compliance Form Schemas & Verification Checklists**: Form 26Q quarterly TDS return, Form 16A certificate, GSTR-2B Table 4(B) ineligible ITC reconciliation, UDYAM portal registration verification, Companies Act Schedule III corporate balance sheet notes, Form 67 (Rule 128), US IRS Schedule K-3, and Vendor PAN / Section 206AB declarations.
- **100% Corpus Verification Suite**: Validated against statutory threshold resets, non-PAN penalty rate caps, and statutory sunset interceptions.

---

## Rationale: Authoritative Knowledge Substrate vs. Probabilistic Web RAG

When autonomous AI agents and developer applications (Cursor, Claude, Copilot, Antigravity, or custom enterprise finance systems) evaluate Indian and cross-border tax compliance, they typically face two systemic failure modes:

1. **Frozen, Outdated Model Weights**: Foundation models hallucinate rates, cite provisions repealed in prior Finance Acts, or invert statutory withholding obligations (such as continuing to mandate Section 206C(1H) collection following its statutory omission on 1 April 2025).
2. **Unstructured Web Search (Web RAG)**: When agents search the public web for statutory sections, they ingest conflicting third-party summaries: commercial search-engine-optimized blogs from 2018–2022, unverified discussion forums, and marketing writeups that omit crucial legislative provisos (such as CBDT Circular 13/2021 unbundling GST from the TDS base, or Ministry of MSME OM 2/1(5)/2021 strictly excluding retail and wholesale traders). This consumes excessive context tokens, introduces 3–5 seconds of latency, and feeds noisy, contradictory context into the reasoning loop.

`@mudraforge/statutory` resolves this by providing an **unambiguous, structured, offline-capable statutory knowledge vault** under Google's Open Knowledge Format (OKF v0.2). Provisions are organized with definitive section codes, operative dates, legislative sunset boundaries, primary citations, thresholds, and audit checklists.

---

## Architectural Principle: Separation of Law & Deterministic Computation

A foundational rule of financial systems: **Providing an LLM with the raw text of a statute does NOT ensure the model will compute or enforce it correctly.**

Large Language Models are probabilistic token sequence predictors, not deterministic arithmetic processors. When an LLM evaluates Section 194Q ("deduct 0.1% on purchase of goods exceeding ₹50 Lakhs"):
- It frequently computes 0.1% on the aggregate transaction value rather than the incremental excess over ₹50 Lakhs.
- It fails to calculate monthly compound penal interest at 3 times the RBI Bank Rate under MSMED Act Sections 15 & 16 across multi-quarter intervals.
- When challenged on computational mistakes, generative models defend erroneous figures due to the **Epistemic Confirmation Loop** (*"Agreement is not truth"*).

**To resolve this, MudraForge enforces a strict Separation of Powers**:
- **The Free OKF Commons (This Package)** provides the declarative knowledge representation: verified statutory thresholds, legal summaries, executive circulars, and compliance return schemas.
- **The Paid Cloud Engine** provides the **deterministic calculation engines**, System-1 semantic intent discovery, and multi-step statutory verification on Cloudflare Anycast Edge. Statutory arithmetic is never delegated to generative token prediction.

---

## Production Lineage & System Validation

`@mudraforge/statutory` is not a theoretical exercise or a synthetic benchmark wrapper. It represents the production-proven statutory oracle subsystem that **MudraForge dogfoods internally** to govern its autonomous financial operating platform (Adesha).

Every statute, threshold check, and temporal boundary in this repository is actively evaluated against enterprise accounts payable workflows and verified by Chartered Accountants before publication.

---

## Legal Domains Currently Covered

> **Full 11-Domain Roadmap & Lifecycle Matrix**:  
> For the complete architectural matrix comparing the 4 starter domains against the full 11-domain sovereign roadmap (including Indian Accounting Standards [Ind AS], MCA Corporate Governance, and SEBI LODR), see [`DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md`](./DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md).

The OKF substrate currently indexes and enforces ground truth across four major regulatory domains:

### 1. Direct Tax (Income Tax & TDS/TCS)
- **Section 194Q**: 0.1% TDS on purchase of goods exceeding ₹50 Lakhs cumulative annual threshold (calculating strictly on the excess).
- **Section 206C(1H)**: TCS on sale of goods, with automated temporal interception of its **1 April 2025 sunset** under the Finance Act, 2025.
- **Section 194J**: Fees for Technical Services (2% FTS) vs. Professional Fees (10%), handling 5% non-PAN penalty rates under Section 206AA.
- **Dual-Act Forward Mapping**: Complete cross-compilation matrix from the *Income-tax Act, 1961* to the *Income-tax Act, 2025* (taking effect 1 April 2026), mapping sections seamlessly (e.g., Section 194Q $\rightarrow$ Section 393(1), Table 8, Item (ii)).

### 2. Indirect Tax (Goods & Services Tax - GST)
- **CGST Section 17(5)**: Comprehensive statutory negative list for Blocked Input Tax Credit (ITC)—including motor vehicles, catering, employee benefits, and the statutory employer obligation proviso under CBIC Circular 172/04/2022-GST.

### 3. Micro, Small & Medium Enterprises (MSME & Section 43B(h))
- **MSMED Act, 2006 (Sections 15 & 16)**: Strict statutory payment clock (15 days without agreement, max 45 days with written agreement) and non-negotiable compound penal interest at **3 times the RBI Bank Rate** (compounded monthly).
- **Trader Exclusion Rule**: Automated enforcement of Ministry of MSME OM No. 1/4(1)/2021-P&G/Policy, strictly excluding wholesale and retail traders (NIC 45, 46, 47) from delayed payment protections and Section 43B(h) addbacks.
- **Balance Sheet Disclosures**: Companies Act, 2013 Schedule III compliance reporting format for unpaid MSME supplier principal and interest.

### 4. Cross-Border & International Tax
- **US Internal Revenue Code (IRC §§ 901 & 904)**: Foreign Tax Credit (FTC) limitation baskets (General Category vs. Passive Category), Pass-Through Entity (PTE) tax pass-throughs, and Schedule K-3 dual-reporting compliance for Indo-US cross-border ventures.
- **Indian Rule 128 (Form 67)**: Statement of foreign tax credit compliance schema and filing deadlines.

---

## Free Local OKF vs. Paid Cloud Enterprise Tier

We deliberately separate **reference knowledge** from **deep mathematical execution & neural reasoning**:

| Capability / Feature | Free Local OKF (NPM / Substrate) | Paid Cloud Enterprise API (`hello@mudraforge.in`) |
| :--- | :--- | :--- |
| **Pricing** | **100% Free** (Open Source / Public Beta) | **Paid Enterprise Subscription** (Direct Contact) |
| **Live OKF Updates (`sync`)** | **Included Free during Beta** (transitions to Paid post-beta for ongoing sustainability) | **Continuous Verified Versioning & Real-Time Sync** |
| **Data Privacy & Latency** | 100% Offline, 0 network calls, sub-1ms | Global Cloudflare Anycast edge (sub-10ms) |
| **Search Engine** | Exact keyword, section code & alias lookup | **System-1 Neural Semantic Discovery Model** (finds relevant laws from unstructured transaction queries) |
| **Reasoning Capabilities** | None (Static reference data only) | **Multi-Step Statutory Reasoning Engine** (evaluates facts, composite supplies, M&A restructuring, and cross-border remittances) |
| **Output Modes** | Raw statutory JSON & thresholds | **Analysis Mode**: Detailed legal rationale, disallowance risk warnings, and balanced double-entry journal vouchers |
| **Deterministic Calculators** | *Not bundled in package* (prevents reverse-engineering) | **Full Execution Engine**: Cumulative ₹50L excess math (§194Q), MSMED 3x RBI compound interest, 194J 2% vs 10% |
| **Government Portal Attestation** | Not available | **Out-of-Band Attestation**: TRACES certificates, UDYAM portal registration, GSTIN verification |
| **How to Obtain Access** | Run `npm install @mudraforge/statutory` | **Email `hello@mudraforge.in` or `support@mudraforge.in`** |

> **Operational Boundary**: The Paid Cloud Enterprise API provides deterministic statutory calculation, neural discovery search, and legal analysis. It does **not** disburse funds, issue payment leases, or perform direct ERP database mutations. Autonomous money movement and general ledger writebacks are governed separately by the **MudraForge Adesha Enterprise Platform** (see [ENTERPRISE_GOVERNANCE.md](./ENTERPRISE_GOVERNANCE.md)).

---

## Public Beta Policy & Sustainable Maintenance

1. **Free Updates During Public Beta**:  
   Throughout the Public Beta, calling `npx @mudraforge/statutory check-update` or `npx @mudraforge/statutory sync` connects to the Cloudflare Anycast edge without an API key. You can synchronize new statutory amendments, notifications, and section definitions directly into your local workspace.
2. **Economic Rationale for Long-Term Maintenance**:  
   Tax law is active public policy subject to annual Union Budgets, periodic Finance Acts, CBDT/CBIC circulars, and appellate tribunal precedents. Continuously auditing official gazettes, formalizing legal schemas with Chartered Accountants, running regression test suites, and distributing low-latency edge updates requires sustained engineering infrastructure. To ensure the oracle remains continuously audited and strictly accurate without quality degradation, live versioning updates will transition to the paid Enterprise subscription following beta conclusion.
3. **Perpetual MIT License Guarantee**:  
   The local OKF bundle you install or clone remains **100% free under the MIT license forever**. You are never locked out of your existing files, and you may fork, modify, or extend them for offline operations at zero cost.

---

## Structured OKF Domain Hierarchy (Zero-Token Discovery)

Rules are organized into **four foundational regulatory domains**, complete with official circulars, statutory notifications, and compliance form schemas:

```
okf/
├── manifest.json                                      # Cryptographic SHA-256 root hash & domain manifest
│
├── direct_tax/
│   ├── tds_goods_194q/
│   │   ├── section.json                               # 0.1% TDS on purchase excess over ₹50L
│   │   ├── circulars/
│   │   │   ├── cbdt_circular_13_2021_guidelines.md    # CBDT Q&A on threshold math & advance netting
│   │   │   └── cbdt_circular_23_2017_gst_unbundling.md# Exclusion of GST from TDS base
│   │   └── forms/
│   │       ├── form_26q_quarterly_return.json         # Form 26Q quarterly TDS reporting schema
│   │       └── vendor_pan_declaration.md              # Vendor PAN & Section 206AB declaration template
│   ├── tds_services_194j/
│   │   ├── section.json                               # 2% FTS vs 10% Professional fees
│   │   ├── circulars/
│   │   │   └── cbdt_circular_03_2020_fts_rate_cut.md  # FTS 2% rate reduction guidelines
│   │   └── forms/
│   │       └── form_16a_tds_certificate.json          # Form 16A quarterly TDS certificate schema
│   └── tcs_goods_206c_1h/
│       ├── section.json                               # Section 206C(1H) sunset on 1 April 2025
│       └── circulars/
│           └── finance_act_2025_sunset_memo.md        # Finance Act 2025 omission memo
│
├── indirect_tax_gst/
│   └── blocked_itc_17_5/
│       ├── section.json                               # CGST 17(5) blocked credit negative list
│       ├── circulars/
│       │   └── cbic_circular_172_2022_employer_obligations.md # Statutory employer obligation exception
│       └── forms/
│           └── gstr_2b_ineligible_reconciliation.json # GSTR-2B vs 3B Table 4(B) reporting schema
│
├── msme_commercial/
│   └── delayed_payments_15_16/
│       ├── section.json                               # 45-day clock, 3x RBI interest & 43B(h)
│       ├── circulars/
│       │   └── msme_om_2021_trader_exclusion.md       # Retail/wholesale trader exclusion rule
│       └── forms/
│           ├── udyam_registration_verification.json   # UDYAM portal certificate validation schema
│           └── schedule_iii_msme_disclosure.md        # Balance Sheet Schedule III disclosure format
│
└── international_tax/
    └── foreign_tax_credit_irc_901_904/
        ├── section.json                               # US Foreign Tax Credit limitation baskets
        └── forms/
            ├── form_67_statement_of_foreign_tax.json  # Indian Income Tax Form 67 (Rule 128)
            └── irs_schedule_k3_reporting.json         # US IRS Schedule K-3 dual-reporting schema
```

Because the folder hierarchy separates legal domains and provisions cleanly, an AI agent browsing the folder can identify the applicable statute, circular, or compliance form at **0 token cost**.

---

## Canonical Edge Synchronization (Full Statutory Universe)

The package bundles an initial curated baseline snapshot across all four domains. **To pull the complete, continually expanding statutory catalog from the Cloudflare Anycast edge API into your local workspace:**

```bash
# Step 1: Check if newer statutes, circulars, or gazette amendments exist on the edge
npx mudraforge-statutory check-update

# Step 2: Synchronize the complete statutory bundle directly to your local ./okf/ directory
npx mudraforge-statutory sync

# Step 3: Browse your full local statutory library interactively
npx mudraforge-statutory browse
```

---

## Quick Start (Free Tier)

### 1. Installation via npm
```bash
npm install @mudraforge/statutory
```

### 2. Initialize AI Agent Skill
Installs `SKILL.md` into your workspace's `.agents/skills/` directory:
```bash
npx mudraforge-statutory init-skill
```

### 3. Direct Programmatic Traversal (Zero Dependencies, Offline-First)
```javascript
import { lookupLocalStatute, isStatuteActive } from '@mudraforge/statutory';

// 1. Look up Section 194Q from local disk (sub-1ms, 0 network calls)
const statute = lookupLocalStatute('194Q');
console.log(statute.title);
console.log(statute.keyStatutoryThresholds.taxableBaseScope);
// => "Tax is deductible strictly on the excess over ₹50 Lakhs, NOT on the aggregate gross turnover."

// 2. Check temporal status (detecting legislative sunsets)
const isActive2024 = await isStatuteActive('206C(1H)', '2024-05-01'); // true
const isActive2025 = await isStatuteActive('206C(1H)', '2025-06-01'); // false (omitted by Finance Act, 2025)
```

---

## Enterprise Tier (Paid Cloud Execution & Analysis Mode)

To access the **System-1 semantic discovery search**, **Analysis Mode output**, and **Deterministic Calculation Engines**, initialize `StatutoryClient` with an Enterprise API key:

```javascript
import { StatutoryClient } from '@mudraforge/statutory';

const client = new StatutoryClient({
    tier: 'ENTERPRISE_PAID',
    apiKey: process.env.MUDRA_STATUTORY_API_KEY // Available via hello@mudraforge.in
});

// Execute calculation via Cloudflare Edge Engine (not stored in local package)
const result = await client.calculate({
    section: '194Q',
    invoiceAmount: 8000000,       // ₹80 Lakhs
    priorFyPurchases: 4000000,    // ₹40 Lakhs already purchased this FY
    hasPan: true
});

console.log(result.taxableBase); // ₹70,00,000 (Calculates strictly on excess over ₹50L)
```

---

## Developer Tooling & Verification Gates

The repository enforces fail-closed automated verification for schemas, temporal rules, and cryptographic digests:

```bash
# 1. Run full 10-suite multi-domain regression test
npm test

# 2. Validate all OKF schemas, circular YAML frontmatter, and return forms
npm run validate

# 3. Verify cryptographic SHA-256 Merkle root integrity
npm run manifest:check

# 4. Deterministically rebuild CATALOG.md from the statutory corpus
npm run catalog
```

---

## Institutional Governance & Contributing

- **[Statutory Knowledge Catalog](./CATALOG.md)**: Full table of all indexed provisions, key thresholds, and return schemas.
- **[Domain Breadth & Depth Comparison](./DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md)**: 4-domain starter commons vs. 11-domain edge roadmap.
- **[Contributor Protocol](./CONTRIBUTING.md)**: Authoring standards for `section.json`, executive circulars, and CA empanelment.
- **[Security & Statutory Integrity Policy](./SECURITY.md)**: Protocol for reporting code flaws and gazetted statutory amendments.
- **[Architecture Specification](./ARCHITECTURE.md)**: Master specification of the Adesha Sovereign Runtime & Statutory Engine.

---

## License

This software and the reference Open Knowledge Format (OKF) knowledge definitions in `./okf/` are licensed under the **[MIT License](./LICENSE)**. Sourced government gazettes and statutory instruments are subject to their respective official public-domain and open government data terms.
