# Statutory Knowledge Catalog

> **Institutional Reference Index**  
> Package: `@mudraforge/statutory` | Version: `2.4.0` | Standard: `OKF v0.2`  
> Epistemic Baseline: Union Budget 2025-26, Finance Act, 2025, and official executive gazettes.

This catalog is deterministically generated from the machine-readable Open Knowledge Format (`section.json`, executive circulars, and return schemas) bundled within this repository.

---

## Catalog Summary Matrix

| Domain | Section | Governing Statute | Validity Period | Temporal Status | Key Statutory Threshold | Primary Form / Schedule |
|---|---|---|---|---|---|---|
| `direct_tax` | [**206C(1H)**](#206c-1h-) | Income-tax Act, 1961 | 2020-10-01 &rarr; 2025-03-31 | **Sunset** (2025-03-31) | Seller > ₹10Cr; Receipts > ₹50L | N/A |
| `direct_tax` | [**194Q**](#194q) | Income-tax Act, 1961 | 2021-07-01 &rarr; 2026-03-31 | `Active` | Buyer > ₹10Cr; Purchases > ₹50L | `form_26q_quarterly_return` |
| `direct_tax` | [**194J**](#194j) | Income-tax Act, 1961 | 1995-07-01 &rarr; 2026-03-31 | `Active` | General Provision | `form_16a_tds_certificate` |
| `indirect_tax_gst` | [**17(5)**](#17-5-) | Central Goods and Services Tax Act, 2017 | 2017-07-01 &rarr; In Force | `Active` | General Provision | `gstr_2b_ineligible_reconciliation` |
| `international_tax` | [**IRC-901-904**](#irc-901-904) | Internal Revenue Code of 1986 | 2021-01-01 &rarr; In Force | `Active` | General Provision | `form_67_statement_of_foreign_tax` |
| `msme_commercial` | [**MSMED-15-16**](#msmed-15-16) | Micro, Small and Medium Enterprises Development Act, 2006 read with Income-tax Act, 1961 Section 43B | 2006-10-02 &rarr; In Force | `Active` | 15 Days (Oral) / 45 Days (Written) | `schedule_iii_msme_disclosure` |

---

## Coverage, Freshness & Verification Registry

The table below records the provenance baseline, verification standard, and explicit operational boundaries for each bundled provision.

| Section Code | Subject Domain | Jurisdiction | Epistemic Baseline | Bundled Status | Verification Standard | Known Coverage Limitations |
|---|---|---|---|---|---|---|
| `194Q` | Direct Tax (TDS) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Applicable strictly to buyer turnover > ₹10Cr; does not cover foreign remittances without PE. |
| `194J` | Direct Tax (TDS) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Covers standard FTS (2%) and Professional (10%); royalty cinematic films covered under separate sub-clause. |
| `206C(1H)` | Direct Tax (TCS) | Republic of India | October 2026 | Bundled Anchor | Sunset Interception Tested | Sunset w.e.f. 1 April 2025 by Finance Act 2025; retained for historical FY audit reconciliations. |
| `17(5)` | Indirect Tax (GST) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Disallows blocked categories; evaluates statutory employer obligation proviso under Circular 172. |
| `MSMED-15-16` | Commercial AP / MSME | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Covers Micro and Small suppliers with valid Udyam; wholesale/retail traders excluded per OM 2021. |
| `IRC-901-904` | International Tax | United States | October 2026 | Bundled Anchor | Dual Tax Legal Reviewed | Covers pass-through Box 21 to Schedule K-3 / Form 1116 basket requirements; does not compute AMT. |

---

## Detailed Domain Specifications

### Direct Tax (Income-tax Act, 1961 / Income-tax Act, 2025)

#### Section 206C(1H): Collection of tax at source by seller on receipt of consideration for sale of goods (Omitted effective 1 April 2025)

- **Governing Statute**: Income-tax Act, 1961
- **Successor Provision**: Finance Act, 2025 (Statutory Sunset) &mdash; Section 206C(1H) Omitted
- **Temporal Validity**: `2020-10-01` to `2025-03-31`
- **Legislative Sunset / Transition**: CRITICAL SUNSET: Section 206C(1H) is formally omitted by Finance Act, 2025 effective 1 April 2025. Post-sunset, seller TCS ceases; buyer TDS under Section 194Q exclusively governs.
- **Machine-Readable Source**: [`okf/direct_tax/tcs_goods_206c_1h/section.json`](./okf/direct_tax/tcs_goods_206c_1h/section.json)

**Statutory Summary**:
> Prior to 1 April 2025, a seller whose turnover exceeded ₹10 Crore was required to collect 0.1% TCS on receipts exceeding ₹50 Lakhs, unless the buyer was already liable to deduct TDS under Section 194Q. Effective 1 April 2025, this provision is omitted by the Finance Act 2025 to eliminate double-compliance friction.

**Key Deterministic Thresholds**:
```json
{
  "sellerPriorYearTurnoverCr": 10,
  "annualReceiptThresholdInr": 5000000,
  "standardTcsRatePercent": 0.1,
  "precedenceRule": "Section 194Q buyer TDS always took precedence over Section 206C(1H) seller TCS when buyer was compliant."
}
```

**Official Citations & Trust Anchors**:
- **Parliament of India / Ministry of Finance** — [Finance Act, 2025 (Section 206C(1H) Sunset Clause)](https://incometaxindia.gov.in): *Omission of Section 206C(1H) effective 1 April 2025*
- **Central Board of Direct Taxes (CBDT)** — [Circular No. 17 of 2020](https://incometaxindia.gov.in/communications/circular/circular_17_2020.pdf): *Guidelines for collection of tax at source under section 206C(1H)*

**Executive Circulars Bundled**:
- [`finance_act_2025_sunset_memo.md`](./okf/direct_tax/tcs_goods_206c_1h/circulars/finance_act_2025_sunset_memo.md)

---

#### Section 194Q: Deduction of tax at source on payment of a certain sum for purchase of goods

- **Governing Statute**: Income-tax Act, 1961 (Act No. 43 of 1961)
- **Successor Provision**: Income-tax Act, 2025 &mdash; Section 393(1), Table 8, Item (ii)
- **Temporal Validity**: `2021-07-01` to `2026-03-31`
- **Legislative Sunset / Transition**: Transitions to Section 393(1) Table 8(ii) of the Income-tax Act, 2025 effective 1 April 2026.
- **Machine-Readable Source**: [`okf/direct_tax/tds_goods_194q/section.json`](./okf/direct_tax/tds_goods_194q/section.json)

**Statutory Summary**:
> Any buyer whose total sales, gross receipts, or turnover from business exceeds ₹10 Crore in the preceding financial year, responsible for paying any sum to a resident seller for purchase of goods exceeding ₹50 Lakhs in the current financial year, must deduct 0.1% TDS on the amount exceeding ₹50 Lakhs at the time of credit to seller account or payment, whichever is earlier.

**Key Deterministic Thresholds**:
```json
{
  "buyerPriorYearTurnoverCr": 10,
  "annualPurchaseThresholdInr": 5000000,
  "standardDeductionRatePercent": 0.1,
  "inoperativePanPenaltyRatePercent": 5,
  "taxableBaseScope": "Tax is deductible strictly on the excess over ₹50 Lakhs, NOT on the aggregate gross turnover."
}
```

**Official Citations & Trust Anchors**:
- **Central Board of Direct Taxes (CBDT)** — [Circular No. 13 of 2021 (Dated 30 June 2021)](https://incometaxindia.gov.in/communications/circular/circular_13_2021.pdf): *Guidelines under section 194Q of the Income-tax Act, 1961 - Threshold calculation & advance netting*
- **Central Board of Direct Taxes (CBDT)** — [Circular No. 23 of 2017](https://incometaxindia.gov.in/communications/circular/circular23_2017.pdf): *Exclusion of separately stated GST from basic taxable amount for TDS purposes*

**Executive Circulars Bundled**:
- [`cbdt_circular_13_2021_guidelines.md`](./okf/direct_tax/tds_goods_194q/circulars/cbdt_circular_13_2021_guidelines.md)
- [`cbdt_circular_23_2017_gst_unbundling.md`](./okf/direct_tax/tds_goods_194q/circulars/cbdt_circular_23_2017_gst_unbundling.md)

**Compliance Return Schemas & Templates**:
- [`form_26q_quarterly_return.json`](./okf/direct_tax/tds_goods_194q/forms/form_26q_quarterly_return.json)
- [`vendor_pan_declaration.md`](./okf/direct_tax/tds_goods_194q/forms/vendor_pan_declaration.md)

---

#### Section 194J: Fees for professional or technical services, royalty, and non-compete fees

- **Governing Statute**: Income-tax Act, 1961
- **Successor Provision**: Income-tax Act, 2025 &mdash; Section 393(1), Table 6, Item (iii)
- **Temporal Validity**: `1995-07-01` to `2026-03-31`
- **Legislative Sunset / Transition**: Transitions to Section 393(1) Table 6 Item (iii) of Income-tax Act, 2025 effective 1 April 2026.
- **Machine-Readable Source**: [`okf/direct_tax/tds_services_194j/section.json`](./okf/direct_tax/tds_services_194j/section.json)

**Statutory Summary**:
> Deduction of tax at source on fees paid to residents for: (a) Professional services (10%), (b) Fees for technical services (2% effective 1 April 2020), (c) Royalty for sale/distribution of cinematographic films (2%), (d) Other royalties and non-compete fees (10%). Threshold: ₹30,000 per financial year for each separate category. Reclassification Risk: If IT architecture/technical consultancy is reclassified by an Assessing Officer as managerial/professional advice, differential withholding of 8% plus Section 201(1A) penal interest (1% per month) attaches.

**Key Deterministic Thresholds**:
```json
{
  "categoryThresholdInr": 30000,
  "technicalServicesRatePercent": 2,
  "professionalServicesRatePercent": 10,
  "nonCompliantPanPenaltyRatePercent": 20,
  "cbdtCircular23GstExclusion": "TDS applies on basic service amount excluding separately stated GST."
}
```

**Official Citations & Trust Anchors**:
- **Ministry of Finance / CBDT** — [Finance Act, 2020 Amendment to Section 194J(1)](https://incometaxindia.gov.in): *Reduction of TDS rate on Fees for Technical Services (FTS) from 10% to 2%*
- **Central Board of Direct Taxes (CBDT)** — [Circular No. 23 of 2017](https://incometaxindia.gov.in/communications/circular/circular23_2017.pdf): *Exclusion of GST component from value of service for tax deduction at source*

**Executive Circulars Bundled**:
- [`cbdt_circular_03_2020_fts_rate_cut.md`](./okf/direct_tax/tds_services_194j/circulars/cbdt_circular_03_2020_fts_rate_cut.md)

**Compliance Return Schemas & Templates**:
- [`form_16a_tds_certificate.json`](./okf/direct_tax/tds_services_194j/forms/form_16a_tds_certificate.json)

---

### Indirect Tax (Central Goods and Services Tax Act, 2017)

#### Section 17(5): Apportionment of credit and blocked input tax credits

- **Governing Statute**: Central Goods and Services Tax Act, 2017 (Act No. 12 of 2017)
- **Successor Provision**: CGST Act, 2017 (In force) &mdash; Section 17(5)(b)(i) & (b)(iii)
- **Temporal Validity**: `2017-07-01` to `OPEN_ENDED`
- **Legislative Sunset / Transition**: Active statutory restriction.
- **Machine-Readable Source**: [`okf/indirect_tax_gst/blocked_itc_17_5/section.json`](./okf/indirect_tax_gst/blocked_itc_17_5/section.json)

**Statutory Summary**:
> Input Tax Credit (ITC) shall NOT be available in respect of: (i) Food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery; (ii) Motor vehicles for transportation of persons having approved seating capacity of up to 13 persons (including driver), except when used for making further taxable supply of such vehicles/transportation; (iii) Membership of a club, health, and fitness centre. Proviso exception: Credit is permissible ONLY where the inward supply is used for making an outward taxable supply of the same category, or where it is statutory obligation for an employer to provide the same under any law for the time being in force (e.g. Factories Act 1948 Section 46).

**Key Deterministic Thresholds**:
```json
{
  "blockedCategories": [
    "Outdoor Catering",
    "Food & Beverages",
    "Motor Vehicles <= 13 seats",
    "Club Membership",
    "Employee Gifts > ₹50,000"
  ],
  "statutoryAccountingDirective": "Prohibited from capitalizing or crediting to ITC Asset Ledger (Account 1400). Must be booked directly as Ineligible Operating Expense in P&L (Account 5010)."
}
```

**Official Citations & Trust Anchors**:
- **Central Board of Indirect Taxes and Customs (CBIC)** — [Central Goods and Services Tax Act, 2017 Section 17(5)](https://cbic-gst.gov.in): *Statutory list of blocked input tax credits*
- **Ministry of Labour & Employment** — [Factories Act, 1948 Section 46](https://labour.gov.in): *Mandatory canteen provision in factories employing > 250 workers (Statutory Proviso Exception)*

**Executive Circulars Bundled**:
- [`cbic_circular_172_2022_employer_obligations.md`](./okf/indirect_tax_gst/blocked_itc_17_5/circulars/cbic_circular_172_2022_employer_obligations.md)

**Compliance Return Schemas & Templates**:
- [`gstr_2b_ineligible_reconciliation.json`](./okf/indirect_tax_gst/blocked_itc_17_5/forms/gstr_2b_ineligible_reconciliation.json)

---

### Cross-Border & International Tax (Internal Revenue Code)

#### Section IRC-901-904: Foreign Tax Credit authorization, separate basket limitation, and partnership pass-through reporting (Form 1116 / Schedule K-3)

- **Governing Statute**: Internal Revenue Code of 1986 (Title 26, U.S. Code)
- **Successor Provision**: Title 26, U.S. Code (Continuous) &mdash; 26 U.S.C. §§ 901, 904(d), 904(j), 469
- **Temporal Validity**: `2021-01-01` to `OPEN_ENDED`
- **Legislative Sunset / Transition**: Active US international tax regime.
- **Machine-Readable Source**: [`okf/international_tax/foreign_tax_credit_irc_901_904/section.json`](./okf/international_tax/foreign_tax_credit_irc_901_904/section.json)

**Statutory Summary**:
> A taxpayer claiming a foreign tax credit under 26 U.S.C. § 901 based on partnership pass-through items reported on IRS Form 1065 Schedule K-1 Box 21 must substantiate the claim with Schedule K-3 (Partner Share of International Income and Taxes). Box 21 alone does not establish legal compliance. Form 1116 separate basket limitation calculations (26 U.S.C. § 904(d)), passive activity limits (26 U.S.C. § 469), and country-by-country breakdown are statutory prerequisites before the credit may be claimed on federal income tax returns.

**Key Deterministic Thresholds**:
```json
{
  "deMinimisExemptionMfJUsd": 600,
  "deMinimisExemptionSingleUsd": 300,
  "statutoryRequirement": "Schedule K-3 mandatory supporting attachment for amounts exceeding de minimis thresholds."
}
```

**Official Citations & Trust Anchors**:
- **Internal Revenue Service (IRS)** — [Instructions for Form 1116 (Foreign Tax Credit)](https://www.irs.gov/forms-pubs/about-form-1116): *Substantiation requirements and separate basket allocations*
- **Internal Revenue Service (IRS)** — [Instructions for Schedule K-3 (Form 1065)](https://www.irs.gov/forms-pubs/about-schedule-k-3-form-1065): *Partner Share of Income, Deductions, Credits, etc. - International*

**Compliance Return Schemas & Templates**:
- [`form_67_statement_of_foreign_tax.json`](./okf/international_tax/foreign_tax_credit_irc_901_904/forms/form_67_statement_of_foreign_tax.json)
- [`irs_schedule_k3_reporting.json`](./okf/international_tax/foreign_tax_credit_irc_901_904/forms/irs_schedule_k3_reporting.json)

---

### Commercial & MSME Compliance (MSMED Act, 2006)

#### Section MSMED-15-16: Statutory payment timelines to Micro & Small Enterprises, compound penal interest, and income tax deduction disallowance

- **Governing Statute**: Micro, Small and Medium Enterprises Development Act, 2006 read with Income-tax Act, 1961 Section 43B(h)
- **Successor Provision**: Income-tax Act, 2025 Section 37(2)(g) &mdash; Section 37(2)(g) of Income-tax Act, 2025
- **Temporal Validity**: `2006-10-02` to `OPEN_ENDED`
- **Legislative Sunset / Transition**: Section 43B(h) takes effect from FY 2023-24 (AY 2024-25) and continues under Section 37(2)(g) of the Income-tax Act, 2025.
- **Machine-Readable Source**: [`okf/msme_commercial/delayed_payments_15_16/section.json`](./okf/msme_commercial/delayed_payments_15_16/section.json)

**Statutory Summary**:
> Under Section 15 of the MSMED Act, where any supplier supplies any goods or renders any services to any buyer, the buyer shall make payment therefor on or before the date agreed upon in writing (which shall NOT exceed 45 days), or if there is no agreement, before the appointed day (15 days from physical acceptance). Under Section 16, failure to pay triggers compound interest with monthly rests at 3 times the RBI Bank Rate (which cannot be claimed as a tax-deductible expense). Under Section 43B(h) of the Income-tax Act, any sum payable to a micro or small enterprise beyond the specified limit is disallowed as a business deduction in the financial year of incurrence and allowed only in the year of actual payment.

**Key Deterministic Thresholds**:
```json
{
  "statutoryDefaultTimelineDays": 15,
  "maximumWrittenAgreementTimelineDays": 45,
  "penalInterestRate": "3 times the Bank Rate notified by the Reserve Bank of India (compounded monthly)",
  "applicableEnterprises": "Micro and Small Enterprises with valid Udyam Registration (Medium Enterprises are excluded)",
  "traderExclusionRule": "Enterprises registered solely under Retail and Wholesale Trade (NIC 45, 46, 47) are excluded from delayed payment protection per Ministry of MSME OM No. 2/1(5)/2021-P&G/Policy."
}
```

**Official Citations & Trust Anchors**:
- **Ministry of Law and Justice** — [Micro, Small and Medium Enterprises Development Act, 2006 (Act No. 27 of 2006)](https://msme.gov.in): *Chapter V: Delayed Payments to Micro and Small Enterprises*
- **Ministry of MSME** — [Office Memorandum No. 2/1(5)/2021-P&G/Policy (Dated 2 July 2021)](https://msme.gov.in/sites/default/files/OM_Retail_Wholesale.pdf): *Inclusion of Retail and Wholesale Trade under MSME - Restriction on Chapter V delayed payment benefits*
- **Central Board of Direct Taxes (CBDT)** — [Finance Act, 2023 (Enacting Section 43B(h))](https://incometaxindia.gov.in): *Disallowance of expenditure for delayed payments to Micro and Small Enterprises*

**Executive Circulars Bundled**:
- [`msme_om_2021_trader_exclusion.md`](./okf/msme_commercial/delayed_payments_15_16/circulars/msme_om_2021_trader_exclusion.md)

**Compliance Return Schemas & Templates**:
- [`schedule_iii_msme_disclosure.md`](./okf/msme_commercial/delayed_payments_15_16/forms/schedule_iii_msme_disclosure.md)
- [`udyam_registration_verification.json`](./okf/msme_commercial/delayed_payments_15_16/forms/udyam_registration_verification.json)

---

