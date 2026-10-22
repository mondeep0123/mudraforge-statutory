# MudraForge Statutory Knowledge Substrate — Architecture Decision Records (ADRs)

> **Standard**: Lightweight ADR Format inspired by Michael Nygard & OpenSSF Project Governance  
> **Package**: `@mudraforge/statutory`  
> **Status**: Institutional Normative Standard

---

## ADR-0001: Offline-First Bundled Commons vs. Hosted Cloudflare Edge Sync

### Context
Developers, AI agents, and enterprise ERP integrations need access to Indian statutory provisions (such as Section 194Q, 194J, 206C(1H), MSMED 15/16, and GST 17(5)). Relying solely on a hosted remote API introduces network latency, availability risks, single-point-of-failure vulnerabilities, and developer friction (requiring API keys for basic lookups).

### Decision
We bundle an offline starter package of 6 canonical provisions across 4 domains directly within the NPM package filesystem (`okf/`), validated by an immutable SHA-256 Merkle root digest. 
- Lookups in default or `mode: 'local'` execute entirely against local disk with zero network requests.
- Hosted Cloudflare Anycast edge synchronization is provided on a best-effort basis during beta to discover real-time gazette updates and expanded unbundled provisions.
- If edge sync is unreachable, callers automatically degrade to the verified local snapshot with an explicit `advisory` signal.

### Consequences
- **Positive**: Zero-network local evaluation works reliably in offline environments, test runners, and air-gapped CI/CD pipelines.
- **Trade-off**: Bundled snapshots reflect the law at release time. Consumers must run `checkUpdates()` or check gazette notices for recent legislative amendments.

---

## ADR-0002: Decoupling Deterministic Statutory Calculators from Declarative OKF Data Models

### Context
Large Language Models (LLMs) frequently hallucinate complex statutory threshold arithmetic (e.g. calculating Section 194Q TDS on the full ₹80 Lakhs invoice instead of the excess over ₹50 Lakhs, or failing to compound MSMED interest at 3x RBI bank rate). 

### Decision
We strictly decouple the declarative knowledge format (OKF v0.2 JSON schemas and Markdown circulars) from arithmetic calculation engines:
1. The open-source `@mudraforge/statutory` package defines declarative schemas, thresholds, rate schedules, and temporal validity bounds.
2. Exact statutory calculations are executed either by deterministic client functions or the paid MudraForge Cloudflare Worker engine.
3. Neither LLM text generation nor probabilistic prompts are ever permitted to compute statutory tax liability or interest.

### Consequences
- **Positive**: Prevents catastrophic financial calculation drift and prompt injection risks.
- **Trade-off**: The open-source package serves as a structured reference and validator; enterprise high-volume calculation is gated behind the deterministic calculation engine.

---

## ADR-0003: Commercial Boundary of Adesha Sovereign Payment Execution

### Context
Open-sourcing tax knowledge creates technical trust, but enterprise organizations require governed execution to automate corporate accounts payable, treasury operations, and bank rail payouts without risk.

### Decision
We formalize a strict 4-layer operational boundary:
1. **Layer 1: Open Statutory Knowledge (Open Source / MIT & CC BY 4.0)**: Machine-readable OKF schemas, circular frontmatter, CLI, and offline validator.
2. **Layer 2: Hosted Knowledge Services (Free Beta / Metered API)**: Cloudflare Anycast edge synchronization, remote manifest checking, and catalog expansions.
3. **Layer 3: Statutory Deduction Engine (Commercial Paid)**: Entity fact-matching, cross-provision conflict resolution, and deterministic statutory arithmetic.
4. **Layer 4: Adesha Sovereign Runtime (Enterprise Commercial)**: Human-in-the-Loop mobile authorization harness, TLA+-verified single-use payment leases, two-way ERP sync (SAP/Tally), and corporate banking rails.

### Consequences
- **Positive**: Clear division of responsibilities; open-source users have an unencumbered, fully functional tax commons, while commercial clients obtain bank-grade execution safety.

---

## ADR-0004: Tripartite Versioning Specification

### Context
Confusing package software updates with legal statutory amendments leads to silent downstream breakages. A statutory amendment does not necessarily change software APIs, and an SDK performance patch does not alter the law.

### Decision
We establish three independent, non-interchangeable versioning dimensions:

| Version Identifier | Target Governed | Lifecycle & Increment Rules | Example |
| :--- | :--- | :--- | :--- |
| **`okfVersion`** | Knowledge Schema Structure | Incremented only when the JSON schema or metadata fields change (e.g., adding a required field). | `0.2.0` |
| **`corpusRelease`** | Legal Corpus Snapshot | Incremented when statutory provisions, rates, or circulars are updated or added. | `2026.04.1` |
| **`version`** (SemVer) | NPM Client SDK & CLI | Standard Semantic Versioning for the JavaScript library, CLI commands, and test runners. | `2.4.0` |

---

## ADR-0005: Formal Product Capability Status Register

### Context
To maintain institutional credibility, public documentation must never blur the line between currently published capabilities, planned features, and proprietary enterprise software.

### Status Register

