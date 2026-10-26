/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory — Deterministic Statutory Calculators
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure, zero-dependency, mathematically deterministic calculation engines
 * for Corporate Finance, Direct Tax, Indirect Tax (GST), International Tax,
 * and Restructuring.
 *
 * Invariant Envelopes:
 * 1. Zero dependencies. Native ES Modules.
 * 2. Integer/paisa-level rounding preventing floating-point precision drift.
 * 3. Enforces isAuthorizedToDisburse: false across all calculations (statutory
 *    computation never authorizes payment disbursement autonomously).
 * 4. Grounded in primary statutory citations, gazette notifications, and judicial rulings.
 */

/**
 * Rounds a financial number to exactly 2 decimal places (paisa).
 * Safeguards against -0, NaN, and non-finite inputs.
 *
 * @param {number|string} amount
 * @returns {number}
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
 *
 * @param {number|string} amount
 * @returns {number}
 */
export function roundSection288B(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || isNaN(n) || Object.is(n, -0)) return 0;
    return Math.round(n);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. CORPORATE TAX: MAT (SECTION 115JB) VS CONCESSIONAL REGIME (SECTION 115BAA)
 * ─────────────────────────────────────────────────────────────────────────────
 * Evaluates:
 * 1. Normal Corporate Tax: 25% (turnover <= 400 Cr) or 30%, plus 7%/12% surcharge, plus 4% cess.
 * 2. Minimum Alternate Tax (MAT u/s 115JB): 15% on Adjusted Book Profit, plus 7%/12% surcharge, plus 4% cess.
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
} = {}) {
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
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. PLACE OF SUPPLY (POS) & ZERO-RATED EXPORT UNDER LUT (IGST ACT SECTIONS 10, 12, 16)
 * ─────────────────────────────────────────────────────────────────────────────
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
} = {}) {
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
        // Intermediary services under Section 13(8)(b) have POS at supplier location in India
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
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. TRANSFER PRICING ARM'S LENGTH PRICE (ALP) ENGINE (SECTION 92C & RULE 10CA)
 * ─────────────────────────────────────────────────────────────────────────────
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
} = {}) {
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
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. SECTION 79 TAX LOSS CARRY-FORWARD & SHAREHOLDING CONTINUITY
 * ─────────────────────────────────────────────────────────────────────────────
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
} = {}) {
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
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. FOREIGN EXCHANGE MONETARY REVALUATION (IND AS 21 & IND AS 109)
 * ─────────────────────────────────────────────────────────────────────────────
 * Revalues foreign currency monetary items at closing reporting spot rates:
 * 1. Monetary Assets (Receivables, Bank) vs Monetary Liabilities (Payables, Loans).
 * 2. Net Unrealized Gain/Loss routing: P&L vs Other Comprehensive Income (OCI - Cash Flow Hedge Reserve).
 * 3. Ind AS 109 Balance Sheet schedule generation.
 */
export function revalueForeignExchangeIndAs109({
    asOfDate = null,
    reportingCurrency = 'INR',
    items = []
} = {}) {
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
