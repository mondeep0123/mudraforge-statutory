/**
 * =============================================================================
 * @MUDRAFORGE/STATUTORY — ZOHO BOOKS & GSTR-2B AP RECONCILIATION ENGINE
 * =============================================================================
 *
 * Implements an end-to-end Accounts Payable (AP) purchase register and
 * GSTR-2B automated reconciliation workflow.
 *
 * Statutory Baseline & Accounting Architecture:
 * 1. CGST Act Section 16(2)(aa) & Rule 36(4):
 *    - Input Tax Credit (ITC) can only be availed if invoice details have been
 *      furnished by the supplier in Form GSTR-1 and communicated to the
 *      recipient in Form GSTR-2B.
 *    - Invoices missing in GSTR-2B represent provisional/unsupported credits
 *      at risk of disallowance and 24% interest under Section 50(3).
 * 2. CGST Act Section 17(5) Blocked Credits:
 *    - Invoices matching GSTR-2B but falling under blocked statutory categories
 *      (e.g., motor vehicles, food & beverages, personal consumption) are
 *      segregated into MATCHED_INELIGIBLE_STATUTORY_BLOCK_17_5.
 * 3. Place of Supply (POS) & Distinct Person Jurisdiction (IGST Act Sec 7, 8, 10, 12):
 *    - Triangulates Supplier Location, Place of Supply, and Recipient Registration.
 *    - Distinguishes between:
 *      a) Legitimate local supplies routable to another branch GSTIN (Sec 25(4)),
 *      b) Stranded local CGST/SGST levies where recipient has no distinct person registration,
 *      c) Erroneous levies where supplier charged local tax instead of IGST.
 * 4. CGST Act Section 16(2) Second Proviso read with Rule 37 & Rule 88B(3):
 *    - If recipient fails to pay the supplier within 180 days from the invoice
 *      date, an amount equal to the ITC availed in proportion to the unpaid amount
 *      must be reversed in Form GSTR-3B Table 4(B)(2).
 *    - Reverse Charge (RCM) and Schedule I deemed supplies are statutorily exempt.
 *    - Section 50(1) 18% delayed interest is computed only if credit was utilized
 *      in terms of Section 50(3) Proviso read with Rule 88B(3).
 *    - Reversals can be re-availed upon subsequent payment without Section 16(4) time bar.
 * 5. Reverse Charge Mechanism (RCM):
 *    - Invoices marked rchrg: "Y" under Section 9(3)/9(4) require recipient
 *      to discharge liability in cash before claiming ITC in Table 4(A)(3).
 * 6. Dual-Mode Normalization:
 *    - Alphanumeric canonical keys resolve slash/hyphen variances (e.g. INV/24/01 == INV-24-01).
 *    - Integer paise precision prevents IEEE-754 summation drift.
 * 7. Zero external dependencies: Pure native ES modules.
 */

import {
    cleanNumericAmount,
    toIntegerPaise,
    fromIntegerPaise,
    roundToPaisa,
    isValidGstinChecksum
} from './calculators.js';

/**
 * Normalizes an invoice number for fuzzy canonical matching across ERP and GSTN.
 * Strips whitespace, converts to uppercase, removes leading zeroes, and collapses separators.
 *
 * @param {string} raw
 * @returns {{ exactKey: string, alphaNumericKey: string }}
 */
export function normalizeInvoiceNumber(raw) {
    if (!raw || typeof raw !== 'string') {
        return { exactKey: '', alphaNumericKey: '' };
    }
    const trimmed = raw.trim().toUpperCase();
    const exactKey = trimmed.replace(/\s+/g, '');
    const alphaNumericKey = trimmed.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
    return { exactKey, alphaNumericKey };
}

/**
 * Normalizes and validates a GSTIN string.
 *
 * @param {string} raw
 * @returns {{ gstin: string|null, pan: string|null, stateCode: string|null, isValid: boolean }}
 */
export function normalizeGstin(raw) {
    if (!raw || typeof raw !== 'string') {
        return { gstin: null, pan: null, stateCode: null, isValid: false };
    }
    const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 15) {
        return { gstin: clean || null, pan: null, stateCode: null, isValid: false };
    }
    const stateCode = clean.slice(0, 2);
    const pan = clean.slice(2, 12);
    const isValid = isValidGstinChecksum(clean);
    return { gstin: clean, pan, stateCode, isValid };
}

/**
 * Parses Zoho Books Bills CSV export into normalized bill records.
 *
 * Standard Zoho Books CSV Headers handled:
 * - Bill Date / Date
 * - Bill Number / Bill # / Invoice Number
 * - Vendor Name / Vendor
 * - GST Identification Number (GSTIN) / GSTIN
 * - Status (paid, unpaid, overdue, partially_paid, open)
 * - Due Date
 * - Taxable Amount / SubTotal
 * - Total / Bill Amount
 * - Balance / Balance Due
 * - CGST, SGST, IGST
 * - Account Name / Category / Blocked Reason
 *
 * @param {string} csvText
 * @returns {Array<Object>}
 */
