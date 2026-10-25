# MudraForge Adesha — Proposed Accounts Payable Pilot Evaluation Guide
## Protocol for Bounded Historical Shadow Audits

> **Document Type**: Proposed Enterprise Pilot Specification  
> **Status**: Proposed Pilot Protocol (Not evidence of an active commercial customer deployment)  
> **Target Audience**: Chief Financial Officers (CFOs), Heads of Tax, Accounts Payable Directors, Enterprise Risk Officers  

---

## 1. Context & Purpose

This document outlines a proposed, non-invasive evaluation protocol for enterprise finance teams seeking to assess the statutory accuracy and audit capabilities of MudraForge Adesha.

A core operational challenge in corporate finance operations is ensuring consistent adherence to complex statutory withholding regimes, cumulative financial-year threshold tracking, and commercial delayed-payment regulations without disrupting active business operations. 

This proposed pilot enables an organization to test MudraForge's deterministic statutory engine against **historical, customer-approved accounts payable records** in a strictly read-only, advisory setting before considering any live workflow integration.

---

## 2. Pilot Objective

The primary objective of the proposed pilot is to evaluate historical vendor transactions against machine-readable statutory baselines to identify potential discrepancies in:
1. **Withholding Tax (TDS) Classification**: Proper categorization under Section 194C (Contractors: 1% individual vs. 2% company), Section 194J (Technical Services 2% vs. Professional 10%), Section 194I (Rent: 2% machinery vs. 10% land/building), and Section 194H (Commission: 2% post-October 2024 vs. 5% prior).
2. **Cumulative FY Threshold Handling**: Verifying whether cumulative vendor payments properly triggered statutory deduction gates upon crossing legal limits (e.g., Section 194Q ₹50 Lakhs excess, Section 194C ₹1 Lakh aggregate / ₹30,000 single bill).
3. **GST Unbundling Adherence**: Checking whether withholding tax was deducted strictly on basic contract value or incorrectly calculated on gross invoice amounts including separately stated GST (CBDT Circular No. 23 of 2017).
4. **Legislative Sunset Adherence**: Confirming that seller TCS under Section 206C(1H) was not applied to transactions post-1 April 2025.
5. **MSME Delayed Payment Compliance**: Flagging payments to verified Micro and Small enterprises exceeding 15 days (oral) or 45 days (written agreement) under Sections 15 and 16 of the MSMED Act, 2006, along with associated Section 43B(h) disallowance risks.

---

## 3. Proposed Candidate Inputs & Progressive Staging

To minimize operational effort for the customer's finance team, the proposed evaluation follows a staged approach:

- **Stage 1 (Initial Calibration Sample — 30 to 50 Invoices)**: Begin with a targeted, representative sample of 30 to 50 historical invoices with known deduction outcomes and supporting records. This verifies column mappings, confirms ingestion formatting, and calibrates baseline rules with minimum time investment from the client.
- **Stage 2 (Expanded Audit — 200 to 500 Invoices)**: Once the workflow, field mapping, and review protocols are established in Stage 1, the evaluation can expand to a full quarter's volume (200 to 500 records) to assess broad cumulative thresholds (such as Section 194Q and 194C cumulative annual limits).

To perform the evaluation, the customer provides an export (CSV or structured tabular extract) containing the following fields:

| Field Group | Required Parameters | Purpose in Evaluation |
| :--- | :--- | :--- |
| **Transaction Metadata** | Invoice Number, Invoice Date, Booking Date | Evaluates temporal validity and applicable legislative regime (1961 Act vs. 2025 Act). |
| **Vendor Identity** | Vendor Legal Name, Entity Type (Individual, Firm, Co.), Vendor PAN, GSTIN | Determines applicable rate schedules (e.g. 1% vs 2% under 194C; 20% under 206AA if PAN missing). |
| **Financial Values** | Basic Taxable Amount, CGST, SGST, IGST, Total Invoice Gross Amount | Verifies basic-value unbundling vs. gross withholding. |
| **Statutory Classification** | Line-item expense description, historical TDS section applied, historical TDS amount deducted | Compares historical treatment against engine ground truth. |
| **Settlement Dates** | Payment / Clearance Date, Payment Method | Measures settlement timelines against the MSMED statutory payment clock. |
| **Enterprise Attributes** | Vendor MSME Registration Type (Micro, Small, Medium, Trader), Udyam Number (if on file) | Filters MSME delayed-payment rules (applying trader exclusion under OM 2/1(5)/2021). |

---

## 4. Processing Workflow & Exception Handling

The evaluation runs as an offline, non-intrusive batch process:

```
[Customer AP Extract] ──► Input Validation ──► Statutory Rule Engine ──► Discrepancy Analysis ──► Human Review Gate
                                                                                                    ↓
                                                                                        [Advisory Audit Report]
```

### The Human-in-the-Loop Ambiguity Standard
In real-world finance operations, certain vendor invoices present legal ambiguities that cannot be resolved from numbers alone (e.g., mixed composite contracts involving both equipment supply and installation labour).

- **Explicit Fail-Closed Policy**: The evaluation engine does not guess or force an arbitrary classification on ambiguous transactions.
- **Flagged Review Categories**: When input data lacks sufficient granularity (such as missing scope-of-work documentation or ambiguous GST itemization), the system categorizes the record as `REQUIRES_HUMAN_REVIEW` with an explicit note explaining the legal assumption required.

---

## 5. Pilot Deliverables

At the conclusion of the evaluation, the customer receives an **Advisory Accounts Payable Discrepancy & Verification Report** comprising:

1. **Executive Findings Summary**:
   - Total records evaluated vs. records with complete statutory determinability.
   - Aggregate count of matched historical treatments.
   - Aggregate count of flagged statutory variances.
