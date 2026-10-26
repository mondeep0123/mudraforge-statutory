/**
 * @fileoverview Canonical Statutory Outcomes & Semantic Disposition Dictionary.
 * Educates developers and autonomous AI agents on all possible non-numerical
 * states, legal preconditions, missing facts, and required downstream actions.
 *
 * Implements hybrid offline-first resolution with graceful edge synchronization.
 *
 * @license MIT
 */

import { STATUTORY_CLIENT_VERSION } from './constants.js';

export const STATUTORY_OUTCOMES_DICTIONARY = [
    {
        code: 'DETERMINED_APPLICABLE',
        aliases: ['APPLICABLE', 'STATUTORY_WITHHOLDING_APPLICABLE', 'APPLICABLE_STANDARD_RATE'],
        category: 'STATUTORY_WITHHOLDING',
        title: 'Statutory Obligation Established',
        description: 'Statutory deduction or tax withholding obligation is actively established on the transaction.',
        triggerCondition: 'All statutory criteria met: cumulative FY threshold crossed, buyer/seller eligibility verified, and statute actively in force.',
        recommendedAction: 'Deduct statutory tax at rate in force from basic invoice amount; credit vendor payable net of TDS; credit TDS payable.',
        remedy: 'Proceed with standard invoice booking. Formulate double-entry voucher: Debit Expense, Debit Input GST, Credit Vendor Payable (Net), Credit TDS Payable (Section rate).',
        consequenceIfUnresolved: 'Failure to deduct leads to interest under Section 201(1A) at 1% per month and 30% expenditure disallowance under Section 40(a)(ia).',
        applicableProvisions: ['194Q', '194C', '194J', '194I', '194H', '195', '51', '393'],
        governingAuthority: 'Direct Tax / Central Board of Direct Taxes (CBDT)'
    },
    {
        code: 'DETERMINED_THRESHOLD_NOT_MET',
        aliases: ['EXEMPT', 'BELOW_THRESHOLD', 'EXEMPT_THRESHOLD_NOT_MET', 'THRESHOLD_NOT_CROSSED'],
        category: 'STATUTORY_SAFE_HARBOR',
        title: 'Statutory Spend Below Monetary Threshold',
        description: 'Transaction falls below the legal monetary threshold; no tax withholding is legally required.',
        triggerCondition: 'Cumulative FY purchases under ₹50 Lakhs (Section 194Q), single invoice under ₹30,000 / aggregate under ₹1,00,000 (Section 194C), or aggregate fees under ₹30,000 (Section 194J).',
        recommendedAction: 'Disburse invoice in full; record transaction amount toward cumulative financial year spend tracker for subsequent invoice gates.',
        remedy: 'Disburse payment without tax deduction. Ensure the cumulative spend accumulator for this vendor is incremented in ERP to catch future threshold crossings.',
        consequenceIfUnresolved: 'Over-withholding harms vendor commercial relations, triggers vendor dispute tickets, and requires cumbersome TDS refund processing.',
        applicableProvisions: ['194Q', '194C', '194J', '194H', '393'],
        governingAuthority: 'Direct Tax / Central Board of Direct Taxes (CBDT)'
    },
    {
        code: 'INDETERMINATE_BUYER_TURNOVER_UNVERIFIED',
        aliases: ['BUYER_TURNOVER_UNVERIFIED', 'TURNOVER_UNVERIFIED', 'EXEMPT_BELOW_BUYER_TURNOVER_THRESHOLD'],
        category: 'EVIDENTIARY_AMBIGUITY',
        title: 'Buyer Turnover Precondition Unverified',
        description: 'Preceding financial year buyer turnover is unverified; statutory applicability cannot be determined.',
        triggerCondition: 'Section 194Q requires buyer turnover exceeding ₹10 Crore in the financial year immediately preceding the transaction year (Section 194Q(1) Explanation).',
        recommendedAction: 'Fail closed; hold automated withholding determination until finance or vendor management records verified audited turnover.',
        remedy: 'Supply buyer turnover in Crores INR (buyerTurnoverCr) verified against the company audited financial statements or income tax return for the preceding FY.',
        missingFacts: ['buyerTurnoverCr', 'buyerTurnoverPrecedingFy'],
        missingFactsExplanation: {
            buyerTurnoverCr: {
                type: 'number',
                description: 'Gross turnover / sales / gross receipts of the buyer entity in the financial year preceding the purchase, expressed in Crores INR.',
                example: 15.5,
                source: 'Audited Profit & Loss Statement / Income Tax Return Form ITR-6'
            },
            buyerTurnoverPrecedingFy: {
                type: 'string',
                description: 'The financial year identifier for the preceding turnover evaluation.',
                example: '2024-25',
                source: 'Corporate Tax Master'
            }
        },
        consequenceIfUnresolved: 'Autonomous payment execution halts fail-closed. If turnover actually exceeds ₹10 Cr and TDS is missed, buyer is treated as assessee-in-default.',
        applicableProvisions: ['194Q', '393'],
        governingAuthority: 'Income-tax Act, 1961 Section 194Q(1) Explanation'
    },
    {
        code: 'INDETERMINATE_PENDING_TRANSACTION_DATE',
        aliases: ['TRANSACTION_DATE_REQUIRED_FOR_REGIME_DETERMINATION', 'PENDING_TRANSACTION_DATE', 'MISSING_TRANSACTION_DATE', 'REGIME_DETERMINATION_PENDING'],
        category: 'TEMPORAL_AMBIGUITY',
        title: 'Transaction Timestamp Required for Regime Resolution',
        description: 'Transaction date, credit date, and payment date are missing; statutory governing Act cannot be determined.',
        triggerCondition: 'Dual-act boundary transition: Income-tax Act, 1961 applies to events crystallized on or before 31 March 2026; Income-tax Act, 2025 applies thereafter.',
        recommendedAction: 'Prompt upstream ERP or invoice capture system for invoice booking/credit timestamp before evaluating legal rules.',
        remedy: 'Provide creditDate (date invoice is booked in accounting ledger) or paymentDate (date funds are disbursed). The earlier event crystallizes the governing Act.',
        missingFacts: ['creditDate', 'paymentDate', 'transactionDate'],
        missingFactsExplanation: {
            creditDate: {
                type: 'string (ISO 8601 YYYY-MM-DD)',
                description: 'Date when amount is credited to the account of the payee or suspense account in corporate books.',
                example: '2026-03-25',
                source: 'ERP General Ledger Booking Timestamp'
            },
            paymentDate: {
                type: 'string (ISO 8601 YYYY-MM-DD)',
                description: 'Date of actual cash disbursement, cheque issuance, or bank wire dispatch.',
                example: '2026-04-10',
                source: 'Bank Rail Payment Instruction'
            },
            transactionDate: {
                type: 'string (ISO 8601 YYYY-MM-DD)',
                description: 'Supplier invoice date on the face of the bill.',
                example: '2026-03-20',
                source: 'Vendor Invoice Document Header'
            }
        },
        consequenceIfUnresolved: 'Statutory determination cannot establish whether return forms belong to Form 26Q (1961 Act) or successor forms under Income-tax Act, 2025.',
        applicableProvisions: ['194Q', '194C', '194J', '194I', '194H', '393'],
        governingAuthority: 'Income-tax Act, 2025 Section 536 read with Section 6 General Clauses Act, 1897'
    },
    {
        code: 'SUNSET_OMITTED',
        aliases: ['OMITTED', 'SUNSET', 'REPEALED', 'STATUTE_SUNSET_REPEALED'],
        category: 'LEGISLATIVE_SUNSET',
        title: 'Statute Omitted / Repealed by Finance Act',
        description: 'Statutory provision has been omitted or repealed by Parliament; tax deduction or collection under this section is prohibited.',
        triggerCondition: 'Transaction date falls on or after statutory sunset effective date (e.g. Section 206C(1H) omitted w.e.f. 1 April 2025; Section 206AB omitted w.e.f. 1 April 2025).',
        recommendedAction: 'Halt tax withholding or collection under this section; update ERP tax engine to prevent obsolete tax collection.',
        remedy: 'Update vendor master and ERP billing tax codes. For post-1 April 2025 goods transactions, evaluate Section 194Q buyer withholding instead of seller TCS.',
        consequenceIfUnresolved: 'Charging repealed taxes creates illegal collections under Article 265 of the Constitution of India and damages customer commercial trust.',
        applicableProvisions: ['206C(1H)', '206AB'],
        governingAuthority: 'Finance Act, 2024 / Finance Act, 2025'
    },
    {
        code: 'PENALTY_RATE_MANDATED',
        aliases: ['PENALTY_RATE', 'INOPERATIVE_PAN_PENALTY', 'PAN_PENALTY_FLOOR', 'SECTION_206AA_PENALTY'],
        category: 'STATUTORY_PENALTY_RATE',
        title: 'Mandatory Non-Furnishing Penalty Rate',
        description: 'Higher penalty rate mandatory due to non-furnishing or invalid/inoperative PAN under Section 206AA.',
        triggerCondition: 'Payee PAN missing, invalid ISO Mod-36 checksum, or designated inoperative due to Aadhaar non-linking.',
        recommendedAction: 'Withhold at statutory penalty floor rate (5% for Section 194Q; 20% for Section 194C, 194J, 194I); flag vendor master for PAN rectification.',
        remedy: 'Apply mandatory penalty rate immediately. Concurrently issue automated notification to vendor requesting valid, operative PAN with Aadhaar linkage proof.',
        missingFactsExplanation: {
            pan: {
                type: 'string (10-char alphanumeric)',
                description: 'Permanent Account Number of the vendor with verified ISO Mod-36 syntax and active/operative filing status.',
                example: 'AAACR5055K',
                source: 'Income Tax Department PAN Verification API / Form 60'
            }
        },
        consequenceIfUnresolved: 'Deducting standard rates on inoperative PANs makes the deductor liable for short-deduction demand plus penal interest under Section 201(1A).',
        applicableProvisions: ['194Q', '194C', '194J', '194I', '194H', '206AA', '393'],
        governingAuthority: 'Income-tax Act, 1961 Section 206AA'
    },
    {
        code: 'DISQUALIFIED_FROM_ZERO_RATING',
        aliases: ['DISQUALIFIED_ZERO_RATING', 'ZERO_RATING_FAILED', 'EXPORT_ZERO_RATING_DISQUALIFIED'],
        category: 'INDIRECT_TAX_DISQUALIFICATION',
        title: 'Export Zero-Rating Disqualified',
        description: 'Supply disqualified from 0% zero-rated export treatment under Letter of Undertaking (LUT).',
        triggerCondition: 'Non-receipt of convertible foreign exchange or authorized RBI INR within statutory timeline (IGST Sec 2(6)(iv)) or classification as Intermediary (IGST Sec 2(13)).',
        recommendedAction: 'Levy standard 18% Integrated GST (IGST); do not issue zero-rated LUT export invoice.',
        remedy: 'Obtain FIRC (Foreign Inward Remittance Certificate) / BRC or ensure supplier acts as principal service provider rather than intermediary broker.',
        missingFactsExplanation: {
            isConvertibleForexReceivedOrRbiInr: {
                type: 'boolean',
                description: 'Affirmation that payment has been realized in convertible foreign currency or Indian Rupees permitted by RBI.',
                example: true,
                source: 'Bank Swift Inward Advice / EDPMS Inward Remittance'
            }
        },
        consequenceIfUnresolved: 'Claiming zero-rating without satisfying export conditions results in IGST demand with 18% interest and 100% penalty under Section 122 CGST Act.',
        applicableProvisions: ['IGST-SEC-16-LUT', '8'],
        governingAuthority: 'Integrated Goods and Services Tax Act, 2017 Section 2(6) & Section 16'
    },
    {
        code: 'REQUIRES_HUMAN_REVIEW',
        aliases: ['HUMAN_REVIEW_REQUIRED', 'COMPOSITE_AMBIGUITY_REVIEW', 'MANUAL_APPROVAL_REQUIRED'],
        category: 'COMPOSITE_AMBIGUITY',
        title: 'Composite Contract Evidentiary Ambiguity',
        description: 'Contractual ambiguity or composite scope of work prevents autonomous deterministic classification.',
        triggerCondition: 'Mixed supplies (Section 8 CGST), composite contracts spanning both goods and on-site engineering labour, or unitemized invoices.',
        recommendedAction: 'Route invoice to corporate tax controller with highlighted ambiguity and evidence requirements; do not auto-disburse.',
        remedy: 'Corporate tax counsel must review the underlying Statement of Work (SOW) to classify the principal supply (e.g. pure works contract vs supply of equipment).',
        consequenceIfUnresolved: 'Misclassifying composite services as goods leads to wrong tax rates, disallowed Input Tax Credits, and cross-statute withholding disputes.',
        applicableProvisions: ['8', '194C', '194J', '17(5)'],
        governingAuthority: 'Central Goods and Services Tax Act, 2017 Section 8'
    },
    {
        code: 'MISSING_EVIDENCE_HOLD',
        aliases: ['CERTIFICATE_MISSING', 'EVIDENCE_HOLD', 'MISSING_STATUTORY_FILING'],
        category: 'DOCUMENTARY_PRECONDITION',
        title: 'Statutory Exemption Certificate Missing',
        description: 'Statutory prerequisite filing or exemption certificate not on file; automated claim blocked fail-closed.',
        triggerCondition: 'Missing Section 197 lower-withholding certificate, missing Form 10F / TRC for cross-border remittance, or missing Schedule K-3.',
        recommendedAction: 'Place payment authorization lease on hold; issue automated vendor request for required statutory certificate.',
        remedy: 'Upload verified statutory exemption document to tenant vault. For lower withholding, verify certificate validity on Traces portal.',
        missingFacts: ['lowerWithholdingCertificate', 'taxResidencyCertificate', 'form10F', 'scheduleK3'],
        missingFactsExplanation: {
            lowerWithholdingCertificate: {
                type: 'string (Certificate Number)',
                description: 'Assessing Officer certificate issued under Section 197 specifying lower/nil withholding percentage and valid financial year.',
                example: 'CERT197-2025-00982',
                source: 'TRACES Portal Verification API'
            },
            taxResidencyCertificate: {
                type: 'string / file',
                description: 'Tax Residency Certificate (TRC) issued by government of non-resident vendor home country under Section 90(4).',
                example: 'TRC-IRS-FORM-6166',
                source: 'Vendor Tax Department'
            }
        },
        consequenceIfUnresolved: 'Withholding at concession rates without certificate makes the deductor liable for the full statutory rate difference plus mandatory interest.',
        applicableProvisions: ['195', '194C', 'IRC-901-904'],
        governingAuthority: 'Income-tax Act, 1961 Section 195 & Section 197'
    },
    {
        code: 'INDETERMINATE_DISPUTE_UNRESOLVED',
        aliases: ['UNRESOLVED_WRITTEN_OBJECTION', 'DISPUTE_CLOCK_PAUSED', 'WRITTEN_OBJECTION_FILED'],
        category: 'COMMERCIAL_DISPUTE_AMBIGUITY',
        title: 'Written Commercial Dispute Objection Pending',
        description: 'Statutory 15-day or 45-day payment clock is paused due to formal written objection filed within 15 days under MSMED Act Section 2(h)(ii).',
        triggerCondition: 'Buyer filed formal written defect notice or commercial objection within 15 days of invoice receipt.',
        recommendedAction: 'Halt statutory interest clock; resolve vendor dispute or obtain defect rectification confirmation.',
        remedy: 'Resolve buyer objection or deliver defect removal notice. Once formal objection is removed or settled, supply objectionRemovalDate to resume statutory clock.',
        missingFacts: ['objectionRemovalDate'],
        missingFactsExplanation: {
            objectionRemovalDate: {
                type: 'string (ISO 8601 YYYY-MM-DD)',
                description: 'Date when the supplier rectifies the defect or buyer formally withdraws written objection.',
                example: '2025-05-10',
                source: 'Dispute Settlement Agreement / Defect Rectification Note'
            }
        },
        consequenceIfUnresolved: 'Delay in resolving dispute risks retroactive compounding penal interest at 3x RBI rate if objection is ultimately dismissed or deemed invalid.',
        applicableProvisions: ['MSMED-15-16', 'MCA-MSME-1'],
        governingAuthority: 'Micro, Small and Medium Enterprises Development Act, 2006 Section 2(h)(ii)'
    },
    {
        code: 'INDETERMINATE_RECIPIENT_COUNTRY_REQUIRED',
        aliases: ['MISSING_RECIPIENT_COUNTRY_FOR_DTAA', 'MISSING_COUNTRY', 'DTAA_COUNTRY_REQUIRED'],
        category: 'CROSS_BORDER_TREATY_AMBIGUITY',
        title: 'Recipient Tax Jurisdiction Country Required for DTAA',
        description: 'Cross-border remittance withholding cannot determine DTAA treaty relief without recipient tax residency country.',
        triggerCondition: 'Section 195 remittance payment without recipient country ISO code.',
        recommendedAction: 'Hold remittance authorization; obtain payee tax residency jurisdiction.',
        remedy: 'Provide ISO 3166-1 alpha-2 country code for the non-resident recipient (e.g. US, SG, DE, GB) and verify Tax Residency Certificate (TRC).',
        missingFacts: ['country'],
        missingFactsExplanation: {
            country: {
                type: 'string (ISO 3166-1 2-letter)',
                description: 'Tax residency country of the foreign payee.',
                example: 'US',
                source: 'Tax Residency Certificate (TRC) Form 10F'
            }
        },
        consequenceIfUnresolved: 'Without country verification, statutory withholding must default to higher domestic rate (typically 20% or 40% plus applicable surcharge).',
        applicableProvisions: ['195'],
        governingAuthority: 'Income-tax Act, 1961 Section 195 read with Section 90'
    },
    {
        code: 'MSME_DELAYED_PAYMENT_INTEREST_DUE',
        aliases: ['MSMED_INTEREST_DUE', 'PENAL_INTEREST_DUE', 'SECTION_16_INTEREST'],
        category: 'COMMERCIAL_STATUTORY_PENALTY',
        title: 'MSME Statutory Delayed Payment Interest Accrued',
        description: 'Payment settlement exceeds statutory 15-day or 45-day window under Section 15 of MSMED Act, 2006; mandatory interest attached.',
        triggerCondition: 'Payment to verified Micro or Small enterprise delayed past statutory clock (15 days oral / max 45 days written contract).',
        recommendedAction: 'Compute compound monthly interest at 3x RBI repo rate under Section 16; flag Section 43B(h) tax disallowance risk at fiscal year-end.',
        remedy: 'Disburse principal payment immediately to cap interest accrual. Calculate compound penal interest using MSMED Section 16 calculator and book to expense.',
        consequenceIfUnresolved: 'Section 43B(h) permanently disallows income tax expense deduction if unpaid at year-end; MSMED interest is inadmissible as a business deduction under Section 23.',
        applicableProvisions: ['MSMED-15-16', 'MSMED-SEC-22', 'MCA-MSME-1'],
        governingAuthority: 'Micro, Small and Medium Enterprises Development Act, 2006 Sections 15 & 16'
    }
];

