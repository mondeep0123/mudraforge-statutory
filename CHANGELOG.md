# Changelog

All notable changes to `@mudraforge/statutory` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.7.0] - 2026-10-25

### Added
- **Edge Sync Merkle Pinning & Trust Anchor Alignment**:
  - Added v2.7.0 edge Merkle root digest (`sha256-6953ce79b63bb2a5809dc928178b4631f08448aa2dcde107dde10f84890bf5cb`) to authoritative `PINNED_RELEASE_ROOTS`.
  - Unified local package, Edge Worker, and public manifest at OKF v2.7.0.
  - Added CLI flag parsing for `--dest <path>`, `-d <path>`, and `--dest=<path>` in `bin/cli.js sync` command.
  - Verified atomic remote sync downloads and unpacks all 24 statutory provisions cleanly into custom destination directories.

---

## [2.6.0] - 2026-10-25

### Added
- **100% Complete Corporate Finance AP Corpus (24 Provisions across 5 Core Domains)**:
  - `direct_tax`: Added **Section 194R** (10% TDS on business perquisites & benefits > ₹20k, Circulars 12/2022 & 18/2022) and **Section 206AB** (Higher withholding rate on non-filers: higher of 2× statutory rate or 5%).
  - `indirect_tax_gst`: Added **Section 51** (2% GST TDS on government/PSU contracts > ₹2.5L), **Section 34** (Credit and debit notes statutory adjustments & 30th November cutoff), **Section 10** (Composition scheme: restrictions on tax collection and ITC blockage), and **Rule 48(4)** (Mandatory E-Invoicing & B2B QR code mandate for turnover > ₹5 Cr with Rule 48(5) void invoice penalty).
  - Expanded test coverage from 49 to 55 comprehensive regression suites with 100% pass rate.
- **Cognitive AI Explanation Toggle**:
  - `POST /api/v1/statutory/calculate` now supports an `explain: true` toggle and rich `mode: 'analysis'` senior legal counsel opinion generated via Google Gemini 2.5 Flash / Workers AI Llama 3.3.
  - Sub-10ms fast path preserved for `mode: 'standard'` and `explain: false` for high-throughput automated ERP batch processing.
- **Section 194J Category Normalization & Fail-Closed Safety**:
  - Flexible case-insensitive synonym mapping (`'professional'`, `'prof'`, `'ca'`, `'legal'`, `'fts'`, `'technical'`, `'director'`).
  - Unknown service categories strictly reject with HTTP 400 `INVALID_SERVICE_CATEGORY` instead of defaulting silently to 2%.
- **MSME Wholesale & Retail Trader Exclusion (NIC 45, 46, 47)**:
  - Deterministically enforces Ministry of MSME OM dated 02.07.2021, setting delayed payment interest to ₹0 with `EXEMPT_TRADER_EXCLUSION`.

---

## [2.5.1] - 2026-10-25

### Fixed
- **Citation Link Integrity & Canonical Landing Pages**: Audited all 70 statutory citation links across the OKF corpus, resolving broken direct PDF paths on `incometaxindia.gov.in` and `msme.gov.in` with canonical regulatory portal landing pages. Replaced decommissioned `main.sci.gov.in` with active `sci.gov.in`.
- **Government PKI TLS Transport**: Added recognition for Government of India Controller of Certifying Authorities (CCA / NIC CA) leaf certificate verification on `taxinformation.cbic.gov.in`.

### Added
- **Automated Citation Verifier**: Added `scripts/verify_citation_links.js` (`npm run citations`) enforcing regulatory domain whitelisting, 100% HTTPS protocol compliance, and live network reachability probing (`--live`).
- **OKF Maintenance Standard Operating Procedure**: Documented normative engineering and legal standard in [`docs/OKF_MAINTENANCE_SOP.md`](./docs/OKF_MAINTENANCE_SOP.md) defining the 10-step statutory provision lifecycle, the Dual-Tier URL Standard, Merkle tree cryptographic re-pinning, and anti-drift invariants.

---

## [2.5.0] - 2026-10-24

### Added
- **Multi-Domain Corpus Expansion**: Expanded statutory coverage from 8 to 18 provisions across 5 foundational domains:
  - `corporate_ma_restructuring` (Section 50B Slump Sale)
  - `direct_tax` (Sections 194C, 194H, 194I, 194J, 194Q, 206C(1H) sunset, 393 forward law)
  - `indirect_tax_gst` (Sections 8 composite/mixed supplies, 9(3) RCM, 16(2) ITC eligibility, 17(5) blocked ITC)
  - `international_tax` (Section 195 cross-border remittances, IRC §§ 901/904 foreign tax credits)
  - `msme_commercial` (Sections 7, 15, 16, 22 of MSMED Act, 2006, MCA Form MSME-1)
- **Offline ISO/IEC 7064 Mod-36 Checksum**: Deterministic Indian GSTIN and PAN checksum validator in `verifyGstinChecksum()`.
- **Two-Pass Precision Resolution**: Enhanced `lookupLocalStatute()` with exact-match priority, resolving single-digit section numbers (e.g., Section 8, Section 9(3)) without sub-string prefix collisions.

---

## [2.4.2] - 2026-10-24

### Added
- **npm Package Update Notifier**: Lightweight, zero-dependency update notifier querying `registry.npmjs.org` with a 24-hour temporary file cache (`checkForPackageUpdate()`).
- **Unified `check-update` CLI Command**: Now audits both npm package code updates against the npm registry and legal rule updates against the Cloudflare Edge manifest.
- **Non-Intrusive Terminal Footers**: Automatically surfaces `[NOTICE]` prompts when a newer npm release is available, with opt-out support via `NO_UPDATE_NOTIFIER=1` or `CI=true`.

---

## [2.4.1] - 2026-10-24

### Added
- **Developer Navigation & Usability**: Compact, audited Table of Contents in `README.md` targeting all key documentation sections.
- **Package Metadata**: Official `homepage` pointing to `https://mudraforge.in/docs` and `bugs` pointing to GitHub Issues.
- **Supported Application Patterns**: Documented clear integration boundaries across AI Agents (local `SKILL.md`), Finance Software (declarative threshold schemas), and Developer Tooling.
- **Corporate M&A Restructuring Domain**: Section 50B slump sale capital gains based on WDV net worth (Section 43(6)), Form 3CEA CA certification schema, and Section 281 clearance checklist.
- **Dual-Act Successor Mapping**: Section 393 (*Income-tax Act, 2025*) successor provision mapping for Section 194Q.
- **Cryptographic Trust Anchor & Anti-Tamper Hardening**: Ed25519 digital signature verification for remote bundles, CRL key revocation enforcement, replay protections, Windows reserved device name protection, and strict production bypass locks (36 passing regression suites).

### Changed
- **Statutory Rate Enforcements**: Section 194J non-PAN deduction rate updated to the statutory 20% penalty tier under Section 206AA.
- **Quotas & Error Semantics**: Documented Cloudflare Edge API rate limits, error codes, and HTTP semantics.

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