2. **Detailed Discrepancy Register (Tri-Part Classification)**:
   Findings are strictly classified into three distinct categories to avoid premature legal assumptions:
   - **Category A — Confirmed Calculation Differences**: Mathematical or rounding discrepancies on settled statutory rates, unbundled GST arithmetic, or clearly crossed financial thresholds.
   - **Category B — Potential Statutory Discrepancies**: Inconsistent rates or threshold treatments where all input facts (PAN, entity type, invoice date) appear complete on the face of the record.
   - **Category C — Items Requiring External Documentation Verification**: Apparent rate differences that may be legally justified by unrecorded external documents (e.g. an Assessing Officer certificate for lower deduction under Section 197, a Section 194C(6) goods transporter ownership declaration, or an MSME trader NIC classification exclusion). The report flags these as *verification checkpoints* rather than claiming a tax error.
3. **Statutory Audit Trail**:
   - For every flagged variance: the exact governing statute, applicable section code, official Gazette citation, and relevant CBDT/CBIC executive circular.
4. **Unresolved Assumptions Log**:
   - Comprehensive inventory of records requiring internal company tax counsel determination.

> **Important Commercial Notice**: The pilot report is strictly analytical and advisory. MudraForge does not guarantee that a pilot will discover historical errors, recoverable tax sums, or cash savings; the value of the evaluation is establishing an empirical baseline of compliance consistency.

### What the Proposed Pilot Demonstrates vs. What It Cannot Establish

| What the Pilot Can Demonstrate | What It Cannot Establish by Itself |
| :--- | :--- |
| The engine can process customer-supplied historical invoice extracts. | It can seamlessly ingest every ERP or arbitrary billing format without custom mapping. |
| Calculations agree with independently verified tax outcomes on clear-cut cases. | Every statutory interpretation or tax deduction across all scenarios is legally infallible. |
| Discrepancies and assumptions are fully traceable to primary gazette citations. | The client will necessarily achieve a specific financial saving or tax recovery. |
| Repeat runs on the same input data produce mathematically identical results. | Production deployment readiness, real-time banking security, or live ERP integration. |

---

## 6. Security, Confidentiality & Data Handling

> **Confidentiality Note on Historical Data**: Historical accounts payable records are not zero-risk. Invoices contain confidential supplier identities, commercial pricing structures, PANs, and banking metadata. Running locally or within customer-designated infrastructure minimizes external exposure, but strict data handling, field masking, and deletion agreements remain mandatory prerequisites before transferring any real records.

To protect enterprise data, the pilot protocol defines clear operational boundaries:

### Verified Baseline Capabilities
- **Local / On-Premise Execution Option**: The core evaluation engine and statutory commons can execute locally within the customer's designated environment with zero external network connectivity.
- **Read-Only Scope**: The evaluation accesses only historical records provided by the customer. It contains no programmatic write access to the customer's ERP, general ledger, or banking infrastructure.

### Pilot Prerequisites (To Be Agreed in Writing Prior to Initiation)
Prior to transferring any sample data or initiating evaluation scripts, the parties will establish:
1. **Bilateral Non-Disclosure Agreement (NDA)**: Governing proprietary financial and supplier pricing data.
2. **Customer-Side Field Masking / Anonymization**: The customer may optionally hash or mask sensitive fields (such as bank account numbers or internal vendor IDs) prior to transmission.
3. **Data Retention & Disposal Schedule**: Agreement on secure disposal of evaluation extracts within a defined period (e.g., 30 days post-report delivery).
4. **Environment Specification**: Mutual agreement on whether processing occurs on customer-controlled workstations or a private cloud environment.

---

## 7. Strict Operational Boundaries

To prevent operational ambiguity, the boundaries of this proposed pilot are explicitly defined:

- **No Live Ledger Mutations**: The pilot will not post journal entries, alter general ledger balances, or modify vendor records in the customer's accounting system (SAP, Zoho Books, Tally, NetSuite).
- **No Money Movement**: The pilot does not connect to banking APIs, issue payment orders, or disburse funds.
- **No Regulatory Filing**: The pilot does not generate or submit Form 26Q returns or TDS challans to the Income Tax Department.
- **Not Formal Legal Advice**: Deliverables constitute technical compliance analysis and do not replace legal opinions from the customer's statutory tax auditors or legal counsel.

---

## 8. Success & Evaluation Criteria

Before initiating a pilot, both parties agree to measurable evaluation benchmarks:

| Criterion | Definition | Evaluation Metric |
| :--- | :--- | :--- |
| **Input Completeness** | Sufficiency of customer data to determine statutory applicability | Percentage of records with complete necessary fields ($\ge 90\%$ target) |
| **Calculation Accuracy** | Agreement on clear-cut cases governed by settled law | $100\%$ mathematical and threshold agreement on verified records |
| **Ambiguity Handling** | Clean separation of uncertain cases without hallucinated conclusions | $100\%$ of incomplete or composite records flagged for human review |
| **Statutory Traceability** | Every variance cited to primary gazette or executive circular | $100\%$ citation resolution to official government sources |
| **Audit Reproducibility** | Repeated runs across the same dataset produce identical outputs | Zero variance across repeat deterministic runs |

---

## 9. Initiating a Pilot Discussion

To discuss a proposed historical AP evaluation, review sample schema formats, or coordinate data requirements:
- **Email**: [hello@mudraforge.in](mailto:hello@mudraforge.in) or [support@mudraforge.in](mailto:support@mudraforge.in)
- **Direct Founder Contact**: Mondeep Engti at [mondeepe@gmail.com](mailto:mondeepe@gmail.com)
- **Official Documentation**: [https://mudraforge.in/docs](https://mudraforge.in/docs)
