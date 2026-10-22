# Statutory Knowledge Catalog

> **Institutional Reference Index**  
> Package: `@mudraforge/statutory` | Version: `2.4.0` | Standard: `OKF v0.2`  
> Epistemic Baseline: Union Budget 2025-26, Finance Act, 2025, and official executive gazettes.

This catalog is deterministically generated from the machine-readable Open Knowledge Format (`section.json`, executive circulars, and return schemas) bundled within this repository.

---

## Catalog Summary Matrix

| Domain | Section | Governing Statute | Validity Period | Temporal Status | Key Statutory Threshold | Primary Form / Schedule |
|---|---|---|---|---|---|---|
| `corporate_ma_restructuring` | [**50B**](#50b) | Income-tax Act, 1961 | 2000-04-01 &rarr; In Force | `Active` | General Provision | `form_3cea_chartered_accountant_report` |
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

### Corporate M&A, Restructuring & Successor Liability (Income-tax & CGST)

#### Section 50B: Special provision for computation of capital gains in case of slump sale

- **Governing Statute**: Income-tax Act, 1961 (Act No. 43 of 1961)
- **Successor Provision**: Income-tax Act, 2025 &mdash; Section 78 (Capital gains on slump sale of undertakings)
- **Temporal Validity**: `2000-04-01` to `OPEN_ENDED`
- **Legislative Sunset / Transition**: Continues under Income-tax Act, 1961 and maps to Section 78 of the Income-tax Act, 2025 effective 1 April 2026.
- **Machine-Readable Source**: [`okf/corporate_ma_restructuring/slump_sale_50b/section.json`](./okf/corporate_ma_restructuring/slump_sale_50b/section.json)

**Statutory Summary**:
> Any profits or gains arising from the slump sale (transfer of one or more undertakings as a result of the sale for a lump sum consideration without values being assigned to individual assets and liabilities u/s 2(42C)) effected in the previous year shall be chargeable to income-tax as capital gains arising from the transfer of long-term capital assets if the undertaking was owned and held by the assessee for more than 36 months, or short-term capital assets if held for not more than 36 months. Capital gain is calculated as the Full Value of Consideration (determined under Rule 11UAE) minus the aggregate net worth of the undertaking. Revaluations are ignored; depreciable assets are valued at WDV under Section 43(6); other assets at book value. No benefit of indexation is available under Section 50B(2). Transfer of a going concern attracts 0% GST under Notification 12/2017-Central Tax (Rate) Entry 2.

**Key Deterministic Thresholds**:
```json
{
  "longTermHoldingPeriodThresholdMonths": 36,
  "revaluationPermittedInNetWorth": false,
  "depreciableAssetValuationBasis": "Written Down Value (WDV) under Section 43(6)",
  "nonDepreciableAssetValuationBasis": "Book value in balance sheet (ignoring revaluation)",
  "indexationBenefitAvailable": false,
  "mandatoryAuditReport": "Form 3CEA by a practicing Chartered Accountant submitted one month prior to Section 139(1) due date",
  "gstApplicability": "Exempt (0% GST under Notification 12/2017-Central Tax (Rate) Entry 2 as transfer of going concern)",
  "successorTaxLiability": "Joint and several liability under Section 313 of Income-tax Act and Section 85 of CGST Act",
  "section281NocRequirement": "Mandatory tax clearance certificate from Assessing Officer if tax assessment proceedings or demand notices are pending"
}
```

**Official Citations & Trust Anchors**:
- **Income Tax Department, Ministry of Finance** — [Section 50B, Income-tax Act, 1961](https://incometaxindia.gov.in/acts/income-tax-act-1961/section-50b.htm): *Special provision for computation of capital gains in case of slump sale*
- **Central Board of Direct Taxes (CBDT)** — [Notification No. 68/2021 (Dated 24 May 2021)](https://incometaxindia.gov.in/communications/notification/notification_68_2021.pdf): *Rule 11UAE: Computation of fair market value of capital assets for the purposes of section 50B*
- **Central Board of Indirect Taxes and Customs (CBIC)** — [Notification No. 12/2017-Central Tax (Rate) Entry 2](https://cbic-gst.gov.in/pdf/central-tax-rate/notf-12-2017-cgst-rate-english.pdf): *Services by way of transfer of a going concern, as a whole or an independent part thereof, attract 0% GST*

**Executive Circulars Bundled**:
- [`cbdt_notification_68_2021_rule_11uae_fmv.md`](./okf/corporate_ma_restructuring/slump_sale_50b/circulars/cbdt_notification_68_2021_rule_11uae_fmv.md)
- [`cbic_notification_12_2017_going_concern_exemption.md`](./okf/corporate_ma_restructuring/slump_sale_50b/circulars/cbic_notification_12_2017_going_concern_exemption.md)

**Compliance Return Schemas & Templates**:
- [`form_3cea_chartered_accountant_report.json`](./okf/corporate_ma_restructuring/slump_sale_50b/forms/form_3cea_chartered_accountant_report.json)
- [`section_281_tax_clearance_checklist.md`](./okf/corporate_ma_restructuring/slump_sale_50b/forms/section_281_tax_clearance_checklist.md)

---

### Direct Tax (Income-tax Act, 1961 / Income-tax Act, 2025)

#### Section 206C(1H): Collection of tax at source by seller on receipt of consideration for sale of goods (Omitted effective 1 April 2025)

- **Governing Statute**: Income-tax Act, 1961
- **Successor Provision**: Finance Act, 2025 (Statutory Sunset) &mdash; Section 206C(1H) Omitted
- **Temporal Validity**: `2020-10-01` to `2025-03-31`
- **Legislative Sunset / Transition**: CRITICAL SUNSET: Section 206C(1H) is formally omitted by Finance Act, 2025 effective 1 April 2025. Post-sunset, seller TCS on sale of goods ceases entirely. Tax withholding on sale of goods is governed strictly by buyer TDS under Section 194Q where the buyer independently satisfies Section 194Q threshold criteria (prior year turnover exceeding ₹10 Crore and cumulative purchases exceeding ₹50 Lakhs). If the buyer is not liable under Section 194Q, no withholding tax or collection of tax attaches to the sale of goods.
- **Machine-Readable Source**: [`okf/direct_tax/tcs_goods_206c_1h/section.json`](./okf/direct_tax/tcs_goods_206c_1h/section.json)

**Statutory Summary**:
> Prior to 1 April 2025, a seller whose turnover exceeded ₹10 Crore in the preceding financial year was required to collect 0.1% TCS on receipts exceeding ₹50 Lakhs from a buyer, unless the buyer was liable to deduct TDS under Section 194Q and had deducted such tax. Effective 1 April 2025, Section 206C(1H) is omitted by the Finance Act, 2025 to eliminate double-compliance overlap. Following this omission, seller TCS on goods is obsolete; buyer TDS under Section 194Q applies only where the buyer independently satisfies its statutory prerequisites.

**Key Deterministic Thresholds**:
```json
{
  "sellerPriorYearTurnoverCr": 10,
  "annualReceiptThresholdInr": 5000000,
  "standardTcsRatePercent": 0.1,
  "precedenceRule": "Historically prior to 1 April 2025, Section 194Q buyer TDS took statutory precedence over Section 206C(1H) seller TCS when the buyer was compliant."
}
```

**Official Citations & Trust Anchors**:
- **Parliament of India / Ministry of Finance** — [Finance Act, 2025 (Section 206C(1H) Sunset Clause)](https://incometaxindia.gov.in/communications/circular/circular_17_2020.pdf): *Omission of Section 206C(1H) effective 1 April 2025*
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
> Deduction of tax at source under Section 194J on payments to resident payees. (1) Statutory Rates: (a) Fees for Technical Services (FTS) under Section 194J(1)(a): 2% (reduced by Finance Act, 2020 s. 80); (b) Fees for Professional Services: 10%; (c) Royalty for cinematographic films: 2%; (d) Other royalties and non-compete fees under Section 28(va): 10%. (2) Threshold: ₹30,000 per financial year applied separately to each statutory category. (3) Classification Invariants: Professional services are strictly defined under Section 44AA(1) (legal, medical, engineering, architecture, accountancy, technical consultancy, interior decoration, IT); FTS is defined under Explanation 2 to Section 9(1)(vii) (managerial, technical, or consultancy services). (4) Reclassification Risk & Penalties: If services deducted at 2% (FTS) are recharacterized on assessment as Section 44AA(1) professional services (10%), the deductor is liable for: (a) the 8% differential withholding tax; (b) mandatory penal interest under Section 201(1A) at 1% per month from the date tax was deductible to date deducted and 1.5% from deduction to deposit; and (c) 30% business expenditure disallowance under Section 40(a)(ia) until tax is deposited.

**Key Deterministic Thresholds**:
```json
{
  "categoryThresholdInr": 30000,
  "technicalServicesRatePercent": 2,
  "professionalServicesRatePercent": 10,
  "nonCompliantPanPenaltyRatePercent": 20,
  "technicalServicesDefinition": "Explanation 2 to Section 9(1)(vii) of Income-tax Act, 1961 (managerial, technical, or consultancy services)",
  "professionalServicesDefinition": "Section 44AA(1) of Income-tax Act, 1961 (notified professions: legal, medical, engineering, architectural, accountancy, technical consultancy, interior decoration, IT professionals)",
  "penalInterestSection201_1A": "1% per month for delay/shortfall from date deductible; 1.5% per month from date deducted to date deposited",
  "disallowanceSection40_a_ia": "30% expenditure disallowance for failure to deduct or deposit TDS",
  "cbdtCircular23GstExclusion": "TDS applies on basic service amount excluding separately stated GST."
}
```

**Official Citations & Trust Anchors**:
- **Ministry of Law & Justice / CBDT** — [Finance Act, 2020 (Act No. 12 of 2020), Section 80 amending Section 194J(1)](https://incometaxindia.gov.in/communications/circular/circular_03_2020.pdf): *Reduction of TDS rate on Fees for Technical Services (FTS) from 10% to 2%*
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
> Input Tax Credit (ITC) shall NOT be available in respect of statutory blocked credits under Section 17(5) of the CGST Act, 2017: (a) Motor vehicles for transportation of persons having approved seating capacity up to 13 persons (including driver), vessels, and aircraft, with narrow exceptions; (b)(i) Food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery, leasing/renting/hiring of motor vehicles; (b)(ii) Membership of a club, health and fitness centre; (b)(iii) Travel benefits extended to employees on vacation (LTC/home travel); (c) & (d) Works contract services and goods/services for construction of immovable property on own account; (h) Goods lost, stolen, destroyed, written off, or disposed of by way of gift or free samples (blocked regardless of value). Statutory Proviso Exception: ITC is permissible where: (1) inward supply is used for making outward taxable supply of the same category; or (2) where an employer is obligated by statutory law in force to provide the goods/services to employees (e.g. Factories Act, 1948 Section 46 mandatory canteen for factories with > 250 workers). Legal Note on Gifts: Under Section 17(5)(h), ITC on gifts is blocked irrespective of value. The ₹50,000 threshold in CGST Schedule I Entry 2 proviso relates solely to whether gifts by an employer to an employee constitute a deemed taxable supply without consideration, and does not permit ITC under Section 17(5).

**Key Deterministic Thresholds**:
```json
{
  "blockedCategories": [
    "Outdoor Catering",
    "Food & Beverages",
    "Motor Vehicles <= 13 seats",
    "Club, Health & Fitness Membership",
    "Gifts and Free Samples (Sec 17(5)(h))",
    "Works Contract for Immovable Property (Sec 17(5)(c))"
  ],
  "giftTreatmentDistinction": "Section 17(5)(h) blocks ITC on gifts and free samples regardless of value. The ₹50,000 threshold in CGST Schedule I Entry 2 proviso applies strictly to deemed supply valuation for employer-employee gifts, not to ITC eligibility.",
  "erpImplementationGuidance": "In standard corporate ERP systems (e.g. SAP/NetSuite), blocked input tax must not be credited to the Electronic Credit Ledger / Asset Account (e.g. standard COA Account 1400); it must be capitalized into the asset cost or expensed to the respective operating expense ledger (e.g. standard COA Account 5010). Account numbers 1400/5010 represent configurable ERP conventions, not statutory account codes."
}
```

**Official Citations & Trust Anchors**:
- **Central Board of Indirect Taxes and Customs (CBIC)** — [Central Goods and Services Tax Act, 2017 Section 17(5)](https://taxinformation.cbic.gov.in): *Statutory list of blocked input tax credits*
- **Central Board of Indirect Taxes and Customs (CBIC)** — [Circular No. 172/04/2022-GST (CBIC-190354/172/2022-TRU)](https://taxinformation.cbic.gov.in): *Clarification on applicability of proviso across Section 17(5)(b) for statutory employer obligations*
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
> Distinct legal mechanisms governing delayed payments to micro and small enterprises: (1) MSMED Act, 2006 Payment Mandate (Section 15): A buyer must pay a registered micro or small enterprise supplier on or before the agreed date in writing (which cannot exceed 45 days), or if no written agreement exists, before the 'appointed day' (15 days from physical delivery or removal of defects). (2) MSMED Act Compound Penal Interest (Sections 16 & 23): Failure to pay on time incurs mandatory compound interest with monthly rests at 3 times the RBI Bank Rate from the due date until actual payment. Under Section 23 of the MSMED Act, this interest is strictly non-deductible in computing taxable income. (3) Income-tax Act Accrual Disallowance (Section 43B(h) / Act 2025 Section 37(2)(g)): If payment to a micro or small enterprise is not made within the Section 15 timeline, the underlying invoice expenditure is disallowed in the financial year of incurrence and allowed only in the year of actual payment; the proviso allowing payment up to the tax return due date (Section 139(1)) does not apply to clause (h). (4) Trader Exclusion: Per Ministry of MSME OM dated 2 July 2021 and RBI Circular FIDD.MSME & NFS.BC.No.13/06.02.31/2021-22, retail and wholesale traders (NIC 45, 46, 47) are eligible for Udyam solely for Priority Sector Lending; they are excluded from Chapter V (Sections 15-25) of the MSMED Act and are therefore exempt from Section 43B(h) tax disallowance.

**Key Deterministic Thresholds**:
```json
{
  "statutoryDefaultTimelineDays": 15,
  "maximumWrittenAgreementTimelineDays": 45,
  "penalInterestRate": "3 times the Bank Rate notified by the Reserve Bank of India (compounded monthly)",
  "statutoryInterestDisallowance": "Section 23 of MSMED Act prohibits claiming Section 16 penal interest as an income tax deduction",
  "taxAccrualDisallowanceSection43Bh": "Disallows deduction of overdue principal in year of incurrence; allowed strictly upon payment under Section 43B(h) / Act 2025 Section 37(2)(g)",
  "applicableEnterprises": "Micro and Small Enterprises with valid Udyam Registration (Medium Enterprises are excluded from Chapter V)",
  "traderExclusionRule": "Enterprises registered solely under Retail and Wholesale Trade (NIC Codes 45, 46, 47) are excluded from delayed payment benefits per Ministry of MSME OM No. 5/2(2)/2021-E/P & G/Policy and RBI Circular FIDD.MSME & NFS.BC.No.13/06.02.31/2021-22",
  "writtenDisputeWindowDays": 15,
  "disputeStatutoryBasis": "Explanation (b) to Section 2(n) of MSMED Act: buyer must lodge written objection regarding defects within 15 days of delivery to prevent deemed acceptance"
}
```

**Official Citations & Trust Anchors**:
- **Ministry of Law and Justice** — [Micro, Small and Medium Enterprises Development Act, 2006 (Act No. 27 of 2006)](https://msme.gov.in): *Chapter V: Delayed Payments to Micro and Small Enterprises (Sections 15, 16, 23)*
- **Ministry of MSME** — [Office Memorandum No. 5/2(2)/2021-E/P & G/Policy (Dated 2 July 2021) & OM No. 1/4(1)/2021-P&G/Policy](https://msme.gov.in/sites/default/files/OM_Retail_Wholesale.pdf): *Inclusion of Retail and Wholesale Trade under MSME - Restriction on Chapter V delayed payment benefits*
- **Reserve Bank of India** — [Circular RBI/2021-2022/67 FIDD.MSME & NFS.BC.No.13/06.02.31/2021-22](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12129&Mode=0): *Lending to Micro, Small & Medium Enterprises - Retail and Wholesale Trade PSL Eligibility*
- **Central Board of Direct Taxes (CBDT)** — [Finance Act, 2023 (Enacting Section 43B(h) of Income-tax Act, 1961)](https://incometaxindia.gov.in): *Disallowance of expenditure for delayed payments to Micro and Small Enterprises*

**Executive Circulars Bundled**:
- [`msme_om_2021_trader_exclusion.md`](./okf/msme_commercial/delayed_payments_15_16/circulars/msme_om_2021_trader_exclusion.md)

**Compliance Return Schemas & Templates**:
- [`schedule_iii_msme_disclosure.md`](./okf/msme_commercial/delayed_payments_15_16/forms/schedule_iii_msme_disclosure.md)
- [`udyam_registration_verification.json`](./okf/msme_commercial/delayed_payments_15_16/forms/udyam_registration_verification.json)

---

