/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DETERMINISTIC STATUTORY & FINANCIAL CALCULATOR (v1.0 -- Adesha Invariants)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements deterministic arithmetic, temporal state machines, and statutory
 * conditionality trees across:
 * 1. MSMED Act Section 16: Exact compound interest with monthly rests at 3x Bank Rate.
 * 2. Section 43B(h) Temporal Engine: March 31 fiscal boundaries, dispute pauses, and trader exclusions.
 * 3. Cross-Border Withholding Engine: Income-tax Act 2025 vs 1961 dual-act mapping,
 *    Form 145/146 routing, and Supreme Court Engineering Analysis (2021) cloud characterization.
 */

// Canonical OKF v0.2 Release Merkle Roots & Versions
export const CURRENT_RELEASE_MERKLE_ROOT = 'sha256-4bbe36c3db841b833dd2bebbd6c1c5ed735498e7b20d1221c323ceb211529fe0';
export const MERKLE_ROOT_OKF_V2 = CURRENT_RELEASE_MERKLE_ROOT;
export const STATUTORY_PACKAGE_VERSION = '2.10.0';
export const OKF_CORPUS_VERSION = '2.9.0';

// Current RBI Bank Rate (H2 2024 - 2026 baseline): 6.75%
export const DEFAULT_RBI_BANK_RATE = 0.0675;

// Dated RBI Bank Rate Schedule notified under Section 49 of the RBI Act, 1934
export const RBI_BANK_RATE_SCHEDULE = [
    { effectiveFrom: '2023-02-08', effectiveTo: null, rate: 0.0675, notificationRef: 'RBI/2022-23/177' },
    { effectiveFrom: '2022-12-07', effectiveTo: '2023-02-07', rate: 0.0650, notificationRef: 'RBI/2022-23/150' },
    { effectiveFrom: '2022-09-30', effectiveTo: '2022-12-06', rate: 0.0615, notificationRef: 'RBI/2022-23/120' }
];

/**
 * Resolves the official RBI Bank Rate in effect on a specific transaction or due date.
 */
export function getRbiBankRateForDate(dateString) {
    const d = dateString ? new Date(dateString) : new Date();
    const dateIso = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const match = RBI_BANK_RATE_SCHEDULE.find(item => {
        if (item.effectiveFrom && dateIso < item.effectiveFrom) return false;
        if (item.effectiveTo && dateIso > item.effectiveTo) return false;
        return true;
    });
    return match ? match.rate : DEFAULT_RBI_BANK_RATE;
}

// Statutory Multiple per MSMED Act 2006 Section 16: 3x Bank Rate
export const MSMED_RATE_MULTIPLIER = 3;

/**
 * Standard Paisa Precision Rounding (2 decimal places) using integer math.
 * Eliminates floating point drift (e.g. 0.00000000001).
 * Rejects negative zero (-0 normalized to 0).
 */
export function roundToPaisa(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || isNaN(n) || Object.is(n, -0)) return 0;
    return Math.round(n * 100) / 100;
}

/**
 * Section 288B Rounding (Rounding off of tax):
 * The amount of tax under the Income-tax Act is rounded off to the nearest rupee,
 * and if the fraction is 50 paise or more, it is rounded up; otherwise ignored.
 */
export function roundSection288B(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || isNaN(n) || Object.is(n, -0)) return 0;
    return Math.round(n);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. MSMED SECTION 16: DETERMINISTIC COMPOUND INTEREST ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Formula: Compound interest with monthly rests at 3x RBI Bank Rate.
 * For partial months, applies prorated day-count fractions.
 */
