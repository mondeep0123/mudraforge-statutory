# Changelog

All notable changes to `@mudraforge/statutory` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2026-10-22

### Added
- **Multi-Domain OKF v0.2 Architecture**: Reorganized statutory knowledge corpus into four foundational regulatory domains:
  - `direct_tax` (Income-tax Act, 1961 / Income-tax Act, 2025; Section 194Q, Section 194J, Section 206C(1H) sunset)
  - `indirect_tax_gst` (Central Goods and Services Tax Act, 2017; Section 17(5) Blocked ITC)
  - `msme_commercial` (MSMED Act, 2006 Sections 15 & 16; delayed payments and Section 43B(h) linkage)
  - `international_tax` (US Internal Revenue Code §§ 901 & 904; Foreign Tax Credit baskets)
- **Executive Circulars & Compliance Forms**: Bundled 6 official executive circulars with YAML frontmatter and 8 compliance return schemas (Form 26Q, Form 16A, GSTR-2B Table 4(B), UDYAM verification, Form 67, IRS Schedule K-3).
- **Automated OKF Validator & Linter**: Created `scripts/validate_okf.js` (`npm run validate`) enforcing schema validation, ISO date checks, `OPEN_ENDED` validity flags, and official URL checks.
- **Cryptographic Manifest & Integrity Tooling**: Created `scripts/generate_manifest.js` calculating per-file SHA-256 hashes and a root Merkle digest (`sha256-d389...`). Added `npm run manifest:check` for tamper-evidence verification.
- **Automated Catalog Generator**: Created `scripts/build_catalog.js` (`npm run catalog`) compiling an authoritative markdown index ([`docs/CATALOG.md`](./docs/CATALOG.md)) from the repository corpus.
- **GitHub Actions CI Matrix**: Added `.github/workflows/ci.yml` running validation, manifest integrity check, and test suite on Ubuntu and Windows across Node.js 18.x, 20.x, and 22.x with minimal permissions (`contents: read`).
- **Governance & Contributor Protocols**:
  - [`CONTRIBUTING.md`](./CONTRIBUTING.md): Authoring standards for `section.json`, executive circulars, and CA review process.
  - [`SECURITY.md`](./SECURITY.md): Responsible disclosure policy for code flaws and statutory inaccuracy triage (2-business-day acknowledgment).
  - [`docs/DATA_LICENSING.md`](./docs/DATA_LICENSING.md): Explicit tripartite licensing separating MIT software, public domain statutes, and CC BY 4.0 structured annotations.
  - `.github/ISSUE_TEMPLATE/`: Templates for new statute requests and legislative amendment notifications.
  - `.github/PULL_REQUEST_TEMPLATE.md`: 7-point verification and provenance checklist.
- **11-Suite Multi-Domain Regression Test**: Expanded `test.js` to cover all 6 provisions, boundary conditions, dead-network offline fallbacks, explicit retrieval modes, and failure cases.

### Changed
- **Explicit Retrieval Modes**: Refactored `lookupStatute()` in `src/index.js` to support explicit `mode: 'auto' | 'local' | 'edge'`. Responses return explicit `retrievalMode` (`LOCAL_SNAPSHOT` vs `EDGE_LIVE`), `isOfflineSnapshot: true`, and advisory notes to prevent stale offline data from being mistaken for real-time gazetted law.
- **Terminal Typography**: Replaced all emojis with standards-compliant bracketed status tags (`[OK]`, `[INFO]`, `[WARN]`, `[ERROR]`, `[PASS]`) across CLI, test suites, and scripts.
- **Temporal Alignment**: Updated temporal references to the *Income-tax Act, 2025* to reflect its effective date of 1 April 2026.
- **Policy Alignment**: Replaced defensive maintenance wording with a grounded, transparent **Free OKF Sync and Maintenance Policy** clarifying best-effort service boundaries.

### Removed
- Deprecated legacy unversioned flat schemas in favor of domain-scoped hierarchy.