/**
 * Retrieve statutory outcomes and disposition codes for developers and AI agents.
 * Evaluates local OKF dictionary first, with optional edge synchronization when online.
 *
 * @param {string} [provision] Optional section code or provision alias (e.g. '194Q', '194C', 'MSMED-15-16')
 * @param {Object} [options]
 * @param {boolean} [options.offline=false] Force offline local evaluation
 * @param {boolean} [options.verbose=false] Include full remediation steps and parameter schemas
 * @param {string} [options.baseUrl] Cloudflare edge base URL (default: https://api.mudraforge.in)
 * @param {number} [options.timeoutMs=2500] Edge request timeout in milliseconds
 * @returns {Promise<{
 *   status: 'SUCCESS',
 *   source: 'LIVE_EDGE' | 'LOCAL_OKF_SUBSTRATE',
 *   provision: string | null,
 *   totalOutcomes: number,
 *   outcomes: typeof STATUTORY_OUTCOMES_DICTIONARY,
 *   version: string,
 *   offlineFallback?: boolean
 * }>}
 */
export async function getStatutoryOutcomes(provision = null, options = {}) {
    const normProvision = provision ? String(provision).trim().toUpperCase() : null;
    const isOffline = options.offline === true || 
                      (typeof process !== 'undefined' && process.env?.MUDRA_OFFLINE === '1');

    // Local filter function
    const filterLocal = (prov) => {
        if (!prov) return STATUTORY_OUTCOMES_DICTIONARY;
        return STATUTORY_OUTCOMES_DICTIONARY.filter(item => {
            if (!item.applicableProvisions || item.applicableProvisions.length === 0) return true;
            return item.applicableProvisions.some(p => p.toUpperCase() === prov || prov.includes(p.toUpperCase()));
        });
    };

    if (isOffline) {
        const outcomes = filterLocal(normProvision);
        return {
            status: 'SUCCESS',
            source: 'LOCAL_OKF_SUBSTRATE',
            provision: normProvision,
            totalOutcomes: outcomes.length,
            outcomes,
            version: STATUTORY_CLIENT_VERSION,
            offlineFallback: false
        };
    }

    // Attempt edge synchronization
    const baseUrl = options.baseUrl || 'https://api.mudraforge.in';
    const edgeUrl = new URL('/api/v1/statutory/outcomes', baseUrl);
    if (normProvision) {
        edgeUrl.searchParams.set('provision', normProvision);
    }
    if (options.verbose) {
        edgeUrl.searchParams.set('verbose', 'true');
    }

    try {
        const timeoutMs = options.timeoutMs || 2500;
        const res = await fetch(edgeUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': `@mudraforge/statutory/${STATUTORY_CLIENT_VERSION} (CLI/SDK Outcomes)`
            },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.outcomes)) {
                return {
                    status: 'SUCCESS',
                    source: 'LIVE_EDGE',
                    provision: normProvision,
                    totalOutcomes: data.outcomes.length,
                    outcomes: data.outcomes,
                    version: data.version || STATUTORY_CLIENT_VERSION,
                    offlineFallback: false
                };
            }
        }
    } catch (_) {
        // Fall through cleanly to local dictionary on network error, 404, or timeout
    }

    // Graceful fallback to local substrate
    const localOutcomes = filterLocal(normProvision);
    return {
        status: 'SUCCESS',
        source: 'LOCAL_OKF_SUBSTRATE',
        provision: normProvision,
        totalOutcomes: localOutcomes.length,
        outcomes: localOutcomes,
        version: STATUTORY_CLIENT_VERSION,
        offlineFallback: true
    };
}

