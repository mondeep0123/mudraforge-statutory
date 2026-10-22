# Open Knowledge Format (OKF) Statutory Substrate v2.4
## Technical Architecture & Invariant Specification

> **Specification Version**: 2.4.0  
> **Status**: Public Beta / Open Commons  
> **Author**: MudraForge Engineering (`engineering@mudraforge.in`)  
> **Reference Standard**: Google Open Knowledge Format (OKF) Specification  

---

## 1. Executive Summary & Problem Formulation

Large Language Models (LLMs) are stochastic autoregressive token predictors. When applied to enterprise accounting, accounts payable (AP) automation, and ERP ledger reconciliation, raw LLMs suffer from the **Stochastic Legal Oracle Failure**:

1. **Threshold Arithmetic Fallacy**: Tax thresholds are strictly non-linear and cumulative across financial years. For example, under **Section 194Q** of the Indian Income-tax Act, 1961, tax is deductible at 0.1% strictly on the *excess* purchase value over ₹50 Lakhs in a financial year. An LLM presented with an ₹80 Lakh invoice and ₹40 Lakhs of prior purchases frequently computes 0.1% of ₹80 Lakhs (₹8,000) instead of the statutory ₹70 Lakh taxable excess (₹7,000)—generating persistent financial errors.
2. **Temporal Boundary Decay**: Statutory laws sunset, transition, or are omitted by annual Finance Acts. For example, **Section 206C(1H)** was sunset effective 1 April 2025. Standard model weights continue citing and enforcing sunset sections long after their legal expiration.
3. **Dual-Act Legislative Transition**: India is transitioning to the **Income-tax Act, 2025** (taking effect 1 April 2026), replacing decades of familiar section numbers (e.g., Section 194Q transitions to Section 393(1), Table 8, Item (ii)). Agents without a dual-act mapping layer will hallucinate cross-statutory citations.

`@mudraforge/statutory` implements an authoritative, versioned, zero-dependency substrate that grounds AI agents in mathematical truth and legal certainty before any transaction is executed.

---

## 2. Architectural Pillars

The MudraForge Statutory architecture is structured into four decoupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Enterprise Cloud Execution Engine (api.mudraforge.in)         │
│ • Deterministic Statutory Calculators (194Q excess, MSMED 3x RBI)      │
│ • System-1 Neural Semantic Discovery Model                             │
│ • Analysis Mode: Journal Vouchers & Disallowance Risk Reports          │
│ • TRACES / UDYAM / GSTIN Live Attestation Verification                 │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ HTTPS (Bearer Auth: hello@mudraforge.in)
┌──────────────────────────────────┴─────────────────────────────────────┐
│ Layer 3: Statutory Client SDK (@mudraforge/statutory / Python)         │
│ • Offline-first local filesystem resolution (sub-1ms)                  │
│ • Cryptographic SHA-256 integrity validation                           │
│ • Automated upstream release synchronization (check-update / sync)     │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Traverses local disk
┌──────────────────────────────────┴─────────────────────────────────────┐
│ Layer 2: Open Knowledge Format (OKF) Filesystem (`./okf/`)             │
│ • Self-documenting files: [Code]-[Explanation].json                    │
│ • Zero-token filesystem discovery for LLM agents                       │
│ • Versioned manifest with dual-act cross-compilation mapping           │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Formal Specification
┌──────────────────────────────────┴─────────────────────────────────────┐
│ Layer 1: Google Open Knowledge Format (OKF) Standard                   │
│ • The "OpenAPI for Knowledge" — model-agnostic, human-readable         │
│ • Universal interchange standard for agent memory & legal ground truth │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The OKF Self-Documenting Filesystem

Under Google's **Open Knowledge Format (OKF)** standard, knowledge bundles must be human-inspectable, model-agnostic, and version-controlled. 

Rather than storing opaque filenames or forcing agents to query expensive vector embedding databases, the OKF filesystem uses **composite semantic filenames**:

```
okf/
├── manifest.json
└── sections/
    ├── 194Q-tds-on-purchase-of-goods.json
    ├── 206C_1H-tcs-on-sale-of-goods-sunset.json
    ├── 17_5-blocked-input-tax-credit.json
    ├── MSMED-15-16-delayed-payment-and-penal-interest.json
    ├── 194J-technical-and-professional-services-tds.json
    └── IRC-901-904-foreign-tax-credit-pass-through.json
```

### Zero-Token Agent Discovery
When an autonomous agent (Antigravity, Cursor, Claude Code) receives a compliance prompt:
1. The agent inspects the `./okf/sections/` directory listing.
2. The combination of section number and plain-text description allows the agent to identify the exact applicable statute with **zero token cost** (avoiding RAG embedding lookups).
3. The agent loads only the targeted JSON statute into context.

---

## 4. Formal Schema Specification

Every OKF statute record implements the following invariant schema:

