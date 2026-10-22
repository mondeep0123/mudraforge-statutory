# Security & Statutory Integrity Policy

MudraForge Knowledge Systems is committed to maintaining the highest standards of code security, cryptographic integrity, and **statutory ground-truth accuracy** across `@mudraforge/statutory`.

Because this package structures tax laws and regulatory compliance logic utilized in enterprise financial systems, an error in statutory logic (e.g. an outdated threshold, an erroneous tax rate, or an unreflected legislative sunset) is treated with the same urgency as a software vulnerability.

---

## Supported Versions

Only the current major release series receives active updates and statutory amendments:

| Version | Supported | Statutory Epistemic Baseline |
|---|---|---|
| `2.4.x` | Yes | Finance Act, 2025 & CBDT/CBIC Circulars up to October 2026 |
| `< 2.4.0` | No | Legacy unversioned flat schemas |

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

## SLA & Response Timelines

| Severity Level | Definition | First Response | Remediation SLA |
|---|---|---|---|
| **Critical Statutory Bug** | Rate error or sunset miss causing immediate financial misstatement | &le; 12 Hours | &le; 24 Hours |
| **High Code Vulnerability** | Arbitrary code execution or integrity bypass | &le; 12 Hours | &le; 24 Hours |
| **Medium Statutory Note** | Ambiguity in executive circular notes or missing form field | &le; 24 Hours | &le; 72 Hours |
| **Low / Documentation** | Typographical error or broken external hyperlink | &le; 48 Hours | Next Scheduled Release |

---

## Responsible Disclosure & Bug Bounty

We operate a responsible disclosure policy. Researchers, Chartered Accountants, and tax attorneys who responsibly report verified statutory or software defects will be credited in our published **Provenance Ledger** and release changelogs.
