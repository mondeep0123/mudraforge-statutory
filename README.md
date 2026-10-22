# @mudraforge/statutory

> **Open Knowledge Format (OKF) — Authoritative Indian & Cross-Border Statutory Substrate**  
> *Zero dependencies. Offline-capable local filesystem. Free public commons for humans and AI agents.*

[![npm version](https://img.shields.io/npm/v/@mudraforge/statutory.svg)](https://www.npmjs.com/package/@mudraforge/statutory)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Edge Network](https://img.shields.io/badge/Edge-Cloudflare%20Global%20Anycast-orange.svg)](https://api.mudraforge.in/api/v1/statutory/docs)
[![Status: Public Beta](https://img.shields.io/badge/Status-Public%20Beta-amber.svg)](https://mudraforge.in)

> **Public Beta Notice**: This release is currently in **Public Beta**.
> - **Free Local OKF**: The core statutory reference filesystem (`./okf/`), CLI browser, and AI agent skills are 100% free to use for developers and early adopters.
> - **Paid Cloud API & Reasoning Engine**: If you need deterministic calculator engines, System-1 neural search, reasoning capabilities, and Analysis Mode outputs, **an Enterprise API key is required**. 
> - **How to Get an API Key**: Direct contact is required. Email us at **`hello@mudraforge.in`** or **`support@mudraforge.in`**.

---

## What is This?

`@mudraforge/statutory` provides an authoritative, versioned knowledge substrate for Indian and cross-border statutory tax law under the **Open Knowledge Format (OKF)**.

Most AI applications and enterprise accounting workflows fail because **LLMs hallucinate statutory rates and cite obsolete section numbers** (such as continuing to apply Section 206C(1H) after its sunset, or failing to anticipate the new Income-tax Act, 2025). 

This package delivers:
1. **Self-Documenting OKF Filesystem**: A clean directory of statutory provisions (`./okf/sections/`) where every file combines the **Section Code + Plain-Text Explanation** for instant, zero-token filesystem discovery by AI agents.
2. **Autonomous Agent Self-Updates**: Agents can check if laws have changed (`check-update`) and sync new releases (`sync`) automatically.
3. **Interactive Terminal Browser**: Browse and inspect laws directly in your shell (`browse`).
4. **Cloud Anycast Edge API**: Sub-10ms global endpoints on Cloudflare edge.

---

## Free Local OKF vs. Paid Cloud Enterprise Tier

We deliberately separate **reference knowledge** from **deep mathematical execution & neural reasoning**:

| Capability / Feature | Free Local OKF (NPM / Substrate) | Paid Cloud Enterprise API (`hello@mudraforge.in`) |
| :--- | :--- | :--- |
| **Pricing** | **100% Free** (Open Source / Public Beta) | **Paid Enterprise Subscription** (Direct Contact) |
| **Data Privacy & Latency** | 100% Offline, 0 network calls, sub-1ms | Global Cloudflare Anycast edge (sub-10ms) |
| **Search Engine** | Exact keyword, section code & alias lookup | **System-1 Neural Semantic Discovery Model** (finds relevant laws from messy transaction queries) |
| **Reasoning Capabilities** | None (Static reference data only) | **Multi-Step Statutory Reasoning Engine** (evaluates facts, composite supplies, M&A restructuring, and cross-border remittances) |
| **Output Modes** | Raw statutory JSON & thresholds | **Analysis Mode**: Detailed legal rationale, disallowance risk warnings, and balanced double-entry journal vouchers |
| **Deterministic Calculators** | ❌ *Not bundled in package* (prevents reverse-engineering) | **✅ Full Execution Engine**: Cumulative ₹50L excess math (§194Q), MSMED 3x RBI compound interest, 194J 2% vs 10% |
| **Government Portal Attestation** | ❌ Not available | **✅ Out-of-Band Attestation**: TRACES certificates, UDYAM portal registration, GSTIN verification |
| **Governance & Safety** | Unbounded (caller responsible for safety) | **Adesha Governance Runtime**: TLA+ verified financial state machines & fail-closed HITL quarantine |
| **How to Obtain Access** | Run `npm install @mudraforge/statutory` | **Email `hello@mudraforge.in` or `support@mudraforge.in`** |

---

## Self-Documenting File Structure

Files in `./okf/sections/` are named using a self-documenting convention combining the **Section Code** and the **Human Explanation**:

```
okf/
├── manifest.json                                      # Integrity root hash & versioning
└── sections/
    ├── 194Q-tds-on-purchase-of-goods.json             # 0.1% TDS on purchase excess over ₹50L
    ├── 206C_1H-tcs-on-sale-of-goods-sunset.json       # TCS sunset on 1 April 2025
    ├── 17_5-blocked-input-tax-credit.json             # GST blocked ITC categories
    ├── MSMED-15-16-delayed-payment-and-penal-interest.json # 45-day rule & 3x RBI interest
    ├── 194J-technical-and-professional-services-tds.json   # 2% FTS vs 10% Professional fees
    └── IRC-901-904-foreign-tax-credit-pass-through.json    # US Foreign Tax Credit baskets
```

Because the file names explain the legal purpose directly, an AI agent (Antigravity, Cursor, Claude Code) browsing the folder can identify the applicable statute at **0 token cost**.

---

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

## Contact & Enterprise Licensing

For enterprise pilots, custom statutory packs, System-1 reasoning models, and API keys:
- **Email**: [hello@mudraforge.in](mailto:hello@mudraforge.in) or [support@mudraforge.in](mailto:support@mudraforge.in)
- **Interactive API Docs**: [api.mudraforge.in/api/v1/statutory/docs](https://api.mudraforge.in/api/v1/statutory/docs)
- **Website**: [mudraforge.in](https://mudraforge.in)

---

## License
MIT © 2026 MudraForge Technologies.
