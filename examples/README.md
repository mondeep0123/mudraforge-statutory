# MudraForge Statutory & Adesha: End-to-End Execution Traces

> **Purpose**: Demonstrates the concrete operational bridge connecting public OKF statutory rules with the commercial Adesha Autonomous Finance Runtime.  
> **Demonstration Notice**: This trace contains synthetic transaction data and modeled authorization, banking, and ledger events. It does not connect to a real bank, verify a live biometric event, or execute a real-world payment. All PANs, GSTINs, and account numbers are explicitly synthetic test fixtures.

---

## 1. Overview

A common question from developers and Chief Financial Officers is:
> *"How does a declarative statutory tax rule in `@mudraforge/statutory` translate into a safe, real-world corporate payment without giving an AI agent uncontrolled access to company bank accounts?"*

This directory contains concrete, audited end-to-end execution traces illustrating every stage of that journey:

```
[Raw Vendor Invoice]
        ↓
Stage 1: Ingestion & Vendor PAN/GSTIN Validation
        ↓
Stage 2: OKF Rule Resolution (Section 194Q TDS on Purchase of Goods)
        ↓
Stage 3: Deterministic Tax Calculation (0.1% on excess over ₹50L, GST unbundled per CBDT 13/2021)
        ↓
Stage 4: Adesha Payment Authorization Lease (Single-use cryptographic token, amount-locked)
        ↓
Stage 5: Human-In-The-Loop Mobile Authorization (CFO Biometric/Passkey Approval on Mobile)
        ↓
Stage 6: Host-to-Host Corporate Bank Rail Disbursement (RTGS Settlement with Bank UTR)
        ↓
Stage 7: General Ledger Writeback (ERP Balanced Double-Entry Journal Entry: Debits ≡ Credits)
```

---

## 2. Artifacts in this Directory

| File | Description |
| :--- | :--- |
| [`invoice_deduction_trace.json`](./invoice_deduction_trace.json) | Full machine-readable execution trace payload covering all 7 stages. |
| [`simulate_end_to_end_trace.js`](./simulate_end_to_end_trace.js) | Standalone simulation runner printing the step-by-step audit lifecycle. |

---

## 3. Running the Trace Locally

Any developer can run this simulation locally with zero external network access:

```bash
node examples/simulate_end_to_end_trace.js
```

Or via npm:

```bash
npm run example:trace
```
