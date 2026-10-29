/**
 * @mudraforge/statutory - Tally & Daybook Statutory Reconciliation Engine
 * 
 * Provides zero-dependency parsing of Tally XML and CSV daybooks,
 * multi-branch vendor PAN aggregation, cumulative Section 194Q threshold
 * evaluation, Section 40(a)(ia) 30% expenditure disallowance risk quantification,
 * and automated Tally XML compensating journal voucher generation.
 * 
 * Complies with:
 * - Section 194Q of Income-tax Act, 1961 (and Section 393 of Income-tax Act, 2025)
 * - Section 40(a)(ia) 30% expenditure disallowance for un-deducted/under-deducted TDS
 * - Section 201(1A) delayed deduction interest
 * - CBDT Circular No. 13 of 2021 (advance payment GST inclusion & excess-over-50L math)
 * 
 * Zero external npm dependencies: Native ES module and pure string/math parsing only.
 */

import { evaluateSection194Q, roundToPaisa } from './calculators.js';
import { decodeTaxIdentifier } from './index.js';

const STATUTORY_THRESHOLD_INR = 5000000; // ₹50 Lakhs (Section 194Q(1))

/**
 * Parses a standard CSV string representing a Tally or ERP purchase daybook.
 * Tolerates variations in header casing and common column aliases.
 * 
 * Supported columns (case-insensitive):
 * - Date: date, vch_date, voucher_date, txn_date
 * - Voucher No: voucher_no, vch_no, invoice_no, ref_no, voucher_number
 * - Voucher Type: voucher_type, vch_type, type (default: 'Purchase')
 * - Party Name: party_name, vendor_name, ledger_name, supplier_name
 * - PAN: pan, vendor_pan, party_pan
 * - GSTIN: gstin, vendor_gstin, party_gstin
 * - Amount: amount, gross_amount, invoice_amount, debit, credit
 * - GST Amount: gst_amount, tax_amount, igst, cgst, sgst (optional)
 * - TDS Deducted: tds_deducted, tds_amount, tds (optional, default 0)
 * 
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Object>} Normalized voucher objects
 */
export function parseTallyDaybookCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('[@mudraforge/statutory] Daybook CSV content must be a non-empty string.');
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        return [];
    }

    // Parse header row
    const rawHeaders = parseCsvRow(lines[0]);
    const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    // Map column indices
    const colIndex = {
        date: findColIndex(headers, ['date', 'vch_date', 'voucher_date', 'txn_date']),
        voucherNo: findColIndex(headers, ['voucher_no', 'vch_no', 'invoice_no', 'ref_no', 'voucher_number']),
        voucherType: findColIndex(headers, ['voucher_type', 'vch_type', 'type']),
        partyName: findColIndex(headers, ['party_name', 'vendor_name', 'ledger_name', 'supplier_name', 'party']),
        pan: findColIndex(headers, ['pan', 'vendor_pan', 'party_pan']),
        gstin: findColIndex(headers, ['gstin', 'vendor_gstin', 'party_gstin']),
        amount: findColIndex(headers, ['amount', 'gross_amount', 'invoice_amount', 'purchase_amount', 'debit', 'value']),
        gstAmount: findColIndex(headers, ['gst_amount', 'tax_amount', 'gst', 'tax']),
        tdsDeducted: findColIndex(headers, ['tds_deducted', 'tds_amount', 'tds', 'tds_cut'])
    };

    if (colIndex.amount === -1) {
        throw new Error('[@mudraforge/statutory] CSV header must include an "Amount", "Gross_Amount", or "Debit" column.');
    }

    const vouchers = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i]);
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const rawDate = colIndex.date !== -1 ? row[colIndex.date] : null;
        const normalizedDate = normalizeIsoDate(rawDate);

        const rawAmount = colIndex.amount !== -1 ? row[colIndex.amount] : '0';
        const amount = Math.abs(parseFloat(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0);

        const rawGst = colIndex.gstAmount !== -1 ? row[colIndex.gstAmount] : '0';
        const gstAmount = Math.abs(parseFloat(String(rawGst).replace(/[^0-9.-]/g, '')) || 0);

        const rawTds = colIndex.tdsDeducted !== -1 ? row[colIndex.tdsDeducted] : '0';
        const tdsDeducted = Math.abs(parseFloat(String(rawTds).replace(/[^0-9.-]/g, '')) || 0);

        const partyName = colIndex.partyName !== -1 ? (row[colIndex.partyName] || 'Unknown Vendor').trim() : 'Unknown Vendor';
        const rawPan = colIndex.pan !== -1 ? (row[colIndex.pan] || '').trim().toUpperCase() : '';
        const rawGstin = colIndex.gstin !== -1 ? (row[colIndex.gstin] || '').trim().toUpperCase() : '';
        const voucherNo = colIndex.voucherNo !== -1 ? (row[colIndex.voucherNo] || `ROW-${i}`).trim() : `ROW-${i}`;
        const voucherType = colIndex.voucherType !== -1 ? (row[colIndex.voucherType] || 'Purchase').trim() : 'Purchase';

        vouchers.push({
            rowNumber: i + 1,
            date: normalizedDate,
            voucherNo,
            voucherType,
            partyName,
            partyPan: rawPan || null,
            partyGstin: rawGstin || null,
            grossAmount: roundToPaisa(amount),
            gstAmount: roundToPaisa(gstAmount),
            tdsDeducted: roundToPaisa(tdsDeducted)
        });
    }

    return vouchers;
}

