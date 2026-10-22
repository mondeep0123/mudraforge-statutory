# MudraForge Adesha — Enterprise Runtime Assurance Overview

> **Target**: Commercial Adesha Sovereign Autonomous Finance Runtime  
> **Classification**: Enterprise Commercial Architecture & Verification Specification  
> **Status**: Proprietary Enterprise Engine (Not distributed in the `@mudraforge/statutory` open-source package)

---

## 1. Overview & Architectural Role

While the open-source `@mudraforge/statutory` package provides declarative knowledge schemas, thresholds, and administrative circulars, the **Adesha Sovereign Runtime** is the commercial execution engine. It governs autonomous accounts payable, payment authorization leases, two-way ERP reconciliation, and bank rail execution.

To guarantee that autonomous financial agents cannot execute unauthorized disbursements or corrupt general ledgers, the Adesha runtime is engineered using formal verification, adversarial mutation testing, and fail-closed state machine invariants.

---

## 2. Statutory Ground Truth Oracle & Adversarial Mutation Matrix

To prevent the **Epistemic Gap** (where engineers embed incorrect tax interpretations into both the code and the tests), Adesha validates statutory computations against an independent test oracle across an adversarial mutation matrix.

### Deliberate Misinterpretation Mutants & Runtime Defenses

| Mutant ID | Injected Corruption | Statutory Legal Ground Truth | Adesha Defense & Interception |
| :--- | :--- | :--- | :--- |
| **MUTANT-01** | Section 194Q rate increased from 0.1% to 1.0% | Section 194Q: 0.1% strictly on excess over ₹50L | [PASS] Intercepted by statutory calculator gate |
| **MUTANT-02** | Section 194Q threshold lowered from ₹50L to ₹10L | Section 194Q: Mandates ₹50 Lakhs cumulative threshold | [PASS] Intercepted by threshold invariant |
| **MUTANT-03** | Section 206C(1H) evaluated on or after 1 April 2025 | Finance Act 2025: Sunsets Section 206C(1H) w.e.f. 01-04-2025 | [PASS] Intercepted by temporal state machine |
| **MUTANT-04** | Section 194Q computed on gross invoice including GST | CBDT Circular 13/2021: Mandates unbundling GST component | [PASS] Intercepted by tax base unbundling parser |
| **MUTANT-05** | Missing PAN on 194Q penalized at 20% instead of 5% | Section 206AA(1) Proviso: Capped strictly at 5% for Sec 194Q | [PASS] Intercepted by statutory rate cap |
| **MUTANT-06** | MSMED penal rate computed from RBI Repo Rate (6.5%) | MSMED Sec 16: Specifies 3x RBI Bank Rate (Sec 49 RBI Act) | [PASS] Intercepted by statutory rate binding |
| **MUTANT-07** | MSMED penal interest computed as simple annual interest| MSMED Sec 16: Mandates compound interest with monthly rests | [PASS] Intercepted by multi-interval compound math |
| **MUTANT-08** | Section 43B(h) disallowance applied to Medium units | Section 43B(h): Applies strictly to Micro and Small enterprises | [PASS] Intercepted by enterprise class gate |
| **MUTANT-09** | Section 194Q applied to foreign vendor without PE | CBDT Circular 13/2021 Q3: Exempts direct foreign imports | [PASS] Intercepted by residency exemption check |
| **MUTANT-10** | Tie-breaker inverted when buyer turnover is under ₹10 Cr| Sec 206C(1H) 2nd Proviso: Only yields if buyer is legally liable | [PASS] Intercepted by dual-statute tiebreaker |
| **MUTANT-11** | Section 194Q deducted on entire invoice crossing ₹50L | Only the incremental excess over ₹50L is the taxable base | [PASS] Intercepted by excess calculation invariant |
| **MUTANT-12** | Advance netting deducted without adjusting prior advance TDS| CBDT Circular 13/2021 Q1: Prevents double withholding | [PASS] Intercepted by advance ledger reconciliation |

---

## 3. Formal TLA+ State Machine Verification

The payment authorization lease lifecycle in MudraForge Adesha is formally modeled in TLA+ (`specs/adesha_lease_state_machine.tla`) and verified using the **TLC Model Checker**.