/**
 * Look up in-depth explanation, legal rationale, and remediation steps for a specific disposition or indeterminate code.
 *
 * @param {string} codeOrQuery Disposition code (e.g. 'BUYER_TURNOVER_UNVERIFIED', 'INDETERMINATE', 'PENALTY_RATE_MANDATED')
 * @param {Object} [options]
 * @returns {Object} Explanation result with matched outcome(s) and remediation instructions
 */
export function explainStatutoryDisposition(codeOrQuery, options = {}) {
    if (!codeOrQuery || typeof codeOrQuery !== 'string' || !codeOrQuery.trim()) {
        throw new Error('[@mudraforge/statutory] A valid disposition code or query string is required, e.g. "BUYER_TURNOVER_UNVERIFIED" or "INDETERMINATE".');
    }

    const query = codeOrQuery.trim().toUpperCase();

    // Special case: "INDETERMINATE" returns all indeterminate outcomes
    if (query === 'INDETERMINATE' || query === 'INDETERMINACY') {
        const matched = STATUTORY_OUTCOMES_DICTIONARY.filter(item => 
            item.code.startsWith('INDETERMINATE_') || 
            item.category.includes('AMBIGUITY') || 
            item.code === 'MISSING_EVIDENCE_HOLD' ||
            item.code === 'REQUIRES_HUMAN_REVIEW'
        );
        return {
            status: 'SUCCESS',
            query,
            matchType: 'CATEGORY_GROUP',
            totalMatches: matched.length,
            matches: matched,
            summary: 'All system dispositions where automated tax determination halts fail-closed pending human review or missing evidentiary facts.'
        };
    }

    // Search by exact code or registered alias
    let directMatch = STATUTORY_OUTCOMES_DICTIONARY.find(item => 
        item.code === query || 
        (item.aliases && item.aliases.some(a => a.toUpperCase() === query))
    );

    if (!directMatch) {
        // Search by partial code, alias substring, or missingFact match
        directMatch = STATUTORY_OUTCOMES_DICTIONARY.find(item => 
            item.code.includes(query) || 
            (item.aliases && item.aliases.some(a => a.toUpperCase().includes(query) || query.includes(a.toUpperCase()))) ||
            (item.missingFacts && item.missingFacts.some(f => f.toUpperCase() === query))
        );
    }

    if (directMatch) {
        return {
            status: 'SUCCESS',
            query,
            matchType: 'EXACT_OR_KEY_MATCH',
            totalMatches: 1,
            matches: [directMatch],
            remedy: directMatch.remedy,
            missingFactsExplanation: directMatch.missingFactsExplanation || null,
            consequenceIfUnresolved: directMatch.consequenceIfUnresolved || null
        };
    }

    // Fuzzy search across titles, descriptions, and categories
    const fuzzyMatches = STATUTORY_OUTCOMES_DICTIONARY.filter(item => 
        item.title.toUpperCase().includes(query) ||
        item.description.toUpperCase().includes(query) ||
        item.category.toUpperCase().includes(query)
    );

    return {
        status: fuzzyMatches.length > 0 ? 'SUCCESS' : 'NOT_FOUND',
        query,
        matchType: fuzzyMatches.length > 0 ? 'FUZZY_MATCH' : 'NO_MATCH',
        totalMatches: fuzzyMatches.length,
        matches: fuzzyMatches,
        availableCodes: STATUTORY_OUTCOMES_DICTIONARY.map(i => i.code)
    };
}

