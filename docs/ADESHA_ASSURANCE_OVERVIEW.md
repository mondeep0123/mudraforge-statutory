# MudraForge Adesha — Enterprise Runtime Assurance Overview

> **Target**: Commercial Adesha Sovereign Autonomous Finance Runtime  
> **Classification**: Enterprise Commercial Architecture & Verification Specification  
> **Status**: Proprietary Enterprise Engine (Not distributed in the `@mudraforge/statutory` open-source package)

---

## 1. Overview & Architectural Role

While the open-source `@mudraforge/statutory` package provides declarative knowledge schemas, thresholds, and administrative circulars, the **Adesha Sovereign Runtime** is the commercial execution engine. It governs autonomous accounts payable, payment authorization leases, two-way ERP reconciliation, and bank rail execution.

> **The Payment Instruction Boundary**:  
> *The dangerous moment in finance AI isn't when the model is wrong. It's when its output becomes a payment instruction. In marketing, an AI hallucination is a typo. In accounts payable, an unhandled bank timeout can trigger a retry that double-pays a vendor. Reasoning can be probabilistic, but financial execution needs deterministic boundaries.*

To guarantee that autonomous financial agents cannot execute unauthorized disbursements or corrupt general ledgers, the Adesha runtime is engineered around four core execution pillars, formal verification, adversarial mutation testing, and fail-closed state machine invariants.

---

## 2. The Four Pillars of Autonomous Finance Execution

1. **Retrieval is Not Verification**:
   Early on, our claim validator relied on pre-populated test files holding expected answers. We scrapped that crutch. Our tests now exercise retrieval from connected systems of record (including live Zoho Books / SAP ERP readback) and authenticated tenant statutory vaults. Finding a document or matching keywords isn't enough; the system must verify what evidence legally supports before any downstream calculation runs.

2. **Safe Tools Do Not Guarantee Safe Workflows**:
   An AI agent can call individually safe API tools and still coordinate an unauthorized or illegal transaction. We separated reasoning from execution: the generative AI coordinates investigations and extracts messy invoice narratives; deterministic code calculates statutory taxes and enforces ledger invariants. Human oversight shouldn't mean accountants re-auditing math; the runtime provides statutory provenance so humans can focus on the actual decision.
   *Rule 11: Agreement with the Engine ≠ Agreement with the Law.*

3. **Preventing Silent Financial Drift**:
   Deterministic code computes numbers. RFC 8785 JSON Canonicalization Scheme (JCS) and SHA-256 bind the result to a verifiable, immutable fingerprint. The hash doesn't calculate—it detects any drift between calculation, human approval, and bank execution. If the financial result no longer matches the verified record, the workflow halts immediately.

4. **Testing Payment Boundaries Against Failure**:
   - **Duplicate-Payment Prevention**: Single-use Compare-and-Swap (CAS) leases tested under concurrent races using MongoDB-compatible atomic operations (`findAndModify`): exactly one consumer succeeds; all concurrent races are rejected with `LEASE_ALREADY_CONSUMED`.
   - **Formal TLA+ Modeling**: TLC explored all 361 reachable states in our configured distributed model (covering two leases, retries, and network timeouts) with zero invariant violations, and caught four deliberate defects injected into the spec.
   - **Edge Execution**: Built on Cloudflare Workers V8 isolates without container-based execution or cold starts.
   - **Accounting Integrity**: Adversarial tests target unbalanced journals, duplicate credits, and amount mismatches, enforcing strict double-entry ledger balance before ERP writeback.

---

## 3. Statutory Ground Truth Oracle & Adversarial Mutation Matrix

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

## 4. Formal TLA+ State Machine Verification

The payment authorization lease lifecycle in MudraForge Adesha is formally modeled in TLA+ (`specs/adesha_lease_state_machine.tla`) and verified using the **TLC Model Checker** (`tlc2.TLC`).

