# MudraForge Statutory & Adesha: Verification & Conformance Report

> **Audited Runtime**: MudraForge Statutory Engine & Adesha Governance Substrate  
> **Release Target**: Bundle `v2.4.0`  
> **Execution Environment**: Node.js v22.16.0 (ESM), TLC Model Checker (TLA+2 Tools / OpenJDK 17)  
> **Test Suite Status**: 61 Active Conformance Suites Passing (100% of tested scenarios)  

---

## 1. Scope & Epistemic Limitations

In enterprise software and autonomous systems, **a passing test suite is evidence of conformance under tested conditions—it is not an absolute mathematical proof that every statutory interpretation or real-world edge case is correct**.

This report documents:
1. The deterministic tests used to verify statutory calculations against published legal sources.
2. The formal TLA+ state machine model used to analyze payment authorization lifecycles.
3. The empirical test harnesses used to evaluate high-concurrency database operations and network timeout handling.
4. **Known limitations and the boundary between simulated test doubles and live enterprise production**.

---

## 2. Statutory Ground Truth Oracle & Mutation Testing

To prevent the **Epistemic Gap** (where software engineers embed an incorrect legal interpretation into both the application and the test suite), MudraForge validates statutory calculations against an independent test oracle across an adversarial mutation matrix.

### Deliberate Misinterpretation Mutants & Test Outcomes

| Mutant ID | Injected Corruption | Statutory Legal Ground Truth | Test Outcome |
| :--- | :--- | :--- | :--- |
| **MUTANT-01** | Section 194Q rate increased from 0.1% to 1.0% | Section 194Q: 0.1% strictly on excess over ₹50L | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-02** | Section 194Q threshold lowered from ₹50L to ₹10L | Section 194Q: Mandates ₹50 Lakhs cumulative threshold | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-03** | Section 206C(1H) evaluated on or after 1 April 2025 | Finance Act 2025: Sunsets Section 206C(1H) w.e.f. 01-04-2025 | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-04** | Section 194Q computed on gross invoice including GST | CBDT Circular 13/2021: Mandates unbundling GST component | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-05** | Missing PAN on 194Q penalized at 20% instead of 5% | Section 206AA(1) Proviso: Capped strictly at 5% for Sec 194Q | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-06** | MSMED penal rate computed from RBI Repo Rate (6.5%) | MSMED Sec 16: Specifies 3x RBI Bank Rate (Sec 49 RBI Act) | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-07** | MSMED penal interest computed as simple annual interest| MSMED Sec 16: Mandates compound interest with monthly rests | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-08** | Section 43B(h) disallowance applied to Medium units | Section 43B(h): Applies strictly to Micro and Small enterprises | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-09** | Section 194Q applied to foreign vendor without PE | CBDT Circular 13/2021 Q3: Exempts direct foreign imports | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-10** | Tie-breaker inverted when buyer turnover is under ₹10 Cr| Sec 206C(1H) 2nd Proviso: Only yields if buyer is legally liable | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-11** | Section 194Q deducted on entire invoice crossing ₹50L | Only the incremental excess over ₹50L is the taxable base | [PASS] Intercepted (Discrepancy detected) |
| **MUTANT-12** | Advance netting deducted without adjusting prior advance TDS| CBDT Circular 13/2021 Q1: Prevents double withholding | [PASS] Intercepted (Discrepancy detected) |

---

## 3. Formal TLA+ State Machine Verification

The payment authorization lease lifecycle in MudraForge Adesha is formally modeled in TLA+ (`specs/adesha_lease_state_machine.tla`) and verified using the **TLC Model Checker**.

### Model Structure & State Space
- **Reachable States**: 25 unique reachable states.
- **Formal Actions**: 8 formal transition actions.
- **Differential Evaluations**: 225 state-action checks:
  - 28 enabled transitions.
  - 197 blocked precondition rejections.
  - **Result**: 100% agreement between the TLA+ specification and the JavaScript runtime implementation.

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

### Persistent Mutation Challenges
We tested the formal model against 4 persistent adversarial specification mutants in `specs/mutants/` (e.g. allowing lease re-consumption or skipping settlement confirmation before ERP writeback). The TLC model checker successfully caught and reported invariant violations for all 4 mutants.

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

## 6. Testing Environments & Transparent Disclosures

To ensure transparency, we distinguish between tested environments and production boundaries:

1. **Network-Level HTTP Test Double (Simulated ERP)**:
   Tested via a standalone Node.js HTTP server listening on port 9876 that mimics Zoho Books REST endpoints (`POST /api/v3/journalentries`). Verified that the runtime formats, transmits, and verifies vouchers over real TCP/HTTP.
2. **Live Cloud API Handshake (Zoho Books Readback)**:
   Executed against a real Zoho Books organization (`Org ID: 60089970402`) using OAuth tokens. Verified readback access to invoices and balance sheet accounts. Also confirmed platform constraints (e.g., write-locks under expired trial tiers).
3. **Internal Research Benchmark Progression**:
   MudraForge tracks internal architectural maturity across an internal 10-point scale:
   - *Baseline*: 5.5 / 10 (Heuristic LLM wrapped around APIs)
   - *Prior Milestone*: 8.5 / 10 (Deterministic OKF, Formal Model)
   - *Current Evaluated Baseline*: 9.2 / 10 (Internal Research Rating)  
   *(Note: This represents MudraForge's internal engineering benchmark and is not an external third-party certification).*

---

## 7. Areas for Ongoing Peer Review & Expansion

- **Chartered Accountant (CA) Empanelment**: Expanding peer review of nuanced circulars and state-specific GST litigation precedents.
- **Section 197 Lower-Deduction Certificates**: Cumulative monitoring of certificate deduction limits across high-volume vendor portfolios.
- **Income-tax Act, 2025 Transition Schedule**: Continuous tracking of rules and gazette notifications released by the Ministry of Finance leading up to 1 April 2026.