/**
 * Parses native Tally XML export containing <VOUCHER> tags.
 * Zero external XML parser required: Uses safe native tokenization.
 * 
 * @param {string} xmlText - Raw Tally XML text
 * @returns {Array<Object>} Normalized voucher objects
 */
export function parseTallyDaybookXml(xmlText) {
    if (!xmlText || typeof xmlText !== 'string') {
        throw new Error('[@mudraforge/statutory] Tally XML content must be a non-empty string.');
    }

    const vouchers = [];
    // Extract every <VOUCHER ...> ... </VOUCHER> block
    const voucherRegex = /<VOUCHER\b[^>]*>([\s\S]*?)<\/VOUCHER>/gi;
    let match;
    let index = 1;

    while ((match = voucherRegex.exec(xmlText)) !== null) {
        const block = match[1];

        // Extract basic voucher properties
        const rawDate = extractXmlTag(block, 'DATE');
        const voucherNo = extractXmlTag(block, 'VOUCHERNUMBER') || `TALLY-VCH-${index}`;
        const voucherType = extractXmlTag(block, 'VOUCHERTYPENAME') || 'Purchase';
        const partyName = extractXmlTag(block, 'PARTYLEDGERNAME') || extractXmlTag(block, 'PARTYNAME') || 'Unknown Vendor';
        const gstin = extractXmlTag(block, 'PARTYGSTIN') || extractXmlTag(block, 'GSTIN');

        // Extract amounts from ledger entries
        let grossAmount = 0;
        let tdsDeducted = 0;

        // Match all <ALLLEDGERENTRIES.LIST> or <LEDGERENTRIES.LIST>
        const ledgerEntryRegex = /<(?:ALL)?LEDGERENTRIES\.LIST>([\s\S]*?)<\/(?:ALL)?LEDGERENTRIES\.LIST>/gi;
        let ledgerMatch;

        while ((ledgerMatch = ledgerEntryRegex.exec(block)) !== null) {
            const entryBlock = ledgerMatch[1];
            const ledger = extractXmlTag(entryBlock, 'LEDGERNAME') || '';
            const rawAmt = extractXmlTag(entryBlock, 'AMOUNT') || '0';
            const amtVal = parseFloat(rawAmt) || 0;

            // In Tally XML:
            // For Purchase vouchers: Credit to Vendor is represented as negative number.
            // Debit to Expense is positive.
            if (ledger.toLowerCase().includes('tds') || ledger.toLowerCase().includes('194q')) {
                tdsDeducted += Math.abs(amtVal);
            } else if (ledger === partyName || Math.abs(amtVal) > grossAmount) {
                // Main party entry
                grossAmount = Math.max(grossAmount, Math.abs(amtVal));
            }
        }

        // Fallback for amount if not extracted from ledger entries
        if (grossAmount === 0) {
            const topAmount = extractXmlTag(block, 'AMOUNT');
            if (topAmount) {
                grossAmount = Math.abs(parseFloat(topAmount) || 0);
            }
        }

        vouchers.push({
            rowNumber: index,
            date: formatTallyDate(rawDate),
            voucherNo,
            voucherType,
            partyName,
            partyPan: null, // Will be resolved from GSTIN or name in reconciliation
            partyGstin: gstin ? gstin.toUpperCase() : null,
            grossAmount: roundToPaisa(grossAmount),
            gstAmount: 0,
            tdsDeducted: roundToPaisa(tdsDeducted)
        });

        index++;
    }

    return vouchers;
}

