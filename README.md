# @mudraforge/statutory

> **Open Knowledge Format (OKF) — Authoritative Indian & Cross-Border Statutory Substrate**  
> *Zero dependencies. Offline-capable local filesystem. Free public commons for humans and AI agents.*

[![npm version](https://img.shields.io/npm/v/@mudraforge/statutory.svg)](https://www.npmjs.com/package/@mudraforge/statutory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edge Network](https://img.shields.io/badge/Edge-Cloudflare%20Global%20Anycast-orange.svg)](https://api.mudraforge.in/api/v1/statutory/docs)
[![Status: Public Beta](https://img.shields.io/badge/Status-Public%20Beta-amber.svg)](https://mudraforge.in)

> **Public Beta Notice**: This release is currently in **Public Beta**.
> - **Free Local OKF & Live Updates (During Beta)**: The core statutory reference filesystem (`./okf/`), CLI browser, AI agent skills, and live edge updating commands (`check-update`, `sync`) are **100% free to use** for developers, open-source contributors, and early adopters while the Public Beta lasts. No API key is required to check for and sync the latest statutory updates during beta.
> - **Why Constant Versioning Updates Will Move to Paid (Sustainability)**: Tax law is a living, continuously changing system—annual Union Budgets/Finance Acts, CBDT/CBIC circulars, gazette notifications, and appellate court decisions alter withholding rates and thresholds year-round. Continuously tracking official gazettes, validating statutory logic with Chartered Accountants, maintaining formal test models, and deploying global edge updates requires ongoing legal engineering and infrastructure. To make this maintenance sustainable long-term without compromising data integrity, live automated versioning updates will transition to the paid tier after the beta concludes, while your downloaded local OKF snapshot remains free under MIT license forever.
> - **Paid Cloud API & Reasoning Engine**: If you need deterministic calculator engines, System-1 neural search, reasoning capabilities, and Analysis Mode outputs, **an Enterprise API key is required**. 
> - **How to Get an Enterprise API Key**: Direct contact is required. Email us at **`hello@mudraforge.in`** or **`support@mudraforge.in`**.

---

## What is This?

`@mudraforge/statutory` provides an authoritative, versioned knowledge substrate for Indian and cross-border statutory tax law under the **Open Knowledge Format (OKF)**.

This package delivers:
1. **Self-Documenting OKF Filesystem**: A clean directory of statutory provisions (`./okf/sections/`) where every file combines the **Section Code + Plain-Text Explanation** for instant, zero-token filesystem discovery by AI agents.
2. **Autonomous Agent Self-Updates**: Agents can check if laws have changed (`check-update`) and sync new releases (`sync`) automatically.
3. **Interactive Terminal Browser**: Browse and inspect laws directly in your shell (`browse`).
4. **Cloud Anycast Edge API**: Sub-10ms global endpoints on Cloudflare edge.

---

## 🎯 Why Does This Exist? (Reliable Knowledge Vault vs. Messy Web Searches)

When AI agents and developer applications (Cursor, Claude, Copilot, Antigravity, or custom enterprise accounting bots) need to evaluate Indian or cross-border tax compliance, they currently face two unacceptable choices:

1. **Frozen, Outdated LLM Weights**: Foundation models hallucinate rates, quote sections that were repealed years ago, or invert buyer and seller obligations (e.g., continuing to enforce Section 206C(1H) after its 1 April 2025 sunset).
2. **Messy Autonomous Web Searches (Web RAG)**: When agents search the web for tax provisions, they ingest unstructured, conflicting results: SEO-farming blogs from 2018, outdated forum discussions, marketing blurbs from accounting software vendors, and unverified summaries that miss crucial legislative provisos (such as CBDT Circular 13/2021 unbundling GST from TDS, or MSME OM 2021 trader exclusions). This wastes thousands of tokens per query, introduces 3–5 seconds of latency, and feeds noisy, contradictory context into the prompt.

`@mudraforge/statutory` solves this by giving AI agents an **unambiguous, structured, offline-capable statutory knowledge vault** under Google's Open Knowledge Format (OKF). One versioned, clean local directory where every law is already structured with exact section codes, operative dates, sunset boundaries, citations, thresholds, and audit checklists. Zero network overhead, zero token waste, and 100% deterministic ground truth.

---

## ⚖️ Why Having the Law Isn't Enough: The Separation of Law & Computation

A fundamental lesson in financial AI: **Giving an LLM the exact statutory text does NOT guarantee the AI will interpret or compute it correctly.**

Language models are stochastic token sequence predictors, not deterministic arithmetic engines. When an LLM is given Section 194Q in its prompt ("deduct 0.1% on purchase of goods exceeding ₹50 Lakhs"):
- It routinely computes 0.1% on the entire invoice amount rather than the incremental excess over ₹50L.
- It fails to calculate compound penal interest at 3x the RBI Bank Rate (compounded monthly) under MSMED Act Sections 15 & 16.
- When told "you made a calculation mistake", the model suffers from the **Epistemic Gap**—confidently and eloquently defending an erroneous number ("Agreement Is Not Truth").

**This is why the Paid Enterprise Tier includes the Cloudflare Edge Deterministic Calculation Engine**:
- **The Free OKF Commons** provides the open, verified knowledge representation (the statutory ground truth).
- **The Paid Cloud Engine** provides the **hardcoded, formally verified arithmetic calculator engines**, System-1 neural semantic search, and multi-step legal reasoning on Cloudflare Anycast edge. You never delegate statutory mathematics to an LLM.

---

## 🐕 Built & Dogfooded by MudraForge (Applied AI Vendor)

`@mudraforge/statutory` is not a synthetic academic prototype or an ungrounded API wrapper. It is the exact, production-proven legal oracle subsystem that **MudraForge actively uses and dogfoods internally** as an applied AI enterprise vendor to govern its autonomous financial operating platform (Adesha). 

Every statute, threshold check, and temporal boundary in this repository is battle-tested in our own production accounts payable pipelines before being released to the public commons.

---

## Legal Domains Currently Covered

> 📊 **Full 11-Domain Roadmap & Lifecycle Matrix**:  
> For the complete architectural matrix comparing the 4 starter domains against the full 11-domain sovereign roadmap (including Indian Accounting Standards [Ind AS], MCA Corporate Governance, and SEBI LODR), see [`DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md`](./DOMAIN_BREADTH_AND_DEPTH_COMPARISON.md).

The OKF substrate currently indexes and enforces ground truth across four major regulatory domains:

### 1. Direct Tax (Income Tax & TDS/TCS)
- **Section 194Q**: 0.1% TDS on purchase of goods exceeding ₹50 Lakhs cumulative annual threshold (calculating strictly on the excess).
- **Section 206C(1H)**: TCS on sale of goods, with automated temporal interception of its **1 April 2025 sunset** under the Finance Act, 2025.
- **Section 194J**: Fees for Technical Services (2% FTS) vs. Professional Fees (10%), handling 5% non-PAN penalty rates.
- **Dual-Act Forward Mapping**: Complete cross-compilation matrix from the *Income-tax Act, 1961* to the upcoming *Income-tax Act, 2025* (taking effect 1 April 2026), mapping sections seamlessly (e.g., Section 194Q → Section 393(1), Table 8, Item (ii)).

### 2. Indirect Tax (Goods & Services Tax - GST)
- **CGST Section 17(5)**: Comprehensive statutory negative list for Blocked Input Tax Credit (ITC)—including motor vehicles, corporate food & beverages, personal consumption, club memberships, and statutory exceptions/provisos.

### 3. Micro, Small & Medium Enterprises (MSME & Section 43B(h))
- **MSMED Act, 2006 (Sections 15 & 16)**: Strict statutory payment clock (15 days without agreement, max 45 days with written agreement) and non-negotiable compound penal interest at **3 times the RBI Bank Rate** (compounded monthly).
- **Trader Exclusion Rule**: Automated enforcement of Ministry of MSME OM No. 2/1(5)/2021-P&G/Policy, strictly excluding wholesale and retail traders (NIC 45, 46, 47) from delayed payment protection.
- **Income Tax Linkage**: Cross-statutory disallowance rules under Section 43B(h) for overdue payments.

### 4. Cross-Border & US-India International Tax
- **US Internal Revenue Code (IRC §§ 901 & 904)**: Foreign Tax Credit (FTC) limitation baskets (General Category vs. Passive Category), Pass-Through Entity (PTE) tax pass-throughs, and Schedule K-3 dual-reporting compliance for Indo-US cross-border ventures.

---

## Free Local OKF vs. Paid Cloud Enterprise Tier

We deliberately separate **reference knowledge** from **deep mathematical execution & neural reasoning**:

| Capability / Feature | Free Local OKF (NPM / Substrate) | Paid Cloud Enterprise API (`hello@mudraforge.in`) |
| :--- | :--- | :--- |
| **Pricing** | **100% Free** (Open Source / Public Beta) | **Paid Enterprise Subscription** (Direct Contact) |
| **Live OKF Updates (`sync`)** | **Included Free during Beta** (transitions to Paid post-beta for ongoing sustainability) | **Continuous Verified Versioning & Real-Time Sync** |
| **Data Privacy & Latency** | 100% Offline, 0 network calls, sub-1ms | Global Cloudflare Anycast edge (sub-10ms) |
| **Search Engine** | Exact keyword, section code & alias lookup | **System-1 Neural Semantic Discovery Model** (finds relevant laws from messy transaction queries) |
| **Reasoning Capabilities** | None (Static reference data only) | **Multi-Step Statutory Reasoning Engine** (evaluates facts, composite supplies, M&A restructuring, and cross-border remittances) |
| **Output Modes** | Raw statutory JSON & thresholds | **Analysis Mode**: Detailed legal rationale, disallowance risk warnings, and balanced double-entry journal vouchers |
| **Deterministic Calculators** | ❌ *Not bundled in package* (prevents reverse-engineering) | **✅ Full Execution Engine**: Cumulative ₹50L excess math (§194Q), MSMED 3x RBI compound interest, 194J 2% vs 10% |
| **Government Portal Attestation** | ❌ Not available | **✅ Out-of-Band Attestation**: TRACES certificates, UDYAM portal registration, GSTIN verification |
| **How to Obtain Access** | Run `npm install @mudraforge/statutory` | **Email `hello@mudraforge.in` or `support@mudraforge.in`** |

> **Important Scope Boundary**: The Paid Cloud Enterprise API provides deterministic statutory calculation, neural discovery search, and legal analysis. It does **not** disburse funds, issue payment leases, or perform direct ERP database mutations. Autonomous money movement and general ledger writebacks are governed separately by the **MudraForge Adesha Enterprise Platform** (see [ENTERPRISE_GOVERNANCE.md](./ENTERPRISE_GOVERNANCE.md)).

### 💡 Why Live Updates Are Free in Beta & Transition to Paid Post-Beta

1. **Free Updates While Beta Lasts**:
   During the Public Beta, calling `npx @mudraforge/statutory check-update` or `npx @mudraforge/statutory sync` connects to our Cloudflare Anycast edge without an API key. You can pull the latest amendments, notifications, and new section definitions directly into your workspace for free.

2. **The Long-Term Economic Rationale (Sustainability)**:
   Statutory compliance is not static code. Tax law is active, moving policy:
   - **Union Budgets & Finance Acts**: Alter rates, amend thresholds, sunset older sections (e.g. §206C(1H) on 1 April 2025), or replace entire codes (e.g. the new *Income-tax Act, 2025* arriving 1 April 2026).
   - **CBDT & CBIC Circulars**: Clarify ambiguous edge cases, such as unbundling GST from TDS, deducting on invoice vs. payment, and issuing trade clarifications.
   - **Appellate Precedents**: ITAT, High Court, and Supreme Court rulings continuously establish new legal tests.

   Tracking the official Union Gazette daily, structuring and validating new legal JSON schemas with Chartered Accountants, running formal TLA+ verification checks, and maintaining low-latency edge distribution incurs real, recurring operational and engineering costs. 

   **To ensure that this statutory oracle remains actively maintained, audited, and strictly accurate for years to come without degradation**, live continuous versioning updates will transition to our paid Enterprise tier after the beta concludes.

3. **Perpetual MIT License Guarantee**:
   The local OKF bundle you install or clone remains **100% free under the MIT license forever**. You are never locked out of your existing files, and you may fork, modify, or extend them for offline operations at zero cost. Only the automated, continuously maintained edge update stream transitions to the paid subscription model.

---

## Structured OKF Domain Hierarchy (Zero-Token Discovery)

Rules are organized into **four foundational regulatory domains**, complete with official circulars, statutory notifications, and compliance form schemas:

```
okf/
├── manifest.json                                      # Integrity root hash & domain manifest
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

Because the folder hierarchy separates legal domains and provisions cleanly, an AI agent (Antigravity, Cursor, Claude Code) browsing the folder can identify the applicable statute, circular, or compliance form at **0 token cost**.

---

## 📥 How to Pull the Full Statutory Universe (Edge Sync)

The package bundles an initial curated baseline snapshot across all four domains. **To pull the complete, continually expanding statutory catalog from the Cloudflare Anycast edge API into your local workspace:**

```bash
# Step 1: Check if newer statutes, circulars, or gazette amendments exist
npx mudraforge-statutory check-update

# Step 2: Synchronize the complete statutory bundle directly to your local ./okf/ directory
npx mudraforge-statutory sync

# Step 3: Browse your full local statutory library interactively
npx mudraforge-statutory browse
```

> 💡 **Public Beta Benefit**: While the Public Beta lasts, edge synchronization (`check-update` and `sync`) is **100% free and unauthenticated**. No API key is required to download and keep your local statutory knowledge files up to date.

## Quick Start (Free Tier)

### 1. Install via npm
```bash
npm install @mudraforge/statutory
```

### 2. Install AI Agent Skill
Installs `SKILL.md` into your project's `.agents/skills/` directory so agents know how to navigate the law:
```bash
npx mudraforge-statutory init-skill
```

### 3. Query Directly in Code (Zero Dependencies, Offline-First)
```javascript
import { lookupLocalStatute, isStatuteActive } from '@mudraforge/statutory';

// 1. Look up Section 194Q from local disk (sub-1ms, 0 network calls)
const statute = lookupLocalStatute('194Q');
console.log(statute.title);
console.log(statute.keyStatutoryThresholds.taxableBaseScope);
// => "Tax is deductible strictly on the excess over ₹50 Lakhs, NOT on the aggregate gross turnover."

// 2. Check temporal status (detecting sunsets)
const isActive2024 = await isStatuteActive('206C(1H)', '2024-05-01'); // true
const isActive2025 = await isStatuteActive('206C(1H)', '2025-06-01'); // false (sunset omitted by Finance Act, 2025)
```

---

## Enterprise Tier (Paid Cloud Execution & Analysis Mode)

To use the **System-1 reasoning search**, **Analysis Mode output**, and **Deterministic Calculator Engines**, initialize `StatutoryClient` with your Enterprise API key:

```javascript
import { StatutoryClient } from '@mudraforge/statutory';

const client = new StatutoryClient({
    tier: 'ENTERPRISE_PAID',
    apiKey: process.env.MUDRA_STATUTORY_API_KEY // Obtain via hello@mudraforge.in
});

// Execute calculation via Cloudflare Edge Engine (not stored in local package)
const result = await client.calculate({
    section: '194Q',
    invoiceAmount: 8000000,       // ₹80 Lakhs
    priorFyPurchases: 4000000,    // ₹40 Lakhs already purchased this FY
    hasPan: true
});

console.log(result.taxableBase); // ₹70,00,000 (Calculates strictly on excess over ₹50L)
console.log(result.tdsAmount);   // ₹7,000 (0.1% TDS)
console.log(result.netPayable);  // ₹79,93,000
```

If you call `calculate()` without an Enterprise API key, the package throws:
```
Error: [@mudraforge/statutory] Deterministic calculation engines require an Enterprise API key.
Direct contact is required: email hello@mudraforge.in or support@mudraforge.in to request access.
```

---

## CLI Commands

```bash
# Browse laws interactively in terminal
npx mudraforge-statutory browse

# Look up a specific section
npx mudraforge-statutory lookup 194Q

# Check temporal status on a specific date (e.g. sunset check)
npx mudraforge-statutory lookup 206C(1H) 2025-06-01

# Check if newer legal releases exist on Cloudflare edge
npx mudraforge-statutory check-update

# Sync local files with latest edge bundle
npx mudraforge-statutory sync

# List all indexed sections
npx mudraforge-statutory list
```

---

## 🤝 Contributing to OKF & Calling Out Legal Overlooks

Statutory law is alive, nuanced, and constantly shaped by new CBDT/CBIC circulars, court rulings, ITAT orders, and annual Finance Acts. 

**If you spot:**
- A statutory oversight or omitted notification
- An ambiguous circular interpretation or missing legal proviso
- An edge-case threshold interaction (e.g., GST component exclusion vs TDS turnover limits)
- A section or domain you want indexed into the OKF commons

**Please call it out or contribute!** We treat statutory ground truth as an open, collective effort for the entire developer and accounting ecosystem. You can contribute or report issues anywhere you can reach us:

- **GitHub Issues & PRs**: Open an [Issue](https://github.com/mondeep0123/mudraforge-statutory/issues) or submit a Pull Request right here on this repository.
- **Engineering Email**: [hello@mudraforge.in](mailto:hello@mudraforge.in) or [support@mudraforge.in](mailto:support@mudraforge.in)
- **Direct Founder Contact**: Mondeep Engti at [mondeepe@gmail.com](mailto:mondeepe@gmail.com)
- **LinkedIn / Socials**: Reach out to Mondeep directly on [LinkedIn](https://linkedin.com) or Twitter/X.

---

## Documentation & Architecture Specifications

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — Architectural thesis, the Separation of Powers, Google Open Knowledge Format (OKF) implementation, and self-documenting filesystem design.
- **[`VERIFICATION.md`](./VERIFICATION.md)** — Verification and test report: TLA+ formal model, 12-mutant statutory test matrix, Two-Generals network reconciliation, and honest epistemic limitations.
- **[`ENTERPRISE_GOVERNANCE.md`](./ENTERPRISE_GOVERNANCE.md)** — The Adesha enterprise runtime: single-use payment authorization leases, atomic CAS gates, presentation locks, and ERP writeback controls.

---

## Contact & Enterprise Licensing

For enterprise pilots, custom statutory packs, System-1 reasoning models, and API keys:
- **Email**: [hello@mudraforge.in](mailto:hello@mudraforge.in) or [support@mudraforge.in](mailto:support@mudraforge.in)
- **Interactive API Docs**: [api.mudraforge.in/api/v1/statutory/docs](https://api.mudraforge.in/api/v1/statutory/docs)
- **Website**: [mudraforge.in](https://mudraforge.in)

---

## License
MIT © 2026 MudraForge Technologies.