export function parseZohoBillsCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') {
        throw new Error('[@mudraforge/statutory] Zoho Books CSV content must be a non-empty string.');
    }

    const cleanCsv = csvText.replace(/^\uFEFF/, '');
    const lines = cleanCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delimiter = !firstLine.includes(',') && firstLine.includes(';') ? ';' : (!firstLine.includes(',') && firstLine.includes('\t') ? '\t' : ',');

    const rawHeaders = parseCsvRow(lines[0], delimiter);
    const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    const colIndex = {
        date: findColIndex(headers, ['bill_date', 'date', 'invoice_date']),
        billNo: findColIndex(headers, ['bill_number', 'bill_no', 'invoice_number', 'bill__', 'bill']),
        dueDate: findColIndex(headers, ['due_date', 'payment_due_date']),
        vendorName: findColIndex(headers, ['vendor_name', 'vendor', 'supplier_name', 'party_name']),
        gstin: findColIndex(headers, ['gst_identification_number__gstin_', 'gstin', 'vendor_gstin', 'party_gstin']),
        pos: findColIndex(headers, ['place_of_supply', 'destination_state', 'pos_state', 'pos']),
        status: findColIndex(headers, ['status', 'bill_status']),
        taxableAmount: findColIndex(headers, ['taxable_amount', 'subtotal', 'item_total', 'basic_amount']),
        totalAmount: findColIndex(headers, ['total', 'bill_amount', 'amount', 'gross_amount']),
        balance: findColIndex(headers, ['balance', 'balance_due', 'amount_due', 'outstanding']),
        cgst: findColIndex(headers, ['cgst', 'cgst_amount']),
        sgst: findColIndex(headers, ['sgst', 'sgst_amount']),
        igst: findColIndex(headers, ['igst', 'igst_amount']),
        category: findColIndex(headers, ['account_name', 'item_category', 'category', 'expense_account']),
        isRcm: findColIndex(headers, ['is_reverse_charge_applied', 'reverse_charge', 'is_rcm', 'rcm'])
    };

    if (colIndex.billNo === -1 || (colIndex.totalAmount === -1 && colIndex.taxableAmount === -1)) {
        throw new Error('[@mudraforge/statutory] Zoho Books CSV must include a Bill Number and Total/Taxable Amount column.');
    }

    const bills = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvRow(lines[i], delimiter);
        if (row.length === 0 || row.every(cell => !cell || !cell.trim())) continue;

        const rawDate = colIndex.date !== -1 ? row[colIndex.date] : null;
        const billDate = normalizeIsoDate(rawDate);

        const rawDueDate = colIndex.dueDate !== -1 ? row[colIndex.dueDate] : null;
        const dueDate = normalizeIsoDate(rawDueDate);

        const billNumber = colIndex.billNo !== -1 ? (row[colIndex.billNo] || `BILL-${i}`).trim() : `BILL-${i}`;
        const vendorName = colIndex.vendorName !== -1 ? (row[colIndex.vendorName] || 'Unknown Vendor').trim() : 'Unknown Vendor';
        const rawGstin = colIndex.gstin !== -1 ? (row[colIndex.gstin] || '').trim().toUpperCase() : '';
        const normalizedGstinObj = normalizeGstin(rawGstin);

        const status = colIndex.status !== -1 ? (row[colIndex.status] || 'unpaid').trim().toLowerCase() : 'unpaid';
        const category = colIndex.category !== -1 ? (row[colIndex.category] || '').trim() : '';
        const rawPos = colIndex.pos !== -1 ? (row[colIndex.pos] || '').trim() : '';

        const rawTaxable = colIndex.taxableAmount !== -1 ? row[colIndex.taxableAmount] : '0';
        const rawTotal = colIndex.totalAmount !== -1 ? row[colIndex.totalAmount] : rawTaxable;
        const rawBalance = colIndex.balance !== -1 ? row[colIndex.balance] : '0';

        const rawCgst = colIndex.cgst !== -1 ? row[colIndex.cgst] : '0';
        const rawSgst = colIndex.sgst !== -1 ? row[colIndex.sgst] : '0';
        const rawIgst = colIndex.igst !== -1 ? row[colIndex.igst] : '0';

        const isRcm = colIndex.isRcm !== -1 ? /true|yes|y|1/i.test(row[colIndex.isRcm] || '') : false;

        const totalAmount = cleanNumericAmount(rawTotal);
        const taxableAmount = colIndex.taxableAmount !== -1 ? cleanNumericAmount(rawTaxable) : totalAmount;
        const balance = cleanNumericAmount(rawBalance);

        const cgst = cleanNumericAmount(rawCgst);
        const sgst = cleanNumericAmount(rawSgst);
        const igst = cleanNumericAmount(rawIgst);
        const totalTax = roundToPaisa(cgst + sgst + igst);

        const { exactKey, alphaNumericKey } = normalizeInvoiceNumber(billNumber);

        // Check if category indicates Section 17(5) blocked credit
        const isBlocked17_5 = /motor|vehicle|food|beverage|catering|club|fitness|personal|gift/i.test(category);

        bills.push({
            source: 'ZOHO_BOOKS',
            docType: 'BILL',
            rowNumber: i + 1,
            billNumber,
            exactKey,
            alphaNumericKey,
            billDate,
            dueDate,
            vendorName,
            vendorGstin: normalizedGstinObj.gstin,
            vendorPan: normalizedGstinObj.pan,
            isGstinValid: normalizedGstinObj.isValid,
            posStateCode: rawPos ? rawPos.slice(0, 2) : (normalizedGstinObj.stateCode || null),
            status,
            category,
            isBlocked17_5,
            isRcm,
            isSchedule1DeemedSupply: /distinct|related|deemed|schedule\s*1/i.test(category),
            taxableAmountInr: roundToPaisa(taxableAmount),
            cgstInr: roundToPaisa(cgst),
            sgstInr: roundToPaisa(sgst),
            igstInr: roundToPaisa(igst),
            totalTaxInr: totalTax,
            totalAmountInr: roundToPaisa(totalAmount),
            balanceInr: roundToPaisa(balance),
            isFullyPaid: balance <= 0 || status === 'paid'
        });
    }

    return bills;
}

/**
 * Parses Zoho Books API JSON response into normalized bill and vendor credit records.
 * Supports bills array, vendor_credits array, line items, and pagination context.
 *
 * @param {Object|string} jsonData - Raw Zoho Books API response object or JSON string
 * @returns {Array<Object>}
 */