export function calculateMsmeCompoundInterest({
    principal,
    // First-class MSMED statutory parameters:
    acceptanceDate = null,        // Day of acceptance / deemed acceptance u/s 2(h)
    deliveryDate = null,          // Day of actual delivery u/s 2(h)(i)
    writtenObjectionDate = null,  // Day of written objection u/s 2(h)(ii) (within 15 days of delivery)
    objectionRemovalDate = null,  // Day objection removed by supplier u/s 2(h)(ii)
    agreedPaymentDate = null,     // Date agreed upon in writing u/s 15
    hasWrittenAgreement = null,   // Boolean: true if written agreement exists, false if absent
    // Trader Exclusion & Enterprise Classification (Ministry of MSME OM 02.07.2021):
    vendorNicCode = null,         // 2-digit or 5-digit NIC code (e.g. '45', '46', '47')
    nicCode = null,               // Alias for vendorNicCode
    supplierType = null,          // 'MANUFACTURER' | 'SERVICE' | 'TRADER' | 'RETAIL_TRADER' | 'WHOLESALE_TRADER'
    isTrader = null,              // Explicit boolean override
    // Direct / legacy parameters:
    dueDate = null,
    accrualStartDate = null,
    paymentDate = new Date().toISOString(),
    rbiBankRate = null,
    dateConvention = 'START_DATE_INCLUSIVE', // 'START_DATE_INCLUSIVE' | 'SECTION_16_DAY_AFTER_DUE' | 'FROM_APPOINTED_DAY' | 'FROM_DAY_AFTER_AGREED_DATE'
    commenceDayAfter = false, // Legacy flag: when true, adds 1 day to dueDate per Section 16 agreed date rule
    includePaymentDate = false // When false, payment date is the settlement day (interest ceases at start of payment date)
}) {
    const p = Number(principal);
    if (isNaN(p) || p <= 0) {
        throw new Error("Invalid principal amount for MSME interest calculation.");
    }

    // ── 0A. TRADER EXCLUSION GATE (MINISTRY OF MSME OM DATED 02.07.2021) ──
    // Retail and Wholesale Trade (NIC Codes 45, 46, 47) were admitted to Udyam
    // solely for Priority Sector Lending (PSL) purposes. Delayed payment interest
    // under Chapter V of MSMED Act (Section 16) and Section 43B(h) disallowance
    // do NOT apply to traders.
    const resolvedNic = String(vendorNicCode || nicCode || '').trim();
    const isTraderByNic = /^(45|46|47)/.test(resolvedNic);
    const isTraderByType = typeof supplierType === 'string' && /TRADER|RETAIL|WHOLESALE/i.test(supplierType);
    const traderExclusionActive = isTrader === true || isTraderByNic || isTraderByType;

    if (traderExclusionActive) {
        return {
            principal: p,
            status: 'EXEMPT_TRADER_EXCLUSION',
            isTrader: true,
            isTraderExclusionApplied: true,
            vendorNicCode: resolvedNic || null,
            supplierType: supplierType || (isTraderByNic ? 'TRADER' : null),
            overdueDays: 0,
            totalInterest: 0,
            penalInterestAmount: 0,
            totalInterestRoundedSection288B: 0,
            totalPayable: p,
            effectiveAnnualRatePercent: 0,
            effectiveAnnualInterestRatePercent: 0,
            monthlyRestsCount: 0,
            monthlyRests: [],
            statutoryRule: 'MSME_TRADER_EXCLUSION_OM_2021',
            statutoryCitation: 'Ministry of MSME OM No. 5/2(2)/2021-E/P & G/Policy dated 02-07-2021 and RBI Circular FIDD.MSME & NFS.BC.No.13/06.02.31/2021-22',
            statutoryBasis: 'Wholesale and Retail Traders (NIC Codes 45, 46, 47) are admitted to Udyam solely for Priority Sector Lending (PSL). Chapter V delayed payment interest u/s 16 of MSMED Act and Section 43B(h) do NOT apply.',
            statutoryRationale: 'Enterprises registered under Retail and Wholesale Trade (NIC Codes 45, 46, 47) are restricted strictly to Priority Sector Lending (PSL) benefits. Delayed payment interest under Section 16 of MSMED Act and Section 43B(h) disallowance do NOT apply to traders.'
        };
    }

    if (!dueDate && !accrualStartDate && !acceptanceDate && !agreedPaymentDate && !deliveryDate) {
        throw new Error("Invalid statutory dates: at least one of acceptanceDate, deliveryDate, agreedPaymentDate, dueDate, or accrualStartDate must be provided for MSME interest calculation.");
    }

    // ── 0. SECTION 2(h) DAY OF ACCEPTANCE & DEEMED ACCEPTANCE RESOLUTION ──
    let effectiveAcceptanceDate = acceptanceDate;
    let acceptanceType = acceptanceDate ? 'EXPLICIT_ACCEPTANCE_DATE' : null;

    if (!effectiveAcceptanceDate && deliveryDate) {
        const dDelivery = new Date(String(deliveryDate).slice(0, 10) + 'T00:00:00.000Z');
        if (isNaN(dDelivery.getTime())) {
            throw new Error("Invalid deliveryDate format (expected YYYY-MM-DD).");
        }

        if (writtenObjectionDate) {
            const dObjection = new Date(String(writtenObjectionDate).slice(0, 10) + 'T00:00:00.000Z');
            const diffDays = Math.round((dObjection.getTime() - dDelivery.getTime()) / 86400000);

            // Section 2(h)(ii): Objection must be made within 15 days from delivery
            if (diffDays >= 0 && diffDays <= 15) {
                if (objectionRemovalDate) {
                    effectiveAcceptanceDate = String(objectionRemovalDate).slice(0, 10);
                    acceptanceType = 'ACCEPTANCE_UPON_OBJECTION_REMOVAL';
                } else {
                    return {
                        principal: p,
                        status: 'DISPUTE_CLOCK_PAUSED',
                        statutoryDetermination: 'INDETERMINATE_DISPUTE_UNRESOLVED',
                        isDisputePaused: true,
                        isAuthorizedToDisburse: false,
                        reason: 'Written objection filed within 15 days of delivery remains unresolved. Acceptance clock paused under Section 2(h)(ii). Objection removal date required to determine due date and interest.',
                        acceptanceDate: null,
                        statutoryDueDate: null,
                        overdueDays: null,
                        totalInterest: null,
                        penalInterestAmount: null,
                        totalInterestRoundedSection288B: null,
                        totalPayable: null,
                        monthlyRestsCount: 0,
                        monthlyRests: []
                    };
                }
            } else {
                effectiveAcceptanceDate = String(deliveryDate).slice(0, 10);
                acceptanceType = 'DEEMED_ACCEPTANCE_UNTIMELY_OBJECTION_DISREGARDED';
            }
        } else {
            effectiveAcceptanceDate = String(deliveryDate).slice(0, 10);
            acceptanceType = 'DEEMED_ACCEPTANCE_NO_OBJECTION';
        }
    }

    // ── 1. STATUTORY DATE RESOLUTION (MSMED ACT 2006 SECTIONS 15, 16 & 2(b)) ──
    // Section 16 prescribes two distinct commencement rules depending on whether a written agreement exists:
    //
    // Branch A (No written agreement):
    //   - Section 15: Buyer shall make payment "before the appointed day".
    //   - Section 2(b): "appointed day means the day following immediately after the expiry of the period of fifteen days from the day of acceptance".
    //   - Section 16: Buyer is liable to pay interest "from the appointed day".
    //   - Execution: Interest accrues ON the appointed day itself (acceptanceDate + 16 days).
    //
    // Branch B (Written agreement):
    //   - Section 15: Buyer shall make payment "on or before the date agreed upon".
    //   - Section 15 Proviso: In no case shall the agreed period exceed 45 days from acceptance.
    //   - Section 16: Buyer is liable to pay interest "from the date immediately following the date agreed upon".
    //   - Execution: Interest accrues starting agreedDate + 1 day (or cappedDate + 1 day).

    let startStr = null;
    let statutoryDueDateStr = null;
    let appointedDayStr = null;
    let effectiveAgreedDateStr = null;
    let statutoryCapApplied = false;
    let statutoryRule = 'LEGACY_DUE_DATE';
    let statutoryCitation = 'MSMED Act, 2006 Section 16';

    const endStr = String(paymentDate).slice(0, 10);
    const payment = new Date(endStr + 'T00:00:00.000Z');

    if (effectiveAcceptanceDate) {
        const dAccept = new Date(String(effectiveAcceptanceDate).slice(0, 10) + 'T00:00:00.000Z');
        if (isNaN(dAccept.getTime())) {
            throw new Error("Invalid acceptanceDate format (expected YYYY-MM-DD).");
        }

        // Section 2(b): Appointed day = day following immediately after expiry of 15 days
        const dAppointed = new Date(dAccept.getTime() + 16 * 86400000);
        appointedDayStr = dAppointed.toISOString().split('T')[0];

        const isWritten = hasWrittenAgreement === true || (hasWrittenAgreement === null && Boolean(agreedPaymentDate));

        if (isWritten && agreedPaymentDate) {
            // Branch B: Written agreement
            statutoryRule = 'SECTION_16_FROM_DAY_AFTER_AGREED_DATE';
            statutoryCitation = 'MSMED Act, 2006 Section 16 (interest running from date immediately following agreed date u/s 15 proviso)';
            
            const dAgreed = new Date(String(agreedPaymentDate).slice(0, 10) + 'T00:00:00.000Z');
            if (isNaN(dAgreed.getTime())) {
                throw new Error("Invalid agreedPaymentDate format (expected YYYY-MM-DD).");
            }

            // Section 15 Proviso: Maximum 45 days from day of acceptance
            const dCap = new Date(dAccept.getTime() + 45 * 86400000);
            if (dAgreed > dCap) {
                statutoryCapApplied = true;
                effectiveAgreedDateStr = dCap.toISOString().split('T')[0];
                statutoryDueDateStr = effectiveAgreedDateStr;
                const dAccrual = new Date(dCap.getTime() + 86400000);
                startStr = dAccrual.toISOString().split('T')[0];
            } else {
                statutoryCapApplied = false;
                effectiveAgreedDateStr = dAgreed.toISOString().split('T')[0];
                statutoryDueDateStr = effectiveAgreedDateStr;
                const dAccrual = new Date(dAgreed.getTime() + 86400000);
                startStr = dAccrual.toISOString().split('T')[0];
            }
        } else {
            // Branch A: No written agreement (Appointed Day rule)
            statutoryRule = 'SECTION_16_FROM_APPOINTED_DAY';
            statutoryCitation = 'MSMED Act, 2006 Section 16 (interest running from appointed day under Section 2(b))';
            
            // Payment due before appointed day (acceptance + 15 days)
            const dDue = new Date(dAccept.getTime() + 15 * 86400000);
            statutoryDueDateStr = dDue.toISOString().split('T')[0];
            // Interest runs FROM the appointed day (acceptance + 16 days)
            startStr = appointedDayStr;
        }
    } else {
        // Direct / legacy parameter fallback
        const dueDateStr = dueDate ? String(dueDate).slice(0, 10) : null;
        const isDayAfter = commenceDayAfter || dateConvention === 'SECTION_16_DAY_AFTER_DUE' || dateConvention === 'FROM_DAY_AFTER_AGREED_DATE';
        const isFromAppointed = dateConvention === 'FROM_APPOINTED_DAY';

        if (accrualStartDate) {
            startStr = String(accrualStartDate).slice(0, 10);
            statutoryDueDateStr = dueDateStr || startStr;
            statutoryRule = 'EXPLICIT_ACCRUAL_START_DATE';
        } else if (isFromAppointed && dueDateStr) {
            // Caller passed appointed day as dueDate; interest runs from appointed day
            startStr = dueDateStr;
            const dDue = new Date(dueDateStr + 'T00:00:00.000Z');
            const dBeforeAppointed = new Date(dDue.getTime() - 86400000);
            statutoryDueDateStr = dBeforeAppointed.toISOString().split('T')[0];
            statutoryRule = 'SECTION_16_FROM_APPOINTED_DAY';
            statutoryCitation = 'MSMED Act, 2006 Section 16 (interest running from appointed day under Section 2(b))';
        } else if (isDayAfter && dueDateStr) {
            // Caller passed agreed payment date; interest runs from day immediately following
            const dDue = new Date(dueDateStr + 'T00:00:00.000Z');
            if (isNaN(dDue.getTime())) {
                throw new Error("Invalid dueDate format (expected YYYY-MM-DD).");
            }
            statutoryDueDateStr = dueDateStr;
            const dAccrual = new Date(dDue.getTime() + 86400000);
            startStr = dAccrual.toISOString().split('T')[0];
            statutoryRule = 'SECTION_16_FROM_DAY_AFTER_AGREED_DATE';
            statutoryCitation = 'MSMED Act, 2006 Section 16 (interest running from date immediately following agreed date u/s 15 proviso)';
        } else {
            // Default legacy inclusive
            startStr = dueDateStr;
            statutoryDueDateStr = dueDateStr;
            statutoryRule = 'LEGACY_DUE_DATE';
        }
    }

    const start = new Date(startStr + 'T00:00:00.000Z');

    if (isNaN(start.getTime()) || isNaN(payment.getTime())) {
        throw new Error("Invalid dueDate or paymentDate format (expected YYYY-MM-DD).");
    }

    let effectiveBankRate = (rbiBankRate !== null && rbiBankRate !== undefined)
        ? Number(rbiBankRate)
        : getRbiBankRateForDate(statutoryDueDateStr || startStr || paymentDate);

    if (isNaN(effectiveBankRate) || !Number.isFinite(effectiveBankRate) || effectiveBankRate <= 0) {
        throw new Error(`Invalid rbiBankRate for MSME calculation: expected finite positive rate, received ${rbiBankRate}.`);
    }

    if (effectiveBankRate > 1) {
        // Defensive normalization: caller passed whole percentage e.g. 6.5 instead of 0.065
        effectiveBankRate = effectiveBankRate / 100;
    }

    const annualRate = effectiveBankRate * MSMED_RATE_MULTIPLIER; // e.g. 0.195 (19.5%)
    const activeDateConvention = dateConvention || 'START_DATE_INCLUSIVE';

    // Zero-Liability Check: Payment made on or before statutory due date
    const dDueRef = statutoryDueDateStr ? new Date(statutoryDueDateStr + 'T00:00:00.000Z') : start;
    if (payment <= dDueRef) {
        return {
            principal: p,
            effectiveAnnualRatePercent: Number((effectiveBankRate * MSMED_RATE_MULTIPLIER * 100).toFixed(2)),
            annualRateDecimal: effectiveBankRate * MSMED_RATE_MULTIPLIER,
            rbiBankRate: effectiveBankRate,
            statutoryRule,
            statutoryCitation,
            statutoryDueDate: statutoryDueDateStr,
            firstAccrualDate: startStr,
            paymentDate: endStr,
            acceptanceDate: effectiveAcceptanceDate ? String(effectiveAcceptanceDate).slice(0, 10) : null,
            acceptanceType,
            appointedDay: appointedDayStr,
            agreedPaymentDate: effectiveAgreedDateStr || (agreedPaymentDate ? String(agreedPaymentDate).slice(0, 10) : null),
            statutoryCapApplied,
            dateConvention: activeDateConvention,
            includePaymentDate,
            dayCountConvention: 'ACTUAL/365_OR_366',
            dayCountConventionBasis: 'DOCUMENTED_CALCULATION_CONVENTION',
            overdueDays: 0,
            totalInterest: 0,
            penalInterestAmount: 0,
            totalInterestRoundedSection288B: 0,
            totalPayable: p,
            monthlyRestsCount: 0,
            monthlyRests: [],
            statutoryBasis: `Payment made on or before statutory due date (${statutoryDueDateStr}). Zero penal interest accrued under Section 16 of MSMED Act, 2006.`
        };
    }

    // Accrual End Boundary:
    // If includePaymentDate is true, accrual continues through the end of paymentDate.
    // If includePaymentDate is false, accrual terminates at opening of paymentDate (paymentDate - 1 day).
    const accrualEnd = includePaymentDate
        ? new Date(payment.getTime() + 86400000)
        : payment;

    if (accrualEnd <= start) {
        return {
            principal: p,
            effectiveAnnualRatePercent: Number((annualRate * 100).toFixed(2)),
            annualRateDecimal: annualRate,
            rbiBankRate: effectiveBankRate,
            dueDate: dueDateStr,
            firstAccrualDate: startStr,
            paymentDate: endStr,
            dateConvention: activeDateConvention,
            includePaymentDate,
            dayCountConvention: 'ACTUAL/365_OR_366',
            overdueDays: 0,
            totalInterest: 0,
            penalInterestAmount: 0,
            totalInterestRoundedSection288B: 0,
            totalPayable: p,
            monthlyRestsCount: 0,
            monthlyRests: [],
            statutoryBasis: "Zero overdue accrual days under selected payment date boundary."
        };
    }

    const totalDays = Math.round((accrualEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate month-by-month compounding with monthly rests strictly in UTC
    const monthlyRests = [];
    let currentBalance = p;
    let iterDate = new Date(start.getTime());
    let restIndex = 1;

    while (iterDate < accrualEnd) {
        const year = iterDate.getUTCFullYear();
        const month = iterDate.getUTCMonth();
        // Start of next calendar month in UTC
        const nextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
        const restEnd = accrualEnd < nextMonthStart ? accrualEnd : nextMonthStart;

        const daysInRest = Math.round((restEnd.getTime() - iterDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysInRest > 0) {
            const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
            const periodInterest = currentBalance * annualRate * (daysInRest / daysInYear);
            const closing = currentBalance + periodInterest;

            const inclusivePeriodEnd = new Date(restEnd.getTime() - 86400000).toISOString().split('T')[0];

            monthlyRests.push({
                restNumber: restIndex++,
                periodStart: iterDate.toISOString().split('T')[0],
                periodEnd: inclusivePeriodEnd,
                daysInPeriod: daysInRest,
                yearDenominator: daysInYear,
                openingPrincipal: Number(currentBalance.toFixed(2)),
                openingPrincipalFullPrecision: currentBalance,
                interestAccrued: Number(periodInterest.toFixed(2)),
                interestAccruedFullPrecision: periodInterest,
                closingBalance: Number(closing.toFixed(2)),
                closingBalanceFullPrecision: closing,
                capitalizedAt: restEnd < accrualEnd ? `End of calendar month (${inclusivePeriodEnd} 24:00 UTC)` : `Payment settlement (${endStr})`
            });

            currentBalance = closing;
        }

        iterDate = restEnd;
    }

    const totalInterest = Number((currentBalance - p).toFixed(2));
    const totalPayable = Number(currentBalance.toFixed(2));

    return {
        principal: p,
        effectiveAnnualRatePercent: Number((annualRate * 100).toFixed(2)),
        annualRateDecimal: annualRate,
        rbiBankRate: effectiveBankRate,
        statutoryRule,
        statutoryCitation,
        statutoryDueDate: statutoryDueDateStr,
        dueDate: statutoryDueDateStr,
        firstAccrualDate: startStr,
        paymentDate: endStr,
        acceptanceDate: effectiveAcceptanceDate ? String(effectiveAcceptanceDate).slice(0, 10) : null,
        acceptanceType,
        appointedDay: appointedDayStr,
        agreedPaymentDate: effectiveAgreedDateStr || (agreedPaymentDate ? String(agreedPaymentDate).slice(0, 10) : null),
        statutoryCapApplied,
        dateConvention: activeDateConvention,
        includePaymentDate,
        dayCountConvention: 'ACTUAL/365_OR_366',
        dayCountConventionBasis: 'DOCUMENTED_CALCULATION_CONVENTION',
        overdueDays: totalDays,
        totalInterest,
        penalInterestAmount: totalInterest,
        totalInterestRoundedSection288B: roundSection288B(totalInterest),
        totalPayable,
        monthlyRestsCount: monthlyRests.length,
        monthlyRests,
        statutoryBasis: `${statutoryCitation} (Compound interest with monthly rests at 3x RBI Bank Rate: ${Number((annualRate * 100).toFixed(2))}%)`
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. SECTION 43B(h) TEMPORAL & FISCAL BOUNDARY STATE MACHINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Accurately branches:
 * - Trader vs Manufacturer qualification (NIC 45, 46, 47 exclusion)
 * - 45-day written contract vs 15-day statutory baseline
 * - Dispute clock pauses (Section 15 Explanation)
 * - Same FY (before March 31) payment vs crossing FY boundary
 */
export function evaluateSection43bH({
    invoiceDate,
    acceptanceDate = null,
    agreedTermsDays = null,
    disputeStartDate = null,
    disputeEndDate = null,
    paymentDate = null,
    fyEndDate = null,
    supplierType = 'MANUFACTURER', // 'MICRO_MANUFACTURER', 'SMALL_MANUFACTURER', 'TRADER', 'MEDIUM'
    nicCode = null
}) {
    const baseAcceptanceDate = new Date(acceptanceDate || invoiceDate);
    
    // Dynamically calculate fiscal year end based on invoice/acceptance date if not explicitly overridden
    let effectiveFyEndDate = fyEndDate;
    if (!effectiveFyEndDate) {
        const refDate = new Date(acceptanceDate || invoiceDate);
        if (!isNaN(refDate.getTime())) {
            const month = refDate.getMonth(); // Jan=0, Feb=1, Mar=2, Apr=3
            const year = refDate.getFullYear();
            const endYear = month >= 3 ? year + 1 : year;
            effectiveFyEndDate = `${endYear}-03-31`;
        } else {
            effectiveFyEndDate = '2026-03-31';
        }
    }
    const fyEnd = new Date(effectiveFyEndDate);
    const actualPayment = paymentDate ? new Date(paymentDate) : null;

    // ── GATE 1: SUPPLIER ELIGIBILITY CHECK ──
    const isTrader = supplierType?.toUpperCase()?.includes('TRADER') 
        || (nicCode && /^(45|46|47)/.test(String(nicCode).trim()));
    const isMedium = supplierType?.toUpperCase()?.includes('MEDIUM');

    if (isTrader) {
        return {
            isCoveredBy43Bh: false,
            qualificationStatus: 'EXCLUDED_TRADER',
            reason: 'Supplier is registered as a Retail or Wholesale Trader (NIC 45/46/47). Ministry of MSME OM No. 2/1(5)/2021-P&G/Policy dated 02.07.2021 restricts Chapter V and Section 43B(h) protection to Manufacturers and Service Providers only.',
            disallowedInCurrentFY: false,
            taxDeductionStatus: 'ALLOWABLE_ON_ACCRUAL',
            statutoryAction: 'Expense is 100% deductible in the current financial year on mercantile accrual basis, regardless of payment date.'
        };
    }

    if (isMedium) {
        return {
            isCoveredBy43Bh: false,
            qualificationStatus: 'EXCLUDED_MEDIUM_ENTERPRISE',
            reason: 'Supplier is a Medium Enterprise. Section 43B(h) exclusively protects Micro and Small enterprises. Medium enterprises are outside the purview.',
            disallowedInCurrentFY: false,
            taxDeductionStatus: 'ALLOWABLE_ON_ACCRUAL',
            statutoryAction: 'Expense is deductible on standard mercantile accrual basis.'
        };
    }

    // ── GATE 2: STATUTORY PAYMENT TIMELINE & DISPUTE PAUSE ──
    // Without written agreement: strictly 15 days from acceptance
    // With written agreement: agreed term up to a maximum cap of 45 days
    let allowedDays = 15;
    let agreementType = 'STATUTORY_DEFAULT_15_DAYS';

    if (agreedTermsDays && Number(agreedTermsDays) > 0) {
        const terms = Number(agreedTermsDays);
        if (terms <= 45) {
            allowedDays = terms;
            agreementType = `WRITTEN_AGREEMENT_${terms}_DAYS`;
        } else {
            allowedDays = 45; // Section 15 statutory cap
            agreementType = 'WRITTEN_AGREEMENT_CAPPED_AT_45_DAYS';
        }
    }

    // Check dispute pause (Section 15 Explanation)
    let disputeDurationDays = 0;
    if (disputeStartDate && disputeEndDate) {
        const dStart = new Date(disputeStartDate);
        const dEnd = new Date(disputeEndDate);
        if (dEnd > dStart) {
            disputeDurationDays = Math.ceil((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24));
        }
    }

    const statutoryDueDate = new Date(baseAcceptanceDate.getTime() + ((allowedDays + disputeDurationDays) * 24 * 60 * 60 * 1000));

    // ── GATE 3: TEMPORAL TAX ASSESSMENT (MARCH 31 FY BOUNDARY) ──
    const dueDateStr = statutoryDueDate.toISOString().split('T')[0];
    const fyEndStr = fyEnd.toISOString().split('T')[0];

    // Case A: Payment already made
    if (actualPayment) {
        const paymentDateStr = actualPayment.toISOString().split('T')[0];
        const isPaidWithinStatutoryTerms = actualPayment <= statutoryDueDate;
        const isPaidBeforeMarch31 = actualPayment <= fyEnd;

        if (isPaidWithinStatutoryTerms) {
            return {
                isCoveredBy43Bh: true,
                qualificationStatus: 'QUALIFIED_MICRO_SMALL',
                statutoryDueDate: dueDateStr,
                actualPaymentDate: paymentDateStr,
                disputeDurationDays,
                agreementType,
                isPaidWithinTerms: true,
                isPaidBeforeMarch31,
                disallowedInCurrentFY: false,
                taxDeductionStatus: 'FULLY_DEDUCTIBLE_CURRENT_FY',
                statutoryAction: `Payment made on ${paymentDateStr} within the statutory clock (due ${dueDateStr}). Expense is 100% allowable on accrual basis in the current assessment year.`
            };
        }

        // Paid LATE, but before March 31 of same FY:
        if (isPaidBeforeMarch31) {
            return {
                isCoveredBy43Bh: true,
                qualificationStatus: 'QUALIFIED_MICRO_SMALL',
                statutoryDueDate: dueDateStr,
                actualPaymentDate: paymentDateStr,
                disputeDurationDays,
                agreementType,
                isPaidWithinTerms: false,
                isPaidBeforeMarch31: true,
                disallowedInCurrentFY: false, // CRITICAL CA INVARIANT: Paid before March 31 = Deductible on actual payment in same FY!
                taxDeductionStatus: 'FULLY_DEDUCTIBLE_CURRENT_FY_ON_PAYMENT',
                msmePenalInterestApplicable: true,
                statutoryAction: `Payment was delayed past statutory due date (${dueDateStr}), but made BEFORE fiscal year-end (${paymentDateStr} <= ${fyEndStr}). Under Section 43B(h), the deduction is allowable on actual payment basis in this same financial year (ZERO year-end tax disallowance). Note: MSMED Section 16 compound interest remains payable to the supplier for the delayed days.`
            };
        }

        // Paid LATE and crossed March 31 into next FY:
        const currentFY = `${fyEnd.getFullYear() - 1}-${String(fyEnd.getFullYear()).slice(-2)}`;
        const nextFY = `${fyEnd.getFullYear()}-${String(fyEnd.getFullYear() + 1).slice(-2)}`;

        return {
            isCoveredBy43Bh: true,
            qualificationStatus: 'QUALIFIED_MICRO_SMALL',
            statutoryDueDate: dueDateStr,
            actualPaymentDate: paymentDateStr,
            disputeDurationDays,
            agreementType,
            isPaidWithinTerms: false,
            isPaidBeforeMarch31: false,
            disallowedInCurrentFY: true,
            assessmentYearDisallowed: `AY ${fyEnd.getFullYear() + 1}-${String(fyEnd.getFullYear() + 2).slice(-2)} (FY ${currentFY})`,
            assessmentYearAllowed: `AY ${actualPayment.getFullYear() + 1}-${String(actualPayment.getFullYear() + 2).slice(-2)} (FY ${nextFY})`,
            taxDeductionStatus: 'DISALLOWED_CURRENT_FY_CARRIED_FORWARD',
            msmePenalInterestApplicable: true,
            statutoryAction: `Overdue invoice remained unpaid as of March 31 (${fyEndStr}) and crossed into next FY. The expense is strictly DISALLOWED in FY ${currentFY} under Section 43B(h), and becomes deductible in FY ${nextFY} (the year of actual payment). MSMED Section 16 penal interest is applicable and is non-deductible under Section 23 of MSMED Act.`
        };
    }

    // Case B: Currently unpaid
    const today = new Date();
    const isCurrentlyOverdue = today > statutoryDueDate;

    return {
        isCoveredBy43Bh: true,
        qualificationStatus: 'QUALIFIED_MICRO_SMALL',
        statutoryDueDate: dueDateStr,
        actualPaymentDate: null,
        disputeDurationDays,
        agreementType,
        isCurrentlyOverdue,
        statutoryAction: isCurrentlyOverdue
            ? `Invoice is currently overdue past ${dueDateStr}. To prevent Section 43B(h) disallowance, payment must be completed before ${fyEndStr} (March 31).`
            : `Invoice is within terms until ${dueDateStr}. Ensure payment is settled before the due date.`
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. CROSS-BORDER WITHHOLDING & DUAL-ACT FORM ROUTER
 * ─────────────────────────────────────────────────────────────────────────────
 * Anchors the transition between Income-tax Act 1961 vs Income-tax Act 2025:
 * - Post-April 1, 2026: Section 393(2), Form 145 (Rule 220), Form 146
 * - Pre-April 1, 2026: Section 195, Form 15CA (Rule 37BB), Form 15CB
 * - SC Engineering Analysis (2021) automated cloud infra vs human FTS
 * - Form 145 Part A vs Part B (AO order) vs Part C (CA cert)
 */
export function evaluateCrossBorderRemittance({
    amountUsd,
    fxRate = 83.5,
    transactionDate = new Date().toISOString(),
    country = null,
    isAutomatedCloudInfra = true,
    hasHumanTechnicalServices = false,
    hasTrc = false,
    hasNoPe = false,
    hasForm10F = false,
    hasAoCertificate = false
}) {
    const usd = Number(amountUsd);
    const amountInr = Number((usd * fxRate).toFixed(2));
    const txDate = new Date(transactionDate);

    // If treaty relief is claimed (TRC, No-PE, or Form 10F) but country is missing,
    // bilateral DTAA treaty benefits cannot be determined under Section 90 without knowing the Contracting State.
    if ((hasTrc || hasNoPe || hasForm10F) && (!country || typeof country !== 'string' || !country.trim())) {
        return {
            amountUsd: usd,
            amountInr,
            transactionDate,
            statutoryDetermination: 'INDETERMINATE',
            status: 'INDETERMINATE',
            isAuthorizedToDisburse: false,
            effectiveRatePercent: null,
            calculatedTdsInr: null,
            withholdingTaxInr: null,
            netRemittanceInr: null,
            indeterminacyReason: 'MISSING_RECIPIENT_COUNTRY_FOR_DTAA',
            characterization: 'Recipient country of tax residency is mandatory to evaluate bilateral DTAA treaty benefits and rates under Section 90.',
            taxabilityBasis: 'DTAA_TREATY_COUNTRY_REQUIRED',
            statutoryCitations: txDate >= new Date('2026-04-01') ? {
                act: "Income-tax Act, 2025",
                chargingSection: "Section 393(2)"
            } : {
                act: "Income-tax Act, 1961",
                chargingSection: "Section 195"
            },
            requiredDocumentation: ['Recipient Country of Tax Residency', 'Tax Residency Certificate (TRC)', 'Form 10F', 'No-PE Certificate']
        };
    }

    // ── TEMPORAL ACT BRIDGE (1 April 2026 Boundary) ──
    const isAct2025 = txDate >= new Date('2026-04-01');

    const statutoryCitations = isAct2025 ? {
        act: "Income-tax Act, 2025",
        chargingSection: "Section 393(2) (Non-Resident Non-Salary Withholding Table)",
        declarationForm: "Form 145",
        caCertificateForm: "Form 146",
        governingRule: "Rule 220 of Income-tax Rules, 2026",
        penaltySection: "Section 462 (Penalty for non-furnishing of Form 145, up to ₹1,00,000)"
    } : {
        act: "Income-tax Act, 1961",
        chargingSection: "Section 195 (Other Sums Payable to Non-Resident)",
        declarationForm: "Form 15CA",
        caCertificateForm: "Form 15CB",
        governingRule: "Rule 37BB of Income-tax Rules, 1962",
        penaltySection: "Section 271-I (Penalty for failure to furnish information, ₹1,00,000)"
    };

    // ── TAXABILITY & CLOUD CHARACTERIZATION ──
    // Engineering Analysis (2021) SC + Rackspace/AWS ITAT Rulings
    let characterization = "";
    let effectiveRatePercent = 20; // Default domestic non-treaty rate
    let taxabilityBasis = "";

    const isTaxHaven = country ? ['CYPRUS', 'CAYMAN', 'BERMUDA', 'BVI', 'PANAMA'].includes(String(country).toUpperCase().trim()) : false;
    if (isTaxHaven) {
        effectiveRatePercent = 30; // Section 94A NJA rate
        characterization = "Notified Jurisdictional Area (Tax Haven) under Section 94A / 2025 Act equivalent. Mandatory 30% withholding.";
        taxabilityBasis = "TAX_HAVEN_STATUTORY_OVERRIDE";
    } else if (isAutomatedCloudInfra && !hasHumanTechnicalServices) {
        // Pure automated SaaS/database infrastructure
        if (hasTrc && hasNoPe) {
            effectiveRatePercent = 0;
            characterization = "Business Profits under DTAA Article 7. Under Supreme Court Engineering Analysis (2021) and ITAT precedents, automated cloud hosting without human managerial/technical involvement does not constitute Royalty or FTS. In the absence of an Indian Permanent Establishment (PE), income is non-taxable in India.";
            taxabilityBasis = "DTAA_ARTICLE_7_BUSINESS_PROFITS_NON_TAXABLE";
        } else {
            effectiveRatePercent = 20;
            characterization = "Automated cloud infrastructure, but foreign vendor lacks TRC and No-PE certificate. Default domestic withholding applies under Section 195 / Section 393.";
            taxabilityBasis = "UNVERIFIED_TREATY_DOMESTIC_RATE";
        }
    } else {
        // Fees for Technical Services (FTS) / Royalty
        if (hasTrc && hasForm10F) {
            effectiveRatePercent = 10; // Standard DTAA Article 12 cap
            characterization = "Fees for Technical Services (FTS) / Royalty under DTAA Article 12. Eligible for concessional treaty rate of 10% (plus surcharge/cess as applicable).";
            taxabilityBasis = "DTAA_ARTICLE_12_FTS_TREATY_RATE";
        } else {
            effectiveRatePercent = 20;
            characterization = "FTS / Royalty without valid TRC and Form 10F. Defaults to domestic statutory rate of 20%.";
            taxabilityBasis = "DOMESTIC_STATUTORY_FTS_RATE";
        }
    }

    // ── FORM ROUTING CONDITIONALITY TREE (Part A vs Part B vs Part C) ──
    const FIVE_LAKHS_INR = 500000;
    let applicablePart = "";
    let caCertificateRequired = false;
    let proceduralSummary = "";

    if (amountInr <= FIVE_LAKHS_INR && effectiveRatePercent === 0) {
        applicablePart = "PART_A";
        caCertificateRequired = false;
        proceduralSummary = `Aggregate remittance in financial year does not exceed ₹5,00,000. File ${statutoryCitations.declarationForm} Part A only. CA Certificate (${statutoryCitations.caCertificateForm}) is not required.`;
    } else if (hasAoCertificate) {
        applicablePart = "PART_B";
        caCertificateRequired = false;
        proceduralSummary = `Lower/Nil withholding certificate or order obtained from Assessing Officer under Section 197 / Section 195(2). File ${statutoryCitations.declarationForm} Part B. CA Certificate (${statutoryCitations.caCertificateForm}) is waived under law.`;
    } else {
        applicablePart = "PART_C";
        caCertificateRequired = true;
        proceduralSummary = `Remittance exceeds ₹5,00,000 and no AO order has been obtained. Mandatory compliance: Obtain CA Certificate in ${statutoryCitations.caCertificateForm}, then file ${statutoryCitations.declarationForm} Part C online before initiating the bank transfer.`;
    }

    const calculatedTdsInr = Number(((amountInr * effectiveRatePercent) / 100).toFixed(2));
    const netRemittanceInr = Number((amountInr - calculatedTdsInr).toFixed(2));

    // Dual control check
    const requiresAdeshaTier2Card = usd > 500;

    return {
        amountUsd: usd,
        amountInr,
        transactionDate,
        statutoryCitations,
        characterization,
        taxabilityBasis,
        effectiveRatePercent,
        calculatedTdsInr,
        netRemittanceInr,
        applicablePart,
        caCertificateRequired,
        proceduralSummary,
        requiredDocumentation: [
            "Vendor Tax Residency Certificate (TRC) covering relevant financial year",
            "Form 10F (self-declaration filed on income tax portal)",
            "No Permanent Establishment (No-PE) certificate from vendor",
            "Invoice and Cloud Service Level Agreement (confirming hosted outside India)",
            caCertificateRequired ? `${statutoryCitations.caCertificateForm} (Chartered Accountant Certificate)` : null,
            `${statutoryCitations.declarationForm} (${applicablePart} acknowledgement)`
        ].filter(Boolean),
        governanceGate: {
            requiresAdeshaTier2Card,
            policy: requiresAdeshaTier2Card 
                ? "International SWIFT remittance exceeds $500 threshold. Bounded Human-in-the-Loop Attention Card + dual-control sign-off required before release."
                : "Within standard autonomous threshold."
        }
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. SECTION 194Q / 206C(1H) / 206AA: DETERMINISTIC GOODS WITHHOLDING ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes exact taxable base exceeding ₹50,00,000 annual threshold, applies
 * Section 206AA penalty rate (20%) if PAN is missing/inoperative, models the
 * Section 206C(1H) sunset effective 1 April 2025, and transitions to
 * Section 393(1) of the Income-tax Act, 2025 on 1 April 2026.
 */
/**
 * 3. LOWER DEDUCTION CERTIFICATE STATUTORY EVALUATOR (SECTION 197 / SECTION 395)
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates the statutory validity of lower deduction certificates across regime transitions:
 * - Checks explicit cancellation or revocation status (Assessing Officer / TRACES).
 * - Checks covered period / validity window against transaction effective date.
 * - Enforces Section 536(2) transitional savings for legacy Section 197 certificates
 *   pre-issued for FY 2026-27 under the Income-tax Act, 2025.
 * - Rejects expired certificates (e.g. FY 2025-26 certificates used post-April 2026).
 */
export function evaluateLowerDeductionCertificateValidity({
    effectiveDate = null,
    lowerDeductionCertificate = null,
    certificateSection = null,
    isAct2025 = false
} = {}) {
    if (!lowerDeductionCertificate && !certificateSection) {
        return {
            isValid: true,
            status: 'NO_CERTIFICATE',
            reason: null,
            governingCertificateSection: isAct2025 ? 'Income-tax Act, 2025 Section 395' : 'Income-tax Act, 1961 Section 197',
            isSection536TransitionalSavingsApplied: false,
            transitionalSavingsClause: null,
            certificateSection: isAct2025 ? '395' : '197'
        };
    }

    const certObj = typeof lowerDeductionCertificate === 'object' && lowerDeductionCertificate !== null
        ? lowerDeductionCertificate
        : {};

    const certRef = String(
        certificateSection ||
        certObj.certificateSection ||
        certObj.section ||
        certObj.governingSection ||
        ''
    ).trim();

    const isLegacy197Ref = /197/.test(certRef) || Boolean(certObj.isTransitionalSection197);

    // 1. Explicit Cancellation / Revocation Check
    if (certObj.isCancelled === true || certObj.revoked === true || certObj.status === 'CANCELLED' || certObj.status === 'REVOKED') {
        return {
            isValid: false,
            status: 'CERTIFICATE_CANCELLED_OR_REVOKED',
            reason: 'Lower deduction certificate has been explicitly cancelled or revoked by the Assessing Officer / TRACES authority.',
            governingCertificateSection: isAct2025 ? 'Income-tax Act, 2025 Section 395 (Revoked)' : 'Income-tax Act, 1961 Section 197 (Revoked)',
            isSection536TransitionalSavingsApplied: false,
            transitionalSavingsClause: null,
            certificateSection: certRef || (isAct2025 ? '395' : '197')
        };
    }

    // 2. Covered Period / Expiry Window Check
    const validFrom = certObj.validFrom || null;
    const validTo = certObj.validTo || null;
    const coveredFy = certObj.coveredFinancialYear || certObj.financialYear || null;

    if (effectiveDate) {
        if (validFrom && effectiveDate < validFrom) {
            return {
                isValid: false,
                status: 'CERTIFICATE_PREMATURE_DATE',
                reason: `Transaction date (${effectiveDate}) is prior to certificate commencement date (${validFrom}).`,
                governingCertificateSection: isAct2025 ? 'Income-tax Act, 2025 Section 395 (Premature)' : 'Income-tax Act, 1961 Section 197 (Premature)',
                isSection536TransitionalSavingsApplied: false,
                transitionalSavingsClause: null,
                certificateSection: certRef || (isAct2025 ? '395' : '197')
            };
        }
        if (validTo && effectiveDate > validTo) {
            return {
                isValid: false,
                status: 'CERTIFICATE_EXPIRED_COVERED_PERIOD',
                reason: `Transaction date (${effectiveDate}) is outside certificate covered validity period (expired on ${validTo}).`,
                governingCertificateSection: isAct2025 ? 'Income-tax Act, 2025 Section 395 (Expired)' : 'Income-tax Act, 1961 Section 197 (Expired)',
                isSection536TransitionalSavingsApplied: false,
                transitionalSavingsClause: null,
                certificateSection: certRef || (isAct2025 ? '395' : '197')
            };
        }
        if (coveredFy && isAct2025) {
            // If transaction is in FY 2026-27 or later, but certificate was strictly for FY 2025-26
            if (/2025-26/.test(coveredFy) && effectiveDate >= '2026-04-01') {
                return {
                    isValid: false,
                    status: 'CERTIFICATE_EXPIRED_COVERED_PERIOD',
                    reason: 'Certificate was sanctioned strictly for FY 2025-26 and does not cover receivables for FY 2026-27.',
                    governingCertificateSection: 'Income-tax Act, 1961 Section 197 (Expired FY 2025-26)',
                    isSection536TransitionalSavingsApplied: false,
                    transitionalSavingsClause: null,
                    certificateSection: certRef || '197'
                };
            }
        }
    }

    // 3. Act 2025 vs Act 1961 Regime Resolution
    if (isAct2025) {
        if (isLegacy197Ref) {
            return {
                isValid: true,
                status: 'VALID_LEGACY_CERTIFICATE_UNDER_SEC_536_2',
                reason: 'Certificate issued under Section 197 covering projected receivables for FY 2026-27 remains legally enforceable under Section 536(2) transitional savings.',
                governingCertificateSection: "Income-tax Act, 2025 Section 395 read with Section 536(2) Transitional Savings (Deemed Section 197 Certificate)",
                isSection536TransitionalSavingsApplied: true,
                transitionalSavingsClause: "Income-tax Act, 2025 Section 536(2)",
                certificateSection: certRef || '197'
            };
        }
        return {
            isValid: true,
            status: 'VALID_ACT_2025_SEC_395',
            reason: 'Valid certificate issued under Section 395 on Form 128 of the Income-tax Act, 2025.',
            governingCertificateSection: "Income-tax Act, 2025 Section 395",
            isSection536TransitionalSavingsApplied: false,
            transitionalSavingsClause: null,
            certificateSection: certRef || '395'
        };
    }

    return {
        isValid: true,
        status: 'VALID_ACT_1961_SEC_197',
        reason: 'Valid certificate issued under Section 197 of the Income-tax Act, 1961.',
        governingCertificateSection: "Income-tax Act, 1961 Section 197",
        isSection536TransitionalSavingsApplied: false,
        transitionalSavingsClause: null,
        certificateSection: certRef || '197'
    };
}

export function resolveGoverningCertificateSection(params = {}) {
    return evaluateLowerDeductionCertificateValidity(params);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHORITATIVE STATUTORY RATE SCHEDULE TABLE
 * ─────────────────────────────────────────────────────────────────────────────
 * Maintains the verified, authoritative statutory rate schedules for Finance Act
 * provisions and Double Taxation Avoidance Agreements (DTAA).
 * Rather than trusting caller-supplied rate numbers, the engine validates or retrieves
 * the legally prescribed rate directly from this verified schedule.
 */
export const AUTHORITATIVE_STATUTORY_RATES = {
    // 1. Finance Act Rates
    'FINANCE_ACT:2025:SCHEDULE_I_PART_II:ITEM_2_B': {
        ratePercent: 10.0,
        source: 'FINANCE_ACT',
        citation: 'Finance Act, 2025 Schedule I Part II Item 2(b)',
        effectiveFrom: '2025-04-01',
        effectiveTo: '2026-03-31',
        applicableCategories: ['TECHNICAL_SERVICES', 'ROYALTY', 'SPECIFIED_FEES']
    },
    'FINANCE_ACT:2026:SCHEDULE_I_PART_II:ITEM_2_B': {
        ratePercent: 10.0,
        source: 'FINANCE_ACT',
        citation: 'Finance Act, 2026 Schedule I Part II Item 2(b)',
        effectiveFrom: '2026-04-01',
        effectiveTo: '2027-03-31',
        applicableCategories: ['TECHNICAL_SERVICES', 'ROYALTY', 'SPECIFIED_FEES']
    },
    // 2. DTAA Double Taxation Avoidance Treaty Rates
    'DTAA_TREATY:INDIA_US:ARTICLE_12_2': {
        ratePercent: 15.0,
        source: 'DTAA_TREATY',
        citation: 'India-US Double Taxation Avoidance Agreement Article 12(2)',
        effectiveFrom: '1991-01-01',
        effectiveTo: '2099-12-31',
        applicableCategories: ['FTS', 'ROYALTY', 'TECHNICAL_SERVICES']
    },
    'DTAA_TREATY:INDIA_SINGAPORE:ARTICLE_12_2': {
        ratePercent: 10.0,
        source: 'DTAA_TREATY',
        citation: 'India-Singapore Double Taxation Avoidance Agreement Article 12(2)',
        effectiveFrom: '1994-08-08',
        effectiveTo: '2099-12-31',
        applicableCategories: ['FTS', 'ROYALTY', 'TECHNICAL_SERVICES']
    },
    'DTAA_TREATY:INDIA_GERMANY:ARTICLE_12_2': {
        ratePercent: 10.0,
        source: 'DTAA_TREATY',
        citation: 'India-Germany Double Taxation Avoidance Agreement Article 12(2)',
        effectiveFrom: '1996-10-26',
        effectiveTo: '2099-12-31',
        applicableCategories: ['FTS', 'ROYALTY', 'TECHNICAL_SERVICES']
    }
};

/**
 * Resolves the statutory missing-PAN penalty floor:
 * - Income-tax Act, 1961 Section 206AA(1) First Proviso
 * - Income-tax Act, 2025 Section 397(2)
 *
 * Statutory Scoping:
 * - 5.0% applies strictly to:
 *   (a) Section 194Q / Section 393(1) Table 8 Item 8(ii) (Purchase of goods)
 *   (b) Section 194-O / Section 393(1) Table 8 Item 8(v) (E-commerce participants)
 * - 20.0% applies to all other categories:
 *   Section 194J / Table 8 Item 7 (Fees for professional/technical services),
 *   Section 194C / Table 8 Item 6 (Contractors),
 *   Section 194I / Table 8 Item 5 (Rent),
 *   Section 194H / Table 8 Item 4 (Commission),
 *   Section 195 / Section 394 (Non-residents).
 */
export function resolveMissingPanPenaltyFloor({
    sectionCode = '194Q',
    tableItem = null,
    isAct2025 = false
} = {}) {
    const sec = String(sectionCode || '').toUpperCase().trim();
    const item = String(tableItem || '').toLowerCase().trim();

    const isGoodsPurchase = sec === '194Q' || item === '393_8_ii' || item === 'item 8(ii)' || item === '8(ii)';
    const isEcommerce = sec === '194O' || sec === '194-O' || item === '393_8_v' || item === 'item 8(v)' || item === '8(v)';

    if (isGoodsPurchase || isEcommerce) {
        return {
            penaltyFloorPercent: 5.0,
            isConcessional5PercentApplicable: true,
            categoryScope: isGoodsPurchase ? 'SPECIFIED_GOODS_PURCHASE_5_PERCENT' : 'SPECIFIED_ECOMMERCE_PARTICIPANT_5_PERCENT',
            governingProviso: isAct2025
                ? `Income-tax Act, 2025 Section 397(2)(b)(i)(${isGoodsPurchase ? 'C' : 'D'}) read with Section 393(1) Table 8, Item ${isGoodsPurchase ? '8(ii)' : '8(v)'}`
                : `Income-tax Act, 1961 Section 206AA(1) First Proviso read with Section ${sec}`
        };
    }

    return {
        penaltyFloorPercent: 20.0,
        isConcessional5PercentApplicable: false,
        categoryScope: 'GENERAL_SERVICES_AND_FEES_20_PERCENT',
        governingProviso: isAct2025
            ? 'Income-tax Act, 2025 Section 397(2)(a)'
            : 'Income-tax Act, 1961 Section 206AA(1)(iii)'
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STATUTORY RATE PROVENANCE & EVIDENCE VALIDATOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates that an asserted rate in force is grounded in authoritative statutory evidence:
 * 1. Checks citation against Authoritative Statutory Rate Table.
 * 2. Rejects fabricated rate values that contradict the authoritative statutory schedule.
 * 3. Enforces temporal validity window [effectiveFrom, effectiveTo] against transactionDate.
 * 4. Disallows private commercial contracts from modifying statutory withholding rates.
 * 5. Rejects unverified or contradictory rate evidence (fails closed).
 */
export function validateRateEvidence({
    rateInForce = null,
    ratesInForceSource = 'STATUTORY_BASE',
    sourceReference = null,
    rateScheduleKey = null,
    effectiveFrom = null,
    effectiveTo = null,
    transactionDate = null
} = {}) {
    // 0. Disallow private commercial contracts from attempting to define statutory rate in force
    if (ratesInForceSource === 'COMMERCIAL_CONTRACT' || ratesInForceSource === 'PRIVATE_AGREEMENT') {
        return {
            isValid: false,
            status: 'INVALID_LEGAL_SOURCE',
            error: 'Private commercial contract cannot define or modify statutory "rates in force" under Income-tax Act, 1961 Section 2(37A) / Income-tax Act, 2025 Section 397(1)(b).'
        };
    }

    // 1. Explicit Schedule Key Resolution with Fail-Closed Rejection of Unknown Keys
    if (rateScheduleKey && !AUTHORITATIVE_STATUTORY_RATES[rateScheduleKey]) {
        return {
            isValid: false,
            status: 'UNKNOWN_RATE_SCHEDULE_KEY',
            error: `Unknown rateScheduleKey "${rateScheduleKey}". Key is not registered in authoritative statutory schedule registry.`
        };
    }

    let schedule = null;
    if (rateScheduleKey && AUTHORITATIVE_STATUTORY_RATES[rateScheduleKey]) {
        schedule = AUTHORITATIVE_STATUTORY_RATES[rateScheduleKey];
    } else if (sourceReference) {
        const refLower = String(sourceReference).toLowerCase();
        for (const [k, v] of Object.entries(AUTHORITATIVE_STATUTORY_RATES)) {
            if (v.citation.toLowerCase().includes(refLower) || refLower.includes(v.citation.toLowerCase())) {
                schedule = v;
                break;
            }
        }
    }

    if (rateInForce === null || rateInForce === undefined) {
        if (schedule) {
            const effStart = schedule.effectiveFrom;
            const effEnd = schedule.effectiveTo;
            if (transactionDate) {
                const tx = String(transactionDate).slice(0, 10);
                if (effStart && tx < String(effStart).slice(0, 10)) {
                    return {
                        isValid: false,
                        status: 'RATE_PRE_EFFECTIVE',
                        error: `Rate in force evidence is not yet effective on transaction date ${tx} (effective from ${effStart}).`
                    };
                }
                if (effEnd && tx > String(effEnd).slice(0, 10)) {
                    return {
                        isValid: false,
                        status: 'RATE_EXPIRED',
                        error: `Rate in force evidence expired on ${effEnd} prior to transaction date ${tx}.`
                    };
                }
            }
            return {
                isValid: true,
                status: 'RETRIEVED_FROM_AUTHORITATIVE_SCHEDULE',
                ratePercent: schedule.ratePercent,
                ratesInForceSource: schedule.source,
                sourceReference: schedule.citation,
                effectiveFrom: schedule.effectiveFrom,
                effectiveTo: schedule.effectiveTo,
                reason: `Rate of ${schedule.ratePercent}% retrieved directly from authoritative statutory schedule (${schedule.citation}).`
            };
        }
        return {
            isValid: true,
            status: 'DEFAULT_STATUTORY_BASE',
            ratePercent: 0.1,
            ratesInForceSource: 'STATUTORY_BASE',
            sourceReference: 'Statutory Base Provision',
            reason: 'No external rate in force asserted; defaulting to baseline statutory rate.'
        };
    }

    const numericRate = Number(rateInForce);
    if (!Number.isFinite(numericRate) || isNaN(numericRate) || numericRate < 0) {
        return {
            isValid: false,
            status: 'INVALID_NUMERIC_RATE',
            error: `Invalid rateInForce "${rateInForce}": must be a non-negative finite number.`
        };
    }

    const recognizedSources = ['FINANCE_ACT', 'DTAA_TREATY', 'CBDT_NOTIFIED', 'STATUTORY_BASE'];
    if (ratesInForceSource && !recognizedSources.includes(ratesInForceSource)) {
        return {
            isValid: false,
            status: 'UNRECOGNIZED_RATE_SOURCE',
            error: `Unrecognized ratesInForceSource "${ratesInForceSource}". Must be one of: ${recognizedSources.join(', ')}.`
        };
    }

    // If authoritative schedule is matched, enforce that supplied rate matches prescribed rate
    if (schedule && Math.abs(numericRate - schedule.ratePercent) > 0.001) {
        return {
            isValid: false,
            status: 'RATE_CONTRADICTS_AUTHORITATIVE_SCHEDULE',
            error: `Supplied rate in force (${numericRate}%) contradicts authoritative statutory schedule for "${schedule.citation}" (prescribed rate: ${schedule.ratePercent}%).`
        };
    }

    // Require citation reference for higher rates
    if (numericRate > 0.1 && ratesInForceSource && ratesInForceSource !== 'STATUTORY_BASE' && !sourceReference && !schedule) {
        return {
            isValid: false,
            status: 'UNAUTHENTICATED_RATE_EVIDENCE',
            error: `Rate in force (${numericRate}%) from source "${ratesInForceSource}" requires an authoritative legal citation in sourceReference (e.g. "Finance Act 2025 Schedule I Part II" or "India-US DTAA Article 12(2)").`
        };
    }

    // Temporal validity window check
    const effStart = schedule?.effectiveFrom || effectiveFrom;
    const effEnd = schedule?.effectiveTo || effectiveTo;

    if (transactionDate) {
        const tx = String(transactionDate).slice(0, 10);
        if (effStart && tx < String(effStart).slice(0, 10)) {
            return {
                isValid: false,
                status: 'RATE_PRE_EFFECTIVE',
                error: `Rate in force evidence is not yet effective on transaction date ${tx} (effective from ${effStart}).`
            };
        }
        if (effEnd && tx > String(effEnd).slice(0, 10)) {
            return {
                isValid: false,
                status: 'RATE_EXPIRED',
                error: `Rate in force evidence expired on ${effEnd} prior to transaction date ${tx}.`
            };
        }
    }

    return {
        isValid: true,
        status: schedule ? 'VERIFIED_AGAINST_AUTHORITATIVE_SCHEDULE' : 'AUTHENTICATED_STATUTORY_EVIDENCE',
        ratePercent: numericRate,
        ratesInForceSource: schedule?.source || ratesInForceSource || 'STATUTORY_BASE',
        sourceReference: schedule?.citation || sourceReference,
        effectiveFrom: effStart,
        effectiveTo: effEnd,
        reason: `Rate of ${numericRate}% verified against authoritative evidence (${schedule?.source || ratesInForceSource || 'STATUTORY_BASE'}: ${schedule?.citation || sourceReference || 'Statutory Baseline'}).`
    };
}

export function evaluateSection194Q({
    invoiceAmount,
    priorFyPurchases = 0,
    priorPurchasesInCurrentFyInr = undefined,
    currentFyPriorPurchasesInr = undefined,
    precedingFyPurchasesInr = undefined,
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    creditDate = null,
    paymentDate = null,
    buyerTurnoverCr = null,
    sellerTurnoverCr = null,
    isBuyerPrescribed = null,
    isSellerPrescribed = null,
    buyerName = null,
    sellerName = null,
    lowerDeductionRate = null,
    lowerDeductionCertificate = null,
    certificateMonetaryCeilingInr = null,
    certificatePriorUtilizedInr = 0,
    certificateSection = null,
    gstAmountInr = 0,
    isAdvancePayment = false,
    creditNoteInr = 0,
    creditNoteTiming = 'BEFORE_TAX_DEDUCTION', // 'BEFORE_TAX_DEDUCTION' | 'AFTER_TAX_DEDUCTION'
    advanceNettedInr = 0,
    priorAdvanceTdsDeductedInr = 0,
    isImportOfGoods = false,
    sellerIsNonResident = false,
    rateInForce = null,
    ratesInForceSource = null, // 'FINANCE_ACT' | 'DTAA_TREATY' | 'CBDT_NOTIFIED' | 'STATUTORY_BASE'
    sourceReference = null,
    rateScheduleKey = null,
    rateEffectiveFrom = null,
    rateEffectiveTo = null
} = {}) {
    const rawInvoiceAmount = Number(invoiceAmount) || 0;
    const gstAmount = Number(gstAmountInr) || 0;
    const creditNote = Number(creditNoteInr) || 0;
    const advanceNetted = Number(advanceNettedInr) || 0;
    const priorAdvanceTds = Number(priorAdvanceTdsDeductedInr) || 0;

    // CBDT Circular No. 13 of 2021 Question 3:
    // Does Section 194Q apply to import of goods from non-residents?
    // Clarification: Section 194Q does not apply to an import of goods where the seller
    // is a non-resident without a permanent establishment in India. (Section 195 applies instead).
    const isForeignVendorImport = Boolean(isImportOfGoods) || Boolean(sellerIsNonResident);
    if (isForeignVendorImport) {
        const effDate = transactionDate || creditDate || paymentDate || null;
        const isAct2025 = effDate ? effDate >= '2026-04-01' : false;
        return {
            invoiceAmountInr: rawInvoiceAmount,
            taxableBase: 0,
            tdsRatePercent: 0,
            calculatedTdsInr: 0,
            netWireInr: rawInvoiceAmount,
            isTdsApplicable: false,
            isSection194QApplicable: false,
            isExemptForeignImport: true,
            effectiveDate: effDate,
            regimeStatus: effDate ? 'DETERMINED' : 'INDETERMINATE_PENDING_TRANSACTION_DATE',
            isAct2025,
            governingSection: isAct2025 ? 'CBDT Circular No. 13 of 2021 Question 3 (Read with Section 393(2))' : 'CBDT Circular No. 13 of 2021 Question 3 (Read with Section 195)',
            statutoryReason: 'CBDT Circular 13/2021 Question 3 explicitly clarifies Section 194Q does not apply to import of goods from non-resident sellers lacking a permanent establishment in India. Governed under cross-border provisions (Section 195 / Section 393(2)).',
            statutoryDisposition: 'EXEMPT_IMPORT_OF_GOODS_FOREIGN_VENDOR'
        };
    }

    // CBDT Circular No. 13 of 2021 Question 1:
    // If tax is separately indicated on invoice and transaction is not advance payment,
    // TDS under Section 194Q is deducted on basic goods value excluding GST component.
    // If advance payment is made before invoice issuance, TDS applies to gross amount.
    const effectivePurchaseAmount = isAdvancePayment 
        ? rawInvoiceAmount 
        : Math.max(0, rawInvoiceAmount - gstAmount);
    
    // CBDT Circular No. 13 of 2021 Question 4 (Purchase Returns & Credit Notes):
    // 1. Credit Note BEFORE withholding (agreed price discount, immediate defect return before ledger entry):
    //    Deduction applies on actual net consideration per Section 194Q(1).
    // 2. Purchase Return AFTER withholding:
    //    Tax already deducted cannot be refunded or adjusted against government remittance.
    //    Purchase value reduction is carried forward for adjustment against subsequent purchases from the same seller in the same FY.
    const isCreditNoteBeforeWithholding = creditNoteTiming !== 'AFTER_TAX_DEDUCTION';
    const amount = isCreditNoteBeforeWithholding 
        ? Math.max(0, effectivePurchaseAmount - creditNote)
        : effectivePurchaseAmount;
    const creditNoteCarryForwardInr = !isCreditNoteBeforeWithholding ? creditNote : 0;
    const cbdtCircular13Q4Status = creditNote > 0
        ? (isCreditNoteBeforeWithholding ? 'CREDIT_NOTE_REDUCED_PURCHASE_VALUE_BEFORE_WITHHOLDING' : 'CREDIT_NOTE_AFTER_WITHHOLDING_CARRIED_FORWARD')
        : 'N/A';
    const creditNoteStatutoryCitation = creditNote > 0
        ? (isCreditNoteBeforeWithholding
            ? 'Section 194Q(1): Deduction on sum for purchase of goods, reflecting net agreed consideration after pre-withholding credit note.'
            : 'CBDT Circular 13/2021 Question 4: Tax deducted prior to purchase return is preserved; credit note value is carried forward for subsequent purchases from same seller in same FY.')
        : null;

    // Disambiguate Current FY purchases vs Preceding FY purchases:
    // Section 194Q(1) statutory threshold evaluates cumulative purchases in the CURRENT previous year (current FY).
    // Purchases from the preceding financial year do NOT consume the current financial year threshold.
    const prior = Math.max(0, Number(
        currentFyPriorPurchasesInr !== undefined
            ? currentFyPriorPurchasesInr
            : (priorPurchasesInCurrentFyInr !== undefined ? priorPurchasesInCurrentFyInr : priorFyPurchases)
    ) || 0);
    const cumulative = prior + amount;
    const THRESHOLD = 5000000; // ₹50 Lakhs

    // Buyer turnover prescription under Section 194Q(1) Explanation:
    // Person whose total sales, gross receipts or turnover exceeds ₹10 Crore in preceding FY.
    let buyerPrescriptionStatus = 'INDETERMINATE';
    if (isBuyerPrescribed !== null && isBuyerPrescribed !== undefined) {
        buyerPrescriptionStatus = isBuyerPrescribed ? 'APPLICABLE' : 'NOT_APPLICABLE';
    } else if (buyerTurnoverCr !== null && buyerTurnoverCr !== undefined) {
        buyerPrescriptionStatus = Number(buyerTurnoverCr) > 10 ? 'APPLICABLE' : 'NOT_APPLICABLE';
    }

    let sellerPrescriptionStatus = 'INDETERMINATE';
    if (isSellerPrescribed !== null && isSellerPrescribed !== undefined) {
        sellerPrescriptionStatus = isSellerPrescribed ? 'APPLICABLE' : 'NOT_APPLICABLE';
    } else if (sellerTurnoverCr !== null && sellerTurnoverCr !== undefined) {
        sellerPrescriptionStatus = Number(sellerTurnoverCr) > 10 ? 'APPLICABLE' : 'NOT_APPLICABLE';
    }

    const isSection194QApplicable = buyerPrescriptionStatus === 'APPLICABLE';
    const isBuyerPrescriptionIndeterminate = buyerPrescriptionStatus === 'INDETERMINATE';

    // Incremental threshold absorption formula with Paisa integer precision:
    // Delta = max(0, cumulative - THRESHOLD) - max(0, prior - THRESHOLD)
    // Taxable base is min(amount, Delta)
    const incrementalExcess = roundToPaisa(Math.max(0, cumulative - THRESHOLD) - Math.max(0, prior - THRESHOLD));
    const conditionalTaxableBase = roundToPaisa(Math.max(0, Math.min(amount, incrementalExcess)));
    const taxableBase = isSection194QApplicable 
        ? conditionalTaxableBase 
        : (isBuyerPrescriptionIndeterminate ? conditionalTaxableBase : 0);

    // Temporal Resolution: "Credit or Payment, whichever is earlier"
    let effectiveDate = transactionDate;
    let withholdingTrigger = 'TRANSACTION_DATE';

    if (creditDate && paymentDate) {
        if (creditDate <= paymentDate) {
            effectiveDate = creditDate;
            withholdingTrigger = 'CREDIT_TO_ACCOUNT';
        } else {
            effectiveDate = paymentDate;
            withholdingTrigger = 'PAYMENT_DISBURSEMENT';
        }
    } else if (creditDate) {
        effectiveDate = creditDate;
        withholdingTrigger = 'CREDIT_TO_ACCOUNT';
    } else if (paymentDate) {
        effectiveDate = paymentDate;
        withholdingTrigger = 'PAYMENT_DISBURSEMENT';
    }

    const isTemporalStraddle = Boolean(
        creditDate && paymentDate &&
        ((creditDate < '2026-04-01' && paymentDate >= '2026-04-01') ||
         (paymentDate < '2026-04-01' && creditDate >= '2026-04-01'))
    );

    const temporalStraddlingAnalysis = isTemporalStraddle ? {
        isStraddlingCommencement: true,
        creditDate,
        paymentDate,
        crystallizedDate: effectiveDate,
        withholdingTrigger,
        governingRegime: effectiveDate >= '2026-04-01' ? 'ACT_2025' : 'ACT_1961',
        statutoryRationale: effectiveDate < '2026-04-01'
            ? `Tax withholding obligation crystallized on ${effectiveDate} (${withholdingTrigger}) under the Income-tax Act, 1961 prior to 2025 Act commencement. Subsequent settlement on ${effectiveDate === creditDate ? paymentDate : creditDate} creates no duplicate withholding under the 2025 Act.`
            : `Both credit and payment occurred on or after 1 April 2026. Governed exclusively by the Income-tax Act, 2025.`
    } : null;

    // Date & Regime analysis (preserves uncertainty when effectiveDate is null rather than coercing machine date)
    let isAct2025 = null;
    let isPost206cSunset = null;
    let governingWithholdingSection = "";
    let regimeStatus = "DETERMINED";

    if (effectiveDate) {
        isAct2025 = effectiveDate >= '2026-04-01';
        isPost206cSunset = effectiveDate >= '2025-04-01';
        governingWithholdingSection = isSection194QApplicable || isBuyerPrescriptionIndeterminate
            ? (isAct2025 ? "Income-tax Act, 2025 Section 393(1) Table 8, Item (ii)" : "Income-tax Act, 1961 Section 194Q")
            : "N/A (Buyer turnover does not exceed ₹10 Cr threshold)";
    } else {
        // Date is missing: preserve uncertainty rather than coercing machine date
        regimeStatus = "INDETERMINATE_PENDING_TRANSACTION_DATE";
        isAct2025 = false;
        isPost206cSunset = true; // Section 206C(1H) sunset on 1 April 2025
        governingWithholdingSection = isSection194QApplicable || isBuyerPrescriptionIndeterminate
            ? "Income-tax Act, 1961 Section 194Q (or Income-tax Act, 2025 Section 393(1) Table 8, Item 8(ii) if credited/paid on or after 1 April 2026)"
            : "N/A (Buyer turnover does not exceed ₹10 Cr threshold)";
    }

    let governingPanPenaltySection = isAct2025 
        ? "Income-tax Act, 2025 Section 397(2)(b)(i)(C) read with Section 393(1) Table 8, Item 8(ii)" 
        : "Income-tax Act, 1961 Section 206AA(1) First Proviso read with Section 194Q";
    
    // Resolve certificate framework with Section 536(2) transitional savings and validity evaluation
    const certResolution = evaluateLowerDeductionCertificateValidity({
        effectiveDate,
        lowerDeductionCertificate,
        certificateSection,
        isAct2025
    });
    let governingCertificateSection = certResolution.governingCertificateSection;

    // Rate determination per Section 194Q / Section 393(1) Table 8(ii) read with
    // Section 206AA(1) First Proviso / Section 397(2) First Proviso:
    // Withholding for missing/inoperative PAN applies the HIGHEST of:
    // (i) rate specified in the Act (0.1%),
    // (ii) rate or rates in force (if specified and higher), or
    // (iii) statutory penalty floor (5.0% for goods purchase; 20.0% standard).
    const panAvailable = Boolean(hasPan) && !isPanInoperative;
    const isCertificateValid = certResolution.isValid;
    const hasLowerDeduction = (lowerDeductionRate !== null && lowerDeductionRate !== undefined) && isCertificateValid;

    // Validate rate in force against authoritative evidence (Section 2(37A) / Section 397(1)(b))
    const rateEvidence = validateRateEvidence({
        rateInForce,
        ratesInForceSource: ratesInForceSource || (rateInForce > 0.1 ? 'FINANCE_ACT' : 'STATUTORY_BASE'),
        sourceReference: sourceReference || (rateInForce > 0.1 ? 'Finance Act Rate Schedule' : null),
        rateScheduleKey,
        effectiveFrom: rateEffectiveFrom,
        effectiveTo: rateEffectiveTo,
        transactionDate: effectiveDate
    });

    if (rateEvidence && !rateEvidence.isValid) {
        regimeStatus = 'INDETERMINATE_RATE_EVIDENCE_REJECTED';
    }

    const statutoryBaseRate = 0.1;
    // Authenticated rate is applied if evidence is valid; unauthenticated / invalid rates fail closed to baseline
    const effectiveRateInForce = rateEvidence.isValid ? rateEvidence.ratePercent : statutoryBaseRate;
    const panFloorResolution = resolveMissingPanPenaltyFloor({
        sectionCode: '194Q',
        tableItem: isAct2025 ? '393_8_ii' : null,
        isAct2025
    });
    const missingPanPenaltyFloor = panFloorResolution.penaltyFloorPercent;
    governingPanPenaltySection = panFloorResolution.governingProviso;
    const missingPanRate = Math.max(statutoryBaseRate, effectiveRateInForce, missingPanPenaltyFloor);
    const standardRatePercent = panAvailable ? statutoryBaseRate : missingPanRate;
    const certifiedRatePercent = hasLowerDeduction ? Number(lowerDeductionRate) : standardRatePercent;

    // Cumulative Certificate Ceiling Exhaustion Tracking
    const certificateCeiling = certificateMonetaryCeilingInr !== null && certificateMonetaryCeilingInr !== undefined
        ? Number(certificateMonetaryCeilingInr)
        : (lowerDeductionCertificate?.monetaryCeilingInr !== undefined ? Number(lowerDeductionCertificate.monetaryCeilingInr) : null);
    
    const certificatePriorUtilized = Number(certificatePriorUtilizedInr) || 
        (lowerDeductionCertificate?.consumedAmountInr !== undefined ? Number(lowerDeductionCertificate.consumedAmountInr) : 0);
    
    const availableCeilingHeadroom = certificateCeiling !== null
        ? Math.max(0, certificateCeiling - certificatePriorUtilized)
        : null;

    let certifiedEligibleBase = 0;
    let uncoveredExcessBase = taxableBase;
    let ceilingExhaustionStatus = 'NO_LOWER_DEDUCTION_CERTIFICATE';

    if (hasLowerDeduction) {
        if (certificateCeiling === null) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'UNCONSTRAINED';
        } else if (availableCeilingHeadroom >= taxableBase) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'WITHIN_CEILING';
        } else if (availableCeilingHeadroom > 0) {
            certifiedEligibleBase = availableCeilingHeadroom;
            uncoveredExcessBase = taxableBase - availableCeilingHeadroom;
            ceilingExhaustionStatus = 'PARTIALLY_EXHAUSTED';
        } else {
            certifiedEligibleBase = 0;
            uncoveredExcessBase = taxableBase;
            ceilingExhaustionStatus = 'FULLY_EXHAUSTED';
        }
    } else if (lowerDeductionRate !== null && !isCertificateValid) {
        ceilingExhaustionStatus = certResolution.status;
    }

    let certifiedTdsInr = 0;
    let uncoveredTdsInr = 0;

    if (isSection194QApplicable || isBuyerPrescriptionIndeterminate) {
        certifiedTdsInr = Number(((certifiedEligibleBase * certifiedRatePercent) / 100).toFixed(2));
        uncoveredTdsInr = Number(((uncoveredExcessBase * standardRatePercent) / 100).toFixed(2));
    }
    const calculatedTdsInr = Number((certifiedTdsInr + uncoveredTdsInr).toFixed(2));
    const effectiveRatePercent = taxableBase > 0 
        ? Number(((calculatedTdsInr / taxableBase) * 100).toFixed(4))
        : 0.0;
    const statutoryRatePercent = isSection194QApplicable || isBuyerPrescriptionIndeterminate
        ? (hasLowerDeduction ? certifiedRatePercent : standardRatePercent)
        : 0.0;

    let sellerTcsStatus = "";

    if (isPost206cSunset) {
        sellerTcsStatus = "Section 206C(1H) was omitted/withdrawn effective 1 April 2025 by Finance Act, 2025. Sellers no longer collect TCS on goods. Withholding rests solely with the buyer.";
    } else if (sellerPrescriptionStatus === 'APPLICABLE' && buyerPrescriptionStatus === 'NOT_APPLICABLE') {
        sellerTcsStatus = "Buyer turnover does not exceed ₹10 Cr, so Section 194Q does not apply. Seller is prescribed (turnover > ₹10 Cr) and must collect TCS under Section 206C(1H) on receipts exceeding ₹50 Lakhs.";
    } else {
        sellerTcsStatus = "Section 194Q holds statutory precedence over Section 206C(1H). Because the buyer is prescribed (turnover > ₹10 Cr) and mandated to deduct TDS under Section 194Q, the seller's Section 206C(1H) collection duty is statutorily displaced/excused.";
    }

    const effectiveBuyerName = buyerName || "Buyer";
    const effectiveSellerName = sellerName || "Seller";

    let applicabilityDisposition = "DETERMINED_APPLICABLE";
    if (buyerPrescriptionStatus === 'NOT_APPLICABLE') {
        applicabilityDisposition = "EXEMPT_BELOW_BUYER_TURNOVER_THRESHOLD";
    } else if (buyerPrescriptionStatus === 'INDETERMINATE') {
        applicabilityDisposition = "INDETERMINATE_BUYER_TURNOVER_UNVERIFIED";
    } else if (rateEvidence && !rateEvidence.isValid) {
        applicabilityDisposition = "INDETERMINATE_RATE_EVIDENCE_REJECTED";
    }

    let formulaText = "";
    if (buyerPrescriptionStatus === 'NOT_APPLICABLE') {
        formulaText = "Section 194Q inapplicable: Buyer turnover does not exceed ₹10 Crore threshold.";
    } else {
        const qualifier = isBuyerPrescriptionIndeterminate ? " [Contingent on > ₹10 Cr Buyer Turnover]" : "";
        if (hasLowerDeduction) {
            if (ceilingExhaustionStatus === 'PARTIALLY_EXHAUSTED') {
                formulaText = `Partial Ceiling Split: ₹${certifiedEligibleBase.toLocaleString('en-IN')} @ ${certifiedRatePercent}% (Sanctioned Certificate Headroom) + ₹${uncoveredExcessBase.toLocaleString('en-IN')} @ ${standardRatePercent}% (Marginal Excess beyond Sanctioned Limit) = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
            } else if (ceilingExhaustionStatus === 'FULLY_EXHAUSTED') {
                formulaText = `Certificate Fully Exhausted: Sanctioned ceiling of ₹${certificateCeiling.toLocaleString('en-IN')} is 100% utilized. Taxable base (₹${taxableBase.toLocaleString('en-IN')}) deducted at standard statutory rate of ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
            } else {
                formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${certifiedRatePercent}% (${isAct2025 ? 'Section 395' : 'Section 197'} Lower Deduction Certificate) = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
            }
        } else if (lowerDeductionRate !== null && !isCertificateValid) {
            formulaText = `Lower Deduction Certificate Disallowed (${certResolution.status}): ${certResolution.reason}. Deducted at standard statutory rate of ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
        } else if (panAvailable) {
            formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × 0.1% = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
        } else {
            const penaltyProvisoCitation = isAct2025 ? 'Section 397(2)(b)(i)(C) 5% cap for goods' : 'Section 206AA(1) First Proviso 5% cap for goods';
            formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${standardRatePercent}% (${penaltyProvisoCitation}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}${qualifier}`;
        }
    }

    const remainingTdsInr = Math.max(0, roundToPaisa(calculatedTdsInr - priorAdvanceTds));
    const netWireInr = roundToPaisa(rawInvoiceAmount - advanceNetted - remainingTdsInr);

    return {
        invoiceAmount: amount,
        rawInvoiceAmount,
        gstAmountInr: gstAmount,
        isAdvancePayment,
        creditNoteInr: creditNote,
        creditNoteTiming,
        creditNoteCarryForwardInr,
        cbdtCircular13Q4Status,
        creditNoteStatutoryCitation,
        advanceNettedInr: advanceNetted,
        priorAdvanceTdsDeductedInr: priorAdvanceTds,
        totalOrderTdsInr: calculatedTdsInr,
        remainingTdsInr,
        netWireInr,
        effectivePurchaseAmount,
        cbdtCircular13NettingApplied: !isAdvancePayment && gstAmount > 0,
        priorFyPurchases: prior,
        priorPurchasesInCurrentFyInr: prior,
        currentFyPriorPurchasesInr: prior,
        precedingFyPurchasesInr: precedingFyPurchasesInr !== undefined ? Number(precedingFyPurchasesInr) : null,
        thresholdAccountingBasis: 'Section 194Q(1) evaluates cumulative purchases in the CURRENT previous year (current FY). Preceding financial year purchases do not consume this threshold.',
        thresholdRemainingInCurrentFyInr: Math.max(0, THRESHOLD - prior),
        cumulativeFyPurchases: cumulative,
        statutoryThreshold: THRESHOLD,
        thresholdBreached: cumulative > THRESHOLD,
        taxableBase,
        conditionalTaxableBase,
        isPanFurnished: panAvailable,
        statutoryRatePercent,
        effectiveRatePercent,
        calculatedTdsInr,
        certifiedTdsInr,
        uncoveredTdsInr,
        certificateCeiling,
        certificatePriorUtilized,
        availableCeilingHeadroom,
        certifiedEligibleBase,
        uncoveredExcessBase,
        ceilingExhaustionStatus,
        cumulativePurchasesInCurrentFyInr: cumulative,
        buyerTurnoverPrecondition: {
            status: buyerPrescriptionStatus,
            thresholdCr: 10,
            rule: "Section 194Q(1) applies strictly if buyer's total turnover/gross receipts in preceding financial year exceeded ₹10 Crore."
        },
        steelCastingHsnGstAssumption: "Steel turbine castings (HSN Chapter 72/73) standardly attract 18% GST. Confirm whether invoice is inclusive of GST or if GST invoice is pending.",
        buyerTurnoverCr: buyerTurnoverCr !== null ? Number(buyerTurnoverCr) : null,
        sellerTurnoverCr: sellerTurnoverCr !== null ? Number(sellerTurnoverCr) : null,
        buyerPrescriptionStatus,
        sellerPrescriptionStatus,
        isSection194QApplicable: buyerPrescriptionStatus === 'APPLICABLE',
        isBuyerPrescribed: buyerPrescriptionStatus === 'APPLICABLE',
        isSellerPrescribed: sellerPrescriptionStatus === 'APPLICABLE',
        applicabilityDisposition,
        statutoryDetermination: (buyerPrescriptionStatus === 'APPLICABLE' && regimeStatus === 'DETERMINED' && (!rateEvidence || rateEvidence.isValid)) ? 'APPLICABLE' : (buyerPrescriptionStatus === 'NOT_APPLICABLE' && (!rateEvidence || rateEvidence.isValid) ? 'EXEMPT' : 'INDETERMINATE'),
        regimeStatus,
        isAct2025: Boolean(isAct2025),
        creditDate,
        paymentDate,
        effectiveWithholdingDate: effectiveDate,
        withholdingTrigger,
        temporalStraddlingAnalysis,
        lowerDeductionRate: hasLowerDeduction ? Number(lowerDeductionRate) : null,
        lowerDeductionCertificate: lowerDeductionCertificate || (hasLowerDeduction ? { ratePercent: Number(lowerDeductionRate), applied: true } : null),
        governingWithholdingSection,
        governingPanPenaltySection,
        governingCertificateSection,
        isSection536TransitionalSavingsApplied: certResolution.isSection536TransitionalSavingsApplied,
        transitionalSavingsClause: certResolution.transitionalSavingsClause,
        certificateValidity: certResolution,
        certificateDisallowanceReason: certResolution.isValid ? null : certResolution.reason,
        legalPrecedence: "Section 194Q (Buyer TDS) overrides Section 206C(1H) (Seller TCS)",
        sellerTcsStatus,
        requiredParty: isSection194QApplicable ? effectiveBuyerName : (sellerPrescriptionStatus === 'APPLICABLE' ? `${effectiveSellerName} (under Section 206C(1H))` : "None"),
        rateInForce: effectiveRateInForce,
        ratesInForceSource: ratesInForceSource || (effectiveRateInForce > 0.1 ? 'FINANCE_ACT' : 'STATUTORY_BASE'),
        statutoryRateHierarchy: {
            statutoryBaseRate,
            rateInForce: effectiveRateInForce,
            ratesInForceSource: ratesInForceSource || (effectiveRateInForce > 0.1 ? 'FINANCE_ACT' : 'STATUTORY_BASE'),
            penaltyFloorRate: missingPanPenaltyFloor,
            governingProviso: governingPanPenaltySection,
            rule: 'HIGHER_OF_BASE_RATE_IN_FORCE_OR_PENALTY_FLOOR'
        },
        rateEvidenceValidation: rateEvidence,
        statutoryFormula: formulaText
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4B. SECTION 206C(1H): DETERMINISTIC SELLER TCS ON GOODS ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates tax collection at source by sellers on sale of goods:
 * - Preceding FY Seller Turnover precondition (> ₹10 Crore)
 * - Buyer Turnover precondition: If buyer turnover > ₹10 Cr, Section 194Q
 *   takes absolute statutory precedence under Section 206C(1H) Second Proviso.
 *   Seller is statutorily excused from collecting TCS.
 * - Threshold: Aggregate consideration received in FY > ₹50 Lakhs.
 * - Rate: 0.1% if PAN furnished and operative.
 * - Section 206CC Proviso Rate Cap: If PAN is missing or inoperative,
 *   rate is strictly capped at 1.0% (NOT 5% or 20%).
 * - Finance Act, 2025 Sunset: Omitted/withdrawn effective 1 April 2025.
 *   On or after 1 April 2025, TCS collection is statutorily barred.
 */
export function evaluateSection206C1H({
    receiptAmountInr = 0,
    priorFyReceiptsInr = 0,
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    sellerTurnoverCr = null,
    buyerTurnoverCr = null,
    isBuyerLiableAndDeducting194Q = false,
    sellerName = null,
    buyerName = null
} = {}) {
    const receipt = Math.max(0, Number(receiptAmountInr) || 0);
    const prior = Math.max(0, Number(priorFyReceiptsInr) || 0);
    const cumulative = prior + receipt;
    const THRESHOLD = 5000000; // ₹50 Lakhs

    const effectiveDate = transactionDate || new Date().toISOString().split('T')[0];
    const isPostSunset = effectiveDate >= '2025-04-01';

    // 1. Finance Act 2025 Sunset Check (Effective 1 April 2025)
    if (isPostSunset) {
        return {
            receiptAmountInr: receipt,
            priorFyReceiptsInr: prior,
            cumulativeFyReceiptsInr: cumulative,
            taxableBase: 0,
            tcsRatePercent: 0,
            calculatedTcsInr: 0,
            isTcsApplicable: false,
            isOmittedByFinanceAct2025: true,
            effectiveDate,
            governingSection: 'Section 206C(1H) (Omitted w.e.f. 1 April 2025)',
            statutoryReason: 'Section 206C(1H) was omitted/withdrawn effective 1 April 2025 by Finance Act, 2025. Sellers no longer collect TCS on goods. Obligation rests solely with buyer withholding under the Income-tax Act.',
            statutoryDisposition: 'OMITTED_SUNSET_BY_FINANCE_ACT_2025'
        };
    }

    // 2. Seller Turnover Precondition (> ₹10 Crore in preceding FY)
    const isSellerPrescribed = sellerTurnoverCr !== null && Number(sellerTurnoverCr) > 10;
    if (sellerTurnoverCr !== null && !isSellerPrescribed) {
        return {
            receiptAmountInr: receipt,
            priorFyReceiptsInr: prior,
            cumulativeFyReceiptsInr: cumulative,
            taxableBase: 0,
            tcsRatePercent: 0,
            calculatedTcsInr: 0,
            isTcsApplicable: false,
            isSellerPrescribed: false,
            effectiveDate,
            governingSection: 'Income-tax Act, 1961 Section 206C(1H)',
            statutoryReason: `Seller turnover (${sellerTurnoverCr} Cr) in preceding financial year did not exceed ₹10 Crore threshold. Section 206C(1H) is inapplicable.`,
            statutoryDisposition: 'EXEMPT_SELLER_TURNOVER_BELOW_THRESHOLD'
        };
    }

    // 3. Section 194Q Absolute Statutory Precedence (Section 194Q(5)(b) read with Second Proviso to Section 206C(1H))
    const isBuyerLiable194Q = (buyerTurnoverCr !== null && Number(buyerTurnoverCr) > 10) || Boolean(isBuyerLiableAndDeducting194Q);
    if (isBuyerLiable194Q) {
        return {
            receiptAmountInr: receipt,
            priorFyReceiptsInr: prior,
            cumulativeFyReceiptsInr: cumulative,
            taxableBase: 0,
            tcsRatePercent: 0,
            calculatedTcsInr: 0,
            isTcsApplicable: false,
            isDisplacedBySection194Q: true,
            effectiveDate,
            governingSection: 'Income-tax Act, 1961 Section 194Q(5)(b) read with Section 206C(1H) Second Proviso',
            statutoryReason: 'Section 194Q(5)(b) and Second Proviso to Section 206C(1H) mandate that TCS under 206C(1H) shall not be collected if buyer is liable to deduct tax at source under Section 194Q and has deducted such amount. Section 194Q takes absolute statutory precedence.',
            statutoryDisposition: 'STATUTORILY_DISPLACED_BY_SECTION_194Q_TDS'
        };
    }

    // 4. Threshold & Taxable Base Calculation
    const incrementalExcess = Math.max(0, cumulative - THRESHOLD) - Math.max(0, prior - THRESHOLD);
    const taxableBase = Math.max(0, Math.min(receipt, incrementalExcess));

    // 5. Rate Determination (Section 206C(1H) read with Section 206CC Proviso)
    const panAvailable = Boolean(hasPan) && !isPanInoperative;
    const tcsRatePercent = panAvailable ? 0.1 : 1.0; // Section 206CC proviso caps missing PAN at 1%, NOT 5% or 20%
    const calculatedTcsInr = Number(((taxableBase * tcsRatePercent) / 100).toFixed(2));

    return {
        receiptAmountInr: receipt,
        priorFyReceiptsInr: prior,
        cumulativeFyReceiptsInr: cumulative,
        statutoryThreshold: THRESHOLD,
        thresholdBreached: cumulative > THRESHOLD,
        taxableBase,
        isPanFurnished: panAvailable,
        tcsRatePercent,
        calculatedTcsInr,
        isTcsApplicable: taxableBase > 0,
        effectiveDate,
        governingSection: 'Income-tax Act, 1961 Section 206C(1H)',
        governingPenaltySection: panAvailable ? null : 'Income-tax Act, 1961 Section 206CC Proviso (Capped at 1%)',
        statutoryDisposition: taxableBase > 0 ? 'DETERMINED_TCS_COLLECTION_REQUIRED' : 'BELOW_THRESHOLD_RECEIPT',
        statutoryFormula: taxableBase > 0
            ? `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${tcsRatePercent}%${panAvailable ? '' : ' (Section 206CC Proviso Cap for 206C(1H))'} = ₹${calculatedTcsInr.toLocaleString('en-IN')}`
            : 'Consideration received does not exceed ₹50 Lakhs threshold in current FY.'
    };
}

/**
 * Standard Indian State & Union Territory Codes (Census 2011 / GSTN 2-digit prefix).
 */
export const INDIAN_STATE_CODES = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory',
    '99': 'Centre Jurisdiction'
};

/**
 * Statutory 4th character legal status classification for Indian Permanent Account Numbers (PAN).
 * Enacted under Section 139A of the Income-tax Act, 1961 read with Rule 114 of Income Tax Rules.
 */
export const PAN_ENTITY_TYPES = {
    'P': { code: 'P', name: 'Individual', isIndividualOrHuf: true, standard194cRatePercent: 1.0 },
    'H': { code: 'H', name: 'Hindu Undivided Family (HUF)', isIndividualOrHuf: true, standard194cRatePercent: 1.0 },
    'C': { code: 'C', name: 'Company', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'F': { code: 'F', name: 'Partnership Firm / LLP', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'T': { code: 'T', name: 'Trust', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'A': { code: 'A', name: 'Association of Persons (AOP)', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'B': { code: 'B', name: 'Body of Individuals (BOI)', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'L': { code: 'L', name: 'Local Authority', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'J': { code: 'J', name: 'Artificial Juridical Person', isIndividualOrHuf: false, standard194cRatePercent: 2.0 },
    'G': { code: 'G', name: 'Government Agency', isIndividualOrHuf: false, standard194cRatePercent: 2.0 }
};

const BASE36_ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates the check digit of a 15-character Goods and Services Tax Identification Number (GSTIN)
 * using the official ISO/IEC 7064 Mod 36, 36 check digit algorithm.
 * 
 * Offline, zero-dependency, and deterministic. Requires zero network calls.
 * 
 * @param {string} gstin 15-character alphanumeric GSTIN string
 * @returns {boolean} True if the 15th character exactly matches the calculated check character
 */
export function isValidGstinChecksum(gstin) {
    if (!gstin || typeof gstin !== 'string') return false;
    const clean = gstin.trim().toUpperCase();

    // Structural syntax: State (2 digits) + PAN (10 chars) + Entity (1 char) + Z (1 char) + Check (1 char)
    const pattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
    if (!pattern.test(clean)) return false;

    let total = 0;
    for (let i = 0; i < 14; i++) {
        const val = BASE36_ALPHANUMERIC.indexOf(clean[i]);
        if (val === -1) return false;
        const factor = (i % 2 === 0) ? 1 : 2;
        const product = val * factor;
        total += Math.floor(product / 36) + (product % 36);
    }

    const expectedIndex = (36 - (total % 36)) % 36;
    const expectedChar = BASE36_ALPHANUMERIC[expectedIndex];
    return clean[14] === expectedChar;
}

/**
 * Deterministically decodes an Indian Tax Identifier (PAN or GSTIN).
 * 
 * Capabilities:
 * - Structural regular expression pattern validation
 * - Offline ISO/IEC 7064 Mod 36, 36 checksum calculation for GSTIN
 * - State code and name extraction from GSTIN prefix
 * - Embedded 10-character PAN extraction from GSTIN positions 3..12
 * - Statutory legal entity classification via 4th character of PAN (Individual, HUF, Company, Firm, etc.)
 * - Statutory Section 194C withholding rate derivation (1% for Individual/HUF vs 2% for Other Entities)
 * 
 * Zero dependencies, 0-neuron, zero network calls.
 * 
 * @param {string} rawId PAN (10 characters) or GSTIN (15 characters)
 * @returns {Object} Decoded tax entity metadata
 */
export function decodeTaxIdentifier(rawId) {
    if (!rawId || typeof rawId !== 'string') {
        return {
            isValid: false,
            error: 'Tax identifier must be a non-empty string.'
        };
    }

    const clean = rawId.trim().toUpperCase();

    // 1. Process 15-character GSTIN
    if (clean.length === 15) {
        const pattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
        if (!pattern.test(clean)) {
            return {
                isValid: false,
                type: 'GSTIN',
                gstin: clean,
                error: 'Malformed GSTIN format: expected 2 digits state + 10 chars PAN + 1 entity char + Z + 1 check char.'
            };
        }

        const isChecksumValid = isValidGstinChecksum(clean);
        const stateCode = clean.slice(0, 2);
        const pan = clean.slice(2, 12);
        const entityCode = pan[3];
        const entityMeta = PAN_ENTITY_TYPES[entityCode] || {
            code: entityCode,
            name: 'Other Entity / Non-Individual',
            isIndividualOrHuf: false,
            standard194cRatePercent: 2.0
        };

        return {
            isValid: isChecksumValid,
            checksumValid: isChecksumValid,
            type: 'GSTIN',
            gstin: clean,
            pan,
            stateCode,
            stateName: INDIAN_STATE_CODES[stateCode] || 'Unknown Territory',
            entityCode,
            entityType: entityMeta.name,
            isIndividualOrHuf: entityMeta.isIndividualOrHuf,
            standard194cRatePercent: entityMeta.standard194cRatePercent,
            error: isChecksumValid ? null : 'GSTIN checksum mismatch under ISO/IEC 7064 Mod 36, 36.'
        };
    }

    // 2. Process 10-character PAN
    if (clean.length === 10) {
        const panPattern = /^[A-Z]{5}\d{4}[A-Z]$/;
        if (!panPattern.test(clean)) {
            return {
                isValid: false,
                type: 'PAN',
                pan: clean,
                error: 'Malformed PAN format: expected 5 letters + 4 digits + 1 letter.'
            };
        }

        const entityCode = clean[3];
        const entityMeta = PAN_ENTITY_TYPES[entityCode] || {
            code: entityCode,
            name: 'Other Entity / Non-Individual',
            isIndividualOrHuf: false,
            standard194cRatePercent: 2.0
        };

        return {
            isValid: true,
            type: 'PAN',
            pan: clean,
            entityCode,
            entityType: entityMeta.name,
            isIndividualOrHuf: entityMeta.isIndividualOrHuf,
            standard194cRatePercent: entityMeta.standard194cRatePercent,
            error: null
        };
    }

    return {
        isValid: false,
        error: `Invalid identifier length (${clean.length}): Expected 10 characters for PAN or 15 characters for GSTIN.`
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. SECTION 194C: DETERMINISTIC CONTRACTOR & SUB-CONTRACTOR ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates payments to resident contractors and sub-contractors:
 * - Deductee entity classification:
 *   - Individual / HUF: 1.0%
 *   - Other entity (Company, LLP, Firm, AOP, BOI): 2.0%
 *   - Auto-inferred if PAN or GSTIN is supplied (4th character decoding).
 * - Dual statutory threshold under Section 194C(5):
 *   - Single invoice > ₹30,000 OR
 *   - Aggregate in Financial Year > ₹1,00,000
 *   - When aggregate crosses ₹1,00,000, catch-up withholding applies to untaxed prior base.
 * - Transporter Exemption under Section 194C(6):
 *   - Contractor in business of plying, hiring or leasing goods carriages who owns
 *     <= 10 goods carriages and furnishes declaration + PAN: 0.0% (NIL TDS).
 * - Section 206AA Penalty: 20.0% if PAN is absent or inoperative.
 * - Section 197 Lower Deduction Certificate with cumulative ceiling tracking.
 * - CBDT Circular No. 23/2017: Excludes separately stated GST.
 * - Income-tax Act, 2025 Transition: Section 393(1) Table 8, Item (i).
 */
export function evaluateSection194C({
    invoiceAmount,
    deducteeType = null, // 'INDIVIDUAL', 'HUF', 'COMPANY', 'FIRM', 'LLP', 'OTHER'
    pan = null,
    gstin = null,
    priorFyPayments = 0,
    priorFyPaymentsAlreadyTaxed = null,
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    creditDate = null,
    paymentDate = null,
    isTransporter = false,
    ownsTenOrLessCarriages = false,
    transporterDeclarationFurnished = false,
    gstAmountInr = 0,
    isAdvancePayment = false,
    lowerDeductionRate = null,
    lowerDeductionCertificate = null,
    certificateMonetaryCeilingInr = null,
    certificatePriorUtilizedInr = 0,
    certificateSection = null
} = {}) {
    const rawInvoiceAmount = Number(invoiceAmount) || 0;
    const gstAmount = Number(gstAmountInr) || 0;

    // CBDT Circular No. 23/2017: If GST is separately stated, TDS applies to basic value
    const effectiveContractAmount = isAdvancePayment
        ? rawInvoiceAmount
        : Math.max(0, rawInvoiceAmount - gstAmount);

    const prior = Math.max(0, Number(priorFyPayments) || 0);
    const cumulative = prior + effectiveContractAmount;

    const SINGLE_THRESHOLD = 30000;
    const AGGREGATE_THRESHOLD = 100000;

    const panAvailable = Boolean(hasPan) && !isPanInoperative;

    // ── Transporter Exemption Check (Section 194C(6)) ──
    const isTransporterExempt = Boolean(
        isTransporter &&
        ownsTenOrLessCarriages &&
        transporterDeclarationFurnished &&
        panAvailable
    );

    // ── Threshold Evaluation (Section 194C(5)) ──
    const singleBreach = effectiveContractAmount > SINGLE_THRESHOLD;
    const aggregateBreach = cumulative > AGGREGATE_THRESHOLD;
    const isThresholdBreached = singleBreach || aggregateBreach;

    let taxableBase = 0;
    let thresholdDisposition = 'BELOW_THRESHOLD_EXEMPT';

    if (isTransporterExempt) {
        taxableBase = 0;
        thresholdDisposition = 'EXEMPT_TRANSPORTER_SECTION_194C_6';
    } else if (isThresholdBreached) {
        if (aggregateBreach) {
            // If aggregate crossed ₹1,00,000, determine previously taxed vs untaxed amount
            const previouslyTaxed = priorFyPaymentsAlreadyTaxed !== null && priorFyPaymentsAlreadyTaxed !== undefined
                ? Math.max(0, Number(priorFyPaymentsAlreadyTaxed))
                : (prior > AGGREGATE_THRESHOLD ? prior : 0);

            taxableBase = Math.max(0, cumulative - previouslyTaxed);
            thresholdDisposition = prior <= AGGREGATE_THRESHOLD && previouslyTaxed === 0
                ? 'AGGREGATE_THRESHOLD_BREACHED_WITH_CATCHUP'
                : 'AGGREGATE_THRESHOLD_ACTIVE';
        } else {
            // Single bill breached ₹30,000 while cumulative <= ₹1,00,000
            taxableBase = effectiveContractAmount;
            thresholdDisposition = 'SINGLE_BILL_THRESHOLD_BREACHED';
        }
    }

    // Temporal Resolution: "Credit or Payment, whichever is earlier"
    let effectiveDate = transactionDate;
    let withholdingTrigger = 'TRANSACTION_DATE';

    if (creditDate && paymentDate) {
        if (creditDate <= paymentDate) {
            effectiveDate = creditDate;
            withholdingTrigger = 'CREDIT_TO_ACCOUNT';
        } else {
            effectiveDate = paymentDate;
            withholdingTrigger = 'PAYMENT_DISBURSEMENT';
        }
    } else if (creditDate) {
        effectiveDate = creditDate;
        withholdingTrigger = 'CREDIT_TO_ACCOUNT';
    } else if (paymentDate) {
        effectiveDate = paymentDate;
        withholdingTrigger = 'PAYMENT_DISBURSEMENT';
    }

    const isTemporalStraddle = Boolean(
        creditDate && paymentDate &&
        ((creditDate < '2026-04-01' && paymentDate >= '2026-04-01') ||
         (paymentDate < '2026-04-01' && creditDate >= '2026-04-01'))
    );

    const temporalStraddlingAnalysis = isTemporalStraddle ? {
        isStraddlingCommencement: true,
        creditDate,
        paymentDate,
        crystallizedDate: effectiveDate,
        withholdingTrigger,
        governingRegime: effectiveDate >= '2026-04-01' ? 'ACT_2025' : 'ACT_1961',
        statutoryRationale: effectiveDate < '2026-04-01'
            ? `Tax withholding obligation crystallized on ${effectiveDate} (${withholdingTrigger}) under the Income-tax Act, 1961 prior to 2025 Act commencement. Subsequent settlement on ${effectiveDate === creditDate ? paymentDate : creditDate} creates no duplicate withholding under the 2025 Act.`
            : `Both credit and payment occurred on or after 1 April 2026. Governed exclusively by the Income-tax Act, 2025.`
    } : null;

    // ── Temporal Act Bridge ──
    const isAct2025 = effectiveDate ? effectiveDate >= '2026-04-01' : false;
    const governingSection = isAct2025
        ? "Income-tax Act, 2025 Section 393(1) Table 6, Item (i)"
        : "Income-tax Act, 1961 Section 194C";
    
    // Resolve certificate framework with Section 536(2) transitional savings and validity evaluation
    const certResolution = evaluateLowerDeductionCertificateValidity({
        effectiveDate,
        lowerDeductionCertificate,
        certificateSection,
        isAct2025
    });
    const governingCertificateSection = certResolution.governingCertificateSection;

    // ── Entity Rate Determination & Tax Identifier Decoding ──
    let decodedTaxId = null;
    const taxIdInput = gstin || pan;
    if (taxIdInput && typeof taxIdInput === 'string') {
        decodedTaxId = decodeTaxIdentifier(taxIdInput);
        if (decodedTaxId.isValid) {
            if (deducteeType === null || deducteeType === undefined) {
                deducteeType = decodedTaxId.isIndividualOrHuf ? 'INDIVIDUAL' : 'COMPANY';
            }
        }
    }
    const normalizedType = String(deducteeType || 'COMPANY').toUpperCase().trim();
    const isIndividualOrHuf = normalizedType === 'INDIVIDUAL' || normalizedType === 'HUF';
    const baseStatutoryRatePercent = isIndividualOrHuf ? 1.0 : 2.0;

    // Section 206AA: 20% if PAN missing/inoperative (no 5% goods cap for 194C)
    const standardRatePercent = panAvailable ? baseStatutoryRatePercent : 20.0;

    // ── Lower Deduction Certificate Validation ──
    const isCertificateValid = certResolution.isValid;
    const hasLowerDeduction = (lowerDeductionRate !== null && lowerDeductionRate !== undefined) && isCertificateValid;
    const certifiedRatePercent = hasLowerDeduction ? Number(lowerDeductionRate) : standardRatePercent;

    const certificateCeiling = certificateMonetaryCeilingInr !== null && certificateMonetaryCeilingInr !== undefined
        ? Number(certificateMonetaryCeilingInr)
        : (lowerDeductionCertificate?.monetaryCeilingInr !== undefined ? Number(lowerDeductionCertificate.monetaryCeilingInr) : null);

    const certificatePriorUtilized = Number(certificatePriorUtilizedInr) ||
        (lowerDeductionCertificate?.consumedAmountInr !== undefined ? Number(lowerDeductionCertificate.consumedAmountInr) : 0);

    const availableCeilingHeadroom = certificateCeiling !== null
        ? Math.max(0, certificateCeiling - certificatePriorUtilized)
        : null;

    let certifiedEligibleBase = 0;
    let uncoveredExcessBase = taxableBase;
    let ceilingExhaustionStatus = 'NO_LOWER_DEDUCTION_CERTIFICATE';

    if (hasLowerDeduction && taxableBase > 0) {
        if (certificateCeiling === null) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'UNCONSTRAINED';
        } else if (availableCeilingHeadroom >= taxableBase) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'WITHIN_CEILING';
        } else if (availableCeilingHeadroom > 0) {
            certifiedEligibleBase = availableCeilingHeadroom;
            uncoveredExcessBase = taxableBase - availableCeilingHeadroom;
            ceilingExhaustionStatus = 'PARTIALLY_EXHAUSTED';
        } else {
            certifiedEligibleBase = 0;
            uncoveredExcessBase = taxableBase;
            ceilingExhaustionStatus = 'FULLY_EXHAUSTED';
        }
    } else if (lowerDeductionRate !== null && !isCertificateValid) {
        ceilingExhaustionStatus = certResolution.status;
    }

    let certifiedTdsInr = 0;
    let uncoveredTdsInr = 0;

    if (taxableBase > 0) {
        certifiedTdsInr = Number(((certifiedEligibleBase * certifiedRatePercent) / 100).toFixed(2));
        uncoveredTdsInr = Number(((uncoveredExcessBase * standardRatePercent) / 100).toFixed(2));
    }
    const calculatedTdsInr = Number((certifiedTdsInr + uncoveredTdsInr).toFixed(2));
    const effectiveRatePercent = taxableBase > 0
        ? Number(((calculatedTdsInr / taxableBase) * 100).toFixed(4))
        : (isTransporterExempt ? 0.0 : standardRatePercent);

    let formulaText = "";
    if (isTransporterExempt) {
        formulaText = "Section 194C(6) Nil withholding: Transporter furnished declaration of owning <= 10 goods carriages with valid PAN.";
    } else if (taxableBase === 0) {
        formulaText = `Section 194C inapplicable: Bill (₹${effectiveContractAmount.toLocaleString('en-IN')}) <= ₹30,000 single limit and cumulative (₹${cumulative.toLocaleString('en-IN')}) <= ₹1,00,000 aggregate limit.`;
    } else if (hasLowerDeduction) {
        if (ceilingExhaustionStatus === 'PARTIALLY_EXHAUSTED') {
            formulaText = `Partial Ceiling Split: ₹${certifiedEligibleBase.toLocaleString('en-IN')} @ ${certifiedRatePercent}% + ₹${uncoveredExcessBase.toLocaleString('en-IN')} @ ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
        } else {
            formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${certifiedRatePercent}% (${isAct2025 ? 'Section 395' : 'Section 197'} Certificate) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
        }
    } else if (lowerDeductionRate !== null && !isCertificateValid) {
        formulaText = `Lower Deduction Certificate Disallowed (${certResolution.status}): ${certResolution.reason}. Deducted at standard statutory rate of ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else if (panAvailable) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${standardRatePercent}% (${isIndividualOrHuf ? 'Individual/HUF' : 'Company/LLP/Firm'}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × 20% (Section 206AA Penal Rate for missing PAN) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    }

    return {
        section: '194C',
        governingSection,
        governingCertificateSection,
        isSection536TransitionalSavingsApplied: certResolution.isSection536TransitionalSavingsApplied,
        transitionalSavingsClause: certResolution.transitionalSavingsClause,
        certificateValidity: certResolution,
        certificateDisallowanceReason: certResolution.isValid ? null : certResolution.reason,
        creditDate,
        paymentDate,
        effectiveWithholdingDate: effectiveDate,
        withholdingTrigger,
        temporalStraddlingAnalysis,
        rawInvoiceAmount,
        gstAmountInr: gstAmount,
        isAdvancePayment,
        effectiveContractAmount,
        cbdtCircular23Applied: !isAdvancePayment && gstAmount > 0,
        priorFyPayments: prior,
        cumulativeFyPayments: cumulative,
        singleThreshold: SINGLE_THRESHOLD,
        aggregateThreshold: AGGREGATE_THRESHOLD,
        singleBreach,
        aggregateBreach,
        isThresholdBreached,
        thresholdDisposition,
        deducteeType: normalizedType,
        isIndividualOrHuf,
        decodedTaxIdentifier: decodedTaxId,
        isTransporter,
        isTransporterExempt,
        ownsTenOrLessCarriages,
        transporterDeclarationFurnished,
        isPanFurnished: panAvailable,
        taxableBase,
        baseStatutoryRatePercent,
        standardRatePercent,
        effectiveRatePercent,
        calculatedTdsInr,
        certifiedTdsInr,
        uncoveredTdsInr,
        certificateCeiling,
        certificatePriorUtilized,
        availableCeilingHeadroom,
        certifiedEligibleBase,
        uncoveredExcessBase,
        ceilingExhaustionStatus,
        lowerDeductionRate: hasLowerDeduction ? Number(lowerDeductionRate) : null,
        statutoryFormula: formulaText
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. SECTION 194J: DETERMINISTIC PROFESSIONAL & TECHNICAL SERVICES ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates payments for professional, technical services, royalty, and director fees:
 * - Service Category Classification:
 *   - Fees for Technical Services (FTS) / BPO / Royalty for cinematographic films: 2.0%
 *   - Royalty (general, non-film): 2.0%
 *   - Professional Services (Legal, Medical, Engineering, Accountancy, etc.): 10.0%
 *   - Non-compete fees (Section 28(va)): 10.0%
 *   - Director Remuneration (other than salary covered by Sec 192): 10.0% (Zero threshold!)
 * - Statutory Threshold under Section 194J(1):
 *   - ₹30,000 aggregate per category in FY.
 *   - Director remuneration: ₹0 threshold (first rupee deductible).
 *   - When cumulative crosses ₹30,000, catch-up withholding applies to untaxed prior base.
 * - Section 206AA Penalty: 20.0% if PAN is missing or inoperative.
 * - Section 197 Lower Deduction Certificate with cumulative ceiling tracking.
 * - CBDT Circular No. 23/2017: Excludes separately stated GST.
 * - Income-tax Act, 2025 Transition: Section 393(1) Table 8, Item (iii).
 */
export const VALID_194J_CATEGORIES = [
    'PROFESSIONAL_SERVICES',
    'TECHNICAL_SERVICES',
    'DIRECTOR_REMUNERATION',
    'ROYALTY_GENERAL',
    'ROYALTY_FILM',
    'NON_COMPETE'
];

export function normalize194JCategory(rawCategory) {
    if (!rawCategory || typeof rawCategory !== 'string') return null;
    const clean = rawCategory.trim().toUpperCase().replace(/[-\s]+/g, '_');
    
    if (VALID_194J_CATEGORIES.includes(clean)) {
        return clean;
    }
    
    // Synonyms for PROFESSIONAL_SERVICES (10%)
    if (/^(PROFESSIONAL|PROF|CA|LEGAL|LAWYER|ADVOCATE|CONSULTING|CONSULTANT|AUDIT|AUDITOR|MEDICAL|DOCTOR|ARCHITECT)$/i.test(clean) ||
        clean.includes('PROFESSIONAL') || clean.includes('LEGAL_') || clean.includes('AUDIT_')) {
        return 'PROFESSIONAL_SERVICES';
    }

    // Synonyms for TECHNICAL_SERVICES (2%)
    if (/^(TECHNICAL|FTS|FEES_FOR_TECHNICAL_SERVICES|IT|SOFTWARE|HOSTING|TECH|DEVELOPMENT|ENGINEERING|CLOUD)$/i.test(clean) ||
        clean.includes('TECHNICAL') || clean.includes('FTS')) {
        return 'TECHNICAL_SERVICES';
    }

    // Synonyms for DIRECTOR_REMUNERATION (10%, ₹0 threshold)
    if (/^(DIRECTOR|DIRECTOR_FEE|DIRECTOR_FEES|SITTING_FEE|SITTING_FEES|BOARD_MEETING_FEE)$/i.test(clean) ||
        clean.includes('DIRECTOR') || clean.includes('SITTING_FEE')) {
        return 'DIRECTOR_REMUNERATION';
    }

    // Synonyms for ROYALTY_GENERAL (2%)
    if (/^(ROYALTY|PATENT|COPYRIGHT|TRADEMARK|IP_LICENSING)$/i.test(clean) ||
        clean === 'ROYALTY_GENERAL') {
        return 'ROYALTY_GENERAL';
    }

    // Synonyms for ROYALTY_FILM (2%)
    if (/^(ROYALTY_FILM|FILM_ROYALTY|CINEMATOGRAPHIC_FILM)$/i.test(clean)) {
        return 'ROYALTY_FILM';
    }

    // Synonyms for NON_COMPETE (10%)
    if (/^(NON_COMPETE|NONCOMPETE|NON_COMPETE_FEE|NON_COMPETE_FEES)$/i.test(clean)) {
        return 'NON_COMPETE';
    }

    return null;
}

export function evaluateSection194J({
    invoiceAmount,
    serviceCategory = 'TECHNICAL_SERVICES', // 'TECHNICAL_SERVICES', 'PROFESSIONAL_SERVICES', 'ROYALTY_FILM', 'ROYALTY_GENERAL', 'DIRECTOR_REMUNERATION', 'NON_COMPETE'
    priorFyCategoryPayments = 0,
    priorPaymentsInCurrentFyInr = null,
    priorFyCategoryPaymentsAlreadyTaxed = null,
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    creditDate = null,
    paymentDate = null,
    gstAmountInr = 0,
    isAdvancePayment = false,
    lowerDeductionRate = null,
    lowerDeductionCertificate = null,
    certificateMonetaryCeilingInr = null,
    certificatePriorUtilizedInr = 0,
    certificateSection = null
} = {}) {
    const rawInvoiceAmount = Number(invoiceAmount) || 0;
    const gstAmount = Number(gstAmountInr) || 0;

    const normalizedCategory = normalize194JCategory(serviceCategory);
    if (!normalizedCategory) {
        throw new Error(`INVALID_SERVICE_CATEGORY: Unknown serviceCategory "${serviceCategory}". Allowed categories: ${VALID_194J_CATEGORIES.join(', ')}`);
    }

    // CBDT Circular No. 23/2017: If GST is separately stated, TDS applies to basic value
    const effectiveServiceAmount = isAdvancePayment
        ? rawInvoiceAmount
        : Math.max(0, rawInvoiceAmount - gstAmount);

    const effectivePriorInput = priorPaymentsInCurrentFyInr !== null && priorPaymentsInCurrentFyInr !== undefined
        ? priorPaymentsInCurrentFyInr
        : priorFyCategoryPayments;
    const prior = Math.max(0, Number(effectivePriorInput) || 0);
    const cumulative = prior + effectiveServiceAmount;

    const isDirectorFee = normalizedCategory === 'DIRECTOR_REMUNERATION';
    const isProfessionalOrNonCompete = normalizedCategory === 'PROFESSIONAL_SERVICES' || normalizedCategory === 'NON_COMPETE';

    // Temporal Resolution: "Credit or Payment, whichever is earlier"
    let effectiveDate = transactionDate;
    let withholdingTrigger = 'TRANSACTION_DATE';

    if (creditDate && paymentDate) {
        if (creditDate <= paymentDate) {
            effectiveDate = creditDate;
            withholdingTrigger = 'CREDIT_TO_ACCOUNT';
        } else {
            effectiveDate = paymentDate;
            withholdingTrigger = 'PAYMENT_DISBURSEMENT';
        }
    } else if (creditDate) {
        effectiveDate = creditDate;
        withholdingTrigger = 'CREDIT_TO_ACCOUNT';
    } else if (paymentDate) {
        effectiveDate = paymentDate;
        withholdingTrigger = 'PAYMENT_DISBURSEMENT';
    }

    const isTemporalStraddle = Boolean(
        creditDate && paymentDate &&
        ((creditDate < '2026-04-01' && paymentDate >= '2026-04-01') ||
         (paymentDate < '2026-04-01' && creditDate >= '2026-04-01'))
    );

    const temporalStraddlingAnalysis = isTemporalStraddle ? {
        isStraddlingCommencement: true,
        creditDate,
        paymentDate,
        crystallizedDate: effectiveDate,
        withholdingTrigger,
        governingRegime: effectiveDate >= '2026-04-01' ? 'ACT_2025' : 'ACT_1961',
        statutoryRationale: effectiveDate < '2026-04-01'
            ? `Tax withholding obligation crystallized on ${effectiveDate} (${withholdingTrigger}) under the Income-tax Act, 1961 prior to 2025 Act commencement. Subsequent settlement on ${effectiveDate === creditDate ? paymentDate : creditDate} creates no duplicate withholding under the 2025 Act.`
            : `Both credit and payment occurred on or after 1 April 2026. Governed exclusively by the Income-tax Act, 2025.`
    } : null;

    // ── Temporal Act Bridge ──
    const isAct2025 = Boolean(effectiveDate && String(effectiveDate).slice(0, 10) >= '2026-04-01');
    const governingSection = isAct2025
        ? "Income-tax Act, 2025 Section 393(1) Table 6, Item (iii)"
        : "Income-tax Act, 1961 Section 194J";

    // ── Rate Determination ──
    // 2% for FTS, BPO, Royalty; 10% for Professional Services, Non-compete, and Director fees
    const baseStatutoryRatePercent = isProfessionalOrNonCompete || isDirectorFee ? 10.0 : 2.0;

    const panAvailable = Boolean(hasPan) && !isPanInoperative;
    const panFloorResolution = resolveMissingPanPenaltyFloor({
        sectionCode: '194J',
        tableItem: isAct2025 ? '393_7' : null,
        isAct2025
    });
    // Section 206AA(1)(iii) / Section 397(2)(a): Strictly 20% floor for professional & technical services
    const standardRatePercent = panAvailable ? baseStatutoryRatePercent : Math.max(baseStatutoryRatePercent, panFloorResolution.penaltyFloorPercent);

    // ── Threshold Evaluation ──
    // Director remuneration has NO threshold under 3rd proviso to Section 194J(1)
    const CATEGORY_THRESHOLD = isDirectorFee ? 0 : 30000;
    const isThresholdBreached = isDirectorFee || cumulative > CATEGORY_THRESHOLD;

    let taxableBase = 0;
    let thresholdDisposition = 'BELOW_THRESHOLD_EXEMPT';

    if (isThresholdBreached) {
        if (isDirectorFee) {
            taxableBase = effectiveServiceAmount;
            thresholdDisposition = 'DIRECTOR_FEES_ZERO_THRESHOLD';
        } else {
            const previouslyTaxed = priorFyCategoryPaymentsAlreadyTaxed !== null && priorFyCategoryPaymentsAlreadyTaxed !== undefined
                ? Math.max(0, Number(priorFyCategoryPaymentsAlreadyTaxed))
                : (prior > CATEGORY_THRESHOLD ? prior : 0);

            taxableBase = Math.max(0, cumulative - previouslyTaxed);
            thresholdDisposition = prior <= CATEGORY_THRESHOLD && previouslyTaxed === 0
                ? 'CATEGORY_THRESHOLD_BREACHED_WITH_CATCHUP'
                : 'CATEGORY_THRESHOLD_ACTIVE';
        }
    }
    
    // Resolve certificate framework with Section 536(2) transitional savings and validity evaluation
    const certResolution = evaluateLowerDeductionCertificateValidity({
        effectiveDate,
        lowerDeductionCertificate,
        certificateSection,
        isAct2025
    });
    const governingCertificateSection = certResolution.governingCertificateSection;

    // ── Lower Deduction Certificate Validation ──
    const isCertificateValid = certResolution.isValid;
    const hasLowerDeduction = (lowerDeductionRate !== null && lowerDeductionRate !== undefined) && isCertificateValid;
    const certifiedRatePercent = hasLowerDeduction ? Number(lowerDeductionRate) : standardRatePercent;

    const certificateCeiling = certificateMonetaryCeilingInr !== null && certificateMonetaryCeilingInr !== undefined
        ? Number(certificateMonetaryCeilingInr)
        : (lowerDeductionCertificate?.monetaryCeilingInr !== undefined ? Number(lowerDeductionCertificate.monetaryCeilingInr) : null);

    const certificatePriorUtilized = Number(certificatePriorUtilizedInr) ||
        (lowerDeductionCertificate?.consumedAmountInr !== undefined ? Number(lowerDeductionCertificate.consumedAmountInr) : 0);

    const availableCeilingHeadroom = certificateCeiling !== null
        ? Math.max(0, certificateCeiling - certificatePriorUtilized)
        : null;

    let certifiedEligibleBase = 0;
    let uncoveredExcessBase = taxableBase;
    let ceilingExhaustionStatus = 'NO_LOWER_DEDUCTION_CERTIFICATE';

    if (hasLowerDeduction && taxableBase > 0) {
        if (certificateCeiling === null) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'UNCONSTRAINED';
        } else if (availableCeilingHeadroom >= taxableBase) {
            certifiedEligibleBase = taxableBase;
            uncoveredExcessBase = 0;
            ceilingExhaustionStatus = 'WITHIN_CEILING';
        } else if (availableCeilingHeadroom > 0) {
            certifiedEligibleBase = availableCeilingHeadroom;
            uncoveredExcessBase = taxableBase - availableCeilingHeadroom;
            ceilingExhaustionStatus = 'PARTIALLY_EXHAUSTED';
        } else {
            certifiedEligibleBase = 0;
            uncoveredExcessBase = taxableBase;
            ceilingExhaustionStatus = 'FULLY_EXHAUSTED';
        }
    } else if (lowerDeductionRate !== null && !isCertificateValid) {
        ceilingExhaustionStatus = certResolution.status;
    }

    let certifiedTdsInr = 0;
    let uncoveredTdsInr = 0;

    if (taxableBase > 0) {
        certifiedTdsInr = Number(((certifiedEligibleBase * certifiedRatePercent) / 100).toFixed(2));
        uncoveredTdsInr = Number(((uncoveredExcessBase * standardRatePercent) / 100).toFixed(2));
    }
    const calculatedTdsInr = Number((certifiedTdsInr + uncoveredTdsInr).toFixed(2));
    const effectiveRatePercent = taxableBase > 0
        ? Number(((calculatedTdsInr / taxableBase) * 100).toFixed(4))
        : standardRatePercent;

    let formulaText = "";
    if (taxableBase === 0) {
        formulaText = `Section 194J inapplicable: Cumulative fees (₹${cumulative.toLocaleString('en-IN')}) do not exceed ₹30,000 threshold for ${normalizedCategory}.`;
    } else if (hasLowerDeduction) {
        if (ceilingExhaustionStatus === 'PARTIALLY_EXHAUSTED') {
            formulaText = `Partial Ceiling Split: ₹${certifiedEligibleBase.toLocaleString('en-IN')} @ ${certifiedRatePercent}% + ₹${uncoveredExcessBase.toLocaleString('en-IN')} @ ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
        } else {
            formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${certifiedRatePercent}% (${isAct2025 ? 'Section 395' : 'Section 197'} Certificate) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
        }
    } else if (lowerDeductionRate !== null && !isCertificateValid) {
        formulaText = `Lower Deduction Certificate Disallowed (${certResolution.status}): ${certResolution.reason}. Deducted at standard statutory rate of ${standardRatePercent}% = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else if (panAvailable) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${standardRatePercent}% (${normalizedCategory}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × 20% (${panFloorResolution.governingProviso}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    }

    return {
        section: '194J',
        isAct2025,
        governingSection,
        governingPanPenaltySection: panFloorResolution.governingProviso,
        governingCertificateSection,
        isSection536TransitionalSavingsApplied: certResolution.isSection536TransitionalSavingsApplied,
        transitionalSavingsClause: certResolution.transitionalSavingsClause,
        certificateValidity: certResolution,
        certificateDisallowanceReason: certResolution.isValid ? null : certResolution.reason,
        creditDate,
        paymentDate,
        effectiveWithholdingDate: effectiveDate,
        withholdingTrigger,
        temporalStraddlingAnalysis,
        rawInvoiceAmount,
        gstAmountInr: gstAmount,
        isAdvancePayment,
        effectiveServiceAmount,
        cbdtCircular23Applied: !isAdvancePayment && gstAmount > 0,
        serviceCategory: normalizedCategory,
        priorFyCategoryPayments: prior,
        priorPaymentsInCurrentFyInr: prior,
        cumulativeFyCategoryPayments: cumulative,
        cumulativePaymentsInCurrentFyInr: cumulative,
        categoryThreshold: CATEGORY_THRESHOLD,
        isDirectorFee,
        isThresholdBreached,
        thresholdDisposition,
        isPanFurnished: panAvailable,
        taxableBase,
        baseStatutoryRatePercent,
        standardRatePercent,
        effectiveRatePercent,
        calculatedTdsInr,
        certifiedTdsInr,
        uncoveredTdsInr,
        certificateCeiling,
        certificatePriorUtilized,
        availableCeilingHeadroom,
        certifiedEligibleBase,
        uncoveredExcessBase,
        ceilingExhaustionStatus,
        lowerDeductionRate: hasLowerDeduction ? Number(lowerDeductionRate) : null,
        statutoryFormula: formulaText,
        classificationRiskAdvisory: normalizedCategory === 'TECHNICAL_SERVICES' ? {
            statutoryRatePercent: 2.0,
            reclassificationRiskRatePercent: 10.0,
            potentialExposure: "If Assessing Officer reclassifies ERP advisory/technical consultancy as professional services under Section 194J(1)(a), differential 8% withholding plus Section 201(1A) interest (1% per month) applies.",
            recommendation: "Review contract scope of work: pure technical/IT services qualify for 2% under Section 194J(1)(II); managerial/professional consulting attracts 10% under Section 194J(1)(a)."
        } : null,
        statutoryRectificationProcedure: {
            excessDeductionRemedy: "Deductor cannot claim a cash refund from the vendor for excess TDS deducted. The deductor must file a correction statement (Revised Form 26Q) via TRACES to adjust challan mapping, or the deductee/vendor claims credit/refund in their annual Income Tax Return (ITR) based on Form 26AS/AIS.",
            belatedCertificateRemedy: "If Section 197 certificate is authenticated post-disbursement, adjust against subsequent payments in the same financial year or advise vendor to claim refund in their ITR."
        }
    };
}




/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. SECTION 194I: DETERMINISTIC TDS ON RENT ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates payments for lease or rental of machinery, equipment, land, or buildings:
 * - Rates:
 *   - Plant, Machinery, or Equipment: 2.0% (Section 194I(a))
 *   - Land, Building, Furniture, or Fittings: 10.0% (Section 194I(b))
 * - Annual Threshold: ₹2,40,000 per financial year per payee.
 * - Missing PAN: 20.0% (Section 206AA(1)(iii)).
 * - CBDT Circular No. 23/2017: Separately stated GST excluded from TDS.
 * - Income-tax Act, 2025 Transition: Section 393(1) Table 8, Item 5.
 */
export function evaluateSection194I({
    invoiceAmount,
    priorFyRent = 0,
    priorFyPayments = null,
    priorFyPaymentsAlreadyTaxed = null,
    rentType = 'LAND_BUILDING', // 'LAND_BUILDING', 'PLANT_MACHINERY'
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    creditDate = null,
    paymentDate = null,
    gstAmountInr = 0,
    isAdvancePayment = false,
    lowerDeductionRate = null,
    lowerDeductionCertificate = null,
    certificateMonetaryCeilingInr = null,
    certificatePriorUtilizedInr = 0,
    certificateSection = null
} = {}) {
    const rawInvoiceAmount = Number(invoiceAmount) || 0;
    const gstAmount = Number(gstAmountInr) || 0;

    const effectiveRentAmount = isAdvancePayment
        ? rawInvoiceAmount
        : Math.max(0, rawInvoiceAmount - gstAmount);

    const effectivePrior = priorFyPayments !== null && priorFyPayments !== undefined
        ? Number(priorFyPayments) || 0
        : Number(priorFyRent) || 0;
    const prior = Math.max(0, effectivePrior);
    const cumulative = prior + effectiveRentAmount;

    // Normalizing rentType:
    const cleanType = String(rentType || '').trim().toUpperCase().replace(/[-\s]+/g, '_');
    const isPlantOrMachinery = /^(PLANT|MACHINERY|EQUIPMENT|PLANT_MACHINERY|PLANT_AND_MACHINERY)$/i.test(cleanType) || cleanType.includes('MACHINERY') || cleanType.includes('EQUIPMENT');
    const normalizedRentType = isPlantOrMachinery ? 'PLANT_MACHINERY' : 'LAND_BUILDING';
    const baseStatutoryRatePercent = isPlantOrMachinery ? 2.0 : 10.0;

    // Temporal Resolution: Credit or Payment, whichever is earlier
    let effectiveDate = transactionDate;
    let withholdingTrigger = 'TRANSACTION_DATE';

    if (creditDate && paymentDate) {
        if (creditDate <= paymentDate) {
            effectiveDate = creditDate;
            withholdingTrigger = 'CREDIT_TO_ACCOUNT';
        } else {
            effectiveDate = paymentDate;
            withholdingTrigger = 'PAYMENT_DISBURSEMENT';
        }
    } else if (creditDate) {
        effectiveDate = creditDate;
        withholdingTrigger = 'CREDIT_TO_ACCOUNT';
    } else if (paymentDate) {
        effectiveDate = paymentDate;
        withholdingTrigger = 'PAYMENT_DISBURSEMENT';
    }

    const isAct2025 = Boolean(effectiveDate && String(effectiveDate).slice(0, 10) >= '2026-04-01');
    const governingSection = isAct2025
        ? "Income-tax Act, 2025 Section 393(1) Table 8, Item 5"
        : "Income-tax Act, 1961 Section 194I";

    const panAvailable = Boolean(hasPan) && !isPanInoperative;
    const panFloorResolution = resolveMissingPanPenaltyFloor({
        sectionCode: '194I',
        tableItem: isAct2025 ? '393_5' : null,
        isAct2025
    });
    const standardRatePercent = panAvailable ? baseStatutoryRatePercent : Math.max(baseStatutoryRatePercent, panFloorResolution.penaltyFloorPercent);

    // Threshold: ₹2,40,000 per financial year
    const RENT_THRESHOLD = 240000;
    const isThresholdBreached = cumulative > RENT_THRESHOLD;

    let taxableBase = 0;
    let thresholdDisposition = 'BELOW_THRESHOLD_EXEMPT';

    if (isThresholdBreached) {
        const previouslyTaxed = priorFyPaymentsAlreadyTaxed !== null && priorFyPaymentsAlreadyTaxed !== undefined
            ? Math.max(0, Number(priorFyPaymentsAlreadyTaxed))
            : (prior > RENT_THRESHOLD ? prior : 0);

        taxableBase = Math.max(0, cumulative - previouslyTaxed);
        thresholdDisposition = prior <= RENT_THRESHOLD && previouslyTaxed === 0
            ? 'CATEGORY_THRESHOLD_BREACHED_WITH_CATCHUP'
            : 'CATEGORY_THRESHOLD_ACTIVE';
    }

    // Lower Deduction Certificate resolution
    const certResolution = evaluateLowerDeductionCertificateValidity({
        effectiveDate,
        lowerDeductionCertificate,
        certificateSection,
        isAct2025
    });
    const hasLowerDeduction = (lowerDeductionRate !== null && lowerDeductionRate !== undefined) && certResolution.isValid;
    const certifiedRatePercent = hasLowerDeduction ? Number(lowerDeductionRate) : standardRatePercent;

    let calculatedTdsInr = 0;
    if (taxableBase > 0) {
        calculatedTdsInr = Number(((taxableBase * certifiedRatePercent) / 100).toFixed(2));
    }
    const effectiveRatePercent = taxableBase > 0
        ? Number(((calculatedTdsInr / taxableBase) * 100).toFixed(4))
        : standardRatePercent;

    let formulaText = "";
    if (taxableBase === 0) {
        formulaText = `Section 194I inapplicable: Cumulative rent (₹${cumulative.toLocaleString('en-IN')}) does not exceed ₹2,40,000 annual threshold.`;
    } else if (hasLowerDeduction) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${certifiedRatePercent}% (${isAct2025 ? 'Section 395' : 'Section 197'} Certificate) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else if (panAvailable) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${standardRatePercent}% (${normalizedRentType}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × 20% (${panFloorResolution.governingProviso}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    }

    return {
        section: isAct2025 ? '393' : '194I',
        isAct2025,
        governingSection,
        governingPanPenaltySection: panFloorResolution.governingProviso,
        rawInvoiceAmount,
        gstAmountInr: gstAmount,
        effectiveRentAmount,
        cbdtCircular23Applied: !isAdvancePayment && gstAmount > 0,
        rentType: normalizedRentType,
        priorFyRent: prior,
        cumulativeFyRent: cumulative,
        rentThreshold: RENT_THRESHOLD,
        isThresholdBreached,
        thresholdDisposition,
        isPanFurnished: panAvailable,
        taxableBase,
        baseStatutoryRatePercent,
        standardRatePercent,
        effectiveRatePercent,
        calculatedTdsInr,
        taxAmountRoundedSection288B: roundSection288B(calculatedTdsInr),
        netPayable: roundToPaisa(Math.max(0, rawInvoiceAmount - calculatedTdsInr)),
        statutoryFormula: formulaText
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 8. SECTION 194H: DETERMINISTIC TDS ON COMMISSION & BROKERAGE ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates payments for commission (other than insurance commission) or brokerage:
 * - Rates:
 *   - Prior to 1 October 2024: 5.0%
 *   - On or after 1 October 2024: 2.0% (Amended by Finance (No. 2) Act, 2024)
 * - Annual Threshold: ₹15,000 per financial year per payee.
 * - Missing PAN: 20.0% (Section 206AA(1)(iii)).
 * - CBDT Circular No. 23/2017: Separately stated GST excluded from TDS.
 * - Income-tax Act, 2025 Transition: Section 393(1) Table 8, Item 4.
 */
export function evaluateSection194H({
    invoiceAmount,
    priorFyCommission = 0,
    priorFyPayments = null,
    priorFyPaymentsAlreadyTaxed = null,
    hasPan = true,
    isPanInoperative = false,
    transactionDate = null,
    creditDate = null,
    paymentDate = null,
    gstAmountInr = 0,
    isAdvancePayment = false,
    lowerDeductionRate = null,
    lowerDeductionCertificate = null,
    certificateMonetaryCeilingInr = null,
    certificatePriorUtilizedInr = 0,
    certificateSection = null
} = {}) {
    const rawInvoiceAmount = Number(invoiceAmount) || 0;
    const gstAmount = Number(gstAmountInr) || 0;

    const effectiveCommissionAmount = isAdvancePayment
        ? rawInvoiceAmount
        : Math.max(0, rawInvoiceAmount - gstAmount);

    const effectivePrior = priorFyPayments !== null && priorFyPayments !== undefined
        ? Number(priorFyPayments) || 0
        : Number(priorFyCommission) || 0;
    const prior = Math.max(0, effectivePrior);
    const cumulative = prior + effectiveCommissionAmount;

    // Temporal Resolution: Credit or Payment, whichever is earlier
    let effectiveDate = transactionDate;
    let withholdingTrigger = 'TRANSACTION_DATE';

    if (creditDate && paymentDate) {
        if (creditDate <= paymentDate) {
            effectiveDate = creditDate;
            withholdingTrigger = 'CREDIT_TO_ACCOUNT';
        } else {
            effectiveDate = paymentDate;
            withholdingTrigger = 'PAYMENT_DISBURSEMENT';
        }
    } else if (creditDate) {
        effectiveDate = creditDate;
        withholdingTrigger = 'CREDIT_TO_ACCOUNT';
    } else if (paymentDate) {
        effectiveDate = paymentDate;
        withholdingTrigger = 'PAYMENT_DISBURSEMENT';
    }

    const dateStr = effectiveDate ? String(effectiveDate).slice(0, 10) : new Date().toISOString().split('T')[0];
    const isAct2025 = Boolean(dateStr >= '2026-04-01');
    const isPostOctober2024 = dateStr >= '2024-10-01';

    // Base statutory rate: 2% from 1 Oct 2024 onwards; 5% prior
    const baseStatutoryRatePercent = isPostOctober2024 ? 2.0 : 5.0;

    const governingSection = isAct2025
        ? "Income-tax Act, 2025 Section 393(1) Table 8, Item 4"
        : "Income-tax Act, 1961 Section 194H";

    const panAvailable = Boolean(hasPan) && !isPanInoperative;
    const panFloorResolution = resolveMissingPanPenaltyFloor({
        sectionCode: '194H',
        tableItem: isAct2025 ? '393_4' : null,
        isAct2025
    });
    const standardRatePercent = panAvailable ? baseStatutoryRatePercent : Math.max(baseStatutoryRatePercent, panFloorResolution.penaltyFloorPercent);

    // Threshold: ₹15,000 per financial year
    const COMMISSION_THRESHOLD = 15000;
    const isThresholdBreached = cumulative > COMMISSION_THRESHOLD;

    let taxableBase = 0;
    let thresholdDisposition = 'BELOW_THRESHOLD_EXEMPT';

    if (isThresholdBreached) {
        const previouslyTaxed = priorFyPaymentsAlreadyTaxed !== null && priorFyPaymentsAlreadyTaxed !== undefined
            ? Math.max(0, Number(priorFyPaymentsAlreadyTaxed))
            : (prior > COMMISSION_THRESHOLD ? prior : 0);

        taxableBase = Math.max(0, cumulative - previouslyTaxed);
        thresholdDisposition = prior <= COMMISSION_THRESHOLD && previouslyTaxed === 0
            ? 'CATEGORY_THRESHOLD_BREACHED_WITH_CATCHUP'
            : 'CATEGORY_THRESHOLD_ACTIVE';
    }

    // Lower Deduction Certificate resolution
    const certResolution = evaluateLowerDeductionCertificateValidity({
        effectiveDate,
        lowerDeductionCertificate,
        certificateSection,
        isAct2025
    });
    const hasLowerDeduction = (lowerDeductionRate !== null && lowerDeductionRate !== undefined) && certResolution.isValid;
    const certifiedRatePercent = hasLowerDeduction ? Number(lowerDeductionRate) : standardRatePercent;

    let calculatedTdsInr = 0;
    if (taxableBase > 0) {
        calculatedTdsInr = Number(((taxableBase * certifiedRatePercent) / 100).toFixed(2));
    }
    const effectiveRatePercent = taxableBase > 0
        ? Number(((calculatedTdsInr / taxableBase) * 100).toFixed(4))
        : standardRatePercent;

    let formulaText = "";
    if (taxableBase === 0) {
        formulaText = `Section 194H inapplicable: Cumulative commission (₹${cumulative.toLocaleString('en-IN')}) does not exceed ₹15,000 annual threshold.`;
    } else if (hasLowerDeduction) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${certifiedRatePercent}% (${isAct2025 ? 'Section 395' : 'Section 197'} Certificate) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else if (panAvailable) {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × ${standardRatePercent}% (${isPostOctober2024 ? 'Finance (No. 2) Act 2024 rate 2%' : 'Pre-amendment rate 5%'}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    } else {
        formulaText = `Taxable Base (₹${taxableBase.toLocaleString('en-IN')}) × 20% (${panFloorResolution.governingProviso}) = ₹${calculatedTdsInr.toLocaleString('en-IN')}`;
    }

    return {
        section: isAct2025 ? '393' : '194H',
        isAct2025,
        governingSection,
        governingPanPenaltySection: panFloorResolution.governingProviso,
        rawInvoiceAmount,
        gstAmountInr: gstAmount,
        effectiveCommissionAmount,
        cbdtCircular23Applied: !isAdvancePayment && gstAmount > 0,
        priorFyCommission: prior,
        cumulativeFyCommission: cumulative,
        commissionThreshold: COMMISSION_THRESHOLD,
        isThresholdBreached,
        thresholdDisposition,
        isPanFurnished: panAvailable,
        taxableBase,
        baseStatutoryRatePercent,
        standardRatePercent,
        effectiveRatePercent,
        calculatedTdsInr,
        taxAmountRoundedSection288B: roundSection288B(calculatedTdsInr),
        netPayable: roundToPaisa(Math.max(0, rawInvoiceAmount - calculatedTdsInr)),
        statutoryFormula: formulaText
    };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORPORATE FINANCE: ADVANCE TAX & INTEREST CALCULATOR (DUAL-ACT ENGINE)
 * Income-tax Act, 1961: Sections 208, 209, 211, 234B, 234C
 * Income-tax Act, 2025: Sections 405 (Computation & Threshold), 408 (Installments)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements authoritative corporate advance tax installment compliance,
 * 12% & 36% safe harbors for Q1 and Q2, Section 234C sudden income provisos
 * (capital gains, dividends, new business), and Section 234B default interest.
 */
export function calculateAdvanceTaxAndInterest({
    taxYear = '2025-26',
    assessmentYear = null,
    estimatedAssessedTaxInr,
    tdsTcsCreditInr = 0,
    paidQ1Inr = 0,
    paidQ2Inr = 0,
    paidQ3Inr = 0,
    paidQ4Inr = 0,
    suddenIncomeExceptions = null,
    assessmentDate = null,
    isAct2025 = null
}) {
    if (estimatedAssessedTaxInr === undefined || estimatedAssessedTaxInr === null) {
        return {
            status: 'INDETERMINATE',
            code: 'MISSING_ESTIMATED_TAX',
            statutoryDetermination: 'INDETERMINATE',
            message: 'Field "estimatedAssessedTaxInr" is required to determine advance tax liability.',
            isAdvanceTaxPayable: null,
            totalInterest: null,
            isAuthorizedToDisburse: false
        };
    }

    const estimatedTax = Number(estimatedAssessedTaxInr);
    const credits = Number(tdsTcsCreditInr || 0);
    if (isNaN(estimatedTax) || estimatedTax < 0 || !Number.isFinite(estimatedTax)) {
        throw new Error('[@mudraforge/statutory] Invalid estimatedAssessedTaxInr: expected non-negative finite number.');
    }
    if (isNaN(credits) || credits < 0 || !Number.isFinite(credits)) {
        throw new Error('[@mudraforge/statutory] Invalid tdsTcsCreditInr: expected non-negative finite number.');
    }

    // Regime resolution: Income-tax Act, 1961 vs Income-tax Act, 2025
    const resolvedIsAct2025 = isAct2025 !== null
        ? Boolean(isAct2025)
        : (taxYear >= '2026-27' || (assessmentYear && assessmentYear >= '2027-28'));

    const governingAct = resolvedIsAct2025 ? 'Income-tax Act, 2025' : 'Income-tax Act, 1961';
    const governingComputationSection = resolvedIsAct2025 ? 'Section 405' : 'Section 208 read with Section 209';
    const governingInstallmentSection = resolvedIsAct2025 ? 'Section 408' : 'Section 211';
    const governingInterestSection = resolvedIsAct2025 ? 'Sections 410 & 411' : 'Sections 234B & 234C';

    const netTaxPayable = roundToPaisa(Math.max(0, estimatedTax - credits));
    const ADVANCE_TAX_THRESHOLD = 10000; // ₹10,000 threshold under Section 208 / Section 405

    // Zero-liability below threshold
    if (netTaxPayable < ADVANCE_TAX_THRESHOLD) {
        return {
            status: 'EXEMPT_BELOW_THRESHOLD',
            statutoryDetermination: 'EXEMPT',
            governingAct,
            governingComputationSection,
            governingInstallmentSection,
            governingInterestSection,
            taxYear,
            assessmentYear: assessmentYear || (taxYear ? `${Number(taxYear.slice(0, 4)) + 1}-${Number(taxYear.slice(5, 7)) + 1}` : null),
            estimatedAssessedTaxInr: estimatedTax,
            tdsTcsCreditInr: credits,
            netTaxPayableInr: netTaxPayable,
            advanceTaxThresholdInr: ADVANCE_TAX_THRESHOLD,
            isAdvanceTaxPayable: false,
            installments: [],
            totalShortfallQ1toQ4: 0,
            interestSection234CInr: 0,
            interestSection234BInr: 0,
            totalInterestInr: 0,
            totalPayableInr: 0,
            isAuthorizedToDisburse: false,
            statutoryRationale: `Assessed tax after TDS/TCS credits (₹${netTaxPayable.toLocaleString('en-IN')}) is below the ₹10,000 threshold under ${governingComputationSection}. No advance tax obligation arises.`
        };
    }

    // Cumulative installments calculation (15%, 45%, 75%, 100%)
    const pQ1 = Math.max(0, Number(paidQ1Inr || 0));
    const pQ2 = Math.max(0, Number(paidQ2Inr || 0));
    const pQ3 = Math.max(0, Number(paidQ3Inr || 0));
    const pQ4 = Math.max(0, Number(paidQ4Inr || 0));

    const cumPaidQ1 = pQ1;
    const cumPaidQ2 = cumPaidQ1 + pQ2;
    const cumPaidQ3 = cumPaidQ2 + pQ3;
    const cumPaidQ4 = cumPaidQ3 + pQ4;

    const reqQ1 = roundToPaisa(netTaxPayable * 0.15);
    const reqQ2 = roundToPaisa(netTaxPayable * 0.45);
    const reqQ3 = roundToPaisa(netTaxPayable * 0.75);
    const reqQ4 = roundToPaisa(netTaxPayable * 1.00);

    // Section 234C Safe Harbors (First Proviso to Section 234C(1)):
    // Q1: If paid on or before 15 June is not less than 12%, no 234C interest.
    // Q2: If paid on or before 15 September is not less than 36%, no 234C interest.
    const safeHarborQ1Threshold = roundToPaisa(netTaxPayable * 0.12);
    const safeHarborQ2Threshold = roundToPaisa(netTaxPayable * 0.36);

    const safeHarborQ1Applied = cumPaidQ1 >= safeHarborQ1Threshold;
    const safeHarborQ2Applied = cumPaidQ2 >= safeHarborQ2Threshold;

    // Sudden income exception relief under First Proviso to Section 234C(1):
    // Capital gains, casual income, new business, domestic dividends
    const suddenReliefTax = (suddenIncomeExceptions && typeof suddenIncomeExceptions === 'object')
        ? Math.max(0, Number(
            (suddenIncomeExceptions.capitalGainsTaxInr || 0) +
            (suddenIncomeExceptions.dividendTaxInr || 0) +
            (suddenIncomeExceptions.newBusinessTaxInr || 0) +
            (suddenIncomeExceptions.casualIncomeTaxInr || 0)
        ))
        : 0;

    // Q1 Interest: 1% per month for 3 months
    let shortfallQ1 = 0;
    let interestQ1 = 0;
    if (!safeHarborQ1Applied && cumPaidQ1 < reqQ1) {
        shortfallQ1 = Math.max(0, reqQ1 - cumPaidQ1);
        if (suddenReliefTax > 0 && suddenIncomeExceptions?.occurrenceQuarter > 1) {
            // Sudden income occurred in subsequent quarter; relief applied to earlier installment
            shortfallQ1 = Math.max(0, shortfallQ1 - roundToPaisa(suddenReliefTax * 0.15));
        }
        interestQ1 = roundSection288B(shortfallQ1) * 0.01 * 3;
    }

    // Q2 Interest: 1% per month for 3 months
    let shortfallQ2 = 0;
    let interestQ2 = 0;
    if (!safeHarborQ2Applied && cumPaidQ2 < reqQ2) {
        shortfallQ2 = Math.max(0, reqQ2 - cumPaidQ2);
        if (suddenReliefTax > 0 && suddenIncomeExceptions?.occurrenceQuarter > 2) {
            shortfallQ2 = Math.max(0, shortfallQ2 - roundToPaisa(suddenReliefTax * 0.45));
        }
        interestQ2 = roundSection288B(shortfallQ2) * 0.01 * 3;
    }

    // Q3 Interest: 1% per month for 3 months (No statutory safe harbor buffer)
    let shortfallQ3 = Math.max(0, reqQ3 - cumPaidQ3);
    let interestQ3 = 0;
    if (shortfallQ3 > 0) {
        if (suddenReliefTax > 0 && suddenIncomeExceptions?.occurrenceQuarter > 3) {
            shortfallQ3 = Math.max(0, shortfallQ3 - roundToPaisa(suddenReliefTax * 0.75));
        }
        interestQ3 = roundSection288B(shortfallQ3) * 0.01 * 3;
    }

    // Q4 Interest: 1% per month for 1 month
    let shortfallQ4 = Math.max(0, reqQ4 - cumPaidQ4);
    let interestQ4 = 0;
    if (shortfallQ4 > 0) {
        interestQ4 = roundSection288B(shortfallQ4) * 0.01 * 1;
    }

    const totalInterest234C = roundSection288B(interestQ1 + interestQ2 + interestQ3 + interestQ4);

    // Section 234B Default Interest:
    // Triggers if total advance tax paid on or before 31 March is < 90% of assessed tax.
    const isNinetyPercentSatisfied = cumPaidQ4 >= roundToPaisa(netTaxPayable * 0.90);
    let shortfall234B = 0;
    let interestSection234B = 0;
    let months234B = 0;

    if (!isNinetyPercentSatisfied) {
        shortfall234B = Math.max(0, netTaxPayable - cumPaidQ4);
        
        // Month count from 1 April of AY to date of determination/assessment
        if (assessmentDate) {
            const ayStart = new Date(`${(assessmentYear ? assessmentYear.slice(0, 4) : Number(taxYear.slice(0, 4)) + 1)}-04-01T00:00:00.000Z`);
            const dAssess = new Date(String(assessmentDate).slice(0, 10) + 'T00:00:00.000Z');
            if (!isNaN(dAssess.getTime()) && dAssess > ayStart) {
                const diffTime = dAssess.getTime() - ayStart.getTime();
                const rawMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4375);
                months234B = Math.max(1, Math.ceil(rawMonths));
            } else {
                months234B = 1;
            }
        } else {
            months234B = 1; // Minimum statutory period: 1 month
        }

        interestSection234B = roundSection288B(shortfall234B) * 0.01 * months234B;
    }

    const totalInterest = roundSection288B(totalInterest234C + interestSection234B);
    const balanceTaxDue = Math.max(0, netTaxPayable - cumPaidQ4);
    const totalPayable = roundToPaisa(balanceTaxDue + totalInterest);

    const installments = [
        {
            quarter: 'Q1',
            statutoryDueDate: `${taxYear.slice(0, 4)}-06-15`,
            cumulativePercentTarget: 15,
            cumulativeRequiredInr: reqQ1,
            cumulativePaidInr: cumPaidQ1,
            quarterlyPaidInr: pQ1,
            shortfallInr: shortfallQ1,
            safeHarbor12PercentThresholdInr: safeHarborQ1Threshold,
            isSafeHarborApplied: safeHarborQ1Applied,
            ratePercent: 1.0,
            statutoryMonths: 3,
            interestInr: interestQ1,
            statutoryRule: safeHarborQ1Applied ? 'SAFE_HARBOR_12_PERCENT_SATISFIED' : (shortfallQ1 > 0 ? 'DEFERMENT_INTEREST_APPLIED' : 'PAID_IN_FULL')
        },
        {
            quarter: 'Q2',
            statutoryDueDate: `${taxYear.slice(0, 4)}-09-15`,
            cumulativePercentTarget: 45,
            cumulativeRequiredInr: reqQ2,
            cumulativePaidInr: cumPaidQ2,
            quarterlyPaidInr: pQ2,
            shortfallInr: shortfallQ2,
            safeHarbor36PercentThresholdInr: safeHarborQ2Threshold,
            isSafeHarborApplied: safeHarborQ2Applied,
            ratePercent: 1.0,
            statutoryMonths: 3,
            interestInr: interestQ2,
            statutoryRule: safeHarborQ2Applied ? 'SAFE_HARBOR_36_PERCENT_SATISFIED' : (shortfallQ2 > 0 ? 'DEFERMENT_INTEREST_APPLIED' : 'PAID_IN_FULL')
        },
        {
            quarter: 'Q3',
            statutoryDueDate: `${taxYear.slice(0, 4)}-12-15`,
            cumulativePercentTarget: 75,
            cumulativeRequiredInr: reqQ3,
            cumulativePaidInr: cumPaidQ3,
            quarterlyPaidInr: pQ3,
            shortfallInr: shortfallQ3,
            isSafeHarborApplied: false,
            ratePercent: 1.0,
            statutoryMonths: 3,
            interestInr: interestQ3,
            statutoryRule: shortfallQ3 > 0 ? 'DEFERMENT_INTEREST_APPLIED' : 'PAID_IN_FULL'
        },
        {
            quarter: 'Q4',
            statutoryDueDate: `${Number(taxYear.slice(0, 4)) + 1}-03-15`,
            cumulativePercentTarget: 100,
            cumulativeRequiredInr: reqQ4,
            cumulativePaidInr: cumPaidQ4,
            quarterlyPaidInr: pQ4,
            shortfallInr: shortfallQ4,
            isSafeHarborApplied: false,
            ratePercent: 1.0,
            statutoryMonths: 1,
            interestInr: interestQ4,
            statutoryRule: shortfallQ4 > 0 ? 'DEFERMENT_INTEREST_APPLIED' : 'PAID_IN_FULL'
        }
    ];

    return {
        status: 'SUCCESS',
        statutoryDetermination: 'APPLICABLE',
        governingAct,
        governingComputationSection,
        governingInstallmentSection,
        governingInterestSection,
        isAct2025: resolvedIsAct2025,
        taxYear,
        assessmentYear: assessmentYear || `${Number(taxYear.slice(0, 4)) + 1}-${Number(taxYear.slice(5, 7)) + 1}`,
        estimatedAssessedTaxInr: estimatedTax,
        tdsTcsCreditInr: credits,
        netTaxPayableInr: netTaxPayable,
        advanceTaxThresholdInr: ADVANCE_TAX_THRESHOLD,
        isAdvanceTaxPayable: true,
        installments,
        totalAdvanceTaxPaidInr: cumPaidQ4,
        balanceTaxDueInr: balanceTaxDue,
        interestSection234CInr: totalInterest234C,
        section234BDetails: {
            ninetyPercentThresholdInr: roundToPaisa(netTaxPayable * 0.90),
            isNinetyPercentSatisfied,
            shortfall234BInr: shortfall234B,
            months234B,
            ratePerMonthPercent: 1.0,
            interestInr: interestSection234B,
            rule: isNinetyPercentSatisfied ? 'EXEMPT_PAID_AT_LEAST_90_PERCENT' : 'DEFAULT_INTEREST_APPLIED_BELOW_90_PERCENT'
        },
        interestSection234BInr: interestSection234B,
        totalInterestInr: totalInterest,
        totalPayableInr: totalPayable,
        isAuthorizedToDisburse: false,
        statutoryRationale: `${governingComputationSection} requires advance tax on net liability ₹${netTaxPayable.toLocaleString('en-IN')}. Section 234C interest ₹${totalInterest234C.toLocaleString('en-IN')} (deferment), Section 234B interest ₹${interestSection234B.toLocaleString('en-IN')} (${isNinetyPercentSatisfied ? 'satisfied >=90%' : 'default <90%'}). Total interest: ₹${totalInterest.toLocaleString('en-IN')}. Note: Payment authorization requires corporate controller sign-off.`
    };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORPORATE FINANCE: GST INPUT TAX CREDIT APPORTIONMENT & REVERSAL
 * CGST Rules 2017: Rule 42 (Inputs & Services) & Rule 43 (Capital Goods)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements monthly common credit isolation (C2), exempt supply ratio (E/F),
 * non-business 5% apportionment (D2), eligible common credit (C3),
 * 60-month capital goods depreciation apportionment (Te), and annual true-up.
 */
export function calculateGstItcApportionmentRule42_43({
    taxPeriod = null,
    financialYear = '2025-26',
    // Rule 42 Inputs (Inputs & Input Services):
    totalInputTaxCreditT,
    exclusiveNonBusinessT1 = 0,
    exclusiveExemptT2 = 0,
    blockedSection17_5_T3 = 0,
    exclusiveTaxableT4 = 0,
    exemptTurnoverE = 0,
    totalTurnoverF = 0,
    // Rule 43 Inputs (Capital Goods):
    capitalGoodsCommonCreditA = 0,
    capitalGoodsPriorQuartersExempt = 0,
    // Annual True-Up Reconciliation parameters:
    isAnnualTrueUp = false,
    annualExemptTurnover = null,
    annualTotalTurnover = null,
    sumOfMonthlyReversalsD1 = 0,
    isRealEstateProject = false
}) {
    if (totalInputTaxCreditT === undefined || totalInputTaxCreditT === null) {
        return {
            status: 'INDETERMINATE',
            code: 'MISSING_TOTAL_ITC',
            statutoryDetermination: 'INDETERMINATE',
            message: 'Field "totalInputTaxCreditT" is required for GST Rule 42/43 apportionment.',
            netEligibleItc: null,
            totalReversal: null,
            isAuthorizedToDisburse: false
        };
    }

    const T = Number(totalInputTaxCreditT);
    const T1 = Math.max(0, Number(exclusiveNonBusinessT1 || 0));
    const T2 = Math.max(0, Number(exclusiveExemptT2 || 0));
    const T3 = Math.max(0, Number(blockedSection17_5_T3 || 0));
    const T4 = Math.max(0, Number(exclusiveTaxableT4 || 0));
    const E = Math.max(0, Number(exemptTurnoverE || 0));
    const F = Math.max(0, Number(totalTurnoverF || 0));

    if (isNaN(T) || T < 0 || !Number.isFinite(T)) {
        throw new Error('[@mudraforge/statutory] Invalid totalInputTaxCreditT: expected non-negative finite number.');
    }

    // Step 1: Ineligible credits under Rule 42(1)(a)-(c)
    const ineligibleDirect = roundToPaisa(T1 + T2 + T3);
    if (ineligibleDirect > T) {
        throw new Error(`[@mudraforge/statutory] Sum of direct ineligible credits (T1 + T2 + T3 = ₹${ineligibleDirect}) cannot exceed total ITC (T = ₹${T}).`);
    }

    // Step 2: C1 - Amount credited to Electronic Credit Ledger
    const C1 = roundToPaisa(T - ineligibleDirect);

    // Step 3: T4 - Exclusive taxable supplies
    if (T4 > C1) {
        throw new Error(`[@mudraforge/statutory] Exclusive taxable credit T4 (₹${T4}) cannot exceed available credit C1 (₹${C1}).`);
    }

    // Step 4: C2 - Common Input Credit
    const C2 = roundToPaisa(C1 - T4);

    // Step 5: D1 - Ineligible common credit attributable to exempt supplies
    // Formula: D1 = (E / F) * C2
    let exemptRatio = 0;
    let D1 = 0;
    let turnoverBasis = 'TAX_PERIOD_TURNOVER';

    if (C2 > 0) {
        if (F > 0) {
            exemptRatio = E / F;
            if (exemptRatio > 1) exemptRatio = 1; // Defensive cap: exempt cannot exceed total turnover
            D1 = roundToPaisa(C2 * exemptRatio);
        } else if (E === 0 && F === 0) {
            // No turnover in tax period; Rule 42 proviso: use last tax period with turnover
            turnoverBasis = 'ZERO_TURNOVER_DEFERRED_TO_PRECEDING_PERIOD';
            exemptRatio = 0;
            D1 = 0;
        } else {
            // E > 0 but F <= 0 (data anomaly)
            exemptRatio = 1.0;
            D1 = C2;
        }
    }

    // Step 6: D2 - Ineligible common credit attributable to non-business use (5% of C2)
    const D2 = C2 > 0 ? roundToPaisa(C2 * 0.05) : 0;

    // Step 7: C3 - Eligible common credit
    // Formula: C3 = C2 - (D1 + D2)
    const C3 = roundToPaisa(Math.max(0, C2 - (D1 + D2)));

    // Total Rule 42 reversal added to output tax liability:
    const rule42Reversal = roundToPaisa(D1 + D2);

    // Total net eligible input credit for the period (exclusive taxable T4 + eligible common C3):
    const netEligibleInputsItc = roundToPaisa(T4 + C3);

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 43: CAPITAL GOODS APPORTIONMENT
    // ═══════════════════════════════════════════════════════════════════════
    const rawA = Math.max(0, Number(capitalGoodsCommonCreditA || 0));
    const priorQ = Math.max(0, Number(capitalGoodsPriorQuartersExempt || 0));
    
    // If capital goods were used exclusively for exempt/non-business and converted to common,
    // reduce credit by 5% per quarter of prior usage
    const reductionFactor = Math.min(1.0, priorQ * 0.05);
    const effectiveA = roundToPaisa(rawA * (1 - reductionFactor));

    // Deemed useful life: 60 months (5 years)
    const DEEMED_USEFUL_LIFE_MONTHS = 60;
    const monthlyCapitalGoodsCreditTm = rawA > 0 ? roundToPaisa(effectiveA / DEEMED_USEFUL_LIFE_MONTHS) : 0;

    // Capital goods reversal for the month: Te = (E / F) * Tr
    let capitalGoodsReversalTe = 0;
    if (monthlyCapitalGoodsCreditTm > 0 && F > 0) {
        capitalGoodsReversalTe = roundToPaisa(monthlyCapitalGoodsCreditTm * exemptRatio);
    }

    const totalPeriodReversal = roundToPaisa(rule42Reversal + capitalGoodsReversalTe);
    const totalNetEligibleItc = roundToPaisa(netEligibleInputsItc + Math.max(0, monthlyCapitalGoodsCreditTm - capitalGoodsReversalTe));

    // ═══════════════════════════════════════════════════════════════════════
    // ANNUAL TRUE-UP RECONCILIATION (RULE 42(2) & 43(2))
    // ═══════════════════════════════════════════════════════════════════════
    let annualTrueUpDetails = null;
    if (isAnnualTrueUp && annualTotalTurnover !== null && annualExemptTurnover !== null) {
        const annualE = Math.max(0, Number(annualExemptTurnover || 0));
        const annualF = Math.max(0, Number(annualTotalTurnover || 0));
        const annualRatio = annualF > 0 ? (annualE / annualF) : 0;
        
        // Final annual D1 calculated on cumulative common credit C2
        const annualD1Final = roundToPaisa(C2 * annualRatio);
        const priorD1Claimed = Math.max(0, Number(sumOfMonthlyReversalsD1 || 0));
        const trueUpDifference = roundToPaisa(annualD1Final - priorD1Claimed);

        annualTrueUpDetails = {
            isAnnualTrueUp: true,
            financialYear,
            annualExemptTurnover: annualE,
            annualTotalTurnover: annualF,
            annualExemptRatio: Number(annualRatio.toFixed(6)),
            finalAnnualD1Inr: annualD1Final,
            sumOfMonthlyD1ReversalsClaimedInr: priorD1Claimed,
            differentialAdjustmentInr: trueUpDifference,
            adjustmentAction: trueUpDifference > 0 
                ? 'ADD_TO_OUTPUT_LIABILITY_WITH_SECTION_50_INTEREST' 
                : (trueUpDifference < 0 ? 'RECLAIM_AS_ELIGIBLE_ITC' : 'ZERO_DIFFERENTIAL_MATCHED'),
            statutoryFilingDeadlineNotice: isRealEstateProject
                ? 'Real estate project true-up governed by Annexure I/II of Notification 16/2019-CT.'
                : 'Annual adjustment due on or before filing return for month of September following FY end (or 30th November cutoff).'
        };
    }

    return {
        status: 'SUCCESS',
        statutoryDetermination: 'APPLICABLE',
        governingRules: 'CGST Rules 2017: Rule 42 (Inputs & Services) & Rule 43 (Capital Goods)',
        taxPeriod: taxPeriod || 'CURRENT_MONTH',
        financialYear,
        rule42InputsBreakdown: {
            totalItcT: T,
            directIneligible: {
                exclusiveNonBusinessT1: T1,
                exclusiveExemptT2: T2,
                blockedSection17_5_T3: T3,
                sumIneligible: ineligibleDirect
            },
            creditedToElectronicLedgerC1: C1,
            exclusiveTaxableT4: T4,
            commonCreditC2: C2,
            exemptTurnoverE: E,
            totalTurnoverF: F,
            exemptRatio: Number(exemptRatio.toFixed(6)),
            turnoverBasis,
            reversals: {
                ineligibleExemptCommonD1: D1,
                nonBusinessCommonD2: D2,
                totalRule42Reversal: rule42Reversal
            },
            eligibleCommonCreditC3: C3,
            netEligibleInputsItc
        },
        rule43CapitalGoodsBreakdown: {
            capitalGoodsCommonCreditA: rawA,
            deemedUsefulLifeMonths: DEEMED_USEFUL_LIFE_MONTHS,
            priorQuartersExempt: priorQ,
            reductionFactorAppliedPercent: reductionFactor * 100,
            effectiveCommonCredit: effectiveA,
            monthlyCreditTm: monthlyCapitalGoodsCreditTm,
            monthlyReversalTe: capitalGoodsReversalTe,
            eligibleCapitalGoodsCreditMonthly: Math.max(0, monthlyCapitalGoodsCreditTm - capitalGoodsReversalTe)
        },
        summary: {
            totalGrossItcT: T,
            totalDirectIneligible: ineligibleDirect,
            totalCommonCreditApportioned: C2,
            totalMonthlyReversalAddedToOutputLiability: totalPeriodReversal,
            netEligibleItcTotal: totalNetEligibleItc
        },
        annualTrueUp: annualTrueUpDetails,
        isAuthorizedToDisburse: false,
        statutoryRationale: `Rule 42 credited ₹${C1.toLocaleString('en-IN')} to ledger, identified ₹${C2.toLocaleString('en-IN')} common credit, and calculated ₹${rule42Reversal.toLocaleString('en-IN')} reversal (D1: ₹${D1}, D2: ₹${D2}). Rule 43 capital goods reversal: ₹${capitalGoodsReversalTe.toLocaleString('en-IN')}. Net eligible ITC: ₹${totalNetEligibleItc.toLocaleString('en-IN')}. Reversal must be added to GSTR-3B Table 4(B).`
    };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORPORATE FINANCE: MSME REPORTING & SCHEDULE III PAYABLE AGING
 * MCA Order 22.01.2019 (Form MSME-1) & Companies Act 2013 Schedule III
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Strictly separates:
 * 1. Accounting Age: Days from invoice date to reporting date (Schedule III brackets).
 * 2. Statutory Overdue Status: Days past Section 15 statutory due date (Appointed Day).
 * 3. MCA Form MSME-1: Bi-annual filing of Micro/Small dues exceeding 45 days.
 */
export function generateMsme1AndScheduleThreeAging({
    asOfDate = new Date().toISOString().slice(0, 10),
    halfYearPeriod = null, // 'APRIL_TO_SEPTEMBER' | 'OCTOBER_TO_MARCH'
    payables = []
}) {
    if (!Array.isArray(payables)) {
        throw new Error('[@mudraforge/statutory] Invalid payables: expected an array of payable records.');
    }

    const dAsOf = new Date(String(asOfDate).slice(0, 10) + 'T00:00:00.000Z');
    if (isNaN(dAsOf.getTime())) {
        throw new Error(`[@mudraforge/statutory] Invalid asOfDate format "${asOfDate}". Expected YYYY-MM-DD.`);
    }

    // Schedule III 4-Tier Accumulators
    const agingMatrix = {
        msmeUndisputed: { lessThan1Year: 0, oneToTwoYears: 0, twoToThreeYears: 0, moreThan3Years: 0, total: 0 },
        msmeDisputed:   { lessThan1Year: 0, oneToTwoYears: 0, twoToThreeYears: 0, moreThan3Years: 0, total: 0 },
        othersUndisputed: { lessThan1Year: 0, oneToTwoYears: 0, twoToThreeYears: 0, moreThan3Years: 0, total: 0 },
        othersDisputed:   { lessThan1Year: 0, oneToTwoYears: 0, twoToThreeYears: 0, moreThan3Years: 0, total: 0 },
        unbilledDues: 0,
        grandTotalTradePayables: 0
    };

    const msme1ReportableList = [];
    const assessedPayables = [];

    for (const item of payables) {
        const amount = Math.max(0, Number(item.amount || item.invoiceAmount || 0));
        if (amount === 0) continue;

        const isUnbilled = item.isUnbilled === true;
        if (isUnbilled) {
            agingMatrix.unbilledDues = roundToPaisa(agingMatrix.unbilledDues + amount);
            agingMatrix.grandTotalTradePayables = roundToPaisa(agingMatrix.grandTotalTradePayables + amount);
            assessedPayables.push({
                invoiceNumber: item.invoiceNumber || 'UNBILLED',
                supplierName: item.supplierName || 'N/A',
                amount,
                isUnbilled: true,
                accountingAgeDays: 0,
                statutoryOverdueDays: 0,
                msme1Reportable: false
            });
            continue;
        }

        // 1. ACCOUNTING AGE (Schedule III): Days from invoice date to asOfDate
        const invDateStr = item.invoiceDate ? String(item.invoiceDate).slice(0, 10) : asOfDate;
        const dInvoice = new Date(invDateStr + 'T00:00:00.000Z');
        const accountingAgeDays = Math.max(0, Math.round((dAsOf.getTime() - dInvoice.getTime()) / 86400000));

        // Enterprise Classification: Micro vs Small vs Medium vs Others
        // Trader exclusion: Retail & Wholesale Trade (NIC 45/46/47) are NOT eligible for MSMED Chapter V / MSME-1
        const nic = String(item.nicCode || item.vendorNicCode || '').trim();
        const isTrader = item.isTrader === true || /^(45|46|47)/.test(nic);
        const isMicroOrSmall = (item.isMicro === true || item.isSmall === true || item.enterpriseType === 'MICRO' || item.enterpriseType === 'SMALL') && !isTrader;
        const isMsme = (isMicroOrSmall || item.isMedium === true || item.enterpriseType === 'MEDIUM') && !isTrader;
        const isDisputed = item.isDisputed === true || Boolean(item.writtenObjectionDate);

        // Map to Schedule III aging bucket
        let bracket = 'lessThan1Year';
        if (accountingAgeDays > 1095) {
            bracket = 'moreThan3Years'; // > 3 years
        } else if (accountingAgeDays > 730) {
            bracket = 'twoToThreeYears'; // 2–3 years
        } else if (accountingAgeDays > 365) {
            bracket = 'oneToTwoYears'; // 1–2 years
        }

        // Accumulate into Schedule III matrix
        let targetCategory;
        if (isMsme) {
            targetCategory = isDisputed ? agingMatrix.msmeDisputed : agingMatrix.msmeUndisputed;
        } else {
            targetCategory = isDisputed ? agingMatrix.othersDisputed : agingMatrix.othersUndisputed;
        }
        targetCategory[bracket] = roundToPaisa(targetCategory[bracket] + amount);
        targetCategory.total = roundToPaisa(targetCategory.total + amount);
        agingMatrix.grandTotalTradePayables = roundToPaisa(agingMatrix.grandTotalTradePayables + amount);

        // 2. STATUTORY OVERDUE STATUS (Section 15 MSMED Act)
        // Statutory due date: 15 days without written agreement; maximum 45 days with written agreement.
        // Day of acceptance: If delivery objection occurred within 15 days, acceptance is date objection removed.
        const deliveryStr = item.deliveryDate ? String(item.deliveryDate).slice(0, 10) : invDateStr;
        const dDelivery = new Date(deliveryStr + 'T00:00:00.000Z');
        
        let dAcceptance = dDelivery;
        let isDisputePaused = false;

        if (item.writtenObjectionDate) {
            const dObj = new Date(String(item.writtenObjectionDate).slice(0, 10) + 'T00:00:00.000Z');
            const objectionDays = Math.round((dObj.getTime() - dDelivery.getTime()) / 86400000);
            if (objectionDays <= 15) {
                if (item.objectionRemovalDate) {
                    dAcceptance = new Date(String(item.objectionRemovalDate).slice(0, 10) + 'T00:00:00.000Z');
                } else {
                    isDisputePaused = true; // Objection active and uncured
                }
            }
        }

        const hasAgreement = item.hasWrittenAgreement === true || Boolean(item.agreedPaymentDate);
        const maxDaysAllowed = hasAgreement ? 45 : 15;
        const dStatutoryDue = new Date(dAcceptance.getTime() + maxDaysAllowed * 86400000);

        let statutoryOverdueDays = 0;
        let isStatutoryOverdue = false;

        if (!isDisputePaused && dAsOf > dStatutoryDue) {
            statutoryOverdueDays = Math.round((dAsOf.getTime() - dStatutoryDue.getTime()) / 86400000);
            isStatutoryOverdue = statutoryOverdueDays > 0;
        }

        // 3. FORM MSME-1 REPORTABLE CRITERIA:
        // Must be Micro or Small enterprise (excluding traders) AND
        // Payment must exceed 45 days from date of acceptance/deemed acceptance AND
        // Outstanding as of half-year end.
        const daysFromAcceptance = isDisputePaused ? 0 : Math.round((dAsOf.getTime() - dAcceptance.getTime()) / 86400000);
        const isMsme1Reportable = isMicroOrSmall && !isDisputePaused && daysFromAcceptance > 45;

        if (isMsme1Reportable) {
            msme1ReportableList.push({
                supplierName: item.supplierName || 'Unknown Vendor',
                supplierPan: item.supplierPan || item.pan || 'PAN_NOT_PROVIDED',
                udyamRegistrationNumber: item.udyamRegistrationNumber || item.udyamRegNo || 'UDYAM_NOT_PROVIDED',
                invoiceNumber: item.invoiceNumber || 'INV_REF',
                invoiceDate: invDateStr,
                acceptanceDate: dAcceptance.toISOString().slice(0, 10),
                amountDueInr: amount,
                accountingAgeDays,
                statutoryOverdueDays,
                daysFromAcceptance,
                reasonForDelay: item.reasonForDelay || 'Operational billing reconciliation'
            });
        }

        assessedPayables.push({
            invoiceNumber: item.invoiceNumber || 'INV_REF',
            supplierName: item.supplierName || 'Unknown Vendor',
            amount,
            accountingAgeDays,
            accountingAgeBracket: bracket,
            isMicroOrSmall,
            isTrader,
            isDisputePaused,
            statutoryDueDate: isDisputePaused ? null : dStatutoryDue.toISOString().slice(0, 10),
            statutoryOverdueDays,
            isStatutoryOverdue,
            msme1Reportable: isMsme1Reportable
        });
    }

    const totalMsme1ReportableAmount = roundToPaisa(msme1ReportableList.reduce((sum, x) => sum + x.amountDueInr, 0));

    return {
        status: 'SUCCESS',
        statutoryDetermination: 'APPLICABLE',
        governingLaw: 'Companies Act, 2013 Schedule III & MCA Order 22.01.2019 (Form MSME-1)',
        asOfDate,
        halfYearPeriod: halfYearPeriod || (dAsOf.getUTCMonth() >= 3 && dAsOf.getUTCMonth() <= 8 ? 'APRIL_TO_SEPTEMBER' : 'OCTOBER_TO_MARCH'),
        totalInvoicesEvaluated: payables.length,
        scheduleThreeAgingMatrix: agingMatrix,
        mcaFormMsme1: {
            reportableVendorsCount: msme1ReportableList.length,
            totalReportableAmountInr: totalMsme1ReportableAmount,
            filingDeadline: halfYearPeriod === 'APRIL_TO_SEPTEMBER' || (dAsOf.getUTCMonth() >= 3 && dAsOf.getUTCMonth() <= 8) ? 'October 31' : 'April 30',
            reportablePayables: msme1ReportableList
        },
        assessedPayablesSummary: {
            totalPayablesCount: assessedPayables.length,
            statutoryOverdueCount: assessedPayables.filter(x => x.isStatutoryOverdue).length,
            disputePausedCount: assessedPayables.filter(x => x.isDisputePaused).length
        },
        isAuthorizedToDisburse: false,
        statutoryRationale: `Schedule III Trade Payables total: ₹${agingMatrix.grandTotalTradePayables.toLocaleString('en-IN')}. MCA Form MSME-1 identified ${msme1ReportableList.length} overdue Micro/Small items exceeding 45 days (₹${totalMsme1ReportableAmount.toLocaleString('en-IN')}). Accounting age is segregated from statutory overdue days.`
    };
}

/**
 * -----------------------------------------------------------------------------
 * 28. CORPORATE TAX: MAT (SECTION 115JB) VS CONCESSIONAL REGIME (SECTION 115BAA)
 * -----------------------------------------------------------------------------
 * Computes comparative corporate tax liability across:
 * 1. Normal Provisions: 25% (turnover <= 400Cr) or 30% (> 400Cr) + surcharge + cess.
 * 2. Section 115JB MAT: 15% on Adjusted Book Profit + surcharge + cess.
 * 3. Section 115JAA MAT Credit: Set-off against normal tax or newly generated.
 * 4. Section 115BAA Concessional Regime: Flat 22% + 10% surcharge + 4% cess = 25.168% effective.
 *    Exempt from Section 115JB MAT u/s 115JB(5A). Forfeits accumulated MAT credit.
 */
export function calculateCorporateTaxMatVsConcessional({
    financialYear = '2025-26',
    assessmentYear = null,
    turnoverPrecedingFyInr = 0,
    netProfitBeforeTaxInr = 0,
    normalTaxAdditionsInr = 0,
    normalTaxDeductionsInr = 0,
    accumulatedMatCreditInr = 0,
    bookProfitAdjustments = null,
    adjustedBookProfitInr = null,
    optedSection115BAA = null
}) {
    const fy = financialYear || '2025-26';
    const ay = assessmentYear || (fy === '2025-26' ? '2026-27' : '2027-28');
    const turnover = Number(turnoverPrecedingFyInr) || 0;
    const npbt = Number(netProfitBeforeTaxInr) || 0;
    const additions = Number(normalTaxAdditionsInr) || 0;
    const deductions = Number(normalTaxDeductionsInr) || 0;
    const priorMatCredit = Number(accumulatedMatCreditInr) || 0;

    // A. Normal Corporate Tax Regime
    const taxableIncomeNormal = Math.max(0, roundToPaisa(npbt + additions - deductions));
    const baseRateNormal = turnover <= 4000000000 ? 0.25 : 0.30;
    const baseTaxNormal = roundToPaisa(taxableIncomeNormal * baseRateNormal);

    let surchargeRateNormal = 0;
    if (taxableIncomeNormal > 100000000) {
        surchargeRateNormal = 0.12;
    } else if (taxableIncomeNormal > 10000000) {
        surchargeRateNormal = 0.07;
    }
    const surchargeNormal = roundToPaisa(baseTaxNormal * surchargeRateNormal);
    const cessNormal = roundToPaisa((baseTaxNormal + surchargeNormal) * 0.04);
    const grossNormalTax = roundToPaisa(baseTaxNormal + surchargeNormal + cessNormal);

    // B. Minimum Alternate Tax (Section 115JB)
    let adjBookProfit = 0;
    if (adjustedBookProfitInr !== null && adjustedBookProfitInr !== undefined) {
        adjBookProfit = Math.max(0, Number(adjustedBookProfitInr) || 0);
    } else if (bookProfitAdjustments && typeof bookProfitAdjustments === 'object') {
        const bpAdditions = (Number(bookProfitAdjustments.incomeTaxProvision) || 0) +
            (Number(bookProfitAdjustments.reservesTransfer) || 0) +
            (Number(bookProfitAdjustments.contingentLiabilities) || 0) +
            (Number(bookProfitAdjustments.diminutionInAssetValue) || 0) +
            (Number(bookProfitAdjustments.exemptIncomeExpenses) || 0);
        const bfLoss = Number(bookProfitAdjustments.broughtForwardLoss) || 0;
        const unabsDep = Number(bookProfitAdjustments.unabsorbedDepreciation) || 0;
        const lossDepDeduction = (bfLoss > 0 && unabsDep > 0) ? Math.min(bfLoss, unabsDep) : Math.max(bfLoss, unabsDep);
        const bpDeductions = lossDepDeduction + (Number(bookProfitAdjustments.exemptIncome) || 0);
        adjBookProfit = Math.max(0, roundToPaisa(npbt + bpAdditions - bpDeductions));
    } else {
        adjBookProfit = npbt;
    }

    const baseMatRate = 0.15;
    const baseMatTax = roundToPaisa(adjBookProfit * baseMatRate);
    let surchargeRateMat = 0;
    if (adjBookProfit > 100000000) {
        surchargeRateMat = 0.12;
    } else if (adjBookProfit > 10000000) {
        surchargeRateMat = 0.07;
    }
    const surchargeMat = roundToPaisa(baseMatTax * surchargeRateMat);
    const cessMat = roundToPaisa((baseMatTax + surchargeMat) * 0.04);
    const grossMatTax = roundToPaisa(baseMatTax + surchargeMat + cessMat);

    // C. Old Regime Set-off & MAT Credit Determination (Section 115JAA)
    let matCreditUtilized = 0;
    let newMatCreditGenerated = 0;
    let netNormalTaxPayable = grossNormalTax;
    let taxPayableOldRegime = 0;

    if (grossMatTax > grossNormalTax) {
        taxPayableOldRegime = grossMatTax;
        newMatCreditGenerated = roundToPaisa(grossMatTax - grossNormalTax);
    } else {
        const maxCreditAllowable = roundToPaisa(grossNormalTax - grossMatTax);
        matCreditUtilized = Math.min(priorMatCredit, maxCreditAllowable);
        netNormalTaxPayable = roundToPaisa(grossNormalTax - matCreditUtilized);
        taxPayableOldRegime = netNormalTaxPayable;
    }
    const closingMatCreditOldRegime = roundToPaisa(priorMatCredit - matCreditUtilized + newMatCreditGenerated);

    // D. Section 115BAA Concessional Regime
    const taxableIncome115BAA = Math.max(0, roundToPaisa(npbt + additions));
    const baseRate115BAA = 0.22;
    const baseTax115BAA = roundToPaisa(taxableIncome115BAA * baseRate115BAA);
    const surcharge115BAA = roundToPaisa(baseTax115BAA * 0.10); // Flat 10% surcharge u/s 115BAA(1) proviso
    const cess115BAA = roundToPaisa((baseTax115BAA + surcharge115BAA) * 0.04);
    const totalTax115BAA = roundToPaisa(baseTax115BAA + surcharge115BAA + cess115BAA);

    // Under Section 115JB(5A), MAT does not apply to 115BAA companies
    // Under Section 115JAA, accumulated MAT credit cannot be utilized and is forfeited
    const forfeitedMatCredit115BAA = priorMatCredit;

    // E. Strategic Comparative Recommendation
    let recommendedRegime = 'SECTION_115BAA';
    let recommendationRationale = '';
    let netCashSavingsInr = 0;

    if (optedSection115BAA === true) {
        recommendedRegime = 'SECTION_115BAA';
        netCashSavingsInr = roundToPaisa(taxPayableOldRegime - totalTax115BAA);
        recommendationRationale = `Assessee has explicitly opted for Section 115BAA (25.168% effective rate). Section 115JB MAT is inapplicable u/s 115JB(5A). Accumulated MAT credit of INR ${forfeitedMatCredit115BAA.toLocaleString('en-IN')} is forfeited.`;
    } else if (optedSection115BAA === false) {
        recommendedRegime = 'OLD_REGIME';
        netCashSavingsInr = roundToPaisa(totalTax115BAA - taxPayableOldRegime);
        recommendationRationale = `Assessee remains under Old Regime. Applicable tax is INR ${taxPayableOldRegime.toLocaleString('en-IN')} (Normal Tax: INR ${grossNormalTax.toLocaleString('en-IN')}, MAT: INR ${grossMatTax.toLocaleString('en-IN')}). Closing MAT credit balance: INR ${closingMatCreditOldRegime.toLocaleString('en-IN')}.`;
    } else {
        if (taxPayableOldRegime < totalTax115BAA) {
            recommendedRegime = 'OLD_REGIME';
            netCashSavingsInr = roundToPaisa(totalTax115BAA - taxPayableOldRegime);
            recommendationRationale = `Old Regime is optimal for FY ${fy}: Net cash outflow is INR ${taxPayableOldRegime.toLocaleString('en-IN')} vs INR ${totalTax115BAA.toLocaleString('en-IN')} under Section 115BAA (Net saving: INR ${netCashSavingsInr.toLocaleString('en-IN')}). Utilizing MAT credit or Chapter VI-A deductions yields lower current cash drain.`;
        } else {
            recommendedRegime = 'SECTION_115BAA';
            netCashSavingsInr = roundToPaisa(taxPayableOldRegime - totalTax115BAA);
            recommendationRationale = `Section 115BAA is optimal for FY ${fy}: Net tax payable is INR ${totalTax115BAA.toLocaleString('en-IN')} vs INR ${taxPayableOldRegime.toLocaleString('en-IN')} under Old Regime (Net saving: INR ${netCashSavingsInr.toLocaleString('en-IN')}). Form 10-IC must be filed before the due date u/s 139(1). Note: INR ${forfeitedMatCredit115BAA.toLocaleString('en-IN')} in accumulated MAT credit will lapse.`;
        }
    }

    return {
        status: 'SUCCESS',
        statutoryDetermination: 'APPLICABLE',
        governingLaw: 'Income-tax Act, 1961 Sections 115BAA, 115JB & 115JAA',
        financialYear: fy,
        assessmentYear: ay,
        taxableIncomeNormalInr: taxableIncomeNormal,
        adjustedBookProfitInr: adjBookProfit,
        normalTaxRegime: {
            turnoverPrecedingFyInr: turnover,
            baseTaxRate: baseRateNormal,
            baseTaxInr: baseTaxNormal,
            surchargeRate: surchargeRateNormal,
            surchargeInr: surchargeNormal,
            cessInr: cessNormal,
            grossNormalTaxInr: grossNormalTax,
            effectiveRate: taxableIncomeNormal > 0 ? roundToPaisa((grossNormalTax / taxableIncomeNormal) * 100) : 0
        },
        minimumAlternateTaxSec115JB: {
            baseMatRate: baseMatRate,
            baseMatTaxInr: baseMatTax,
            surchargeRate: surchargeRateMat,
            surchargeInr: surchargeMat,
            cessInr: cessMat,
            grossMatTaxInr: grossMatTax,
            effectiveMatRate: adjBookProfit > 0 ? roundToPaisa((grossMatTax / adjBookProfit) * 100) : 0
        },
        matCreditScheduleSec115JAA: {
            openingMatCreditInr: priorMatCredit,
            matCreditUtilizedInr: matCreditUtilized,
            newMatCreditGeneratedInr: newMatCreditGenerated,
            closingMatCreditInr: closingMatCreditOldRegime,
            expiryYears: '15 Assessment Years'
        },
        concessionalRegimeSec115BAA: {
            taxableIncomeInr: taxableIncome115BAA,
            baseTaxRate: 0.22,
            baseTaxInr: baseTax115BAA,
            surchargeRate: 0.10,
            surchargeInr: surcharge115BAA,
            cessInr: cess115BAA,
            totalTaxInr: totalTax115BAA,
            effectiveRate: 25.168,
            matApplicable: false,
            matExemptionClause: 'Section 115JB(5A)',
            forfeitedMatCreditInr: forfeitedMatCredit115BAA
        },
        comparisonSummary: {
            cashOutflowOldRegimeInr: taxPayableOldRegime,
            cashOutflowSection115BAAInr: totalTax115BAA,
            recommendedRegime,
            netCashSavingsInr,
            form10IcRequired: recommendedRegime === 'SECTION_115BAA'
        },
        isAuthorizedToDisburse: false,
        statutoryRationale: recommendationRationale,
        citations: [
            'Income-tax Act, 1961 Section 115BAA (Tax on income of certain domestic companies)',
            'Income-tax Act, 1961 Section 115JB (Special provision for payment of tax by certain companies)',
            'Income-tax Act, 1961 Section 115JB(5A) (Non-applicability of MAT to Section 115BAA)',
            'Income-tax Act, 1961 Section 115JAA (Tax credit in respect of tax paid on deemed income)'
        ]
    };
}

/**
 * -----------------------------------------------------------------------------
 * 29. PLACE OF SUPPLY (POS) & ZERO-RATED EXPORT UNDER LUT (IGST ACT SECTIONS 10, 12, 16)
 * -----------------------------------------------------------------------------
 * Evaluates:
 * 1. Domestic B2B / B2C POS (Sec 10 for Goods, Sec 12 for Services).
 * 2. Intra-State (CGST + SGST) vs Inter-State (IGST) classification.
 * 3. Export of Services under Section 16 & Section 2(6) cumulative 5 conditions.
 * 4. Letter of Undertaking (LUT) zero-rate export vs tax payment refund.
 */
export function evaluatePlaceOfSupplyAndLut({
    transactionType = 'DOMESTIC_SERVICES',
    supplierStateCode = null,
    supplierGstin = null,
    recipientStateCode = null,
    recipientGstin = null,
    recipientCountryCode = 'IN',
    invoiceAmountInr = 0,
    gstRate = 0.18,
    isB2B = true,
    placeOfSupplyStateCode = null,
    immovablePropertyLocationStateCode = null,
    isSupplierInIndia = true,
    isRecipientOutsideIndia = null,
    isPlaceOfSupplyOutsideIndia = null,
    isConvertibleForexReceivedOrRbiInr = null,
    isDistinctPersonEstablishment = false,
    isIntermediaryService = false,
    hasValidLut = false,
    lutArn = null
}) {
    const amount = Number(invoiceAmountInr) || 0;
    const rate = Number(gstRate) || 0.18;
    const isTransExport = transactionType === 'EXPORT_SERVICES' || transactionType === 'EXPORT_GOODS' || (recipientCountryCode && recipientCountryCode.toUpperCase() !== 'IN');

    // Extract state codes
    let supState = supplierStateCode;
    if (!supState && supplierGstin && typeof supplierGstin === 'string' && supplierGstin.length >= 2) {
        supState = supplierGstin.slice(0, 2);
    }
    let recState = recipientStateCode;
    if (!recState && recipientGstin && typeof recipientGstin === 'string' && recipientGstin.length >= 2) {
        recState = recipientGstin.slice(0, 2);
    }

    if (isTransExport) {
        // Evaluate Section 2(6) 5 Cumulative Conditions for Export of Services
        const cond1SupplierInIndia = isSupplierInIndia === true;
        const cond2RecipientOutsideIndia = recipientCountryCode.toUpperCase() !== 'IN' && (isRecipientOutsideIndia === null || isRecipientOutsideIndia === true);
        // Intermediary services under Section 13(8)(b) have POS at supplier location in India!
        const cond3PosOutsideIndia = !isIntermediaryService && (isPlaceOfSupplyOutsideIndia === null || isPlaceOfSupplyOutsideIndia === true);
        const cond4ForexReceived = isConvertibleForexReceivedOrRbiInr === true;
        const cond5NotDistinctPersons = isDistinctPersonEstablishment === false;

        const conditionAudit = [
            { condition: '1. Supplier located in India (Sec 2(6)(i))', status: cond1SupplierInIndia ? 'PASS' : 'FAIL' },
            { condition: '2. Recipient located outside India (Sec 2(6)(ii))', status: cond2RecipientOutsideIndia ? 'PASS' : 'FAIL' },
            { condition: '3. Place of supply outside India (Sec 2(6)(iii) & Sec 13)', status: cond3PosOutsideIndia ? 'PASS' : (isIntermediaryService ? 'FAIL_INTERMEDIARY_SEC_13_8_B' : 'FAIL') },
            { condition: '4. Convertible forex / RBI permitted INR received (Sec 2(6)(iv))', status: cond4ForexReceived ? 'PASS' : 'FAIL_NO_FIRC_EBRC' },
            { condition: '5. Not merely establishments of distinct persons (Sec 2(6)(v))', status: cond5NotDistinctPersons ? 'PASS' : 'FAIL_DISTINCT_PERSON_BRANCH' }
        ];

        const isFullyQualifiedExport = cond1SupplierInIndia && cond2RecipientOutsideIndia && cond3PosOutsideIndia && cond4ForexReceived && cond5NotDistinctPersons;

        if (isFullyQualifiedExport) {
            if (hasValidLut) {
                return {
                    status: 'SUCCESS',
                    statutoryDetermination: 'ZERO_RATED_EXPORT_UNDER_LUT',
                    governingLaw: 'IGST Act, 2017 Sections 2(6), 16(1)(a) & 16(3)(a); CGST Rules, 2017 Rule 96A',
                    transactionType: 'EXPORT_SERVICES',
                    invoiceAmountInr: amount,
                    gstRate: 0,
                    igstPayableInr: 0,
                    cgstPayableInr: 0,
                    sgstPayableInr: 0,
                    lutArn: lutArn || 'LUT_ARN_ACTIVE_ON_RECORD',
                    isZeroRated: true,
                    itcRefundEligible: true,
                    reportingTable: 'GSTR-1 Table 6A (Export without payment of tax)',
                    conditionAudit,
                    isAuthorizedToDisburse: false,
                    statutoryRationale: `Zero-Rated Export of Services under LUT: All 5 conditions of Section 2(6) IGST Act verified. Export proceeds in convertible foreign exchange/RBI INR confirmed. Supply is zero-rated at 0% IGST under valid LUT ARN ${lutArn || 'ACTIVE'}. Accumulated unutilized ITC is eligible for refund under Section 54(3).`
                };
            } else {
                const igstTax = roundToPaisa(amount * rate);
                return {
                    status: 'SUCCESS',
                    statutoryDetermination: 'ZERO_RATED_EXPORT_WITH_TAX_PAYMENT',
                    governingLaw: 'IGST Act, 2017 Sections 2(6), 16(1)(a) & 16(3)(b); CGST Act Section 54',
                    transactionType: 'EXPORT_SERVICES',
                    invoiceAmountInr: amount,
                    gstRate: rate,
                    igstPayableInr: igstTax,
                    cgstPayableInr: 0,
                    sgstPayableInr: 0,
                    isZeroRated: true,
                    itcRefundEligible: true,
                    reportingTable: 'GSTR-1 Table 6A (Export with payment of tax)',
                    conditionAudit,
                    isAuthorizedToDisburse: false,
                    statutoryRationale: `Zero-Rated Export with payment of tax: All 5 conditions of Section 2(6) satisfied, but no valid LUT on record. IGST of INR ${igstTax.toLocaleString('en-IN')} (at ${(rate * 100)}%) is charged and eligible for refund under Section 54(1).`
                };
            }
        } else {
            const igstTax = roundToPaisa(amount * rate);
            const failedReasons = conditionAudit.filter(c => c.status !== 'PASS').map(c => c.condition);
            return {
                status: 'SUCCESS',
                statutoryDetermination: 'DISQUALIFIED_FROM_ZERO_RATING',
                governingLaw: 'IGST Act, 2017 Sections 2(6), 7(5)(a) & 13',
                transactionType: 'DISQUALIFIED_EXPORT_SERVICES',
                invoiceAmountInr: amount,
                gstRate: rate,
                igstPayableInr: igstTax,
                cgstPayableInr: 0,
                sgstPayableInr: 0,
                isZeroRated: false,
                itcRefundEligible: false,
                disqualificationReasons: failedReasons,
                conditionAudit,
                isAuthorizedToDisburse: false,
                statutoryRationale: `Disqualified from Zero-Rated Export: Supply failed statutory condition(s): ${failedReasons.join('; ')}. Treated as standard domestic inter-state supply to foreign person subject to standard ${(rate * 100)}% IGST (INR ${igstTax.toLocaleString('en-IN')}).`
            };
        }
    }

    // Domestic Transaction Place of Supply Determination
    let posState = placeOfSupplyStateCode;
    let posLegalRule = '';

    if (immovablePropertyLocationStateCode) {
        posState = immovablePropertyLocationStateCode;
        posLegalRule = 'IGST Act Section 12(3) (Directly related to immovable property - location of property)';
    } else if (transactionType === 'DOMESTIC_GOODS') {
        posState = posState || recState || supState;
        posLegalRule = 'IGST Act Section 10(1)(a) (Location of goods at termination of delivery)';
    } else {
        if (isB2B && recState) {
            posState = recState;
            posLegalRule = 'IGST Act Section 12(2)(a) (B2B supply - location of registered recipient)';
        } else if (recState) {
            posState = recState;
            posLegalRule = 'IGST Act Section 12(2)(b) (B2C supply with address on record)';
        } else {
            posState = supState;
            posLegalRule = 'IGST Act Section 12(2)(b) proviso (B2C supply without address - location of supplier)';
        }
    }

    const isIntraState = supState && posState && (supState === posState);
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    let cgstAmountInr = 0, sgstAmountInr = 0, igstAmountInr = 0;

    if (isIntraState) {
        cgstRate = rate / 2;
        sgstRate = rate / 2;
        cgstAmountInr = roundToPaisa(amount * cgstRate);
        sgstAmountInr = roundToPaisa(amount * sgstRate);
    } else {
        igstRate = rate;
        igstAmountInr = roundToPaisa(amount * igstRate);
    }
    const totalGstInr = roundToPaisa(cgstAmountInr + sgstAmountInr + igstAmountInr);

    return {
        status: 'SUCCESS',
        statutoryDetermination: isIntraState ? 'INTRA_STATE_SUPPLY' : 'INTER_STATE_SUPPLY',
        governingLaw: isIntraState ? 'CGST Act Section 9 & SGST Act Section 9' : 'IGST Act Section 5 & Section 7',
        posLegalRule,
        supplierStateCode: supState,
        placeOfSupplyStateCode: posState,
        recipientStateCode: recState,
        invoiceAmountInr: amount,
        supplyNature: isIntraState ? 'INTRA_STATE' : 'INTER_STATE',
        taxBreakdown: {
            cgstRate,
            cgstAmountInr,
            sgstRate,
            sgstAmountInr,
            igstRate,
            igstAmountInr,
            totalGstAmountInr: totalGstInr
        },
        isAuthorizedToDisburse: false,
        statutoryRationale: isIntraState
            ? `Intra-State Supply: Supplier state (${supState}) matches Place of Supply (${posState}). CGST (${(cgstRate * 100)}%: INR ${cgstAmountInr.toLocaleString('en-IN')}) and SGST (${(sgstRate * 100)}%: INR ${sgstAmountInr.toLocaleString('en-IN')}) levied under Section 9.`
            : `Inter-State Supply: Supplier state (${supState}) differs from Place of Supply (${posState}). IGST (${(igstRate * 100)}%: INR ${igstAmountInr.toLocaleString('en-IN')}) levied under Section 5 of IGST Act.`
    };
}

/**
 * -----------------------------------------------------------------------------
 * 30. TRANSFER PRICING ARM'S LENGTH PRICE (ALP) ENGINE (SECTION 92C & RULE 10CA)
 * -----------------------------------------------------------------------------
 * Computes Transfer Pricing compliance:
 * 1. Associated Enterprise (AE) transaction validation under Section 92A.
 * 2. 3% tolerance band for wholesale traders vs 1% for other businesses (proviso to Sec 92C(2)).
 * 3. Rule 10CA Percentile Range: 35th to 65th percentile dataset evaluation for >= 6 comparables.
 * 4. Rule 10CA(7) Median (50th percentile) primary adjustment if tested margin is outside range.
 * 5. Section 92CE Secondary Adjustment threshold warning (> 1 Cr).
 */
export function calculateTransferPricingAlp({
    transactionDescription = 'International Transaction with Associated Enterprise',
    testedParty = 'Indian Enterprise',
    associatedEnterpriseName = 'Foreign AE',
    isAssociatedEnterprise = true,
    internationalTransactionAmountInr = 0,
    testedPartyOperatingMarginPercent = 0,
    isWholesaleTrading = false,
    comparablesData = [],
    transferPricingMethod = 'TNMM'
}) {
    const amount = Number(internationalTransactionAmountInr) || 0;
    const testedMargin = Number(testedPartyOperatingMarginPercent) || 0;
    const tolerancePercent = isWholesaleTrading ? 3.0 : 1.0;

    if (!isAssociatedEnterprise) {
        return {
            status: 'SUCCESS',
            statutoryDetermination: 'NOT_APPLICABLE',
            governingLaw: 'Income-tax Act, 1961 Section 92A & 92C',
            transactionDescription,
            isAssociatedEnterprise: false,
            statutoryRationale: 'Counterparty is not an Associated Enterprise under Section 92A. Transfer Pricing provisions u/s 92C do not apply to third-party transactions.',
            isAuthorizedToDisburse: false
        };
    }

    const comparables = Array.isArray(comparablesData)
        ? comparablesData.map(x => Number(typeof x === 'object' && x !== null ? (x.operatingMargin || x.margin || 0) : x)).filter(x => !isNaN(x)).sort((a, b) => a - b)
        : [];

    let isArmLengthCompliant = false;
    let primaryAdjustmentInr = 0;
    let percentile35 = null;
    let percentile65 = null;
    let median50 = null;
    let arithmeticMean = null;
    let appliedRule = '';

    if (comparables.length >= 6) {
        appliedRule = 'Rule 10CA Percentile Range (Dataset >= 6 Comparables)';
        const n = comparables.length;

        const getPercentileValue = (p) => {
            const index = (n * p);
            if (Number.isInteger(index)) {
                const i = index - 1;
                return (comparables[i] + comparables[Math.min(i + 1, n - 1)]) / 2;
            } else {
                const i = Math.floor(index);
                return comparables[Math.min(i, n - 1)];
            }
        };

        percentile35 = roundToPaisa(getPercentileValue(0.35));
        percentile65 = roundToPaisa(getPercentileValue(0.65));
        median50 = roundToPaisa(getPercentileValue(0.50));

        if (testedMargin >= percentile35 && testedMargin <= percentile65) {
            isArmLengthCompliant = true;
            primaryAdjustmentInr = 0;
        } else if (testedMargin > percentile65) {
            isArmLengthCompliant = true;
            primaryAdjustmentInr = 0;
        } else {
            isArmLengthCompliant = false;
            const marginShortfall = roundToPaisa(median50 - testedMargin);
            primaryAdjustmentInr = roundToPaisa(amount * (marginShortfall / 100));
        }
    } else if (comparables.length > 0) {
        appliedRule = 'Proviso to Section 92C(2) Arithmetic Mean & Tolerance Band (< 6 Comparables)';
        arithmeticMean = roundToPaisa(comparables.reduce((sum, x) => sum + x, 0) / comparables.length);
        const variationPercent = Math.abs(testedMargin - arithmeticMean);

        if (variationPercent <= tolerancePercent || testedMargin >= arithmeticMean) {
            isArmLengthCompliant = true;
            primaryAdjustmentInr = 0;
        } else {
            isArmLengthCompliant = false;
            const marginShortfall = roundToPaisa(arithmeticMean - testedMargin);
            primaryAdjustmentInr = roundToPaisa(amount * (marginShortfall / 100));
        }
    } else {
        appliedRule = 'Single Transaction Assessment (No Dataset)';
        isArmLengthCompliant = true;
        primaryAdjustmentInr = 0;
    }

    const requiresSecondaryAdjustment = primaryAdjustmentInr > 10000000;

    return {
        status: 'SUCCESS',
        statutoryDetermination: isArmLengthCompliant ? 'ARM_LENGTH_COMPLIANT' : 'PRIMARY_ADJUSTMENT_REQUIRED',
        governingLaw: 'Income-tax Act, 1961 Section 92C, Rule 10B & Rule 10CA',
        testedParty,
        associatedEnterpriseName,
        transferPricingMethod,
        internationalTransactionAmountInr: amount,
        testedPartyOperatingMarginPercent: testedMargin,
        appliedRule,
        toleranceBandPercent: tolerancePercent,
        datasetSummary: {
            comparablesCount: comparables.length,
            percentile35,
            percentile65,
            median50,
            arithmeticMean,
            armLengthRange: percentile35 !== null ? [percentile35, percentile65] : null
        },
        primaryAdjustmentInr,
        secondaryAdjustmentAlert: requiresSecondaryAdjustment ? {
            applicable: true,
            section: 'Section 92CE',
            threshold: 'Exceeds INR 1,00,00,000',
            repatriationPeriodDays: 90,
            statutoryConsequence: 'Excess money must be repatriated into India within 90 days, failing which interest at SBI 1-yr MCLR + 325 bps applies.'
        } : { applicable: false },
        isAuthorizedToDisburse: false,
        statutoryRationale: isArmLengthCompliant
            ? `Transfer Pricing Compliant: Tested party operating margin of ${testedMargin}% is within the statutory arm's length range [${percentile35 ?? arithmeticMean}%, ${percentile65 ?? arithmeticMean}%]. Primary adjustment is INR 0.`
            : `Primary Adjustment Required: Tested margin (${testedMargin}%) falls below statutory arm's length range. Under Rule 10CA(7), adjustment is made to the Median (50th percentile: ${median50}%). Primary TP addition to income: INR ${primaryAdjustmentInr.toLocaleString('en-IN')}.${requiresSecondaryAdjustment ? ' Section 92CE secondary adjustment mandatory.' : ''}`
    };
}

/**
 * -----------------------------------------------------------------------------
 * 31. SECTION 79 TAX LOSS CARRY-FORWARD & SHAREHOLDING CONTINUITY
 * -----------------------------------------------------------------------------
 * Evaluates carry forward and set off of accumulated business losses:
 * 1. General Rule (Sec 79(1)): Denied if >= 51% change in voting power.
 * 2. Startup Carve-Out (Sec 79(2)): Preserved for DPIIT startups u/s 80-IAC if all original shareholders continue.
 * 3. IBC Carve-Out (Sec 79(2)(c)): Preserved for NCLT resolution plans.
 * 4. Section 32(2) Invariant: Unabsorbed depreciation carries forward INDEFINITELY regardless of Section 79.
 */
export function evaluateSection79LossContinuity({
    companyType = 'CLOSELY_HELD_COMPANY',
    isDpiitRecognizedStartup = false,
    isIbcResolutionPlan = false,
    accumulatedBroughtForwardLossInr = 0,
    unabsorbedDepreciationInr = 0,
    shareholdingInLossYear = [],
    shareholdingInSetOffYear = [],
    votingPowerHeldByOriginalShareholdersPercent = null
}) {
    const bfLoss = Math.max(0, Number(accumulatedBroughtForwardLossInr) || 0);
    const unabsDep = Math.max(0, Number(unabsorbedDepreciationInr) || 0);

    let continuityPercent = votingPowerHeldByOriginalShareholdersPercent !== null
        ? Number(votingPowerHeldByOriginalShareholdersPercent)
        : null;

    let allOriginalShareholdersContinue = false;

    if (continuityPercent === null && Array.isArray(shareholdingInLossYear) && shareholdingInLossYear.length > 0 && Array.isArray(shareholdingInSetOffYear)) {
        let commonVotingPower = 0;
        let originalFoundCount = 0;

        for (const orig of shareholdingInLossYear) {
            const pan = orig.shareholderPan || orig.pan || orig.name;
            const origPct = Number(orig.percentage || orig.votingPower || 0);
            const current = shareholdingInSetOffYear.find(x => (x.shareholderPan || x.pan || x.name) === pan);

            if (current && Number(current.percentage || current.votingPower || 0) > 0) {
                originalFoundCount++;
                commonVotingPower += Math.min(origPct, Number(current.percentage || current.votingPower || 0));
            }
        }
        continuityPercent = roundToPaisa(commonVotingPower);
        allOriginalShareholdersContinue = (originalFoundCount === shareholdingInLossYear.length);
    } else if (continuityPercent !== null) {
        allOriginalShareholdersContinue = continuityPercent > 0;
    } else {
        continuityPercent = 100;
        allOriginalShareholdersContinue = true;
    }

    let isLossCarryForwardAllowed = false;
    let governingClause = 'Section 79(1)';
    let rationale = '';

    if (isIbcResolutionPlan) {
        isLossCarryForwardAllowed = true;
        governingClause = 'Section 79(2)(c) (Insolvency and Bankruptcy Code Resolution Plan)';
        rationale = 'Accumulated business losses are protected under Section 79(2)(c): Change in shareholding pursuant to NCLT approved resolution plan under the IBC, 2016 is exempt from Section 79 restrictions.';
    } else if (isDpiitRecognizedStartup) {
        governingClause = 'Section 79(2) (DPIIT Recognized Startup under Section 80-IAC)';
        if (allOriginalShareholdersContinue) {
            isLossCarryForwardAllowed = true;
            rationale = `Accumulated business losses protected under Section 79(2) startup carve-out: Although original voting power is ${continuityPercent}%, all original shareholders continue to hold shares in the company.`;
        } else {
            isLossCarryForwardAllowed = continuityPercent >= 51.0;
            rationale = isLossCarryForwardAllowed
                ? `Section 79 satisfied: Original shareholders retain ${continuityPercent}% voting power (>= 51%).`
                : `Section 79(2) startup carve-out failed: Not all original shareholders continue to hold shares, and retained voting power (${continuityPercent}%) is below 51%. Business loss lapsed.`;
        }
    } else {
        governingClause = 'Section 79(1) General Corporate Rule';
        if (continuityPercent >= 51.0) {
            isLossCarryForwardAllowed = true;
            rationale = `Section 79(1) compliant: Original shareholders hold ${continuityPercent}% of voting power on the last day of the financial year (threshold: >= 51%). Business losses can be set off.`;
        } else {
            isLossCarryForwardAllowed = false;
            rationale = `Section 79(1) violation: Voting power held by original shareholders has fallen to ${continuityPercent}% (< 51%). Accumulated business losses of INR ${bfLoss.toLocaleString('en-IN')} are legally lapsed and forfeited.`;
        }
    }

    const allowableLossSetOffInr = isLossCarryForwardAllowed ? bfLoss : 0;
    const lapsedBusinessLossInr = isLossCarryForwardAllowed ? 0 : bfLoss;

    return {
        status: 'SUCCESS',
        statutoryDetermination: isLossCarryForwardAllowed ? 'LOSS_CARRYFORWARD_ALLOWED' : 'LOSS_CARRYFORWARD_DENIED',
        governingLaw: 'Income-tax Act, 1961 Section 79 & Section 32(2)',
        governingClause,
        companyType,
        isDpiitRecognizedStartup,
        isIbcResolutionPlan,
        beneficialOwnershipContinuityPercent: continuityPercent,
        allOriginalShareholdersContinue,
        lossSchedule: {
            broughtForwardBusinessLossInr: bfLoss,
            allowableLossSetOffInr,
            lapsedBusinessLossInr,
            unabsorbedDepreciationInr: unabsDep,
            unabsorbedDepreciationStatutoryStatus: 'Fully protected under Section 32(2) -- Indefinite carry forward unaffected by shareholding changes.'
        },
        isAuthorizedToDisburse: false,
        statutoryRationale: `${rationale} Note: Unabsorbed depreciation of INR ${unabsDep.toLocaleString('en-IN')} is unaffected by Section 79 per Supreme Court precedent (CIT v. Virmani Industries) and carries forward indefinitely.`
    };
}

/**
 * -----------------------------------------------------------------------------
 * 32. FOREIGN EXCHANGE MONETARY REVALUATION (IND AS 21 & IND AS 109)
 * -----------------------------------------------------------------------------
 * Revalues foreign currency monetary items at closing reporting spot rates:
 * 1. Monetary Assets (Receivables, Bank) vs Monetary Liabilities (Payables, Loans).
 * 2. Net Unrealized Gain/Loss routing: P&L vs Other Comprehensive Income (OCI - Cash Flow Hedge Reserve).
 * 3. Ind AS 109 Balance Sheet schedule generation.
 */
export function revalueForeignExchangeIndAs109({
    asOfDate = null,
    reportingCurrency = 'INR',
    items = []
}) {
    const dAsOf = asOfDate ? new Date(asOfDate) : new Date();
    const asOfIso = !isNaN(dAsOf.getTime()) ? dAsOf.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const revaluedItems = [];
    let totalPnlGainInr = 0;
    let totalPnlLossInr = 0;
    let totalOciGainInr = 0;
    let totalOciLossInr = 0;

    const itemList = Array.isArray(items) ? items : [];

    for (const item of itemList) {
        const desc = item.description || item.itemDescription || 'FX Item';
        const itemType = (item.itemType || 'MONETARY_ASSET').toUpperCase();
        const ccy = item.foreignCurrency || item.currency || 'USD';
        const fcyAmt = Number(item.foreignAmount || item.amount || 0);
        const bookRate = Number(item.bookingRate || item.historicalRate || 1);
        const closeRate = Number(item.closingRate || item.spotRate || bookRate);
        const isHedge = item.isDesignatedCashFlowHedge === true;

        if (itemType === 'NON_MONETARY') {
            revaluedItems.push({
                description: desc,
                itemType: 'NON_MONETARY',
                foreignCurrency: ccy,
                foreignAmount: fcyAmt,
                bookingRate: bookRate,
                closingRate: closeRate,
                carryingAmountInr: roundToPaisa(fcyAmt * bookRate),
                unrealizedGainLossInr: 0,
                accountingTreatment: 'Carried at historical cost per Ind AS 21.23(b) -- No closing rate revaluation.'
            });
            continue;
        }

        const carryingAmountInr = roundToPaisa(fcyAmt * bookRate);
        const revaluedAmountInr = roundToPaisa(fcyAmt * closeRate);

        let gainLoss = 0;
        if (itemType === 'MONETARY_ASSET') {
            gainLoss = roundToPaisa(revaluedAmountInr - carryingAmountInr);
        } else {
            gainLoss = roundToPaisa(carryingAmountInr - revaluedAmountInr);
        }

        let routing = '';
        if (isHedge) {
            routing = 'OTHER_COMPREHENSIVE_INCOME (Cash Flow Hedge Reserve)';
            if (gainLoss >= 0) totalOciGainInr += gainLoss;
            else totalOciLossInr += Math.abs(gainLoss);
        } else {
            routing = 'PROFIT_AND_LOSS (Foreign Exchange Fluctuation Account)';
            if (gainLoss >= 0) totalPnlGainInr += gainLoss;
            else totalPnlLossInr += Math.abs(gainLoss);
        }

        revaluedItems.push({
            description: desc,
            itemType,
            foreignCurrency: ccy,
            foreignAmount: fcyAmt,
            bookingRate: bookRate,
            closingRate: closeRate,
            carryingAmountInr,
            revaluedAmountInr,
            unrealizedGainLossInr: gainLoss,
            isGain: gainLoss >= 0,
            accountingTreatment: routing
        });
    }

    const netPnlGainLossInr = roundToPaisa(totalPnlGainInr - totalPnlLossInr);
    const netOciGainLossInr = roundToPaisa(totalOciGainInr - totalOciLossInr);

    return {
        status: 'SUCCESS',
        statutoryDetermination: 'APPLICABLE',
        governingLaw: 'Ind AS 21 (The Effects of Changes in Foreign Exchange Rates) & Ind AS 109 (Financial Instruments)',
        asOfDate: asOfIso,
        reportingCurrency,
        totalItemsEvaluated: revaluedItems.length,
        summary: {
            netPnlImpactInr: netPnlGainLossInr,
            netPnlStatus: netPnlGainLossInr >= 0 ? 'NET_UNREALIZED_GAIN' : 'NET_UNREALIZED_LOSS',
            netOciImpactInr: netOciGainLossInr,
            netOciStatus: netOciGainLossInr >= 0 ? 'NET_HEDGE_RESERVE_GAIN' : 'NET_HEDGE_RESERVE_LOSS',
            totalPnlGainInr: roundToPaisa(totalPnlGainInr),
            totalPnlLossInr: roundToPaisa(totalPnlLossInr)
        },
        revaluedItems,
        isAuthorizedToDisburse: false,
        statutoryRationale: `Ind AS 21 & 109 Revaluation: ${revaluedItems.length} items evaluated as of ${asOfIso}. Net P&L FX impact: INR ${netPnlGainLossInr.toLocaleString('en-IN')}; Net OCI Hedge impact: INR ${netOciGainLossInr.toLocaleString('en-IN')}. Accounting revaluations do not authorize payment disbursement.`
    };
}

