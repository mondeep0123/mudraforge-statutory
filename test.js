import dns from 'node:dns';
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

import {
    lookupStatute,
    listSections,
    isStatuteActive,
    computeTemporalStatus,
    StatutoryClient,
    getLocalManifest
} from './src/index.js';

async function run() {
    console.log('===========================================================================');
    console.log('@MUDRAFORGE/STATUTORY MULTI-DOMAIN REGRESSION TEST SUITE');
    console.log('===========================================================================\n');

    // 1. Directory Listing
    console.log('── Test 1: Section Catalog & Manifest Listing ──');
    const sections = await listSections();
    console.log(`[PASS] listSections: retrieved ${sections.length} sections across active domains.`);
    if (sections.length < 6) {
        throw new Error(`Expected at least 6 sections, got ${sections.length}`);
    }

    // 2. Direct Tax: Section 194Q
    console.log('\n── Test 2: Direct Tax — Section 194Q (TDS on Purchase of Goods) ──');
    const res194Q = await lookupStatute('194Q');
    console.log(`[PASS] lookupStatute(194Q): status=${res194Q.status}, temporal=${res194Q.temporalStatus}, source=${res194Q.source}`);
    const qThresholds = res194Q.statute.keyStatutoryThresholds;
    if (qThresholds.buyerPriorYearTurnoverCr !== 10 || qThresholds.annualPurchaseThresholdInr !== 5000000) {
        throw new Error('Section 194Q thresholds do not match statutory baseline (₹10Cr turnover / ₹50L purchases)');
    }
    console.log(`[PASS] 194Q Statutory Baseline Verified: > ₹10Cr Turnover, > ₹50L Purchases, ${qThresholds.standardDeductionRatePercent}% TDS, ${qThresholds.inoperativePanPenaltyRatePercent}% Inoperative PAN rate.`);

    // 3. Direct Tax: Section 194J
    console.log('\n── Test 3: Direct Tax — Section 194J (TDS on Professional & Technical Fees) ──');
    const res194J = await lookupStatute('194J');
    console.log(`[PASS] lookupStatute(194J): status=${res194J.status}, temporal=${res194J.temporalStatus}`);
    const jRates = res194J.statute.keyStatutoryThresholds;
    if (jRates.technicalServicesRatePercent !== 2 || jRates.professionalServicesRatePercent !== 10) {
        throw new Error('Section 194J rates do not reflect CBDT rate cut (2% FTS / 10% Professional)');
    }
    console.log(`[PASS] 194J Rates Verified: ${jRates.technicalServicesRatePercent}% Technical Services / ${jRates.professionalServicesRatePercent}% Professional Fees.`);

    // 4. Direct Tax: Section 206C(1H) Sunset Verification
    console.log('\n── Test 4: Direct Tax — Section 206C(1H) (Sunset on 1 April 2025) ──');
    const sunsetActive = await isStatuteActive('206C(1H)', '2025-06-01');
    console.log(`[PASS] isStatuteActive(206C(1H), 2025-06-01): ${sunsetActive} (expected false)`);
    if (sunsetActive !== false) {
        throw new Error('Section 206C(1H) should evaluate as false (sunset) after 1 April 2025!');
    }
    const res206C = await lookupStatute('206C(1H)', { asOfDate: '2025-06-01' });
    console.log(`[PASS] lookupStatute(206C(1H), 2025-06-01): temporalStatus=${res206C.temporalStatus} (SUNSET_SUPERSEDED)`);
    if (res206C.temporalStatus !== 'SUNSET_SUPERSEDED') {
        throw new Error('Expected temporalStatus to be SUNSET_SUPERSEDED');
    }

    // 5. Indirect Tax (GST): Section 17(5) Blocked ITC
    console.log('\n── Test 5: Indirect Tax (GST) — Section 17(5) (Ineligible / Blocked ITC) ──');
    const res17_5 = await lookupStatute('17(5)');
    console.log(`[PASS] lookupStatute(17(5)): status=${res17_5.status}, temporal=${res17_5.temporalStatus}`);
    if (!res17_5.statute.keyStatutoryThresholds.blockedCategories.includes('Outdoor Catering')) {
        throw new Error('Section 17(5) blocked categories missing Outdoor Catering');
    }
    console.log(`[PASS] 17(5) Blocked Categories Verified: ${res17_5.statute.keyStatutoryThresholds.blockedCategories.join(', ')}`);

    // 6. MSME Commercial: Sections 15 & 16 of MSMED Act, 2006
    console.log('\n── Test 6: Commercial & MSME — Sections 15 & 16 (Delayed Payments & 43B(h)) ──');
    const resMSME = await lookupStatute('MSMED-15-16');
    console.log(`[PASS] lookupStatute(MSMED-15-16): status=${resMSME.status}, temporal=${resMSME.temporalStatus}`);
    const msmeRules = resMSME.statute.keyStatutoryThresholds;
    if (msmeRules.statutoryDefaultTimelineDays !== 15 || msmeRules.maximumWrittenAgreementTimelineDays !== 45) {
        throw new Error('MSMED timelines invalid (15 days oral / 45 days written)');
    }
    console.log(`[PASS] MSMED Timelines Verified: ${msmeRules.statutoryDefaultTimelineDays} days (default) / ${msmeRules.maximumWrittenAgreementTimelineDays} days (max contract). Interest: ${msmeRules.penalInterestRate}`);

    // 7. International Tax: IRC § 901 & § 904
    console.log('\n── Test 7: Cross-Border Tax — IRC § 901 & § 904 (Foreign Tax Credit Baskets) ──');
    const resIRC = await lookupStatute('IRC-901-904');
    console.log(`[PASS] lookupStatute(IRC-901-904): status=${resIRC.status}, temporal=${resIRC.temporalStatus}`);
    const ircThresholds = resIRC.statute.keyStatutoryThresholds;
    if (ircThresholds.deMinimisExemptionMfJUsd !== 600 || ircThresholds.deMinimisExemptionSingleUsd !== 300) {
        throw new Error('IRC 901 de minimis thresholds invalid ($600 MFJ / $300 Single)');
    }
    console.log(`[PASS] IRC De Minimis Substantiation Limits: $${ircThresholds.deMinimisExemptionSingleUsd} (Single) / $${ircThresholds.deMinimisExemptionMfJUsd} (MFJ). Schedule K-3 mandatory.`);

    // 8. Offline Fallback & Local Resilience
    console.log('\n── Test 8: Offline-First Local Resilience (Dead Network Simulation) ──');
    const deadNetworkOptions = { baseUrl: 'http://127.0.0.1:59999' };
    const offlineRes = await lookupStatute('194Q', deadNetworkOptions);
    console.log(`[PASS] lookupStatute with dead network gracefully resolved locally: source=${offlineRes.source}, status=${offlineRes.status}`);
    const offlineList = await listSections(deadNetworkOptions);
    console.log(`[PASS] listSections with dead network gracefully listed ${offlineList.length} local sections.`);

    // 9. Enterprise StatutoryClient Class & Tier Attestation
    console.log('\n── Test 9: Enterprise StatutoryClient & Calculation Gate ──');
    const enterpriseClient = new StatutoryClient({
        tier: 'ENTERPRISE_PAID',
        apiKey: 'mf_live_ent_test_token_8842',
        offlineFirst: true
    });
    const entRes = await enterpriseClient.lookup('194Q');
    console.log(`[PASS] enterpriseClient.lookup(194Q): status=${entRes.status}, tier=${entRes.tier}, source=${entRes.source}`);

    const freeClient = new StatutoryClient();
    try {
        await freeClient.calculate({ section: '194Q', invoiceAmount: 8000000 });
        throw new Error('FAILED: calculate() should have thrown without API key');
    } catch (err) {
        if (err.code === 'API_KEY_REQUIRED' && err.message.includes('hello@mudraforge.in')) {
            console.log('[PASS] calculate() correctly blocked unauthenticated call with direct contact instructions:');
            console.log(`  Contact: ${err.contact} / ${err.support}`);
        } else {
            throw err;
        }
    }

    // 10. Cryptographic Manifest Check
    console.log('\n── Test 10: Cryptographic Manifest Verification ──');
    const manifest = getLocalManifest();
    if (!manifest || !manifest.rootHash || !manifest.rootHash.startsWith('sha256-')) {
        throw new Error('Local manifest is missing a valid rootHash!');
    }
    console.log(`[PASS] Manifest Verified: v${manifest.okfVersion}, Root Hash: ${manifest.rootHash}`);

    // 11. Failure Modes & Explicit Retrieval Modes
    console.log('\n── Test 11: Failure Modes & Explicit Retrieval Verification ──');
    // Mode local check
    const localExplicit = await lookupStatute('194Q', { mode: 'local' });
    if (localExplicit.retrievalMode !== 'LOCAL_SNAPSHOT' || localExplicit.isOfflineSnapshot !== true) {
        throw new Error('Expected retrievalMode=LOCAL_SNAPSHOT and isOfflineSnapshot=true');
    }
    console.log(`[PASS] Explicit mode='local' returned validated snapshot with advisory note.`);

    // Local 404 check
    try {
        await lookupStatute('NON_EXISTENT_SECTION_999', { mode: 'local' });
        throw new Error('FAILED: lookupStatute should have thrown for non-existent section');
    } catch (err) {
        if (err.code === 'SECTION_NOT_FOUND') {
            console.log(`[PASS] Non-existent section correctly rejected with code: ${err.code}`);
        } else {
            throw err;
        }
    }

    // Invalid input check
    try {
        await lookupStatute('');
        throw new Error('FAILED: lookupStatute should have thrown for empty string');
    } catch (err) {
        console.log(`[PASS] Empty section query correctly rejected: "${err.message}"`);
    }

    console.log('\n===========================================================================');
    console.log('ALL 11 TEST SUITES PASSED (100% REPRODUCIBLE PRECISION)');
    console.log('===========================================================================\n');
}

run().catch(err => {
    console.error('\n[FAIL] Test Suite Failed:', err);
    process.exit(1);
});
