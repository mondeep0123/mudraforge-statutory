# @mudraforge/statutory

> **Open Knowledge Format (OKF) — Structured Indian & Cross-Border Statutory Knowledge Substrate**  
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
| **Package Release** | **`v2.4.2`** (Public Beta) |
| **Knowledge Specification** | **Google Open Knowledge Format (OKF v0.2) + MudraForge Statutory Schema Extension** |
| **Regulatory Snapshot** | **CBDT / CBIC / MCA / MSME Baseline: October 2026** |
| **Corpus Quality Card** | 100% Citation Resolution (15/15 URLs) in [`docs/CORPUS_QUALITY.md`](./docs/CORPUS_QUALITY.md) |
| **Architecture Decision Records** | 6 Normative ADRs documented in [`docs/ARCHITECTURE_DECISIONS.md`](./docs/ARCHITECTURE_DECISIONS.md) |
| **Vendor Conformance Suite** | 12/12 Passing Fixture Tests in [`conformance/`](./conformance/) |
| **End-to-End Execution Trace** | Audited 7-stage AP lifecycle in [`examples/`](./examples/) (`npm run example:trace`) |
| **Enterprise Assurance Preview** | Formal TLA+ & mutation defenses in [`docs/ADESHA_ASSURANCE_OVERVIEW.md`](./docs/ADESHA_ASSURANCE_OVERVIEW.md) |
| **Integrity Root** | SHA-256 root manifest in [`okf/manifest.json`](./okf/manifest.json) (reproducible byte-level non-tampering proof) |
| **Temporal Framework** | Dual-Act Bridge: *Income-tax Act, 1961* & *Income-tax Act, 2025* |
| **Verification Gate** | 100% Pass across cumulative thresholds, legislative sunsets, and excess math |

> **Note on Cryptographic Scope**: The SHA-256 root hash in `okf/manifest.json` provides mathematical verification of **byte-level integrity** (ensuring local files have not been corrupted, altered, or partially written). A hash certifies that bytes match the published release; it does not by itself constitute legal or statutory authority. Epistemic authority is established strictly via the primary gazette citations, CBDT/CBIC executive circulars, and independent ground-truth tests.

---

## Table of Contents