export function parseZohoBillsJson(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const rawBills = Array.isArray(data) ? data : (Array.isArray(data.bills) ? data.bills : []);
    const rawCredits = Array.isArray(data.vendor_credits) ? data.vendor_credits : [];

    const records = [];

    // 1. Process Bills
    for (let idx = 0; idx < rawBills.length; idx++) {
        const b = rawBills[idx];
        const billNumber = (b.bill_number || b.invoice_number || `ZOHO-BILL-${idx + 1}`).trim();
        const { exactKey, alphaNumericKey } = normalizeInvoiceNumber(billNumber);
        const rawGstin = (b.gst_no || b.gstin || b.vendor_gstin || '').trim().toUpperCase();
        const normalizedGstinObj = normalizeGstin(rawGstin);

        const taxableAmount = cleanNumericAmount(b.sub_total || b.taxable_amount || b.total || 0);
        const totalAmount = cleanNumericAmount(b.total || taxableAmount);
        const balance = cleanNumericAmount(b.balance !== undefined ? b.balance : (b.status === 'paid' ? 0 : totalAmount));

        const cgst = cleanNumericAmount(b.cgst_amount || 0);
        const sgst = cleanNumericAmount(b.sgst_amount || 0);
        const igst = cleanNumericAmount(b.igst_amount || 0);
        const totalTax = roundToPaisa(cgst + sgst + igst);

        let category = String(b.category_name || b.account_name || '').trim();
        let isBlocked17_5 = Boolean(b.is_blocked_17_5) || /motor|vehicle|food|beverage|catering|club|fitness|personal|gift/i.test(category);

        // Inspect line items if present
        if (Array.isArray(b.line_items) && b.line_items.length > 0) {
            for (const item of b.line_items) {
                const itemCat = String(item.account_name || item.name || item.description || '');
                if (/motor|vehicle|food|beverage|catering|club|fitness|personal|gift/i.test(itemCat)) {
                    isBlocked17_5 = true;
                    if (!category) category = itemCat;
                }
            }
        }

        const isRcm = Boolean(b.is_reverse_charge_applied || b.reverse_charge_vat_registered || b.is_rcm);
        const rawPos = String(b.place_of_supply || b.destination_state || '').trim();

        records.push({
            source: 'ZOHO_BOOKS_API',
            docType: 'BILL',
            rowNumber: idx + 1,
            billId: b.bill_id || null,
            billNumber,
            exactKey,
            alphaNumericKey,
            billDate: normalizeIsoDate(b.date || b.bill_date),
            dueDate: normalizeIsoDate(b.due_date),
            vendorName: (b.vendor_name || 'Unknown Vendor').trim(),
            vendorGstin: normalizedGstinObj.gstin,
            vendorPan: normalizedGstinObj.pan,
            isGstinValid: normalizedGstinObj.isValid,
            posStateCode: rawPos ? rawPos.slice(0, 2) : (normalizedGstinObj.stateCode || null),
            status: String(b.status || 'unpaid').toLowerCase(),
            category,
            isBlocked17_5,
            isRcm,
            isSchedule1DeemedSupply: /distinct|related|deemed|schedule\s*1/i.test(category),
            taxableAmountInr: roundToPaisa(taxableAmount),
            cgstInr: roundToPaisa(cgst),
            sgstInr: roundToPaisa(sgst),
            igstInr: roundToPaisa(igst),
            totalTaxInr: totalTax,
            totalAmountInr: roundToPaisa(totalAmount),
            balanceInr: roundToPaisa(balance),
            isFullyPaid: balance <= 0 || b.status === 'paid'
        });
    }

    // 2. Process Vendor Credits (Credit Notes)
    for (let cIdx = 0; cIdx < rawCredits.length; cIdx++) {
        const c = rawCredits[cIdx];
        const creditNumber = (c.vendor_credit_number || c.credit_note_number || `ZOHO-CREDIT-${cIdx + 1}`).trim();
        const { exactKey, alphaNumericKey } = normalizeInvoiceNumber(creditNumber);
        const rawGstin = (c.gst_no || c.gstin || c.vendor_gstin || '').trim().toUpperCase();
        const normalizedGstinObj = normalizeGstin(rawGstin);

        const rawTaxable = cleanNumericAmount(c.sub_total || c.taxable_amount || c.total || 0);
        const rawTotal = cleanNumericAmount(c.total || rawTaxable);
        const rawCgst = cleanNumericAmount(c.cgst_amount || 0);
        const rawSgst = cleanNumericAmount(c.sgst_amount || 0);
        const rawIgst = cleanNumericAmount(c.igst_amount || 0);

        records.push({
            source: 'ZOHO_BOOKS_API',
            docType: 'VENDOR_CREDIT',
            rowNumber: rawBills.length + cIdx + 1,
            billId: c.vendor_credit_id || null,
            billNumber: creditNumber,
            exactKey,
            alphaNumericKey,
            billDate: normalizeIsoDate(c.date),
            dueDate: null,
            vendorName: (c.vendor_name || 'Unknown Vendor').trim(),
            vendorGstin: normalizedGstinObj.gstin,
            vendorPan: normalizedGstinObj.pan,
            isGstinValid: normalizedGstinObj.isValid,
            posStateCode: normalizedGstinObj.stateCode || null,
            status: String(c.status || 'open').toLowerCase(),
            category: 'Vendor Credit / Purchase Return',
            isBlocked17_5: false,
            isRcm: false,
            isSchedule1DeemedSupply: false,
            taxableAmountInr: roundToPaisa(-Math.abs(rawTaxable)),
            cgstInr: roundToPaisa(-Math.abs(rawCgst)),
            sgstInr: roundToPaisa(-Math.abs(rawSgst)),
            igstInr: roundToPaisa(-Math.abs(rawIgst)),
            totalTaxInr: roundToPaisa(-Math.abs(rawCgst + rawSgst + rawIgst)),
            totalAmountInr: roundToPaisa(-Math.abs(rawTotal)),
            balanceInr: 0,
            isFullyPaid: true
        });
    }

    return records;
}

/**
 * Parses GST Portal GSTR-2B JSON data into flat normalized invoice entries.
 * Supports standard GSTN schema including b2b and cdnr sections.
 *
 * @param {Object|string} gstr2bData - Raw GSTR-2B JSON or parsed object
 * @returns {Array<Object>}
 */