```json
{
  "sectionId": "SEC_194Q",
  "sectionCode": "194Q",
  "aliases": ["194Q", "TDS ON GOODS", "PURCHASE TDS", "BUYER TDS"],
  "governingStatute": "Income-tax Act, 1961",
  "statutorySection": "Section 194Q",
  "successorStatute": "Income-tax Act, 2025",
  "successorSection": "Section 393(1), Table 8, Item (ii)",
  "title": "Deduction of tax at source on payment of a certain sum for purchase of goods",
  "effectivePeriod": {
    "validFrom": "2021-07-01",
    "validTo": "2026-03-31",
    "annualReset": "04-01",
    "sunsetNotes": "Active until repeal of Income-tax Act, 1961 on 2026-03-31. Replaced seamlessly by Section 393(1) of Income-tax Act, 2025 on 2026-04-01."
  },
  "plainTextSummary": "Any person, being a buyer who is responsible for paying any sum to any resident seller for purchase of any goods...",
  "keyStatutoryThresholds": {
    "annualPurchaseThresholdInr": 5000000,
    "taxableBaseScope": "Tax is deductible strictly on the excess over ₹50 Lakhs, NOT on the aggregate gross turnover.",
    "buyerPriorYearTurnoverThresholdInr": 100000000,
    "standardDeductionRatePercent": 0.1,
    "higherRateWithoutPanPercent": 5.0
  },
  "officialCitations": [
    {
      "authority": "Central Board of Direct Taxes (CBDT)",
      "instrument": "Circular No. 13 of 2021",
      "subject": "Guidelines under section 194Q of the Income-tax Act, 1961",
      "officialUrl": "https://incometaxindia.gov.in"
    }
  ],
  "requiredDocumentChecklist": [
    "Vendor Permanent Account Number (PAN)",
    "Valid Tax Invoice / Debit Note",
    "Cumulative Purchase Ledger for current FY",
    "Turnover declaration of buyer for preceding FY (> ₹10 Cr)"
  ],
  "tier": "PUBLIC_COMMONS_FREE",
  "version": "2.4.0"
}
```

---

## 5. Temporal Validity State Machines

The substrate evaluates statute validity dynamically as a function of transaction date:

$$\text{TemporalStatus}(S, t) = \begin{cases} 
\text{FUTURE}, & t < S.\text{validFrom} \\
\text{ACTIVE}, & S.\text{validFrom} \le t \le S.\text{validTo} \\
\text{EXPIRED\_SUNSET}, & t > S.\text{validTo} 
\end{cases}$$

### The Section 206C(1H) Sunset Invariant
Section 206C(1H) was omitted by the Finance Act, 2025 effective 1 April 2025. Any transaction dated on or after `2025-04-01` attempting to collect TCS under Section 206C(1H) will be intercepted by the oracle:
```javascript
const isActive = await isStatuteActive('206C(1H)', '2025-06-15');
// => false
// Agent halts transaction: "TCS collection u/s 206C(1H) is illegal post-sunset."
```

---

## 6. Mathematical Invariants: Knowledge vs. Execution

MudraForge maintains an absolute boundary between **Reference Knowledge** (Free Commons) and **Deterministic Execution** (Enterprise Cloud Engine):

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Free Local OKF Substrate    │       │     Cloudflare Edge Engine      │
│     (Zero Network / Offline)    │       │  (Enterprise Bearer Key Gated)  │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ • Section thresholds (₹50L)     │       │ • Cumulative Excess Math        │
│ • Statutory rates (0.1% / 5%)   │  ──►  │ • MSMED 3x RBI Monthly Compound │
│ • Document audit checklists     │       │ • Analysis Mode Journal Voucher │
│ • CBDT circular citations       │       │ • TLA+ Financial State Machine  │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

### Deterministic Calculation Equations
1. **Section 194Q Taxable Base**:
   $$\text{TaxableBase} = \max\left(0, \min\left(\text{InvoiceAmt}, \; (\text{PriorFY} + \text{InvoiceAmt}) - 50{,}00{,}000\right)\right)$$
2. **MSMED Section 16 Compound Penal Interest**:
   $$A = P \times \left(1 + \frac{3 \times r_{\text{RBI}}}{12}\right)^{n}$$
   Where interest is compounded monthly and specifically disallowed as an expense under Section 43B(h).

---

## 7. Cryptographic Integrity & Sync Architecture

To ensure zero tampering in untrusted local environments:
1. The `manifest.json` file contains a root cryptographic hash (`rootHash`) computed across all section files.
2. When the agent executes `npx mudraforge-statutory check-update`, the client requests `GET /api/v1/statutory/version` from the Cloudflare edge.
3. If an upstream gazette notification or CBDT circular creates a new legal release, the client downloads `bundle.json`, verifies the SHA-256 signature, and atomically updates `./okf/sections/`.

---

## 8. License & Commercial Availability

- **Local OKF Substrate & CLI**: Released under the **MIT License**. Free for public commons use, developers, and autonomous agents.
- **Enterprise Execution API**: Cloudflare Anycast Edge deployment (`api.mudraforge.in`). Requires commercial enterprise credentials.
- **Enterprise Contact**: Direct contact is required to obtain an API key. Email **`hello@mudraforge.in`** or **`support@mudraforge.in`**.