| Subsystem / Capability | Architectural Layer | Operational Status | Availability / Access | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Bundled OKF Starter Seed (6 Provisions)** | Layer 1 (Open Knowledge) | `PUBLIC_BUNDLED` | Immediate (NPM package) | 11/11 tests passing; SHA-256 Merkle root verified |
| **Zero-Network CLI (`mudraforge-statutory`)** | Layer 1 (Open Knowledge) | `PUBLIC_BUNDLED` | Immediate (Global / NPX) | `bin/cli.js` verified across Windows & Ubuntu |
| **Vendor-Neutral Conformance Suite** | Layer 1 (Open Knowledge) | `PUBLIC_BUNDLED` | Immediate (`conformance/`) | 12/12 fixture tests passing |
| **Cloudflare Anycast Edge Sync** | Layer 2 (Hosted Services) | `PUBLIC_EDGE_SYNC` | Free Beta (`api.mudraforge.in`) | Cloudflare Edge Worker manifest endpoint |
| **11-Domain Catalog Discovery** | Layer 2 (Hosted Services) | `PUBLIC_EDGE_SYNC` | Free Beta | Remote catalog indexing |
| **Differential Tax Calculators** | Layer 3 (Deduction Engine) | `ENTERPRISE_INTERNAL` | Paid Enterprise API | Deterministic calculation engine |
| **Dual-Custody Mobile Approval Harness** | Layer 4 (Adesha Runtime) | `ENTERPRISE_INTERNAL` | Enterprise License / Pilot | Android APK & TLA+ payment state machine |
| **ERP Two-Way Sync (SAP/Tally/Zoho)** | Layer 4 (Adesha Runtime) | `ENTERPRISE_INTERNAL` | Enterprise License | Two-way database connectors & journal writebacks |
| **Bank Rail API Execution (ICICI/HDFC)** | Layer 4 (Adesha Runtime) | `ENTERPRISE_INTERNAL` | Enterprise License | Host-to-Host banking integration |

---

## ADR-0006: Declarative Composite Transaction Profiles and Domain Knowledge Graphs

### Context
Commercial lifecycle events (such as corporate acquisitions, slump sales, mergers, and vendor onboarding runs) are not individual statutes. Instead, they represent business transaction archetypes that trigger multiple intersecting statutory regimes across Direct Tax, Indirect Tax (GST), and Corporate Governance (Companies Act).

Treating complex transactions as flat, isolated `section.json` files forces consuming developers and AI agents to guess the relationships, execution sequences, and documentary requirements connecting relevant laws. Conversely, hardcoding operational execution logic, linear numbering assumptions, or premature legal verdicts (e.g. declaring a deal void due to a missing certificate without evaluating statutory safe harbors) into declarative formats violates both open knowledge standards and sound statutory jurisprudence.

### Decision
We establish a 3-tier declarative knowledge model for complex multi-statute transactions:

1. **Tier 1: Atomic Statutory Provision (`section.json`)**: Authoritative legislative text, official Gazette citations, rates, and temporal validity windows.
2. **Tier 2: Legal Concept Definition (`concepts/*.md`)**: Substantive interpretation boundaries, statutory conditions, exceptions, safe harbors, and evidence checklists (Markdown with structured YAML frontmatter).
3. **Tier 3: Composite Transaction Profile (`composites/*.json`)**: Declarative relationship graph connecting relevant concepts and provisions for a specific business transaction archetype.

#### Core Architectural Invariants:
1. **Extension Attribution**: Composite profiles are documented as a versioned **MudraForge OKF Transaction Extension**, keeping them distinct from upstream Google OKF v0.2 core specifications while fully utilizing OKF frontmatter conventions.
2. **Declarative Dependencies over Arbitrary Sequences**: The profile models statutory dependencies using true graph topology (`parallelIndependentChecks`, `conditionalDownstreamChecks`, `dependsOn`) rather than imposing an artificial linear numbered sequence on concurrent diligence streams.
3. **Statutory Safe Harbors over Binary Failure Verdicts**: Profiles declare applicable legal questions, statutory conditions, safe harbors (e.g., bona fide purchaser for value without notice under Section 281), and evidentiary burdens, leaving judicial or executive determinations to runtime evaluation engines.
4. **Strict Temporal Enactment Distinguishability**: Corresponding provisions under the Income-tax Act, 1961 (such as §281, §170) and the Income-tax Act, 2025 (such as §499, §313 taking effect 1 April 2026) must remain explicitly distinguished by enactment code and effective period.
5. **Separation of Open Knowledge from Governed Execution**:
   - The open commons (`@mudraforge/statutory`) provides the inspectable, reusable, and testable dependency graph of laws and evidence requirements.
   - The commercial runtime (Adesha) executes deterministic calculations, enforces bank escrow locks, requires CFO biometric authorization, and writes balanced ERP journal entries.

### Consequences
- **Positive**: Makes complex statutory relationships discoverable and machine-readable for AI agents without compromising open-source format purity or disclosing proprietary execution code.
- **Lifecycle Management**: Implemented as an experimental prototype on a dedicated feature branch (`feature/composite-transaction-profiles`) and subjected to independent legal scenario benchmarking prior to promotion into public release `v2.5.0`. Release `v2.4.0` remains focused on the verified atomic statutory corpus.