### 1. Full Concurrent Distributed Model (361 Reachable States)
In the complete distributed execution configuration covering concurrent transactions, retry attempts, and network drops:
- **Reachable States Explored**: **361 unique reachable states** fully traversed by TLC.
- **Safety Invariant Violations**: **0 violations**. Every reachable state maintains mutual exclusion, single-consumption CAS gates, and fail-closed ambiguity preservation.
- **Concurrency Coverage**: Evaluates concurrent races between multiple leases competing for settlement rails under network fault conditions.

### 2. Four Deliberate TLA+ Mutation Challenges (Caught by TLC)
To prove that the formal TLA+ specification is sensitive to real-world edge defects (and not a tautology), four unsafe transitions were deliberately injected into the model (`tools/run_tla_mutant_challenges.js`). TLC caught and generated counterexample traces for every single mutant:

| Mutant ID | Injected Defect | Formal Invariant Guarding It | TLC Verification Outcome |
| :--- | :--- | :--- | :--- |
| **TLA-MUTANT-1** | Missing CAS guard (permitting lease re-use post-settlement) | `InvariantNoDoubleDisbursement` | [CAUGHT] TLC found counterexample trace at Depth 4 |
| **TLA-MUTANT-2** | Optimistic timeout retry under HTTP 504 uncertainty | `InvariantAmbiguityPreservedFailClosed` | [CAUGHT] TLC found counterexample trace at Depth 3 |
| **TLA-MUTANT-3** | Premature ledger writeback prior to bank settlement | `InvariantNoLedgerWritebackWithoutSettlement` | [CAUGHT] TLC found counterexample trace at Depth 2 |
| **TLA-MUTANT-4** | Unleased direct dispatch bypassing authority harness | `InvariantNoUnleasedDisbursement` | [CAUGHT] TLC found counterexample trace at Depth 1 |

### 3. Single-Lease Micro-State Space (25 States & 225 Evaluations)
For an isolated lease in the differential test harness (`tests/test_oracle_tla_differential_equivalence.js`):
- **Reachable States**: 25 unique reachable states.
- **Formal Actions**: 8 formal transition actions.
- **Differential Evaluations**: 225 state-action checks (28 enabled transitions, 197 blocked precondition rejections).
- **Agreement**: 100% differential equivalence between the TLA+ formal specification and the private runtime implementation.

#### Mathematical Derivation of the 225 Checks
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

## 5. The Two-Generals Problem & In-Flight Banking Resolution

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

## 6. Double-Entry General Ledger Balance Invariants

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

## 7. Current Development Status & Scoped Pilot Boundary

> **Honest Operational Status**:  
> All 60 enterprise test suites are passing across formal TLA+ state machines, mutation matrices, and differential calculators, and our core engine baseline is frozen at `v2.2.0`.  
>  
> Importantly, **Adesha itself remains under active development**; passing tests does not make the product production-ready. Our planned initial pilot is deliberately and narrowly scoped:
> - **Domain Focus**: Domestic Accounts Payable (AP) in supervised shadow mode.
> - **System of Record**: Live ERP readback from connected systems (Zoho Books / SAP S/4HANA).
> - **Safety Constraints**: No live bank credentials connected, and **zero live funds at risk**.
>
> Autonomous finance will not be unlocked by bigger AI models alone. It requires traceable evidence, deterministic calculations, and execution boundaries that hold when a model gets something wrong.

---

## 8. Access & Commercial Deployment

For enterprises, financial institutions, and audit firms seeking deployment details, pilot onboarding, or custom ERP connector specifications:

- **Commercial Inquiries**: [hello@mudraforge.in](mailto:hello@mudraforge.in)
- **Technical Architecture Desk**: [engineering@mudraforge.in](mailto:engineering@mudraforge.in)
- **Enterprise Governance Whitepaper**: See [`ENTERPRISE_GOVERNANCE.md`](./ENTERPRISE_GOVERNANCE.md).