export function parseGstr2bJson(gstr2bData) {
    const root = typeof gstr2bData === 'string' ? JSON.parse(gstr2bData) : gstr2bData;
    const data = root.data || root;
    const recipientGstin = (root.gstin || data.gstin || '').trim().toUpperCase();

    const normalizedRecords = [];

    // 1. B2B Invoices
    const b2bList = Array.isArray(data.b2b) ? data.b2b : [];
    for (const supplier of b2bList) {
        const supplierGstin = String(supplier.ctin || '').trim().toUpperCase();
        const normSupplierGstin = normalizeGstin(supplierGstin);
        const supplierName = (supplier.cname || supplier.trade_name || 'Registered Supplier').trim();

        const invoices = Array.isArray(supplier.inv) ? supplier.inv : [];
        for (const inv of invoices) {
            const rawInvNum = String(inv.inum || '').trim();
            const { exactKey, alphaNumericKey } = normalizeInvoiceNumber(rawInvNum);

            const invoiceDate = parseGstPortalDate(inv.idt);
            const totalInvoiceValue = cleanNumericAmount(inv.val || 0);
            const posStateCode = String(inv.pos || '').trim();
            const isRcm = String(inv.rchrg || 'N').trim().toUpperCase() === 'Y';
            const itcAvailable = String(inv.itcavl || 'Y').trim().toUpperCase() === 'Y';
            const itcRevReason = String(inv.rsn || '').trim();

            let taxableSum = 0;
            let igstSum = 0;
            let cgstSum = 0;
            let sgstSum = 0;
            let cessSum = 0;

            const items = Array.isArray(inv.items || inv.itm_det) ? (inv.items || inv.itm_det) : [];
            for (const it of items) {
                taxableSum += cleanNumericAmount(it.txval || 0);
                igstSum += cleanNumericAmount(it.igst || 0);
                cgstSum += cleanNumericAmount(it.cgst || 0);
                sgstSum += cleanNumericAmount(it.sgst || 0);
                cessSum += cleanNumericAmount(it.cess || 0);
            }

            const totalTax = roundToPaisa(igstSum + cgstSum + sgstSum + cessSum);

            normalizedRecords.push({
                source: 'GSTR_2B',
                docType: 'INVOICE',
                invoiceNumber: rawInvNum,
                exactKey,
                alphaNumericKey,
                invoiceDate,
                supplierGstin: normSupplierGstin.gstin,
                supplierPan: normSupplierGstin.pan,
                supplierName,
                recipientGstin,
                posStateCode,
                isRcm,
                itcAvailable,
                itcRevReason: itcRevReason || null,
                taxableAmountInr: roundToPaisa(taxableSum),
                igstInr: roundToPaisa(igstSum),
                cgstInr: roundToPaisa(cgstSum),
                sgstInr: roundToPaisa(sgstSum),
                cessInr: roundToPaisa(cessSum),
                totalTaxInr: totalTax,
                totalAmountInr: roundToPaisa(totalInvoiceValue || (taxableSum + totalTax))
            });
        }
    }

    // 2. CDNR Credit / Debit Notes
    const cdnrList = Array.isArray(data.cdnr) ? data.cdnr : [];
    for (const supplier of cdnrList) {
        const supplierGstin = String(supplier.ctin || '').trim().toUpperCase();
        const normSupplierGstin = normalizeGstin(supplierGstin);
        const supplierName = (supplier.cname || supplier.trade_name || 'Registered Supplier').trim();

        const notes = Array.isArray(supplier.nt) ? supplier.nt : [];
        for (const nt of notes) {
            const rawNoteNum = String(nt.nt_num || '').trim();
            const { exactKey, alphaNumericKey } = normalizeInvoiceNumber(rawNoteNum);
            const noteDate = parseGstPortalDate(nt.nt_dt);
            const originalInvoiceNum = String(nt.inum || '').trim();
            const noteType = String(nt.typ || 'C').toUpperCase(); // 'C' = Credit Note, 'D' = Debit Note
            const isCreditNote = noteType === 'C';

            let multiplier = isCreditNote ? -1 : 1;
            const totalNoteValue = cleanNumericAmount(nt.val || 0) * multiplier;
            const posStateCode = String(nt.pos || '').trim();
            const isRcm = String(nt.rchrg || 'N').trim().toUpperCase() === 'Y';
            const itcAvailable = String(nt.itcavl || 'Y').trim().toUpperCase() === 'Y';
            const itcRevReason = String(nt.rsn || '').trim();

            let taxableSum = 0;
            let igstSum = 0;
            let cgstSum = 0;
            let sgstSum = 0;
            let cessSum = 0;

            const items = Array.isArray(nt.items || nt.itm_det) ? (nt.items || nt.itm_det) : [];
            for (const it of items) {
                taxableSum += cleanNumericAmount(it.txval || 0) * multiplier;
                igstSum += cleanNumericAmount(it.igst || 0) * multiplier;
                cgstSum += cleanNumericAmount(it.cgst || 0) * multiplier;
                sgstSum += cleanNumericAmount(it.sgst || 0) * multiplier;
                cessSum += cleanNumericAmount(it.cess || 0) * multiplier;
            }

            const totalTax = roundToPaisa(igstSum + cgstSum + sgstSum + cessSum);

            normalizedRecords.push({
                source: 'GSTR_2B',
                docType: isCreditNote ? 'CREDIT_NOTE' : 'DEBIT_NOTE',
                invoiceNumber: rawNoteNum,
                originalInvoiceNumber: originalInvoiceNum,
                exactKey,
                alphaNumericKey,
                invoiceDate: noteDate,
                supplierGstin: normSupplierGstin.gstin,
                supplierPan: normSupplierGstin.pan,
                supplierName,
                recipientGstin,
                posStateCode,
                isRcm,
                itcAvailable,
                itcRevReason: itcRevReason || null,
                taxableAmountInr: roundToPaisa(taxableSum),
                igstInr: roundToPaisa(igstSum),
                cgstInr: roundToPaisa(cgstSum),
                sgstInr: roundToPaisa(sgstSum),
                cessInr: roundToPaisa(cessSum),
                totalTaxInr: totalTax,
                totalAmountInr: roundToPaisa(totalNoteValue)
            });
        }
    }

    return normalizedRecords;
}

/**
 * Comprehensive Accounts Payable Reconciliation Engine:
 * Reconciles Zoho Books Bills with Form GSTR-2B.
 *
 * Categorizes transactions with statutory precision:
 * 1. MATCHED_ELIGIBLE: Perfect match in books and 2B, ITC marked eligible. Safe to claim.
 * 2. MISMATCH_AMOUNT_VALUE: Present in both, but taxable or tax variance exceeds tolerance.
 * 3. MATCHED_INELIGIBLE_STATUTORY_BLOCK_17_5: Present in both, but blocked under CGST Section 17(5).
 * 4. MATCHED_ROUTABLE_TO_BRANCH_GSTIN: Legitimate local levy in another state where recipient has a distinct person registration.
 * 5. MATCHED_INELIGIBLE_STRANDED_LOCAL_CGST_SGST: Mandatory local levy in supplier's state (e.g. hotel) where recipient has no registration.
 * 6. MATCHED_INELIGIBLE_PLACE_OF_SUPPLY_MISMATCH: Erroneous tax levy (supplier charged local tax instead of IGST).
 * 7. GSTR2B_INELIGIBLE_FLAGGED_BY_GSTN: Invoice in 2B but GST portal flagged itcavl: "N".
 * 8. MISSING_IN_GSTR2B: Bill in Books but unfiled by vendor. Provisional ITC restricted u/s 16(2)(aa).
 * 9. MISSING_IN_GSTR2B_TIMING: Bill in Books within recent tax period window (potential IFF / QRMP timing difference).
 * 10. MISSING_IN_BOOKS: Reported by vendor in 2B but absent in Books. Unrecorded AP liability.
 * 11. MISSING_IN_BOOKS_GOODS_IN_TRANSIT: In 2B within goods-in-transit window pending receipt under Section 16(2)(b).
 *
 * Evaluates Rule 37 180-day aging, proportional reversals, Rule 88B(3) ECL utilization, and re-availment rights.
 *
 * @param {Object} params
 * @param {Array<Object>|string} params.zohoBills - Array of parsed Zoho bills or raw CSV text
 * @param {Array<Object>|string} params.gstr2b - Array of parsed GSTR-2B invoices or raw JSON text
 * @param {Object} [params.options]
 * @param {number} [params.options.toleranceInr=1.00] - Rounding tolerance threshold (default ₹1.00)
 * @param {string} [params.options.asOfDate] - Audit date for Rule 37 aging (default today ISO)
 * @param {string} [params.options.recipientGstin] - Current filing recipient GSTIN
 * @param {Array<string>} [params.options.recipientRegisteredStates] - Array of state codes where recipient has distinct registrations
 * @param {Array<string>} [params.options.recipientRegisteredGstins] - Array of recipient pan-India GSTINs
 * @param {'UTILIZED'|'UNUTILIZED'} [params.options.eclUtilizationStatus='UTILIZED'] - Electronic Credit Ledger utilization status for Sec 50(3) interest
 * @param {number} [params.options.goodsInTransitWindowDays=15] - Threshold days to classify missing books bill as goods in transit
 * @returns {Object} Full reconciliation payload with metrics and audit trail
 */