/**
 * Reconciles a list of daybook vouchers against Section 194Q statutory rules,
 * performing multi-branch vendor PAN consolidation, excess-over-₹50L tracking,
 * and Section 40(a)(ia) 30% expenditure disallowance risk analysis.
 * 
 * @param {Array<Object>} vouchers - Array of normalized vouchers
 * @param {Object} [options={}] - Configuration options
 * @param {number|null} [options.buyerTurnoverCr=null] - Preceding FY buyer turnover in ₹ Crores (null = assume > 10Cr)
 * @param {number} [options.disallowancePercent=30] - Expenditure disallowance under Section 40(a)(ia) (default 30%)
 * @param {number} [options.corporateTaxRatePercent=30] - Applicable corporate tax rate (default 30%)
 * @param {number} [options.delayedInterestRateMonthlyPercent=1.0] - Monthly interest u/s 201(1A) (default 1%)
 * @param {string|null} [options.auditDate=null] - Cutoff date for Section 201(1A) interest (YYYY-MM-DD)
 * @returns {Object} Comprehensive audit reconciliation report
 */
export function reconcile194QDaybook(vouchers, options = {}) {
    if (!Array.isArray(vouchers)) {
        throw new Error('[@mudraforge/statutory] Daybook vouchers must be an array.');
    }

    const {
        buyerTurnoverCr = null,
        disallowancePercent = 30,
        corporateTaxRatePercent = 30,
        delayedInterestRateMonthlyPercent = 1.0,
        auditDate = new Date().toISOString().slice(0, 10)
    } = options;

    // 1. Resolve and validate Tax Identifier (PAN) for every voucher
    const validatedVouchers = vouchers.map(v => {
        let resolvedPan = v.partyPan ? String(v.partyPan).trim().toUpperCase() : null;
        let isPanValid = false;
        let panDetails = null;

        // Try to decode existing PAN
        if (resolvedPan) {
            const dec = decodeTaxIdentifier(resolvedPan);
            if (dec.isValid && dec.type === 'PAN') {
                isPanValid = true;
                panDetails = dec;
            }
        }

        // If PAN is missing or invalid, attempt extraction from partyGstin
        if (!isPanValid && v.partyGstin) {
            const rawGstin = String(v.partyGstin).trim().toUpperCase();
            const gstinDec = decodeTaxIdentifier(rawGstin);
            const candidatePan = gstinDec.pan || (rawGstin.match(/[A-Z]{5}[0-9]{4}[A-Z]/)?.[0]);
            if (candidatePan) {
                const panDec = decodeTaxIdentifier(candidatePan);
                if (panDec.isValid && panDec.type === 'PAN') {
                    resolvedPan = candidatePan;
                    isPanValid = true;
                    panDetails = panDec;
                }
            }
        }

        // If still no valid PAN, generate a synthetic grouping key based on normalized party name
        const groupingKey = resolvedPan || `UNRESOLVED_PAN_${v.partyName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

        return {
            ...v,
            resolvedPan,
            groupingKey,
            isPanValid,
            panDetails
        };
    });

    // 2. Group vouchers by Vendor PAN / Grouping Key
    const vendorGroups = new Map();

    for (const v of validatedVouchers) {
        if (!vendorGroups.has(v.groupingKey)) {
            vendorGroups.set(v.groupingKey, {
                groupingKey: v.groupingKey,
                pan: v.resolvedPan,
                isPanValid: v.isPanValid,
                partyNames: new Set(),
                gstins: new Set(),
                vouchers: []
            });
        }

        const group = vendorGroups.get(v.groupingKey);
        group.partyNames.add(v.partyName);
        if (v.partyGstin) group.gstins.add(v.partyGstin);
        group.vouchers.push(v);
    }

    // 3. Process each vendor group chronologically
    const vendorSummaries = [];
    const auditedVouchers = [];

    let totalDaybookPurchasesInr = 0;
    let totalExcessPurchasesOver50LInr = 0;
    let totalTdsPayableInr = 0;
    let totalTdsDeductedInr = 0;
    let totalTdsShortfallInr = 0;
    let totalSection40aDisallowanceInr = 0;
    let totalEstimatedTaxImpactInr = 0;
    let totalSection201InterestInr = 0;

    for (const [key, group] of vendorGroups.entries()) {
        // Sort chronologically by date, then row number
        group.vouchers.sort((a, b) => {
            if (a.date && b.date && a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return (a.rowNumber || 0) - (b.rowNumber || 0);
        });

        let rollingPriorPurchases = 0;
        let vendorTotalPurchases = 0;
        let vendorExcessPurchases = 0;
        let vendorTdsPayable = 0;
        let vendorTdsDeducted = 0;
        let vendorTdsShortfall = 0;
        let vendorSection40aDisallowance = 0;
        let vendorEstimatedTaxHit = 0;
        let vendorSection201Interest = 0;
        let thresholdBreachedDate = null;
        let hasExceptions = false;

        const processedGroupVouchers = [];

        for (const v of group.vouchers) {
            const amount = Number(v.grossAmount) || 0;
            totalDaybookPurchasesInr = roundToPaisa(totalDaybookPurchasesInr + amount);
            vendorTotalPurchases = roundToPaisa(vendorTotalPurchases + amount);

            // Run deterministic Section 194Q calculator
            const calc = evaluateSection194Q({
                invoiceAmount: amount,
                priorFyPurchases: rollingPriorPurchases,
                hasPan: group.isPanValid,
                isPanInoperative: false,
                transactionDate: v.date,
                buyerTurnoverCr,
                gstAmountInr: v.gstAmount || 0,
                buyerName: 'Buyer',
                sellerName: v.partyName
            });

            const taxableBase = calc.taxableBase || 0;
            const requiredTds = calc.calculatedTdsInr || 0;
            const actualTds = v.tdsDeducted || 0;
            const shortfall = Math.max(0, roundToPaisa(requiredTds - actualTds));

            if (calc.thresholdBreached && !thresholdBreachedDate) {
                thresholdBreachedDate = v.date;
            }

            // If there is an under-deduction on an amount crossing the threshold
            let auditStatus = 'COMPLIANT';
            let section40aDisallowance = 0;
            let taxHitExposure = 0;
            let section201Interest = 0;

            if (taxableBase > 0) {
                vendorExcessPurchases = roundToPaisa(vendorExcessPurchases + taxableBase);
                vendorTdsPayable = roundToPaisa(vendorTdsPayable + requiredTds);
                vendorTdsDeducted = roundToPaisa(vendorTdsDeducted + actualTds);

                if (shortfall > 0) {
                    hasExceptions = true;
                    auditStatus = actualTds === 0 ? 'EXCEPTION_TDS_NOT_DEDUCTED' : 'EXCEPTION_TDS_UNDER_DEDUCTED';

                    // Section 40(a)(ia) disallowance: 30% of the entire unwithheld purchase base
                    // If shortfall is partial, proportionate base is disallowed
                    const unwithheldRatio = requiredTds > 0 ? shortfall / requiredTds : 1;
                    const unwithheldBase = roundToPaisa(taxableBase * unwithheldRatio);

                    section40aDisallowance = roundToPaisa(unwithheldBase * (disallowancePercent / 100));
                    taxHitExposure = roundToPaisa(section40aDisallowance * (corporateTaxRatePercent / 100));

                    // Section 201(1A) delayed deduction interest (1% per month or part of month)
                    const overdueMonths = calculateElapsedMonths(v.date, auditDate);
                    section201Interest = roundToPaisa(shortfall * (delayedInterestRateMonthlyPercent / 100) * overdueMonths);

                    vendorTdsShortfall = roundToPaisa(vendorTdsShortfall + shortfall);
                    vendorSection40aDisallowance = roundToPaisa(vendorSection40aDisallowance + section40aDisallowance);
                    vendorEstimatedTaxHit = roundToPaisa(vendorEstimatedTaxHit + taxHitExposure);
                    vendorSection201Interest = roundToPaisa(vendorSection201Interest + section201Interest);
                }
            } else {
                auditStatus = 'BELOW_STATUTORY_50L_THRESHOLD';
            }

            const auditedVoucher = {
                ...v,
                vendorPan: group.pan,
                priorPurchasesInFy: rollingPriorPurchases,
                cumulativePurchasesInFy: roundToPaisa(rollingPriorPurchases + amount),
                isOver50LThreshold: calc.thresholdBreached,
                taxableBase194Q: taxableBase,
                statutoryRatePercent: calc.effectiveRatePercent,
                requiredTdsInr: requiredTds,
                actualTdsInr: actualTds,
                shortfallInr: shortfall,
                auditStatus,
                section40aDisallowanceInr: section40aDisallowance,
                estimatedTaxHitInr: taxHitExposure,
                section201InterestInr: section201Interest,
                statutoryCitation: calc.governingWithholdingSection
            };

            processedGroupVouchers.push(auditedVoucher);
            auditedVouchers.push(auditedVoucher);

            // Advance rolling prior purchases
            rollingPriorPurchases = roundToPaisa(rollingPriorPurchases + amount);
        }

        totalExcessPurchasesOver50LInr = roundToPaisa(totalExcessPurchasesOver50LInr + vendorExcessPurchases);
        totalTdsPayableInr = roundToPaisa(totalTdsPayableInr + vendorTdsPayable);
        totalTdsDeductedInr = roundToPaisa(totalTdsDeductedInr + vendorTdsDeducted);
        totalTdsShortfallInr = roundToPaisa(totalTdsShortfallInr + vendorTdsShortfall);
        totalSection40aDisallowanceInr = roundToPaisa(totalSection40aDisallowanceInr + vendorSection40aDisallowance);
        totalEstimatedTaxImpactInr = roundToPaisa(totalEstimatedTaxImpactInr + vendorEstimatedTaxHit);
        totalSection201InterestInr = roundToPaisa(totalSection201InterestInr + vendorSection201Interest);

        vendorSummaries.push({
            groupingKey: key,
            pan: group.pan,
            isPanValid: group.isPanValid,
            vendorNames: Array.from(group.partyNames),
            primaryVendorName: Array.from(group.partyNames)[0] || 'Unknown Vendor',
            gstins: Array.from(group.gstins),
            voucherCount: group.vouchers.length,
            totalPurchasesInr: vendorTotalPurchases,
            thresholdBreached: vendorTotalPurchases > STATUTORY_THRESHOLD_INR,
            thresholdBreachedDate,
            excessPurchasesOver50LInr: vendorExcessPurchases,
            tdsPayableInr: vendorTdsPayable,
            tdsDeductedInr: vendorTdsDeducted,
            tdsShortfallInr: vendorTdsShortfall,
            section40aDisallowanceInr: vendorSection40aDisallowance,
            estimatedTaxHitInr: vendorEstimatedTaxHit,
            section201InterestInr: vendorSection201Interest,
            hasExceptions,
            vouchers: processedGroupVouchers
        });
    }

    // Sort vendor summaries: High shortfall first
    vendorSummaries.sort((a, b) => b.tdsShortfallInr - a.tdsShortfallInr);

    const exceptionVendors = vendorSummaries.filter(v => v.hasExceptions);
    const compliantVendors = vendorSummaries.filter(v => !v.hasExceptions);

    return {
        auditSummary: {
            totalVouchersScanned: vouchers.length,
            uniqueVendorsCount: vendorGroups.size,
            vendorsExceeding50LCount: vendorSummaries.filter(v => v.thresholdBreached).length,
            vendorsWithExceptionsCount: exceptionVendors.length,
            totalPurchasesInr: totalDaybookPurchasesInr,
            totalExcessPurchasesOver50LInr: totalExcessPurchasesOver50LInr,
            totalTdsPayableInr: totalTdsPayableInr,
            totalTdsDeductedInr: totalTdsDeductedInr,
            totalTdsShortfallInr: totalTdsShortfallInr,
            totalSection40aDisallowanceInr: totalSection40aDisallowanceInr,
            totalEstimatedTaxImpactInr: totalEstimatedTaxImpactInr,
            totalSection201InterestInr: totalSection201InterestInr,
            totalAuditExposureInr: roundToPaisa(totalTdsShortfallInr + totalEstimatedTaxImpactInr + totalSection201InterestInr),
            statutoryAuthority: 'CBDT Section 194Q & Section 40(a)(ia) of the Income-tax Act, 1961',
            isAuthorizedToDisburse: false
        },
        exceptionVendors,
        compliantVendors,
        allVendors: vendorSummaries,
        auditedVouchers
    };
}

/**
 * Generates Tally-compliant XML for compensating journal vouchers to record
 * un-withheld Section 194Q TDS directly into Tally Prime.
 * 
 * Creates double-entry vouchers:
 * Debit: Vendor Ledger
 * Credit: TDS on Purchase of Goods u/s 194Q
 * 
 * @param {Object} reconciliationResult - Result from reconcile194QDaybook()
 * @param {Object} [options={}] - Customization options
 * @param {string} [options.voucherDate] - Voucher date YYYYMMDD (defaults to latest exception date or today)
 * @param {string} [options.creditLedgerName='TDS on Purchase of Goods u/s 194Q'] - Credit ledger
 * @param {string} [options.companyName=''] - Tally company name
 * @returns {string} XML string ready for Tally Prime HTTP import or file import
 */
export function generateTally194QJournalXml(reconciliationResult, options = {}) {
    if (!reconciliationResult || !Array.isArray(reconciliationResult.exceptionVendors)) {
        throw new Error('[@mudraforge/statutory] Valid reconciliation result with exceptionVendors is required.');
    }

    const {
        voucherDate = new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        creditLedgerName = 'TDS on Purchase of Goods u/s 194Q',
        companyName = ''
    } = options;

    const tallyDate = voucherDate.replace(/[^0-9]/g, '');

    const voucherXmlList = [];

    for (const vendor of reconciliationResult.exceptionVendors) {
        if (vendor.tdsShortfallInr <= 0) continue;

        const partyName = escapeXml(vendor.primaryVendorName);
        const panStr = vendor.pan ? `PAN: ${vendor.pan}` : 'PAN: NOT FURNISHED';
        const amount = vendor.tdsShortfallInr.toFixed(2);
        const narration = escapeXml(
            `Compensating TDS entry under Section 194Q on cumulative purchases of ₹${vendor.totalPurchasesInr.toLocaleString('en-IN')} (${panStr}) exceeding statutory ₹50,00,000 threshold. Ref: CBDT Circular 13/2021.`
        );

        voucherXmlList.push(`      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
          <DATE>${tallyDate}</DATE>
          <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
          <NARRATION>${narration}</NARRATION>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${amount}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(creditLedgerName)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${amount}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>`);
    }

    const companyTag = companyName 
        ? `<STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY></STATICVARIABLES>`
        : '<STATICVARIABLES/>';

    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        ${companyTag}
      </REQUESTDESC>
      <REQUESTDATA>
${voucherXmlList.join('\n')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Formats a clean, executive-ready Markdown audit exception report.
 * 
 * @param {Object} reconciliationResult - Output from reconcile194QDaybook()
 * @returns {string} Formatted Markdown audit memorandum
 */
export function generateAuditMarkdownReport(reconciliationResult) {
    const { auditSummary, exceptionVendors } = reconciliationResult;

    const fmtInr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let md = `# SECTION 194Q STATUTORY AUDIT & 40(a)(ia) EXPOSURE REPORT\n\n`;
    md += `**Statutory Authority**: Income-tax Act, 1961 Section 194Q read with Section 40(a)(ia) and CBDT Circular 13/2021\n`;
    md += `**Audit Scope**: Daybook Multi-Branch PAN Aggregation & Rolling Threshold Scrutiny\n\n`;

    md += `## 1. Executive Summary\n\n`;
    md += `| Metric | Statutory Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Total Vouchers Audited** | \`${auditSummary.totalVouchersScanned}\` |\n`;
    md += `| **Unique Vendor Entities** | \`${auditSummary.uniqueVendorsCount}\` |\n`;
    md += `| **Vendors Exceeding ₹50L Threshold** | \`${auditSummary.vendorsExceeding50LCount}\` |\n`;
    md += `| **Vendors with Unwithheld Shortfall** | **\`${auditSummary.vendorsWithExceptionsCount}\`** |\n`;
    md += `| **Total Daybook Purchases** | ${fmtInr(auditSummary.totalPurchasesInr)} |\n`;
    md += `| **Taxable Base (Excess > ₹50L)** | ${fmtInr(auditSummary.totalExcessPurchasesOver50LInr)} |\n`;
    md += `| **Required TDS Liability** | ${fmtInr(auditSummary.totalTdsPayableInr)} |\n`;
    md += `| **Actual TDS Deducted in Books** | ${fmtInr(auditSummary.totalTdsDeductedInr)} |\n`;
    md += `| **Statutory TDS Shortfall** | **${fmtInr(auditSummary.totalTdsShortfallInr)}** |\n`;
    md += `| **Section 40(a)(ia) 30% Expenditure Disallowance** | **${fmtInr(auditSummary.totalSection40aDisallowanceInr)}** |\n`;
    md += `| **Estimated Income Tax Exposure (@ 30%)** | **${fmtInr(auditSummary.totalEstimatedTaxImpactInr)}** |\n`;
    md += `| **Section 201(1A) Delayed Deduction Interest** | ${fmtInr(auditSummary.totalSection201InterestInr)} |\n`;
    md += `| **Total Cumulative Audit Exposure** | **${fmtInr(auditSummary.totalAuditExposureInr)}** |\n\n`;

    if (exceptionVendors.length === 0) {
        md += `> [!NOTE]\n> **100% Statutory Compliance**: Zero unwithheld Section 194Q TDS detected across all daybook records. No Section 40(a)(ia) disallowance risk.\n`;
        return md;
    }

    md += `## 2. Vendor Exception Schedule (Form 3CD Clause 21(b) Working Papers)\n\n`;
    md += `| Vendor Name | PAN | Total Purchases | Excess > ₹50L | TDS Shortfall | 40(a)(ia) Disallowance | Tax Hit Exposure |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const v of exceptionVendors) {
        md += `| **${v.primaryVendorName}** | \`${v.pan || 'MISSING'}\` | ${fmtInr(v.totalPurchasesInr)} | ${fmtInr(v.excessPurchasesOver50LInr)} | **${fmtInr(v.tdsShortfallInr)}** | **${fmtInr(v.section40aDisallowanceInr)}** | **${fmtInr(v.estimatedTaxHitInr)}** |\n`;
    }

    md += `\n> [!CAUTION]\n`;
    md += `> **Audit Defense Directive**: The Income-tax Department enforces strict 30% expenditure disallowance under Section 40(a)(ia) for failure to deduct TDS. A compensating journal entry must be posted in Tally before closing annual financial statements.\n`;

    return md;
}

// -----------------------------------------------------------------------------
// INTERNAL HELPER UTILITIES
// -----------------------------------------------------------------------------

function parseCsvRow(rowText) {
    const result = [];
    let insideQuotes = false;
    let current = '';

    for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') {
            if (insideQuotes && rowText[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function findColIndex(headers, candidateNames) {
    // 1. Exact match
    for (const name of candidateNames) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
    }
    // 2. Substring match, but ignore short names (length <= 3 like 'gst' or 'tax') to prevent false matches (e.g. 'gst' in 'gstin')
    for (const name of candidateNames) {
        if (name.length <= 3) continue;
        const idx = headers.findIndex(h => h.includes(name));
        if (idx !== -1) return idx;
    }
    return -1;
}

function normalizeIsoDate(raw) {
    if (!raw) return null;
    const str = String(raw).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        const d = dmy[1].padStart(2, '0');
        const m = dmy[2].padStart(2, '0');
        const y = dmy[3];
        return `${y}-${m}-${d}`;
    }
    // YYYYMMDD
    if (/^\d{8}$/.test(str)) {
        return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }
    return str;
}

function formatTallyDate(raw) {
    if (!raw) return null;
    const clean = String(raw).trim();
    if (/^\d{8}$/.test(clean)) {
        return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
    }
    return normalizeIsoDate(clean);
}

function extractXmlTag(xmlBlock, tagName) {
    const regex = new RegExp(`<${tagName}\\b[^>]*>([^<]*)<\\/${tagName}>`, 'i');
    const m = xmlBlock.match(regex);
    return m ? m[1].trim() : null;
}

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function calculateElapsedMonths(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 1;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;

    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() > start.getDate()) {
        months += 1;
    }
    return Math.max(1, months);
}