- [Quick Start (Free Tier)](#quick-start-free-tier)
  - [1. Installation via npm](#1-installation-via-npm)
  - [2. Initialize AI Agent Skill](#2-initialize-ai-agent-skill)
  - [3. Direct Programmatic Traversal](#3-direct-programmatic-traversal-zero-dependencies-offline-first)
- [Supported Application Patterns](#supported-application-patterns)
  - [1. AI Agents & LLM Tooling](#1-ai-agents--llm-tooling)
  - [2. Finance Software & Accounts-Payable Workflows](#2-finance-software--accounts-payable-workflows)
  - [3. Developer Tooling & Audit Verification](#3-developer-tooling--audit-verification)
- [Tier Separation: Free Commons vs. Hosted Calculation Engine](#architectural-boundaries-open-substrate-vs-hosted-edge-vs-adesha-platform)
- [Legal Domains Currently Covered](#legal-domains-currently-covered)
- [Structured OKF Directory Hierarchy](#structured-okf-domain-hierarchy-zero-token-discovery)
- [Canonical Edge Synchronization](#canonical-edge-synchronization-full-statutory-universe)
- [Enterprise Tier (Paid Cloud Execution)](#enterprise-tier-paid-cloud-execution--analysis-mode)
  - [Edge API Endpoints & Quotas](#enterprise-edge-api-endpoints--quotas)
  - [Error Semantics & Response Codes](#error-semantics--response-codes)
- [System Origin & Validation Baseline](#system-origin--validation-baseline)
- [The Payment Instruction Boundary & End-to-End AP Architecture](#the-payment-instruction-boundary--end-to-end-ap-architecture)

---

## Supported Application Patterns

`@mudraforge/statutory` serves as an authoritative reference layer and computation client across three distinct environments:

### 1. AI Agents & LLM Tooling
- **Current Implementation**: Generates a self-contained [`SKILL.md`](./SKILL.md) skill definition (`npx @mudraforge/statutory init-skill`) that connects agent runtimes directly to the local filesystem without external API calls or token bloat from search queries.
- **Integration Boundary**: Agents can read structured section definitions (`okf/**/section.json`) to discover rates, thresholds, and return filing schemas deterministically rather than relying on model parameter memory.

### 2. Finance Software & Accounts-Payable Workflows
- **Current Implementation**: Provides offline threshold logic (such as Section 194Q cumulative purchases exceeding ₹50 Lakhs) and legislative sunsets (Section 206C(1H) omission on 1 April 2025). The hosted enterprise tier provides deterministic calculation via `client.calculate()`.
- **Integration Boundary**: Custom accounting engines or enterprise middleware can invoke these functions via Node.js or REST endpoints. *(Note: This package exposes standard programmatic and JSON interfaces; it does not ship pre-packaged ERP plugins for third-party platforms).*

### 3. Developer Tooling & Audit Verification
- **Current Implementation**: CLI commands (`browse`, `lookup`, `list`, `check-update`) allow developers and tax compliance teams to inspect verified primary citations, download statutory checklists (such as Form 3CEA slump sale audit requirements), and verify dual-act forward crosswalks between the 1961 and 2025 Income-tax Acts.
- **Integration Boundary**: Usable standalone in terminal environments, continuous integration (CI) compliance checks, or custom tax tooling.

---

## The Payment Instruction Boundary & End-to-End AP Architecture

> **The Dangerous Moment in Finance AI**:  
> *The dangerous moment in finance AI isn't when the model is wrong. It's when its output becomes a payment instruction.*
> 
> In marketing, an AI hallucination is a typo. In accounts payable, an unhandled bank timeout can trigger a retry that double-pays a vendor.
> 
> Hardening the financial runtime for **Adesha, MudraForge's organizational AI**, our principle is simple:  
> **Reasoning can be probabilistic, but financial execution needs deterministic boundaries.**

### The Four Pillars of Autonomous Finance Execution

1. **Retrieval is Not Verification**: Finding a document or matching keywords is not legal verification. Real accounting requires validating evidence against connected systems of record (including live Zoho Books / SAP ERP readback) and authenticated tenant statutory vaults.
2. **Safe Tools Do Not Guarantee Safe Workflows**: An AI agent can call individually safe API tools and still coordinate an unauthorized or illegal transaction. Generative models coordinate investigations; deterministic code calculates statutory taxes and enforces ledger invariants (*Rule 11: Agreement with the Engine ≠ Agreement with the Law*).
3. **Preventing Silent Financial Drift**: Deterministic code computes numbers. RFC 8785 JSON Canonicalization Scheme (JCS) and SHA-256 bind calculation results to a verifiable fingerprint. The hash does not compute—it detects changes between calculation, human authorization, and execution. If the result no longer matches the fingerprint, the workflow halts.
4. **Testing Payment Boundaries Against Failure**: Single-use CAS leases prevent duplicate payments under concurrent races. Formal TLA+ modeling with the TLC Model Checker explored all 361 reachable states in our configured distributed model with 0 invariant violations and caught 4 injected defects. Edge execution runs on Cloudflare Workers V8 isolates with zero-discrepancy double-entry ledger writebacks.

### Seven-Stage End-to-End AP Governance Lifecycle

```
Stage 1: Invoice Ingestion (IRP QR / PDF)
    ↓
Stage 2: OKF Rule Resolution (Sub-1ms Local Offline Lookup)
    ↓
Stage 3: Deterministic Statutory Computation (Excess Math & GST Unbundling)
    ↓
Stage 4: Cryptographic Payment Authorization Lease (Single-Use Atomic CAS Gate)
    ↓
Stage 5: Human-in-the-Loop Authority Harness (CFO Biometric Passkey / Mobile)
    ↓
Stage 6: Bank Rail Settlement (Host-to-Host Corporate RTGS)
    ↓
Stage 7: General Ledger Balanced Double-Entry Writeback (ERP Equilibrium: ₹0.00 Discrepancy)
```

Run this audited 7-stage AP simulation directly in your local terminal:
```bash
npm run example:trace
```

---

## Statutory Authority & Epistemic Boundary

- **Primary Legislation & Official Circulars**: Statutory texts, executive circulars, notifications, and compliance forms in this repository are structured transpositions of official publications issued by the Ministry of Finance (CBDT/CBIC), Ministry of MSME, Ministry of Corporate Affairs (MCA), and the US Internal Revenue Service (IRS). Official government source material remains the sole statutory authority.
- **Open Knowledge Format (OKF v0.2) & Companion Model**: This repository implements Google's Open Knowledge Format (OKF v0.2) for portable knowledge publication (Markdown circulars, YAML frontmatter, trust anchors, and `okf.publication.json`). It extends the format with the **MudraForge Statutory Schema Extension** (`section.json`, `forms/*.json`) to capture strict transactional threshold parameters, tax rate determinants, and dual-act mappings needed by accounting software and autonomous agents.
- **Deterministic Runtime Separation**: Mathematical execution (cumulative threshold deductions, multi-interval monthly compound interest, double-entry ledger writebacks, and single-use payment leases) is evaluated independently by the MudraForge Adesha Governance Engine on Cloudflare Anycast Edge. Reference metadata published in this package does not constitute formal legal counsel or statutory audit certification.

---

## Project Identity, Audience & Non-Goals

### Purpose & Intended Audience
`@mudraforge/statutory` publishes an open, machine-readable statutory knowledge substrate for software engineers building financial AI agents (Antigravity, Cursor, Claude Code, Copilot), ERP integration teams (Tally, SAP, Zoho Books, NetSuite), Chartered Accountants, and compliance automation engineers.

### What OKF Compatibility Means
Provisions in this repository adhere to the **Open Knowledge Format (OKF v0.2)** specification:
- **Declarative Knowledge**: Legal rules are structured into clean, machine-readable JSON (`section.json`), official administrative circulars with YAML frontmatter (`.md`), and compliance return schemas.
- **Companion Extension**: While Google's OKF v0.2 standardizes Markdown-based knowledge with YAML frontmatter, MudraForge provides a companion data model (`section.json`) to express transactional tax thresholds, rate structures, and dual-act cross-compilation maps.
- **Temporal State Machines**: Strict `validFrom`, `validTo`, and `annualReset` boundaries preventing retrospective hallucination and catching legislative sunsets (e.g. Section 206C(1H) sunset on 1 April 2025).
- **Trust Anchors**: Every provision binds to authoritative primary sources: the Gazette of India, CBDT/CBIC executive circulars, or Ministry notifications (`incometax.gov.in`, `cbic-gst.gov.in`, `msme.gov.in`, `irs.gov.in`).
- **Cryptographic Provenance**: Bundled files are verifiable against a deterministic SHA-256 Merkle root hash.

### Explicit Non-Goals
1. **Not Legal or Tax Advice**: This package structures public legal instruments into machine-readable data. It does not provide formal legal counsel, tax opinions, or statutory audit certification.
2. **Not a Universal Legal Library**: Unlike broad legal repositories (*IndiaCode*, *Open India Law*), this project does not compile general civil, criminal, or constitutional case law. It focuses strictly on **transactional finance, direct/indirect taxation, and commercial AP compliance**.
3. **Not an ERP or Payment Rail**: This package provides declarative ground truth to AI agents and software pipelines; it does not store accounting ledgers, move money, or replace enterprise ERPs.

---

## Published Inventory Metrics

The repository currently publishes a verified starter seed across five regulatory domains, accompanied by official executive guidance and compliance schemas:

- **5 Foundational Regulatory Domains**: Direct Tax (TDS/TCS), Indirect Tax (GST), MSME & Working Capital, International Tax, Corporate M&A & Restructuring.
- **7 Indexed Core Provisions**: Section 194Q, Section 194J, Section 206C(1H) sunset, CGST Section 17(5), MSMED Act Sections 15 & 16, US Internal Revenue Code §§ 901 & 904, Section 50B (Slump Sale & Successor Liability).
- **8 Official Executive Circulars & Memoranda**: CBDT Circular 13/2021, CBDT Circular 23/2017, CBDT Circular 03/2020, Finance Act 2025 Sunset Memorandum, CBIC Circular 172/04/2022-GST, Ministry of MSME OM 1/4(1)/2021-P&G/Policy, CBDT Notification 68/2021 (Rule 11UAE FMV), CBIC Notification 12/2017 Entry 2 (0% GST going concern).
- **10 Compliance Form Schemas & Verification Checklists**: Form 26Q quarterly TDS return, Form 16A certificate, GSTR-2B Table 4(B) ineligible ITC reconciliation, UDYAM portal registration verification, Companies Act Schedule III corporate balance sheet notes, Form 67 (Rule 128), US IRS Schedule K-3, Form 3CEA CA slump sale report schema, Section 281 & Section 313 M&A tax due diligence checklist, and Vendor PAN / Section 206AB declarations.
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

## System Origin & Validation Baseline

`@mudraforge/statutory` publishes the declarative statutory rules, executive circulars, and return schemas developed internally at MudraForge to feed its autonomous finance engine (Adesha). 

It is currently released as a **Public Beta**. The bundled schemas and temporal state machines have been verified internally against synthetic mutation suites, historical enterprise AP audit samples, and Chartered Accountant peer reviews before publication. It has not yet been subjected to third-party high-volume client production workloads, which is why we invite independent evaluation, verification, and community contributions.

---

## Legal Domains Currently Covered

> **Full 11-Domain Roadmap & Lifecycle Matrix**:  
> For the complete architectural matrix comparing the 4 starter domains against the full 11-domain sovereign roadmap (including Indian Accounting Standards [Ind AS], MCA Corporate Governance, and SEBI LODR), see [`docs/DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md`](./docs/DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md).

The OKF substrate currently indexes and enforces ground truth across five major regulatory domains:

### 1. Direct Tax (Income Tax & TDS/TCS)
- **Section 194Q**: 0.1% TDS on purchase of goods exceeding ₹50 Lakhs cumulative annual threshold (calculating strictly on the excess).
- **Section 206C(1H)**: TCS on sale of goods, with automated temporal interception of its **1 April 2025 sunset** under the Finance Act, 2025.
- **Section 194J**: Fees for Technical Services (2% FTS) vs. Professional Fees (10%), enforcing standard 20% non-PAN penalty rate under Section 206AA(1)(iii) / Section 397(2)(a).
- **Dual-Act Forward Mapping**: Complete cross-compilation bridge from the legacy *Income-tax Act, 1961* to the *Income-tax Act, 2025* (which took effect 1 April 2026), mapping historical provisions seamlessly (e.g., Section 194Q $\rightarrow$ Section 393(1), Table 8, Item (ii)).

### 2. Indirect Tax (Goods & Services Tax - GST)
- **CGST Section 17(5)**: Comprehensive statutory negative list for Blocked Input Tax Credit (ITC)—including motor vehicles, catering, employee benefits, and the statutory employer obligation proviso under CBIC Circular 172/04/2022-GST.

### 3. Micro, Small & Medium Enterprises (MSME & Section 43B(h))
- **MSMED Act, 2006 (Sections 15 & 16)**: Strict statutory payment clock (15 days without agreement, max 45 days with written agreement) and non-negotiable compound penal interest at **3 times the RBI Bank Rate** (compounded monthly).
- **Trader Exclusion Rule**: Automated enforcement of Ministry of MSME OM No. 1/4(1)/2021-P&G/Policy, strictly excluding wholesale and retail traders (NIC 45, 46, 47) from delayed payment protections and Section 43B(h) addbacks.
- **Balance Sheet Disclosures**: Companies Act, 2013 Schedule III compliance reporting format for unpaid MSME supplier principal and interest.

### 4. Cross-Border & International Tax
- **US Internal Revenue Code (IRC §§ 901 & 904)**: Foreign Tax Credit (FTC) limitation baskets (General Category vs. Passive Category), Pass-Through Entity (PTE) tax pass-throughs, and Schedule K-3 dual-reporting compliance for Indo-US cross-border ventures.
- **Indian Rule 128 (Form 67)**: Statement of foreign tax credit compliance schema and filing deadlines.

### 5. Corporate M&A & Restructuring
- **Section 50B (Slump Sale)**: Capital gains computation on slump sale of undertakings based on Written Down Value (WDV) net worth under Section 43(6), Form 3CEA CA certification schema, and Section 281/313 tax clearance due diligence checklists.

---

## Architectural Boundaries: Open Substrate vs. Hosted Edge vs. Adesha Platform

To ensure clarity for developers, CAs, and prospective enterprise clients, the capabilities across the three operational tiers are explicitly delineated below:

| Capability / Layer | Tier 1: Open Substrate (This NPM Package) | Tier 2: Hosted Edge API (Cloudflare Anycast) | Tier 3: Commercial Adesha Runtime (Enterprise Platform) |
| :--- | :--- | :--- | :--- |
| **Pricing & License** | **100% Free** (MIT Code / CC BY 4.0 Data) | **Best-Effort Free Beta** (Transitions to Paid) | **Commercial Enterprise SaaS** |
| **Execution Location** | 100% Local Filesystem (0 Network Calls) | Cloudflare Edge (Global 300+ PoPs, typical 20–80ms Anycast latency) | Private Enterprise VPC / On-Premise Worker |
| **Statutory Knowledge** | Bundled 4-Domain Starter Seed (6 Core Sections) | 4 Active Domains (11-Domain Roadmap Catalog in expansion) | Full 11-Domain Sovereign Catalog + Custom Private Contracts |
| **Lookup Engine** | Exact code, alias & folder path resolution | System-1 Semantic Intent & Rule Discovery | Multi-tenant RAG & Context Assembler |
| **Temporal Status** | Offline deterministic evaluation (`computeTemporalStatus`) | Live temporal state machine resolution | In-flight temporal locks across transaction lifecycle |
| **Deterministic Calculators**| *Not included* (declarative schemas only) | Hosted calculation endpoint (`POST /calculate`) | Full arithmetic engine with ₹50L excess & 3x RBI interest |
| **Payment Authorization** | *Not included* | *Not included* | **Single-Use Cryptographic Payment Leases (TLA+ verified)** |
| **Banking Execution** | *Not included* | *Not included* | **Host-to-Host Bank Rails (RazorpayX / ICICI / HDFC)** |
| **ERP Writebacks** | *Not included* | *Not included* | **Balanced double-entry journal writebacks (SAP / Zoho)** |
| **How to Access** | `npm install @mudraforge/statutory` | `npx @mudraforge/statutory sync` | Contact: `hello@mudraforge.in` |

> **Operational Distinction**: This open-source repository provides the **declarative knowledge foundation**. It does not perform live banking transfers, hold funds, or mutate corporate ERP databases. Those consequential actions are strictly isolated within the **MudraForge Adesha Enterprise Governance Engine** (see [`docs/ENTERPRISE_GOVERNANCE.md`](./docs/ENTERPRISE_GOVERNANCE.md)).

---

## Free OKF Sync and Maintenance Policy

The MudraForge Statutory project publishes an open, locally usable statutory knowledge package under the MIT License. The hosted free sync service (`npx @mudraforge/statutory sync`) is provided on a best-effort basis and is not a guarantee of perpetual availability, comprehensive statutory coverage, or continuous updates.

- **Maintainer Capacity & Best-Effort Updates**: Future updates to the hosted free dataset depend on maintainer capacity, community contributions, infrastructure costs, and project priorities. The free sync service may have limited coverage, delayed updates, or periods without new releases.
- **Snapshot Provenance & User Responsibility**: Each published bundle explicitly identifies its release version, source provenance, and applicable verification or effective-date information. Users and AI agents are responsible for checking whether a statutory snapshot is current and suitable for their intended use.
- **Perpetual Local Freedom**: Users may continue to use, inspect, fork, and maintain previously released files subject to the MIT license.
- **Separation of Services**: Additional hosted services, expanded domain suites (covering all 11 enterprise domains), and maintained deterministic calculation engines are offered separately under commercial subscriptions.

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
├── international_tax/
│   └── foreign_tax_credit_irc_901_904/
│       ├── section.json                               # US Foreign Tax Credit limitation baskets
│       └── forms/
│           ├── form_67_statement_of_foreign_tax.json  # Indian Income Tax Form 67 (Rule 128)
│           └── irs_schedule_k3_reporting.json         # US IRS Schedule K-3 dual-reporting schema
│
└── corporate_ma_restructuring/
    └── slump_sale_50b/
        ├── section.json                               # Section 50B slump sale & net worth rules
        ├── circulars/
        │   ├── cbdt_notification_68_2021_rule_11uae_fmv.md # Rule 11UAE Fair Market Value formula
        │   └── cbic_notification_12_2017_going_concern_exemption.md # 0% GST going concern exemption
        └── forms/
            ├── form_3cea_chartered_accountant_report.json # Form 3CEA CA slump sale report schema
            └── section_281_tax_clearance_checklist.md # Section 281 & 313 due diligence checklist
```

Because the folder hierarchy separates legal domains and provisions cleanly, an AI agent browsing the folder can identify the applicable statute, circular, or compliance form at **0 token cost**.

---

## Canonical Edge Synchronization (Full Statutory Universe)

The package bundles an initial curated baseline snapshot across all four domains. **To pull the complete, continually expanding statutory catalog from the Cloudflare Anycast edge API into your local workspace:**

```bash
# Step 1: Check if newer statutes, circulars, or gazette amendments exist on the edge
npx @mudraforge/statutory check-update

# Step 2: Synchronize the complete statutory bundle directly to your local ./okf/ directory
npx @mudraforge/statutory sync

# Step 3: Browse your full local statutory library interactively
npx @mudraforge/statutory browse
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
npx @mudraforge/statutory init-skill
```

### 3. Direct Programmatic Traversal (Zero Dependencies, Offline-First)
```javascript
import { lookupLocalStatute, isStatuteActive } from '@mudraforge/statutory';

// 1. Look up Section 194Q from local disk (0 network calls, direct filesystem read)
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
console.log(result.taxAmount);   // ₹7,000 (0.1% TDS on taxable base)
```

### Enterprise Edge API Endpoints & Quotas

| Endpoint | Method | Auth Required | Quota Limit | Response |
|---|---|---|---|---|
| `/api/v1/statutory/sections` | `GET` | No | 180 req/min | JSON array of indexed OKF sections |
| `/api/v1/statutory/lookup` | `GET` | No | 180 req/min | Parametric section details & temporal validity |
| `/api/v1/statutory/laws/:code` | `GET` | No | 180 req/min | Direct path statutory section lookup |
| `/api/v1/statutory/manifest.json` | `GET` | No | 180 req/min | Latest OKF release manifest & rootHash |
| `/api/v1/statutory/bundle.json` | `GET` | No | 180 req/min | Full versioned statutory bundle (ETag 304 supported) |
| `/api/v1/statutory/calculate` | `POST` | **Yes** (Bearer) | 45 req/min | Deterministic statutory deduction result |

### Error Semantics & Response Codes

All error responses from `@mudraforge/statutory` and the hosted edge API return structured JSON:

```json
{
  "status": "ERROR",
  "error": "API_KEY_REQUIRED",
  "message": "Deterministic calculation engines require an Enterprise API key.",
  "contact": "hello@mudraforge.in"
}
```

| HTTP Status | Error Code | Description / Remedy |
|---|---|---|
| `400 Bad Request` | `INVALID_AMOUNT` | Numerical value is negative, NaN, or exceeds `Number.MAX_SAFE_INTEGER`. |
| `400 Bad Request` | `INVALID_DATE_FORMAT` | Date string does not match ISO 8601 `YYYY-MM-DD` format. |
| `400 Bad Request` | `QUERY_TOO_LONG` | Section search query exceeds 64-character security ceiling. |
| `401 / 403 Forbidden` | `API_KEY_REQUIRED` / `INVALID_API_KEY` | Missing or invalid Enterprise API key. Contact `hello@mudraforge.in`. |
| `404 Not Found` | `SECTION_NOT_FOUND` | Queried section does not exist in the indexed statutory corpus. |
| `405 Method Not Allowed` | `METHOD_NOT_ALLOWED` | Non-GET request sent to read-only commons endpoints. |
| `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | JSON request body on `/calculate` exceeds 64KB security threshold. |
| `415 Unsupported Media` | `UNSUPPORTED_MEDIA_TYPE` | Non-JSON payload sent to calculation engine. Set `Content-Type: application/json`. |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Request quota breached. Check `Retry-After` header before retrying. |

---

## Developer Tooling & Verification Gates

The repository enforces fail-closed automated verification for schemas, temporal rules, and cryptographic digests:

```bash
# 1. Run full 36-suite multi-domain regression test
npm test

# 2. Validate all OKF schemas, circular YAML frontmatter, and return forms
npm run validate

# 3. Verify cryptographic SHA-256 Merkle root integrity
npm run manifest:check

# 4. Deterministically rebuild CATALOG.md from the statutory corpus
npm run catalog
```

---

## A Note from the Maintainer

Hi, I am Mondeep Engti, the founder of MudraForge and the current maintainer of `@mudraforge/statutory`.

I am building this project because I believe that statutory compliance knowledge—the rules that govern commercial trade, taxation, MSME working capital, and enterprise accountability—should not be locked inside expensive proprietary silos or hallucinated by ungrounded black-box AI models. It should be open, machine-readable, and mathematically verifiable by anyone.

This repository is part of a deliberate two-tier architecture:
1. **The Public Commons (`@mudraforge/statutory`)**: Provides declarative, zero-dependency statutory ground truth under Google's Open Knowledge Format (OKF v0.2) with cryptographic Merkle verification. It is 100% free, inspectable, and locally usable for developers, researchers, and Chartered Accountants.
2. **The Commercial Platform (Adesha)**: Builds on top of this foundation to deliver an autonomous enterprise finance runtime—providing deterministic calculation engines, two-way ERP reconciliation, and single-use cryptographic payment leases governed by human authorization.

**This project is currently maintained by a solo founder.** That means development velocity, review capacity, and update cadences have real limits. The hosted edge sync is provided on a best-effort basis, while the bundled local package is guaranteed to remain fully functional offline indefinitely.

I open-sourced this layer because critical financial infrastructure benefits from public inspection, adversarial testing, and community contributions. Whether you are an engineer building financial AI agents, a Chartered Accountant auditing tax withholding, or a compliance practitioner, your feedback, pull requests, and bug reports are genuinely welcome.

If you are working on autonomous financial systems or want to discuss the roadmap, you can reach me directly at **mondeepe@gmail.com** or **hello@mudraforge.in**.

— Mondeep Engti, Founder & Maintainer

---

## Institutional Documentation & Architecture

All deep-dive architectural specifications, governance boundaries, quality reports, and catalogs are organized in the [`docs/`](./docs/) directory:

- **[Statutory Knowledge Catalog](./docs/CATALOG.md)**: Full table of all indexed provisions, key thresholds, and return schemas.
- **[Domain Breadth & Depth Comparison](./docs/DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md)**: 4-domain starter commons vs. 11-domain edge roadmap.
- **[Architecture Decisions (ADRs)](./docs/ARCHITECTURE_DECISIONS.md)**: Formal architecture decision records (ADR-0001 through ADR-0006).
- **[Architecture Specification](./docs/ARCHITECTURE.md)**: Master specification of the Adesha Sovereign Runtime & Statutory Engine.
- **[Corpus Quality Card](./docs/CORPUS_QUALITY.md)**: Machine-verified citation health, temporal bounds, and dual-act coverage.
- **[Enterprise Governance Boundary](./docs/ENTERPRISE_GOVERNANCE.md)**: Operational firewall between open knowledge and governed execution.
- **[Adesha Assurance Overview](./docs/ADESHA_ASSURANCE_OVERVIEW.md)**: Formal TLA+ specifications and mutation testing defenses.
- **[Verification Specification](./docs/VERIFICATION.md)**: Multi-domain test harness and conformance criteria.
- **[Data Licensing & Attribution Policy](./docs/DATA_LICENSING.md)**: Tripartite legal licensing boundary (MIT code, CC BY 4.0 structured schemas, public domain statutes).

### Community & Contribution Standards
- **[Contributor Protocol](./CONTRIBUTING.md)**: Authoring standards for `section.json`, executive circulars, and CA empanelment.
- **[Security & Statutory Integrity Policy](./SECURITY.md)**: Protocol for reporting code flaws and gazetted statutory amendments.
- **[Changelog](./CHANGELOG.md)**: Complete record of versioned releases, breaking changes, and migrations.

---

## License

- **Software Code & Tools**: Licensed under the **[MIT License](./LICENSE)**.
- **Derived OKF Schemas & Curated Summaries**: Licensed under the **[Creative Commons Attribution 4.0 International (CC BY 4.0)](./docs/DATA_LICENSING.md)**.
- **Primary Government Gazettes & Statutory Instruments**: Sourced under official public-domain and open government data terms (Republic of India Copyright Act, 1957 Section 52(1)(q) / US Code Title 17 Section 105). See **[DATA_LICENSING.md](./docs/DATA_LICENSING.md)** for details.