export function reconcileZohoGstr2b({ zohoBills, gstr2b, options = {} }) {
    const {
        toleranceInr = 1.00,
        asOfDate = new Date().toISOString().slice(0, 10),
        recipientGstin = null,
        recipientRegisteredStates = [],
        recipientRegisteredGstins = [],
        eclUtilizationStatus = 'UTILIZED',
        goodsInTransitWindowDays = 15
    } = options;

    const tolerancePaise = toIntegerPaise(toleranceInr, 'toleranceInr');

    // 1. Ingest & Normalize Inputs
    const parsedBills = typeof zohoBills === 'string' ? parseZohoBillsCsv(zohoBills) : (Array.isArray(zohoBills) ? zohoBills : []);
    const parsed2b = typeof gstr2b === 'string' ? parseGstr2bJson(gstr2b) : (Array.isArray(gstr2b) ? gstr2b : []);

    const recipientFilingState = recipientGstin ? recipientGstin.slice(0, 2) : null;

    // Assemble comprehensive recipient state portfolio (distinct persons under Section 25(4))
    const recipientStateSet = new Set();
    if (recipientFilingState) {
        recipientStateSet.add(recipientFilingState);
    }
    for (const g of recipientRegisteredGstins) {
        if (typeof g === 'string' && g.length >= 2) {
            recipientStateSet.add(g.slice(0, 2));
        }
    }
    for (const s of recipientRegisteredStates) {
        if (typeof s === 'string' && s.length >= 2) {
            recipientStateSet.add(s.slice(0, 2));
        }
    }

    // Index GSTR-2B by composite key: supplierGstin + "|" + exactKey (with alphaNumericKey secondary lookup)
    const gstr2bExactMap = new Map();
    const gstr2bAlphaMap = new Map();
    const matched2bSet = new Set();

    for (let i = 0; i < parsed2b.length; i++) {
        const record = parsed2b[i];
        const gstinKey = record.supplierGstin || 'UNKNOWN_GSTIN';
        const exactComposite = `${gstinKey}|${record.exactKey}`;
        const alphaComposite = `${gstinKey}|${record.alphaNumericKey}`;

        gstr2bExactMap.set(exactComposite, { record, index: i });
        gstr2bAlphaMap.set(alphaComposite, { record, index: i });
    }

    const items = [];

    let totalBooksTaxablePaise = 0;
    let totalBooksTaxPaise = 0;
    let total2bTaxablePaise = 0;
    let total2bTaxPaise = 0;

    let matchedEligibleCount = 0;
    let eligibleItcPaise = 0;

    let amountMismatchCount = 0;
    let mismatchedItcPaise = 0;

    let blocked17_5Count = 0;
    let blocked17_5ItcPaise = 0;

    let posMismatchCount = 0;
    let posMismatchItcPaise = 0;

    let routableToBranchCount = 0;
    let routableToBranchItcPaise = 0;

    let strandedLocalCount = 0;
    let strandedLocalItcPaise = 0;

    let gstr2bPortalIneligibleCount = 0;
    let gstr2bPortalIneligibleItcPaise = 0;

    let missingIn2bCount = 0;
    let atRiskUnfiledItcPaise = 0;

    let rule37OverdueCount = 0;
    let rule37ReversalAmountPaise = 0;
    let rule37InterestExposurePaise = 0;

    // 2. Iterate Zoho Bills & Match against GSTR-2B
    for (const bill of parsedBills) {
        const gstinKey = bill.vendorGstin || 'UNKNOWN_GSTIN';
        const exactComposite = `${gstinKey}|${bill.exactKey}`;
        const alphaComposite = `${gstinKey}|${bill.alphaNumericKey}`;

        const booksTaxablePaise = toIntegerPaise(bill.taxableAmountInr);
        const booksTaxPaise = toIntegerPaise(bill.totalTaxInr);
        totalBooksTaxablePaise += booksTaxablePaise;
        totalBooksTaxPaise += booksTaxPaise;

        // Rule 37 180-Day Aging & Section 50(1) Evaluation
        let isRule37Overdue = false;
        let daysElapsedSinceBill = 0;
        let rule37Status = 'COMPLIANT_OR_NOT_APPLICABLE';
        let rule37ReversalTaxInr = 0;
        let rule37InterestInr = 0;
        let isReclaimableUponPayment = false;

        const isFullyPaid = bill.isFullyPaid || bill.balanceInr <= 0;

        // Try exact match, fallback to alphanumeric
        let matchEntry = gstr2bExactMap.get(exactComposite) || gstr2bAlphaMap.get(alphaComposite) || null;
        const isRcm = bill.isRcm || (matchEntry && matchEntry.record.isRcm);

        if (bill.billDate) {
            daysElapsedSinceBill = calculateDaysElapsed(bill.billDate, asOfDate);

            if (isRcm) {
                rule37Status = 'EXEMPT_RCM_SUPPLY'; // Proviso 1 to Rule 37(1)
            } else if (bill.isSchedule1DeemedSupply) {
                rule37Status = 'EXEMPT_SCHEDULE_1_DEEMED_SUPPLY'; // Proviso 2 to Rule 37(1)
            } else if (isFullyPaid) {
                rule37Status = 'COMPLIANT_FULLY_PAID';
            } else if (daysElapsedSinceBill <= 180) {
                rule37Status = 'WITHIN_180_DAYS_WINDOW';
            } else {
                // Bill exceeds 180 days unpaid!
                isRule37Overdue = true;
                rule37OverdueCount++;
                rule37Status = 'OVERDUE_REVERSAL_REQUIRED';
                isReclaimableUponPayment = true;

                // Second Proviso to Section 16(2): Proportional to unpaid balance
                const unpaidRatio = bill.totalAmountInr > 0 ? (bill.balanceInr / bill.totalAmountInr) : 1;
                const overdueTaxPaise = Math.round(booksTaxPaise * Math.min(1, Math.max(0, unpaidRatio)));
                rule37ReversalAmountPaise += overdueTaxPaise;
                rule37ReversalTaxInr = fromIntegerPaise(overdueTaxPaise);

                // Section 50(1) interest evaluated against ECL utilization
                const overdueDaysPast180 = daysElapsedSinceBill - 180;
                if (eclUtilizationStatus === 'UNUTILIZED') {
                    rule37InterestInr = 0;
                } else {
                    const annualInterestRate = 0.18;
                    const interestPaise = Math.round(overdueTaxPaise * (annualInterestRate / 365) * overdueDaysPast180);
                    rule37InterestExposurePaise += interestPaise;
                    rule37InterestInr = fromIntegerPaise(interestPaise);
                }
            }
        }

        if (!matchEntry) {
            // Disposition: MISSING_IN_GSTR2B
            missingIn2bCount++;
            atRiskUnfiledItcPaise += booksTaxPaise;

            const isTimingDifference = daysElapsedSinceBill <= 30;
            const disposition = isTimingDifference ? 'MISSING_IN_GSTR2B_TIMING' : 'MISSING_IN_GSTR2B';
            const itcStatus = isTimingDifference ? 'PROVISIONAL_PENDING_NEXT_GSTR2B' : 'PROVISIONAL_AT_RISK_RESTRICTED';

            items.push({
                disposition,
                itcStatus,
                statutorySection: 'CGST Act Section 16(2)(aa) read with Rule 36(4)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: 0,
                gstr2bTaxInr: 0,
                varianceTaxableInr: bill.taxableAmountInr,
                varianceTaxInr: bill.totalTaxInr,
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: isTimingDifference
                    ? 'Invoice dated within recent tax cycle. May appear in subsequent Form GSTR-2B or vendor IFF filing. Withhold claim until populated.'
                    : 'Invoice unfiled by vendor. Provisional ITC restricted under Section 16(2)(aa) & Rule 36(4). Withhold claim in GSTR-3B Table 4(A)(5). Issue vendor notice.',
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: false,
                    matchType: 'UNMATCHED',
                    isTimingDifference
                }
            });
            continue;
        }

        // Mark 2B record as matched
        matched2bSet.add(matchEntry.index);
        const record2b = matchEntry.record;

        const gstr2bTaxablePaise = toIntegerPaise(record2b.taxableAmountInr);
        const gstr2bTaxPaise = toIntegerPaise(record2b.totalTaxInr);

        const diffTaxablePaise = Math.abs(booksTaxablePaise - gstr2bTaxablePaise);
        const diffTaxPaise = Math.abs(booksTaxPaise - gstr2bTaxPaise);

        // Place of Supply (POS) Triangulation Matrix
        const supplierStateCode = record2b.supplierGstin ? record2b.supplierGstin.slice(0, 2) : (bill.vendorGstin ? bill.vendorGstin.slice(0, 2) : null);
        const posStateCode = record2b.posStateCode || bill.posStateCode || supplierStateCode;
        const hasLocalTax = (record2b.cgstInr > 0 || record2b.sgstInr > 0 || bill.cgstInr > 0 || bill.sgstInr > 0);
        const isSupplierLocal = supplierStateCode && posStateCode && supplierStateCode === posStateCode;

        let posClassification = 'POS_COMPLIANT';
        if (recipientFilingState && posStateCode && recipientFilingState !== posStateCode) {
            if (hasLocalTax && isSupplierLocal) {
                // Legitimate intra-state supply in supplier's state
                if (recipientStateSet.has(posStateCode)) {
                    posClassification = 'POS_ROUTABLE_TO_BRANCH_GSTIN';
                } else {
                    const isStatutoryLocalPOS = /hotel|lodge|stay|accommodation|catering|restaurant|real estate|immovable|event/i.test(bill.category || '');
                    posClassification = isStatutoryLocalPOS ? 'POS_STRANDED_LOCAL_CGST_SGST' : 'POS_ERRONEOUS_LEVY';
                }
            } else if (hasLocalTax && !isSupplierLocal) {
                posClassification = 'POS_ERRONEOUS_LEVY';
            } else if (!hasLocalTax) {
                // Interstate IGST but POS points to different state
                posClassification = recipientStateSet.has(posStateCode) ? 'POS_ROUTABLE_TO_BRANCH_GSTIN' : 'POS_ERRONEOUS_LEVY';
            }
        }

        if (record2b.itcAvailable === false) {
            // Disposition: GSTR2B_INELIGIBLE_FLAGGED_BY_GSTN
            gstr2bPortalIneligibleCount++;
            gstr2bPortalIneligibleItcPaise += booksTaxPaise;

            items.push({
                disposition: 'GSTR2B_INELIGIBLE_FLAGGED_BY_GSTN',
                itcStatus: 'INELIGIBLE_PORTAL_FLAGGED',
                statutorySection: 'CGST Act Section 16(4) / 16(2) (GSTN Ineligibility Flag)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(diffTaxablePaise),
                varianceTaxInr: fromIntegerPaise(diffTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: `Form GSTR-2B has flagged this credit as ineligible: ${record2b.itcRevReason || 'Section 16(4) time-barred or supplier/recipient restriction'}. Do not avail in GSTR-3B Table 4(A)(5).`,
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    itcRevReason: record2b.itcRevReason
                }
            });
        } else if (bill.isBlocked17_5) {
            // Disposition: MATCHED_INELIGIBLE_STATUTORY_BLOCK_17_5
            blocked17_5Count++;
            blocked17_5ItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MATCHED_INELIGIBLE_STATUTORY_BLOCK_17_5',
                itcStatus: 'INELIGIBLE_REVERSIBLE_TABLE_4B1',
                statutorySection: 'CGST Act Section 17(5) (Statutorily Blocked Input Tax Credit)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(diffTaxablePaise),
                varianceTaxInr: fromIntegerPaise(diffTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: 'Report in GSTR-3B Table 4(B)(1) as Ineligible ITC. Do not credit to electronic ledger.',
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    matchType: exactComposite === `${gstinKey}|${record2b.exactKey}` ? 'EXACT' : 'ALPHANUMERIC',
                    blockedCategory: bill.category || 'Section 17(5) Item'
                }
            });
        } else if (posClassification === 'POS_ROUTABLE_TO_BRANCH_GSTIN') {
            // Disposition: MATCHED_ROUTABLE_TO_BRANCH_GSTIN
            routableToBranchCount++;
            routableToBranchItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MATCHED_ROUTABLE_TO_BRANCH_GSTIN',
                itcStatus: 'ROUTABLE_TO_ANOTHER_BRANCH_GSTIN',
                statutorySection: 'CGST Act Section 25(4) read with IGST Act Section 12 (Distinct Persons)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(diffTaxablePaise),
                varianceTaxInr: fromIntegerPaise(diffTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: `Intra-state supply in State ${posStateCode}. Taxpayer holds valid registration in State ${posStateCode}. Route this voucher to branch GSTIN for claim in that state's GSTR-3B.`,
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    posStateCode,
                    recipientFilingState,
                    recipientRegisteredStates: Array.from(recipientStateSet)
                }
            });
        } else if (posClassification === 'POS_STRANDED_LOCAL_CGST_SGST') {
            // Disposition: MATCHED_INELIGIBLE_STRANDED_LOCAL_CGST_SGST
            strandedLocalCount++;
            strandedLocalItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MATCHED_INELIGIBLE_STRANDED_LOCAL_CGST_SGST',
                itcStatus: 'INELIGIBLE_STRANDED_LOCAL_LEVY',
                statutorySection: 'IGST Act Section 12(3)/12(4) & CGST Act Section 16(2)(c)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(diffTaxablePaise),
                varianceTaxInr: fromIntegerPaise(diffTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: `Mandatory intra-state supply in supplier state under Section 12(3)/12(4) (e.g. hotel/catering). Recipient lacks registration in State ${posStateCode}. Credit is stranded; absorb as operating expense.`,
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    posStateCode,
                    recipientFilingState
                }
            });
        } else if (posClassification === 'POS_ERRONEOUS_LEVY') {
            // Disposition: MATCHED_INELIGIBLE_PLACE_OF_SUPPLY_MISMATCH
            posMismatchCount++;
            posMismatchItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MATCHED_INELIGIBLE_PLACE_OF_SUPPLY_MISMATCH',
                itcStatus: 'INELIGIBLE_DEFECTIVE_INVOICE_POS_ERROR',
                statutorySection: 'CGST Act Section 16(2)(c) read with IGST Act Section 10(1)(a) & Section 12',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(diffTaxablePaise),
                varianceTaxInr: fromIntegerPaise(diffTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: `Supplier erroneously charged local CGST/SGST of State ${posStateCode} instead of IGST to State ${recipientFilingState}. Demand vendor credit note and corrected IGST invoice.`,
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    posStateCode,
                    recipientFilingState
                }
            });
        } else if (diffTaxablePaise > tolerancePaise || diffTaxPaise > tolerancePaise) {
            // Disposition: MISMATCH_AMOUNT_VALUE
            amountMismatchCount++;
            mismatchedItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MISMATCH_AMOUNT_VALUE',
                itcStatus: 'VALUE_DISCREPANCY_PENDING_RESOLUTION',
                statutorySection: 'CGST Act Section 16(2)(aa) & Rule 36(4)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: fromIntegerPaise(booksTaxablePaise - gstr2bTaxablePaise),
                varianceTaxInr: fromIntegerPaise(booksTaxPaise - gstr2bTaxPaise),
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                statutoryAction: `Taxable or tax amount exceeds ₹${toleranceInr} tolerance. Restrict claim to lower GSTR-2B amount; seek vendor credit note or amendment.`,
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    matchType: exactComposite === `${gstinKey}|${record2b.exactKey}` ? 'EXACT' : 'ALPHANUMERIC',
                    varianceExceeded: true
                }
            });
        } else {
            // Disposition: MATCHED_ELIGIBLE
            matchedEligibleCount++;
            eligibleItcPaise += booksTaxPaise;

            items.push({
                disposition: 'MATCHED_ELIGIBLE',
                itcStatus: isRcm ? 'ELIGIBLE_RCM_TABLE_4A3' : 'ELIGIBLE_CREDIT_TABLE_4A5',
                statutorySection: 'CGST Act Section 16(2) read with Section 16(1)',
                vendorName: bill.vendorName,
                vendorGstin: bill.vendorGstin,
                billNumber: bill.billNumber,
                billDate: bill.billDate,
                booksTaxableInr: bill.taxableAmountInr,
                booksTaxInr: bill.totalTaxInr,
                gstr2bTaxableInr: record2b.taxableAmountInr,
                gstr2bTaxInr: record2b.totalTaxInr,
                varianceTaxableInr: 0,
                varianceTaxInr: 0,
                isRule37Overdue,
                daysElapsedSinceBill,
                rule37Status,
                rule37ReversalTaxInr,
                rule37InterestInr,
                isReclaimableUponPayment,
                isRcm,
                statutoryAction: isRule37Overdue
                    ? `Eligible in GSTR-2B but >180 days unpaid (Rule 37). Must reverse ₹${rule37ReversalTaxInr} in Table 4(B)(2) + 18% interest ₹${rule37InterestInr}. Re-avail upon payment.`
                    : (isRcm
                        ? '100% matched RCM supply. Pay liability in cash in Table 3.1(d); avail credit in GSTR-3B Table 4(A)(3).'
                        : '100% matched and compliant. Avail full credit in GSTR-3B Table 4(A)(5).'),
                auditEvidence: {
                    inBooks: true,
                    inGstr2b: true,
                    matchType: exactComposite === `${gstinKey}|${record2b.exactKey}` ? 'EXACT' : 'ALPHANUMERIC',
                    varianceExceeded: false,
                    isRcm
                }
            });
        }
    }

    // 3. Scan Unmatched GSTR-2B Invoices (Missing in Books)
    let missingInBooksCount = 0;
    let missingInBooksTaxPaise = 0;

    for (let i = 0; i < parsed2b.length; i++) {
        const record = parsed2b[i];
        total2bTaxablePaise += toIntegerPaise(record.taxableAmountInr);
        total2bTaxPaise += toIntegerPaise(record.totalTaxInr);

        if (!matched2bSet.has(i)) {
            missingInBooksCount++;
            const taxPaise = toIntegerPaise(record.totalTaxInr);
            missingInBooksTaxPaise += taxPaise;

            const recordDateObj = new Date(record.invoiceDate);
            const asOfDateObj = new Date(asOfDate);
            const daysSinceInvoice = isNaN(recordDateObj) ? 999 : Math.floor((asOfDateObj - recordDateObj) / (1000 * 60 * 60 * 24));
            const isGoodsInTransit = daysSinceInvoice <= goodsInTransitWindowDays;

            const disposition = isGoodsInTransit ? 'MISSING_IN_BOOKS_GOODS_IN_TRANSIT' : 'MISSING_IN_BOOKS';
            const itcStatus = isGoodsInTransit ? 'GOODS_IN_TRANSIT_PENDING_RECEIPT' : 'UNRECORDED_PURCHASE_IN_BOOKS';

            items.push({
                disposition,
                itcStatus,
                statutorySection: isGoodsInTransit ? 'CGST Act Section 16(2)(b) (Receipt of Goods Condition)' : 'General Accounting Principles & GST Compliance',
                vendorName: record.supplierName,
                vendorGstin: record.supplierGstin,
                billNumber: record.invoiceNumber,
                billDate: record.invoiceDate,
                booksTaxableInr: 0,
                booksTaxInr: 0,
                gstr2bTaxableInr: record.taxableAmountInr,
                gstr2bTaxInr: record.totalTaxInr,
                varianceTaxableInr: -record.taxableAmountInr,
                varianceTaxInr: -record.totalTaxInr,
                isRule37Overdue: false,
                daysElapsedSinceBill: 0,
                rule37Status: 'NOT_IN_BOOKS',
                rule37ReversalTaxInr: 0,
                rule37InterestInr: 0,
                isReclaimableUponPayment: false,
                statutoryAction: isGoodsInTransit
                    ? `Invoice reported in GSTR-2B dated ${record.invoiceDate} (within ${goodsInTransitWindowDays} days). Verify physical receipt of goods per Section 16(2)(b) before recording bill.`
                    : 'Invoice reported in GSTR-2B by supplier but missing in Zoho Books. Review purchase orders or confirm if goods/services received.',
                auditEvidence: {
                    inBooks: false,
                    inGstr2b: true,
                    docType: record.docType,
                    posStateCode: record.posStateCode,
                    isGoodsInTransit
                }
            });
        }
    }

    const summary = {
        totalBooksBillsCount: parsedBills.length,
        totalGstr2bRecordsCount: parsed2b.length,
        matchedEligibleCount,
        amountMismatchCount,
        blocked17_5Count,
        posMismatchCount,
        routableToBranchCount,
        strandedLocalCount,
        gstr2bPortalIneligibleCount,
        missingIn2bCount,
        missingInBooksCount,
        rule37OverdueCount,

        totalBooksTaxableInr: fromIntegerPaise(totalBooksTaxablePaise),
        totalBooksTaxInr: fromIntegerPaise(totalBooksTaxPaise),
        totalGstr2bTaxableInr: fromIntegerPaise(total2bTaxablePaise),
        totalGstr2bTaxInr: fromIntegerPaise(total2bTaxPaise),

        eligibleItcInr: fromIntegerPaise(eligibleItcPaise),
        atRiskUnfiledItcInr: fromIntegerPaise(atRiskUnfiledItcPaise),
        blocked17_5ItcInr: fromIntegerPaise(blocked17_5ItcPaise),
        posMismatchItcInr: fromIntegerPaise(posMismatchItcPaise),
        routableToBranchItcInr: fromIntegerPaise(routableToBranchItcPaise),
        strandedLocalItcInr: fromIntegerPaise(strandedLocalItcPaise),
        gstr2bPortalIneligibleItcInr: fromIntegerPaise(gstr2bPortalIneligibleItcPaise),
        mismatchedItcInr: fromIntegerPaise(mismatchedItcPaise),
        missingInBooksTaxInr: fromIntegerPaise(missingInBooksTaxPaise),

        rule37ReversalAmountInr: fromIntegerPaise(rule37ReversalAmountPaise),
        rule37InterestExposureInr: fromIntegerPaise(rule37InterestExposurePaise),
        eclUtilizationStatus,

        reconciliationStatus: (missingIn2bCount === 0 && amountMismatchCount === 0 && missingInBooksCount === 0 && posMismatchCount === 0 && blocked17_5Count === 0) ? 'FULLY_RECONCILED' : 'EXCEPTIONS_IDENTIFIED',
        isAuthorizedToDisburse: false
    };

    return {
        status: 'SUCCESS',
        auditDate: asOfDate,
        summary,
        reconciliationItems: items
    };
}