### Model Structure & State Space
- **Reachable States**: 25 unique reachable states.
- **Formal Actions**: 8 formal transition actions.
- **Differential Evaluations**: 225 state-action checks:
  - 28 enabled transitions.
  - 197 blocked precondition rejections.
  - **Result**: 100% agreement between the TLA+ specification and the private runtime implementation.

### Mathematical Derivation of the 225 Checks
1. **Seven Deterministic Actions (Single-Branch, 1 Evaluation per State)**:
   `IssueLease`, `ConsumeLeaseCAS`, `WireSettlementSuccess`, `StatementIngestionConfirmsSettlement`, `GatewayCertifiesReversal`, `RetryWireWithLinkedKey`, `PostGeneralLedgerVoucher`.
   $$\text{Subtotal} = 25 \text{ states} \times 7 \text{ actions} \times 1 \text{ branch} = 175 \text{ evaluations}$$

2. **One Non-Deterministic Action (Two-Branch, 2 Evaluations per State)**:
   `WireNetworkTimeout504`: Under an HTTP 504 network timeout, the banking partner may or may not have disbursed funds before the connection dropped:
   - Branch 1 (`executed`): Bank disbursed funds.
   - Branch 2 (`non_executed`): Bank did not disburse funds.
   $$\text{Subtotal} = 25 \text{ states} \times 1 \text{ action} \times 2 \text{ branches} = 50 \text{ evaluations}$$

3. **Total**: $175 + 50 = 225 \text{ differential evaluations}$.

---

## 4. The Two-Generals Problem & In-Flight Banking Resolution

In distributed banking, network communication over public payment rails is fundamentally subject to the **Two-Generals Problem**:

```
Client ──[ POST /v1/payouts ]──► Gateway ──► Bank Rail
   ▲                                              │
   │                                              ▼
   └───[ HTTP 504 Timeout / Socket Drop ]─────────┘
```

When an enterprise runtime encounters an HTTP 504 gateway timeout, socket reset, or worker crash after transmitting a payment, the client cannot know whether the bank executed the wire.

### Enforced Invariants
1. **Preserving Uncertainty Fail-Closed**:
   The lease transitions to `AMBIGUOUS_RECONCILING` with `safeToRetry: false`. In this state, the runtime strictly blocks automatic retries or new lease issuance.
2. **Elapsed Time Never Unlocks a Retry**:
   Waiting for an arbitrary cooling-off period (e.g., 30 minutes) does not guarantee non-execution, because anti-fraud holds and clearinghouse queues can delay settlement.
3. **Dual-Mode Resolution Contract**:
   - `IDEMPOTENT_RETRY`: Re-transmits using the **exact original `transportIdempotencyKey`** and identical request body. Both RazorpayX and Modern Treasury return existing transaction outcomes without creating duplicate debits.
   - `COMPENSATED_REATTEMPT`: Only after receiving an authoritative reversal or failure certification does the runtime generate a fresh linked transport token (`attemptIndex: 2`) under the same business lease.

---

## 5. Double-Entry General Ledger Balance Invariants

In corporate accounting, recording a voucher before external settlement creates accounting distortions. Adesha enforces:

1. **Precondition Gate**: General ledger writeback is strictly locked until a verified bank Unique Transaction Reference (UTR) is present.
2. **Source-Bound Line Invariant (`verifySourceBoundLineInvariants`)**:
   Every journal line must bind directly to an authoritative source document:
   - COGS / Expense binds to the invoice basic value.
   - GST Input Tax Credit binds to the digitally signed government e-invoice (IRP) digest.
   - TDS Payable binds to the deterministic statutory calculator output.
   - Advance Netting binds to the unapplied advance ledger balance.
   - Bank Credit binds to the authorized wire disbursement amount.
3. **Paisa-Level Equilibrium**:
   $$\sum \text{Debits} \equiv \sum \text{Credits} \quad (\text{Discrepancy } \le ₹0.01)$$

---

## 6. Access & Commercial Deployment

For enterprises, financial institutions, and audit firms seeking deployment details, pilot onboarding, or custom ERP connector specifications:

- **Commercial Inquiries**: [hello@mudraforge.in](mailto:hello@mudraforge.in)
- **Technical Architecture Desk**: [engineering@mudraforge.in](mailto:engineering@mudraforge.in)
- **Enterprise Governance Whitepaper**: See [`ENTERPRISE_GOVERNANCE.md`](./ENTERPRISE_GOVERNANCE.md).