/**
 * Automatically enriches a calculation result with canonical explanations, remediation steps,
 * and missing fact schemas when the result is INDETERMINATE or when verbose is requested.
 *
 * @param {Object} result Calculation response or outcome object
 * @param {Object} [options]
 * @param {boolean} [options.verbose=false] Force rich explanatory fields on all dispositions
 * @param {boolean} [options.explain=false] Alias for verbose
 * @returns {Object} Enriched result object
 */
export function enrichWithOutcomeExplanation(result, options = {}) {
    if (!result || typeof result !== 'object') return result;

    const determination = result.statutoryDetermination || result.status || null;
    const isIndeterminate = determination && (
        determination === 'INDETERMINATE' ||
        determination.startsWith('INDETERMINATE_') ||
        determination === 'DISPUTE_CLOCK_PAUSED'
    );
    const hasReason = Boolean(result.indeterminacyReason);
    const isVerbose = options.verbose === true || options.explain === true;

    if (isIndeterminate || hasReason || isVerbose) {
        const lookupKey = result.indeterminacyReason || determination;
        if (lookupKey) {
            try {
                const expl = explainStatutoryDisposition(lookupKey);
                if (expl && expl.matches && expl.matches.length > 0) {
                    const match = expl.matches[0];
                    const shouldAttachExplanation = options.attachExplanationProperty !== false && 
                        options.explain !== false && 
                        options.includeExplanation !== false;
                    if (shouldAttachExplanation && !result.explanation) {
                        result.explanation = match.description || result.regimeNotice || result.contingentNotice || null;
                    }
                    if (!result.remedy && match.remedy) {
                        result.remedy = match.remedy;
                    }
                    if (!result.consequenceIfUnresolved && match.consequenceIfUnresolved) {
                        result.consequenceIfUnresolved = match.consequenceIfUnresolved;
                    }
                    if (!result.missingFactsExplanation && match.missingFactsExplanation) {
                        result.missingFactsExplanation = match.missingFactsExplanation;
                    }
                }
            } catch (_) {}
        }
    }

    return result;
}