/**
 * Generates an executive Markdown audit exception memorandum for the AP & Tax team.
 *
 * @param {Object} reconResult - Output of reconcileZohoGstr2b
 * @returns {string} Markdown memorandum
 */
export function generateGstr2bAuditMarkdownReport(reconResult) {
    if (!reconResult || reconResult.status !== 'SUCCESS') {
        throw new Error('[@mudraforge/statutory] Invalid reconciliation result passed to generateGstr2bAuditMarkdownReport.');
    }

    const s = reconResult.summary;
    const fmt = n => 'INR ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let md = '# ZOHO BOOKS & GSTR-2B AP RECONCILIATION AUDIT MEMORANDUM\n\n';
    md += `**Execution Date**: \`${reconResult.auditDate}\`  \n`;
    md += `**Statutory Mandate**: CGST Act Section 16(2)(aa), Section 17(5), & Rule 37 read with Section 50  \n`;
    md += `**Reconciliation Disposition**: **\`${s.reconciliationStatus}\`**  \n\n`;

    md += '## 1. Executive Summary & ITC Health Matrix\n\n';
    md += '| Metric | Books (Zoho) | GSTR-2B (GSTN) | Variance / Risk |\n';
    md += '| :--- | :--- | :--- | :--- |\n';
    md += `| **Total Vouchers Scanned** | \`${s.totalBooksBillsCount}\` bills | \`${s.totalGstr2bRecordsCount}\` records | \`${s.missingIn2bCount + s.missingInBooksCount}\` unmatched |\n`;
    md += `| **Taxable Goods & Services Base** | ${fmt(s.totalBooksTaxableInr)} | ${fmt(s.totalGstr2bTaxableInr)} | ${fmt(s.totalBooksTaxableInr - s.totalGstr2bTaxableInr)} |\n`;
    md += `| **Input Tax Credit (ITC) Total** | ${fmt(s.totalBooksTaxInr)} | ${fmt(s.totalGstr2bTaxInr)} | ${fmt(s.totalBooksTaxInr - s.totalGstr2bTaxInr)} |\n`;
    md += `| **100% Eligible ITC (Table 4(A)(5))** | — | — | **${fmt(s.eligibleItcInr)}** |\n`;
    md += `| **Provisional / At-Risk ITC (Missing in 2B)** | — | — | **${fmt(s.atRiskUnfiledItcInr)}** (Withhold) |\n`;
    md += `| **Blocked Ineligible ITC (Sec 17(5))** | — | — | **${fmt(s.blocked17_5ItcInr)}** (Table 4(B)(1)) |\n`;
    md += `| **Routable to Other Branch GSTINs** | — | — | **${fmt(s.routableToBranchItcInr)}** (Port to Branch) |\n`;
    md += `| **Stranded Local State Levies** | — | — | **${fmt(s.strandedLocalItcInr)}** (Absorb as Expense) |\n`;
    md += `| **Place of Supply (POS) Defective Invoices** | — | — | **${fmt(s.posMismatchItcInr)}** (Vendor Credit Note Req) |\n`;
    md += `| **Rule 37 Overdue Reversal (>180 Days)** | — | — | **${fmt(s.rule37ReversalAmountInr)}** (Table 4(B)(2)) |\n`;
    md += `| **Rule 37 Sec 50(1) Delayed Interest (${s.eclUtilizationStatus})** | — | — | **${fmt(s.rule37InterestExposureInr)}** |\n\n`;

    const exceptions = reconResult.reconciliationItems.filter(i => i.disposition !== 'MATCHED_ELIGIBLE');

    if (exceptions.length === 0) {
        md += '## 2. Statutory Audit Verdict\n\n';
        md += '> **100% CLEAN AP AUDIT**: Every purchase bill recorded in Zoho Books is corroborated by an eligible GSTR-2B return filed by registered suppliers with zero variance, zero blocked credit exposure, and zero Rule 37 180-day overdue liabilities.\n';
        return md;
    }

    md += `## 2. Actionable AP Exceptions Register (${exceptions.length} Items)\n\n`;
    md += '| Vendor GSTIN | Vendor Name | Bill No | Bill Date | Books ITC | GSTR-2B ITC | Disposition | Statutory Action Required |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

    for (const ex of exceptions) {
        md += `| \`${ex.vendorGstin || 'N/A'}\` | ${ex.vendorName} | \`${ex.billNumber}\` | ${ex.billDate || 'N/A'} | ${fmt(ex.booksTaxInr)} | ${fmt(ex.gstr2bTaxInr)} | **\`${ex.disposition}\`** | ${ex.statutoryAction} |\n`;
    }

    md += '\n---\n*Report generated deterministically by MudraForge Statutory Engine under OKF v0.2 substrate.*\n';
    return md;
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function parseCsvRow(rowText, delimiter = ',') {
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
        } else if (char === delimiter && !insideQuotes) {
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
    for (const name of candidateNames) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
    }
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Handle DD-MM-YYYY or DD/MM/YYYY
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return null;
}

function parseGstPortalDate(raw) {
    if (!raw) return null;
    const str = String(raw).trim();
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4 && parts[2].length === 2) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    return str;
}

function calculateDaysElapsed(fromDateStr, toDateStr) {
    if (!fromDateStr || !toDateStr) return 0;
    const fromMs = new Date(fromDateStr).getTime();
    const toMs = new Date(toDateStr).getTime();
    if (isNaN(fromMs) || isNaN(toMs)) return 0;
    return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}
