# MudraForge Statutory Knowledge Quality Card

> **Format Reference**: Inspired by Google's *Data Cards Playbook* and the OpenSSF Project Quality Standards.  
> **Target Package**: `@mudraforge/statutory` v2.4.0  
> **Evaluation Mode**: Machine-audited against primary sources, official gazettes, and test fixtures.  
> **Generated Timestamp**: 2026-10-22T18:29:02.599Z

---

## 1. Corpus Summary Metrics

| Dimension | Metric | Denominator / Baseline | Coverage Rate | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Source Citations** | 15 resolvable gazette URLs | 15 total citations declared | **100.0%** | VERIFIED |
| **Temporal Validity Bounds** | 6 sections with explicit dates | 6 total bundled sections | **100.0%** | VERIFIED |
| **Dual-Act 2025 Transition Bridges** | 3 direct tax provisions mapped | 3 direct tax provisions | **100.0%** | VERIFIED |
| **Attached Administrative Circulars** | 6 official circulars | 6 sections across 4 domains | **100% Attached** | VERIFIED |
| **Attached Return/Compliance Schemas** | 8 schemas/templates | 6 sections across 4 domains | **100% Attached** | VERIFIED |
| **Cryptographic Merkle Verification** | 20 bundle files verified | SHA-256 Merkle root digest | **0 Mismatches** | VERIFIED |

---

## 2. Epistemic Quality & Provenance Boundaries

1. **Statutory Text Authority**:
   - The provisions represented in this repository are structured representations of Indian Union Acts, CBDT circulars, CBIC notifications, and US Internal Revenue Code provisions.
   - Primary legal authority resides exclusively in the official **Gazette of India**, **CBDT/CBIC executive notifications**, and official legislative publications.
   - Cryptographic SHA-256 hashes certify **byte-level distribution integrity**, not judicial infallibility.

2. **Temporal Window Modeling**:
   - Every provision models an explicit `validFrom` and `validTo` (or `OPEN_ENDED`).
   - Sunset transitions (such as Section 206C(1H) sunset on 1 April 2025 and Income-tax Act, 1961 sunset on 31 March 2026) are evaluated deterministically at query time.

3. **Dual-Gate Verification**:
   - Every release candidate must pass both:
     - **Gate A (Structural Validation)**: Zero schema lint errors via `npm run validate`.
     - **Gate B (Independent Legal Ground Truth)**: Differential test suite (`test.js`) verifying calculations against independently prepared CA tax baselines.

4. **Four Distinct Levels of Verification Assurance**:
   - **Level 1 (Reachable Source)**: The declared official Gazette, CBDT, or CBIC URL resolves with HTTP 200 (verified by automated crawl).
   - **Level 2 (Text Conformance)**: The statutory threshold numbers, rates, and effective dates in `section.json` correspond directly to the official legislative paragraphs.
   - **Level 3 (Differential Computation)**: The calculation logic is independently executed against edge-case test vectors (e.g. ₹50L excess boundary, inoperative PAN rates) in `test.js`.
   - **Level 4 (Practitioner Review)**: The provision has undergone review by an empanelled Chartered Accountant or legal scholar (indicated in `reviewedBy`).

---

## 3. Provision-by-Provision Quality Registry

| Section Code | Statutory Provision | Governing Statute | Temporal Window | Status | Citations | Circulars | Forms | 2025 Act Successor |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **206C(1H)** | Collection of tax at source by seller on receipt of consideration for sale of goods (Omitted effective 1 April 2025) | Income-tax Act, 1961 | `2020-10-01` to `2025-03-31` | `SUNSET_SUPERSEDED` | 2 | 1 | 0 | Finance Act, 2025 (Statutory Sunset) (Section 206C(1H) Omitted) |
| **194Q** | Deduction of tax at source on payment of a certain sum for purchase of goods | Income-tax Act, 1961 (Act No. 43 of 1961) | `2021-07-01` to `2026-03-31` | `SUNSET_SUPERSEDED` | 2 | 2 | 2 | Income-tax Act, 2025 (Section 393(1), Table 8, Item (ii)) |
| **194J** | Fees for professional or technical services, royalty, and non-compete fees | Income-tax Act, 1961 | `1995-07-01` to `2026-03-31` | `SUNSET_SUPERSEDED` | 2 | 1 | 1 | Income-tax Act, 2025 (Section 393(1), Table 6, Item (iii)) |
| **17(5)** | Apportionment of credit and blocked input tax credits | Central Goods and Services Tax Act, 2017 (Act No. 12 of 2017) | `2017-07-01` to `OPEN_ENDED` | `ACTIVE` | 3 | 1 | 1 | CGST Act, 2017 (In force) (Section 17(5)(b)(i) & (b)(iii)) |
| **IRC-901-904** | Foreign Tax Credit authorization, separate basket limitation, and partnership pass-through reporting (Form 1116 / Schedule K-3) | Internal Revenue Code of 1986 (Title 26, U.S. Code) | `2021-01-01` to `OPEN_ENDED` | `ACTIVE` | 2 | 0 | 2 | Title 26, U.S. Code (Continuous) (26 U.S.C. §§ 901, 904(d), 904(j), 469) |
| **MSMED-15-16** | Statutory payment timelines to Micro & Small Enterprises, compound penal interest, and income tax deduction disallowance | Micro, Small and Medium Enterprises Development Act, 2006 read with Income-tax Act, 1961 Section 43B(h) | `2006-10-02` to `OPEN_ENDED` | `ACTIVE` | 4 | 1 | 2 | Income-tax Act, 2025 Section 37(2)(g) (Section 37(2)(g) of Income-tax Act, 2025) |

---

## 4. Maintenance & Defect Resolution Protocol

- **Defect Reporting**: Statutory inaccuracies must be submitted via GitHub Issues with the `statutory-defect` label, citing the official Gazette Notification or Circular number.
- **Initial Acknowledgement**: Target 2 business days for incoming reports.
- **Triage & Legal Ground-Truth Verification**: Target 5 business days to verify reported discrepancies against primary Gazette texts.
- **Targeted Patch Release**: Target 14 calendar days for verified statutory threshold or rate defects (or scheduled in the next monthly corpus release).
- **Local Continuity Guarantee**: Local filesystem queries continue operating indefinitely without network or server reliance even if hosted edge services are interrupted.
