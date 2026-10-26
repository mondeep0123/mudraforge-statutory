# Security & Statutory Integrity Policy

MudraForge Knowledge Systems is committed to maintaining the highest standards of code security, cryptographic integrity, and **statutory ground-truth accuracy** across `@mudraforge/statutory`.

Because this package structures tax laws and regulatory compliance logic utilized in enterprise financial systems, an error in statutory logic (e.g. an outdated threshold, an erroneous tax rate, or an unreflected legislative sunset) is treated with the same urgency as a software vulnerability.

---

## Supported Versions

Only the current major release series receives active updates and statutory amendments:

| Version | Supported | Statutory Epistemic Baseline |
|---|---|---|
| `2.9.x` | Yes | Finance Act, 2025 & CBDT/CBIC Circulars up to October 2026 |
| `< 2.9.0` | No | Legacy unversioned flat schemas |

---

## What to Report

We welcome reports regarding two distinct categories:

### 1. Code & Cryptographic Vulnerabilities
- Flaws in the client library, CLI parser, or validation routines.
- Insecure dependency vulnerabilities or supply chain tampering.
- Cryptographic hash mismatches in `manifest.json`.

### 2. Statutory & Regulatory Inaccuracies
- **Statutory Rate Discrepancies**: Discrepancy between `section.json` rates and the official gazetted statute.
- **Threshold Sunset / Transition Lag**: Unreflected legislative amendments (e.g. Union Budget changes, Finance Act clauses).
- **Executive Circular Contradictions**: Mismatches between CBDT/CBIC clarification circulars and bundled markdown guidance.
- **Form Schema Obsolescence**: Outdated reporting fields or filing deadlines in compliance forms.

---

## Reporting Protocol

Please do **NOT** report critical security flaws or zero-day statutory discrepancies in public GitHub issues.

Send an encrypted or detailed notification to our dedicated security and compliance desk:

- **Security Desk**: [security@mudraforge.in](mailto:security@mudraforge.in)
- **Statutory Compliance Desk**: [compliance@mudraforge.in](mailto:compliance@mudraforge.in)

### Submission Details
To expedite resolution, please include:
1. **Affected Section / File**: e.g., `okf/direct_tax/tds_goods_194q/section.json` or `bin/cli.js`.
2. **Official Trust Anchor**: URL to the Gazette of India notification, CBDT/CBIC executive circular, or court judgment.
3. **Proposed Ground-Truth Correction**: Explicit diff or statutory citation demonstrating the discrepancy.

---

## Triage & Release Protocol

We operate an open-source, community-verified disclosure and correction model:

| Issue Type | Target Acknowledgment | Triage & Gazette Verification | Target Release Window |
|---|---|---|---|
| **Critical Statutory Bug** (e.g., incorrect tax rate, missed sunset) | 2 business days | 5 business days (verified against Gazette) | 14 calendar days (fast-tracked patch release) |
| **Code / Security Vulnerability** (e.g., parser crash, checksum mismatch) | 2 business days | 3 business days | 7 calendar days |
| **Regulatory Clarification** (e.g., administrative circular ambiguity) | 5 business days | Next monthly review cycle | Scheduled monthly corpus release |
| **Documentation / Typo** (e.g., broken official link) | 5 business days | Regular maintenance | Next release cycle |

### Correction Verification Policy
To prevent regressions, no statutory correction is merged based solely on ungrounded AI generation or secondary blog summaries. Every amendment must link to an official primary gazette URL, circular number, or statutory enactment.

---

## Responsible Disclosure & Attribution

Researchers, Chartered Accountants, and tax practitioners who report verified statutory discrepancies or security flaws are gratefully acknowledged in our **Published Release & Provenance Ledger** and release changelogs.
