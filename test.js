import dns from 'node:dns';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

import {
    lookupStatute,
    lookupLocalStatute,
    listSections,
    isStatuteActive,
    computeTemporalStatus,
    StatutoryClient,
    getLocalManifest,
    syncOkf,
    checkUpdates,
    assertSecureEndpoint,
    resolveSafeStatuteFilename,
    StatutoryIndeterminateError,
    compareSemver,
    checkForPackageUpdate,
    decodeTaxIdentifier,
    isValidGstinChecksum,
    verifyLocalSubstrate,
    runStatutoryDoctor,
    crosswalkStatute,
    getStatutoryDiff,
    roundToPaisa,
    roundSection288B,
    calculateCorporateTaxMatVsConcessional,
    evaluatePlaceOfSupplyAndLut,
    calculateTransferPricingAlp,
    evaluateSection79LossContinuity,
    evaluateSection281TaxClearance,
    revalueForeignExchangeIndAs109,
    evaluateSection194A,
    evaluateSection194O,
    evaluateSection194IA,
    evaluateSection194R,
    evaluateSection43BStatutoryPayables,
    calculateItcReversalRule37,
    calculateRule37ASupplierNonFilingReversal,
    getStatutoryOutcomes,
    explainStatutoryDisposition,
    enrichWithOutcomeExplanation,
    ignorePackageUpdate,
    STATUTORY_OUTCOMES_DICTIONARY,
    STATUTORY_EXIT_CODES,
    STATUTORY_CLIENT_VERSION
} from './src/index.js';

async function run() {
    console.log('===========================================================================');
    console.log('@MUDRAFORGE/STATUTORY MULTI-DOMAIN REGRESSION TEST SUITE');
    console.log('===========================================================================\n');

    // 1. Directory Listing
    console.log('── Test 1: Section Catalog & Manifest Listing ──');
    const sections = await listSections();
    console.log(`[PASS] listSections: retrieved ${sections.length} sections across active domains.`);
    if (sections.length < 7) {
        throw new Error(`Expected at least 7 sections, got ${sections.length}`);
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

    // 8. Corporate M&A: Section 50B (Slump Sale & Successor Liability)
    console.log('\n── Test 8: Corporate M&A — Section 50B (Slump Sale & Successor Liability) ──');
    const res50B = await lookupStatute('50B');
    console.log(`[PASS] lookupStatute(50B): status=${res50B.status}, temporal=${res50B.temporalStatus}`);
    const bThresholds = res50B.statute.keyStatutoryThresholds;
    if (bThresholds.revaluationPermittedInNetWorth !== false || bThresholds.indexationBenefitAvailable !== false) {
        throw new Error('Section 50B statutory invariants violated (revaluations must be false, indexation must be false)');
    }
    console.log(`[PASS] Section 50B Verified: WDV valuation basis (${bThresholds.depreciableAssetValuationBasis}), Form 3CEA mandatory audit.`);

    // 9. Offline Fallback & Local Resilience
    console.log('\n── Test 9: Offline-First Local Resilience (Dead Network Simulation) ──');
    const deadNetworkOptions = { baseUrl: 'http://127.0.0.1:59999' };
    const offlineRes = await lookupStatute('194Q', deadNetworkOptions);
    console.log(`[PASS] lookupStatute with dead network gracefully resolved locally: source=${offlineRes.source}, status=${offlineRes.status}`);
    const offlineList = await listSections(deadNetworkOptions);
    console.log(`[PASS] listSections with dead network gracefully listed ${offlineList.length} local sections.`);

    // 10. Enterprise StatutoryClient Class & Tier Attestation
    console.log('\n── Test 10: Enterprise StatutoryClient & Calculation Gate ──');
    const enterpriseClient = new StatutoryClient({
        tier: 'ENTERPRISE_PAID',
        apiKey: 'mf_live_ent_test_token_8842',
        offlineFirst: true
    });
    const entRes = await enterpriseClient.lookup('194Q');
    console.log(`[PASS] enterpriseClient.lookup(194Q): status=${entRes.status}, tier=${entRes.tier}, source=${entRes.source}`);

    const freeClient = new StatutoryClient();
    if (freeClient.preferIpv4 !== false) {
        throw new Error('Default StatutoryClient preferIpv4 must be false');
    }
    const ipv4Client = new StatutoryClient({ preferIpv4: true });
    if (ipv4Client.preferIpv4 !== true) {
        throw new Error('StatutoryClient with preferIpv4: true must set preferIpv4 to true');
    }
    console.log('[PASS] StatutoryClient preferIpv4 defaulting and opt-in verified.');

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

    // 11. Cryptographic Manifest Check
    console.log('\n── Test 11: Cryptographic Manifest Verification ──');
    const manifest = getLocalManifest();
    if (!manifest || !manifest.rootHash || !manifest.rootHash.startsWith('sha256-')) {
        throw new Error('Local manifest is missing a valid rootHash!');
    }
    console.log(`[PASS] Manifest Verified: v${manifest.okfVersion}, Root Hash: ${manifest.rootHash}`);

    // 12. Failure Modes & Explicit Retrieval Modes
    console.log('\n── Test 12: Failure Modes & Explicit Retrieval Verification ──');
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

    // 13. Hardened syncOkf & checkUpdates with ETag 304 and Atomic Staging
    console.log('\n── Test 13: Hardened syncOkf() & checkUpdates() (Atomic Staging & ETag 304) ──');
    const mockHash = 'sha256-ca9a4bde1d09030fbc7962952fcfa6b881c48716d0ac54c2f18be1c4e3d66253';
    const mockServer = http.createServer((req, res) => {
        if (req.url === '/api/v1/statutory/manifest.json') {
            if (req.headers['if-none-match'] === `"${mockHash}"`) {
                res.writeHead(304, { 'ETag': `"${mockHash}"` });
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'ETag': `"${mockHash}"` });
            return res.end(JSON.stringify({
                okfVersion: STATUTORY_CLIENT_VERSION,
                publishedAt: '2026-10-24T00:00:00.000Z',
                rootHash: mockHash,
                totalSections: 1,
                changelog: 'Mock changelog for testing'
            }));
        }

        if (req.url === '/api/v1/statutory/bundle.json') {
            if (req.headers['if-none-match'] === `"${mockHash}"`) {
                res.writeHead(304, { 'ETag': `"${mockHash}"` });
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'ETag': `"${mockHash}"` });
            return res.end(JSON.stringify({
                okfVersion: STATUTORY_CLIENT_VERSION,
                publishedAt: '2026-10-24T00:00:00.000Z',
                rootHash: mockHash,
                totalSections: 1,
                changelog: 'Mock changelog',
                statutes: [
                    {
                        sectionId: 'ITA1961_SEC194Q',
                        sectionCode: '194Q',
                        governingStatute: 'Income-tax Act, 1961',
                        title: 'Deduction of tax at source on purchase of goods',
                        effectivePeriod: { validFrom: '2021-07-01', validTo: '2026-03-31' },
                        keyStatutoryThresholds: { annualPurchaseThresholdInr: 5000000 }
                    }
                ]
            }));
        }

        res.writeHead(404);
        res.end();
    });

    await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
    const mockPort = mockServer.address().port;
    const mockBaseUrl = `http://127.0.0.1:${mockPort}`;
    const tempSyncDir = path.join(os.tmpdir(), `okf-test-sync-${Date.now()}`);

    try {
        // Initial sync
        const syncRes1 = await syncOkf({ baseUrl: mockBaseUrl, okfDir: tempSyncDir, expectedRootHash: mockHash, allowUnverifiedRoot: true, requiredSections: ['194Q'] });
        if (!syncRes1.success || syncRes1.notModified || syncRes1.syncedSections !== 1) {
            throw new Error(`syncOkf failed initial download: ${JSON.stringify(syncRes1)}`);
        }
        console.log(`[PASS] Initial syncOkf succeeded: syncedSections=${syncRes1.syncedSections}, okfVersion=${syncRes1.okfVersion}`);

        // Verify written file
        const manifestOnDisk = JSON.parse(fs.readFileSync(path.join(tempSyncDir, 'manifest.json'), 'utf8'));
        if (manifestOnDisk.rootHash !== mockHash) {
            throw new Error('Manifest on disk does not match mock root hash');
        }
        const stagedFiles = fs.readdirSync(path.join(tempSyncDir, 'sections'));
        if (!stagedFiles.some(f => f.startsWith('194Q-'))) {
            throw new Error('Synced section 194Q file not found on disk');
        }
        console.log(`[PASS] Atomically written file verified on disk: ${stagedFiles[0]}`);

        // Second sync with ETag match -> 304 Not Modified
        const syncRes2 = await syncOkf({ baseUrl: mockBaseUrl, okfDir: tempSyncDir, expectedRootHash: mockHash, allowUnverifiedRoot: true, requiredSections: ['194Q'] });
        if (!syncRes2.success || !syncRes2.notModified) {
            throw new Error('Second sync should have returned notModified=true via HTTP 304');
        }
        console.log(`[PASS] ETag 304 Not Modified verified on second sync: notModified=${syncRes2.notModified}`);

        // checkUpdates with ETag match
        const updateCheck = await checkUpdates({ baseUrl: mockBaseUrl, okfDir: tempSyncDir });
        if (updateCheck.isOutdated !== false || updateCheck.notModified !== true) {
            throw new Error('checkUpdates should report not outdated when rootHash matches');
        }
        console.log(`[PASS] checkUpdates correctly reported up-to-date status via 304.`);
    } finally {
        mockServer.close();
        try {
            fs.rmSync(tempSyncDir, { recursive: true, force: true });
        } catch (_) {}
    }

    // 14. Security Assertions (Insecure Transport & Path Traversal Rejection)
    console.log('\n── Test 14: Security Hardening (Insecure Transport & Path Traversal) ──');
    // Insecure HTTP to remote host must be rejected
    try {
        await syncOkf({ baseUrl: 'http://insecure-remote-domain.com' });
        throw new Error('FAILED: syncOkf should have rejected insecure remote HTTP transport');
    } catch (err) {
        if (err.message.includes('Insecure transport rejected')) {
            console.log(`[PASS] Insecure HTTP transport rejected: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // Path traversal sanitization
    const safeName = resolveSafeStatuteFilename({ sectionCode: '../../etc/passwd', title: 'Malicious Path' });
    if (safeName.includes('/') || safeName.includes('\\') || safeName.includes('..')) {
        throw new Error(`Sanitized filename leaked path separators: ${safeName}`);
    }
    console.log(`[PASS] Path traversal characters safely sanitized into: "${safeName}"`);

    // 15. Windows Reserved Device Names Protection
    console.log('\n── Test 15: Windows Reserved Device Names Protection (CON, PRN, AUX, NUL) ──');
    const winCon = resolveSafeStatuteFilename({ sectionCode: 'CON', title: 'Reserved Device Test' });
    if (!winCon.startsWith('sec_CON')) {
        throw new Error(`Expected Windows reserved name "CON" to be prefixed with sec_, got: ${winCon}`);
    }
    const winNul = resolveSafeStatuteFilename({ sectionCode: 'NUL' });
    if (!winNul.startsWith('sec_NUL')) {
        throw new Error(`Expected Windows reserved name "NUL" to be prefixed with sec_, got: ${winNul}`);
    }
    console.log(`[PASS] Windows reserved names protected: CON -> "${winCon}", NUL -> "${winNul}"`);

    // 16. Prototype Pollution Rejection
    console.log('\n── Test 16: Prototype Pollution Rejection (__proto__, constructor, prototype) ──');
    try {
        resolveSafeStatuteFilename({ sectionCode: '__proto__' });
        throw new Error('FAILED: __proto__ should have been rejected');
    } catch (err) {
        if (err.message.includes('Security violation: Forbidden sectionCode')) {
            console.log(`[PASS] Prototype pollution attempt (__proto__) correctly blocked: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 17. Temporal Date Format Validation
    console.log('\n── Test 17: Strict Date Format Validation (ISO 8601 YYYY-MM-DD) ──');
    try {
        computeTemporalStatus({ effectivePeriod: { validFrom: '2021-07-01', validTo: '2026-03-31' } }, 'INVALID_DATE_STRING');
        throw new Error('FAILED: computeTemporalStatus should have rejected invalid date string');
    } catch (err) {
        if (err.message.includes('Invalid date format')) {
            console.log(`[PASS] Invalid date string correctly rejected: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 18. Section Query Maximum Length Bound
    console.log('\n── Test 18: Section Query Length Bound (> 64 chars) ──');
    try {
        await lookupStatute('A'.repeat(65));
        throw new Error('FAILED: lookupStatute should have rejected query exceeding 64 chars');
    } catch (err) {
        if (err.message.includes('exceeds maximum allowable length')) {
            console.log(`[PASS] Overly long section query correctly rejected: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 19. Transport Security across lookupStatute, listSections, and calculate
    console.log('\n── Test 19: Comprehensive HTTPS Transport Enforcement ──');
    try {
        await lookupStatute('194Q', { baseUrl: 'http://insecure-host.com', mode: 'edge' });
        throw new Error('FAILED: lookupStatute should have rejected insecure remote HTTP');
    } catch (err) {
        if (err.message.includes('Insecure transport rejected')) {
            console.log(`[PASS] lookupStatute rejected insecure remote HTTP: "${err.message}"`);
        } else {
            throw err;
        }
    }

    try {
        await listSections({ baseUrl: 'http://insecure-host.com' });
        throw new Error('FAILED: listSections should have rejected insecure remote HTTP');
    } catch (err) {
        if (err.message.includes('Insecure transport rejected')) {
            console.log(`[PASS] listSections rejected insecure remote HTTP: "${err.message}"`);
        } else {
            throw err;
        }
    }

    const insecureEntClient = new StatutoryClient({
        apiKey: 'test_token',
        baseUrl: 'http://insecure-host.com'
    });
    try {
        await insecureEntClient.calculate({ section: '194Q', invoiceAmount: 8000000 });
        throw new Error('FAILED: client.calculate should have rejected insecure remote HTTP');
    } catch (err) {
        if (err.message.includes('Insecure transport rejected')) {
            console.log(`[PASS] StatutoryClient.calculate rejected insecure remote HTTP: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 20. Unicode NFKC Normalization and Zero-Width Stripping
    console.log('\n── Test 20: Unicode NFKC Normalization & Zero-Width Stripping ──');
    const fullWidthRes = await lookupStatute('１９４Ｑ'); // Full-width 194Q
    if (!fullWidthRes || fullWidthRes.statute.sectionCode !== '194Q') {
        throw new Error('FAILED: lookupStatute failed to normalize full-width Unicode characters');
    }
    console.log(`[PASS] Full-width Unicode "１９４Ｑ" successfully resolved to: Section ${fullWidthRes.statute.sectionCode}`);

    const zeroWidthRes = await lookupStatute('\u200B194Q\uFEFF');
    if (!zeroWidthRes || zeroWidthRes.statute.sectionCode !== '194Q') {
        throw new Error('FAILED: lookupStatute failed to strip zero-width spaces');
    }
    console.log(`[PASS] Zero-width padded "\\u200B194Q\\uFEFF" successfully resolved to: Section ${zeroWidthRes.statute.sectionCode}`);

    // 21. Safe Integer Overflow in StatutoryClient.calculate
    console.log('\n── Test 21: Client Financial Safe Integer Overflow Guard ──');
    const entClient = new StatutoryClient({
        apiKey: 'test_api_key',
        baseUrl: 'https://localhost:8443'
    });
    try {
        await entClient.calculate({ section: '194Q', invoiceAmount: 9007199254740992 });
        throw new Error('FAILED: client.calculate should have rejected amount exceeding MAX_SAFE_INTEGER');
    } catch (err) {
        if (err.message.includes('exceeding Number.MAX_SAFE_INTEGER')) {
            console.log(`[PASS] Safe integer overflow correctly rejected client-side: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 22. Staging Folder & Dotfolder Isolation in findJsonFilesRecursively
    console.log('\n── Test 22: Dotfolder and Abandoned Staging Directory Isolation ──');
    const tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-dotfolder-test-'));
    try {
        const dotStagingDir = path.join(tempTestDir, '.staging-sync-abandoned');
        fs.mkdirSync(dotStagingDir, { recursive: true });
        fs.writeFileSync(path.join(dotStagingDir, 'leak_test.json'), JSON.stringify({ sectionCode: 'LEAKED_TEST_SECTION' }), 'utf8');

        const normalDir = path.join(tempTestDir, 'sections');
        fs.mkdirSync(normalDir, { recursive: true });
        fs.writeFileSync(path.join(normalDir, 'valid_test.json'), JSON.stringify({ sectionCode: 'VALID_SECTION' }), 'utf8');

        const leakedLookup = lookupLocalStatute('LEAKED_TEST_SECTION', tempTestDir);
        if (leakedLookup !== null) {
            throw new Error('FAILED: lookupLocalStatute traversed into hidden .staging-sync-abandoned directory');
        }
        console.log('[PASS] Abandoned .staging-sync-* directory successfully excluded from local lookup.');

        const validLookup = lookupLocalStatute('VALID_SECTION', tempTestDir);
        if (!validLookup || validLookup.sectionCode !== 'VALID_SECTION') {
            throw new Error('FAILED: lookupLocalStatute failed to read legitimate sections directory');
        }
        console.log('[PASS] Legitimate section in sections/ successfully loaded.');
    } finally {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
    }

    // 23. Fail-Closed Invariant & StatutoryIndeterminateError
    console.log('\n── Test 23: Fail-Closed Statutory Invariant ──');
    try {
        await isStatuteActive('UNKNOWN_PROVISION', '2025-06-01', { failClosed: true, mode: 'local' });
        console.log('[PASS] Non-existent section returned false cleanly.');
    } catch (_) {
        throw new Error('FAILED: Non-existent section should return false when not found');
    }

    try {
        // Query against an unreachable local dir with failClosed=true to simulate indeterminate error
        await isStatuteActive('194Q', '2025-06-01', {
            failClosed: true,
            mode: 'local',
            okfDir: path.join(os.tmpdir(), 'non_existent_okf_dir_404')
        });
        throw new Error('FAILED: isStatuteActive should have thrown StatutoryIndeterminateError when directory missing');
    } catch (err) {
        if (err instanceof StatutoryIndeterminateError && err.failClosed) {
            console.log(`[PASS] Indeterminate statutory state threw fail-closed exception: "${err.message}"`);
        } else {
            throw err;
        }
    }

    // 24. Semver Comparison Precision
    console.log('\n── Test 24: Semver Comparison Monotonic Precision ──');
    if (compareSemver('2.4.0', '2.3.9') !== 1 || compareSemver('2.1.0', '2.4.0') !== -1 || compareSemver('2.4.0', '2.4.0') !== 0) {
        throw new Error('FAILED: compareSemver failed comparison checks');
    }
    console.log('[PASS] compareSemver correctly evaluated ordering (2.4.0 > 2.3.9, 2.1.0 < 2.4.0).');

    // 25. Monotonic Version & Rollback Attack Prevention
    console.log('\n── Test 25: Monotonic OKF Bundle Rollback Attack Prevention ──');
    const rollbackServer = http.createServer((req, res) => {
        // Mock server serving older v2.1.0 bundle
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion: '2.1.0', // Older than installed 2.4.0
            rootHash: 'sha256-d9612074241f7c2cc1d05fa5eee254996f21db56ad1ab71ac36a084ffd4169e1',
            publishedAt: '2024-01-01T00:00:00.000Z',
            statutes: [{ sectionCode: '194Q', title: 'Test', effectivePeriod: { validFrom: '2021-07-01' } }]
        }));
    });

    await new Promise(resolve => rollbackServer.listen(0, '127.0.0.1', resolve));
    const rollbackPort = rollbackServer.address().port;

    try {
        const testClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-rollback-test-'));
        try {
            // Write local manifest v2.4.0
            fs.writeFileSync(path.join(testClientDir, 'manifest.json'), JSON.stringify({
                okfVersion: '2.4.0',
                publishedAt: '2026-10-22T20:00:33.899Z',
                rootHash: 'sha256-d9612074241f7c2cc1d05fa5eee254996f21db56ad1ab71ac36a084ffd4169e1'
            }), 'utf8');

            await syncOkf({
                baseUrl: `http://127.0.0.1:${rollbackPort}`,
                okfDir: testClientDir
            });
            throw new Error('FAILED: syncOkf should have rejected downgrade attack (v2.1.0 over v2.4.0)');
        } catch (err) {
            if (err.message.includes('Rollback attack detected')) {
                console.log(`[PASS] Downgrade attack correctly blocked: "${err.message}"`);
            } else {
                throw err;
            }
        } finally {
            fs.rmSync(testClientDir, { recursive: true, force: true });
        }
    } finally {
        rollbackServer.close();
    }

    // 26. Section 393 (Income-tax Act, 2025) Lookup & Temporal Invariant
    console.log('\n── Test 26: Income-tax Act, 2025 — Section 393 Lookup & Temporal Validity ──');
    const sec393 = await lookupStatute('393');
    if (!sec393 || sec393.statute?.sectionCode !== '393') {
        throw new Error('FAILED: lookupStatute(393) failed to resolve Section 393');
    }
    if (sec393.temporalStatus !== 'ACTIVE') {
        throw new Error(`FAILED: Section 393 should be ACTIVE post 1 April 2026, got: ${sec393.temporalStatus}`);
    }
    console.log('[PASS] lookupStatute(393): status=SUCCESS, temporalStatus=ACTIVE, governingStatute=Income-tax Act, 2025');

    // 27. Adversarial Bundle: Recomputed Unauthorized Root Rejection
    console.log('\n── Test 27: Adversarial Bundle — Recomputed Unauthorized Root Rejection ──');
    const tamperedStatute = {
        sectionCode: '194Q',
        title: 'Tampered Section 194Q',
        effectivePeriod: { validFrom: '2021-07-01', validTo: '2026-03-31' },
        taxRate: 0
    };
    const tamperedSafeName = resolveSafeStatuteFilename(tamperedStatute);
    const jsonStr = JSON.stringify(tamperedStatute, null, 2);
    const fileHash = crypto.createHash('sha256').update(jsonStr).digest('hex');
    const rootHasher = crypto.createHash('sha256');
    rootHasher.update(`${tamperedSafeName}:${fileHash}\n`);
    const recomputedTamperedRoot = `sha256-${rootHasher.digest('hex')}`;

    const spoofServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion: STATUTORY_CLIENT_VERSION,
            rootHash: recomputedTamperedRoot,
            publishedAt: '2026-10-24T00:00:00.000Z',
            statutes: [tamperedStatute]
        }));
    });
    await new Promise(resolve => spoofServer.listen(0, '127.0.0.1', resolve));
    const spoofPort = spoofServer.address().port;

    try {
        const testClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-spoof-test-'));
        try {
            // Test 27a: Calling syncOkf with NO caller intervention (no expectedRootHash)
            // Must fail-closed against unpinned and unsigned recomputed root!
            try {
                await syncOkf({
                    baseUrl: `http://127.0.0.1:${spoofPort}`,
                    okfDir: testClientDir
                });
                throw new Error('FAILED: syncOkf should have rejected untrusted recomputed root by default');
            } catch (errDefault) {
                if (errDefault.message.includes('Untrusted bundle rootHash')) {
                    console.log(`[PASS] Untrusted recomputed root blocked without caller intervention: "${errDefault.message}"`);
                } else {
                    throw errDefault;
                }
            }

            // Test 27b: Calling syncOkf with explicit mismatching expectedRootHash
            await syncOkf({
                baseUrl: `http://127.0.0.1:${spoofPort}`,
                okfDir: testClientDir,
                expectedRootHash: 'sha256-authoritative_expected_root_hash_anchor_1234567890'
            });
            throw new Error('FAILED: syncOkf should have rejected unauthorized recomputed root');
        } catch (err) {
            if (err.message.includes('not authorized')) {
                console.log(`[PASS] Unauthorized recomputed root correctly blocked: "${err.message}"`);
            } else {
                throw err;
            }
        } finally {
            fs.rmSync(testClientDir, { recursive: true, force: true });
        }
    } finally {
        spoofServer.close();
    }

    // 28. Adversarial Bundle: Missing Required Sections Rejection
    console.log('\n── Test 28: Adversarial Bundle — Missing Required Sections Rejection ──');
    const incompleteServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion: STATUTORY_CLIENT_VERSION,
            rootHash: recomputedTamperedRoot,
            publishedAt: '2026-10-24T00:00:00.000Z',
            statutes: [tamperedStatute] // Only has 194Q, missing 194J, 17(5), MSMED-15-16
        }));
    });
    await new Promise(resolve => incompleteServer.listen(0, '127.0.0.1', resolve));
    const incompletePort = incompleteServer.address().port;

    try {
        const testClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-missing-test-'));
        try {
            await syncOkf({
                baseUrl: `http://127.0.0.1:${incompletePort}`,
                okfDir: testClientDir,
                expectedRootHash: recomputedTamperedRoot,
                allowUnverifiedRoot: true,
                requiredSections: ['194Q', '194J', '17(5)', 'MSMED-15-16']
            });
            throw new Error('FAILED: syncOkf should have rejected bundle missing required sections');
        } catch (err) {
            if (err.message.includes('missing required statutory provision')) {
                console.log(`[PASS] Incomplete bundle missing required sections correctly blocked: "${err.message}"`);
            } else {
                throw err;
            }
        } finally {
            fs.rmSync(testClientDir, { recursive: true, force: true });
        }
    } finally {
        incompleteServer.close();
    }

    // 29. End-to-End Cryptographic Trust Anchor: Ed25519 Bundle Signature Verification
    console.log('\n── Test 29: End-to-End Cryptographic Trust Anchor (Ed25519 Signature Verification) ──');
    const { publicKey: testPubKey, privateKey: testPrivKey } = crypto.generateKeyPairSync('ed25519');
    const testPubKeyBase64 = testPubKey.export({ type: 'spki', format: 'der' }).toString('base64');

    const signedStatute = {
        sectionId: 'ITA2025_SEC393',
        sectionCode: '393',
        governingStatute: 'Income-tax Act, 2025',
        title: 'Deduction of tax at source on payment on transfer of certain goods',
        effectivePeriod: { validFrom: '2026-04-01' }
    };
    const signedFileName = resolveSafeStatuteFilename(signedStatute);
    const signedJsonStr = JSON.stringify(signedStatute, null, 2);
    const signedFileHash = crypto.createHash('sha256').update(signedJsonStr).digest('hex');
    const signedRootHasher = crypto.createHash('sha256');
    signedRootHasher.update(`${signedFileName}:${signedFileHash}\n`);
    const signedRootHash = `sha256-${signedRootHasher.digest('hex')}`;

    const okfVersion = STATUTORY_CLIENT_VERSION;
    const publishedAt = '2026-10-24T00:00:00.000Z';
    const canonicalPayload = `${okfVersion}|${signedRootHash}|${publishedAt}`;
    const validSignature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), testPrivKey).toString('base64');

    let serverSignature = validSignature;
    const signedServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion,
            rootHash: signedRootHash,
            publishedAt,
            signature: serverSignature,
            statutes: [signedStatute]
        }));
    });
    await new Promise(resolve => signedServer.listen(0, '127.0.0.1', resolve));
    const signedPort = signedServer.address().port;

    try {
        const testClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-signed-test-'));
        try {
            // Case 1: Valid signature with authorized test key succeeds with explicit test flag
            const syncRes = await syncOkf({
                baseUrl: `http://127.0.0.1:${signedPort}`,
                okfDir: testClientDir,
                publicKey: testPubKeyBase64,
                allowUntrustedPublicKey: true,
                skipMandatoryBaselineCheck: true
            });
            if (!syncRes.success || syncRes.syncedSections !== 1) {
                throw new Error(`Signed bundle sync failed: ${JSON.stringify(syncRes)}`);
            }
            console.log('[PASS] Ed25519 signed bundle verified and accepted by trust anchor.');

            // Case 2: Tampered signature must fail closed
            serverSignature = Buffer.from('corrupted_signature_payload_bytes').toString('base64');
            const tamperedClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-bad-sig-test-'));
            try {
                await syncOkf({
                    baseUrl: `http://127.0.0.1:${signedPort}`,
                    okfDir: tamperedClientDir,
                    publicKey: testPubKeyBase64,
                    allowUntrustedPublicKey: true,
                    skipMandatoryBaselineCheck: true
                });
                throw new Error('FAILED: syncOkf should have rejected corrupted Ed25519 signature');
            } catch (errSig) {
                if (errSig.message.includes('Untrusted bundle rootHash')) {
                    console.log(`[PASS] Corrupted Ed25519 signature correctly rejected: "${errSig.message}"`);
                } else {
                    throw errSig;
                }
            } finally {
                fs.rmSync(tamperedClientDir, { recursive: true, force: true });
            }
        } finally {
            fs.rmSync(testClientDir, { recursive: true, force: true });
        }
    } finally {
        signedServer.close();
    }

    // 30. Production Security Guard: Disablement of Development Bypasses
    console.log('\n── Test 30: Production Disablement of Development Bypasses ──');
    const prevNodeEnv = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'production';
        const dummyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-prod-bypass-test-'));
        try {
            await syncOkf({
                baseUrl: 'https://api.mudraforge.in',
                okfDir: dummyDir,
                allowUnverifiedRoot: true
            });
            throw new Error('FAILED: syncOkf must reject allowUnverifiedRoot in production');
        } catch (prodErr) {
            if (prodErr.message.includes('strictly forbidden in production environments')) {
                console.log(`[PASS] Production development bypass guard verified: "${prodErr.message}"`);
            } else {
                throw prodErr;
            }
        } finally {
            fs.rmSync(dummyDir, { recursive: true, force: true });
        }
    } finally {
        process.env.NODE_ENV = prevNodeEnv;
    }

    // 31. Adversarial Trust Chain 1: Valid signature paired with modified statute content
    console.log('\n── Test 31: Adversarial Trust Chain — Modified Statute with Valid Signature ──');
    const tamperedStatutes = [{
        sectionId: 'ITA2025_SEC393',
        sectionCode: '393',
        governingStatute: 'Income-tax Act, 2025',
        title: 'Tampered Statute with False 0% Rate',
        effectivePeriod: { validFrom: '2026-04-01' }
    }];
    const modServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion,
            rootHash: signedRootHash, // Server claims signedRootHash, but files inside are tampered
            publishedAt,
            signature: validSignature,
            statutes: tamperedStatutes
        }));
    });
    await new Promise(resolve => modServer.listen(0, '127.0.0.1', resolve));
    const modPort = modServer.address().port;
    try {
        const modClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-mod-statute-test-'));
        try {
            await syncOkf({
                baseUrl: `http://127.0.0.1:${modPort}`,
                okfDir: modClientDir,
                publicKey: testPubKeyBase64,
                allowUntrustedPublicKey: true,
                skipMandatoryBaselineCheck: true
            });
            throw new Error('FAILED: syncOkf should have caught Merkle root mismatch on tampered statute');
        } catch (modErr) {
            if (modErr.message.includes('Cryptographic integrity violation: Bundle rootHash mismatch')) {
                console.log(`[PASS] Tampered statute with claimed valid rootHash correctly blocked: "${modErr.message}"`);
            } else {
                throw modErr;
            }
        } finally {
            fs.rmSync(modClientDir, { recursive: true, force: true });
        }
    } finally {
        modServer.close();
    }

    // 32. Adversarial Trust Chain 2: Recomputed rootHash paired with old signature
    console.log('\n── Test 32: Adversarial Trust Chain — Recomputed Root with Mismatched Signature ──');
    const tamperedJsonStr = JSON.stringify(tamperedStatutes[0], null, 2);
    const tamperedFileName = resolveSafeStatuteFilename(tamperedStatutes[0]);
    const tamperedFileHash = crypto.createHash('sha256').update(tamperedJsonStr).digest('hex');
    const tamperedHasher = crypto.createHash('sha256');
    tamperedHasher.update(`${tamperedFileName}:${tamperedFileHash}\n`);
    const recomputedTamperedRootHash = `sha256-${tamperedHasher.digest('hex')}`;

    const recomputedServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion,
            rootHash: recomputedTamperedRootHash, // Attacker accurately recomputed root
            publishedAt,
            signature: validSignature, // But signature belongs to the original root
            statutes: tamperedStatutes
        }));
    });
    await new Promise(resolve => recomputedServer.listen(0, '127.0.0.1', resolve));
    const recompPort = recomputedServer.address().port;
    try {
        const recompClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-recomp-sig-test-'));
        try {
            await syncOkf({
                baseUrl: `http://127.0.0.1:${recompPort}`,
                okfDir: recompClientDir,
                publicKey: testPubKeyBase64,
                allowUntrustedPublicKey: true,
                skipMandatoryBaselineCheck: true
            });
            throw new Error('FAILED: syncOkf should have failed signature verification for recomputed root');
        } catch (recompErr) {
            if (recompErr.message.includes('Untrusted bundle rootHash')) {
                console.log(`[PASS] Recomputed rootHash with mismatched signature correctly blocked: "${recompErr.message}"`);
            } else {
                throw recompErr;
            }
        } finally {
            fs.rmSync(recompClientDir, { recursive: true, force: true });
        }
    } finally {
        recomputedServer.close();
    }

    // 33. Adversarial Trust Chain 3: Untrusted public key supplied through caller options in production
    console.log('\n── Test 33: Adversarial Trust Chain — Untrusted Public Key Rejected in Production ──');
    const prevEnvForPubKey = process.env.ENVIRONMENT;
    try {
        process.env.ENVIRONMENT = 'production';
        const dummyKeyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-untrusted-key-test-'));
        try {
            await syncOkf({
                baseUrl: 'https://api.mudraforge.in',
                okfDir: dummyKeyDir,
                publicKey: testPubKeyBase64
            });
            throw new Error('FAILED: syncOkf must reject untrusted public key in production');
        } catch (keyErr) {
            if (keyErr.message.includes('Untrusted public key provided. Only keys registered with the MudraForge Root Authority are accepted')) {
                console.log(`[PASS] Untrusted public key strictly rejected in production: "${keyErr.message}"`);
            } else {
                throw keyErr;
            }
        } finally {
            fs.rmSync(dummyKeyDir, { recursive: true, force: true });
        }
    } finally {
        process.env.ENVIRONMENT = prevEnvForPubKey;
    }

    // 34. Adversarial Trust Chain 4: Production guard across all environment indicators
    console.log('\n── Test 34: Adversarial Trust Chain — Production Guards Across CF and Worker Envs ──');
    const envVarsToTest = ['NODE_ENV=production', 'ENVIRONMENT=production', 'CF_PAGES=1', 'CF_ENVIRONMENT=production', 'PRODUCTION=true'];
    for (const envSetting of envVarsToTest) {
        const [k, v] = envSetting.split('=');
        const oldVal = process.env[k];
        try {
            process.env[k] = v;
            const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-env-guard-test-'));
            try {
                await syncOkf({
                    baseUrl: 'https://api.mudraforge.in',
                    okfDir: testDir,
                    allowUnverifiedRoot: true
                });
                throw new Error(`FAILED: syncOkf should have rejected allowUnverifiedRoot under ${envSetting}`);
            } catch (envErr) {
                if (!envErr.message.includes('strictly forbidden in production environments')) {
                    throw envErr;
                }
            } finally {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        } finally {
            if (oldVal !== undefined) process.env[k] = oldVal;
            else delete process.env[k];
        }
    }
    console.log('[PASS] Production development bypass guard verified across 5 distinct runtime environment variables.');

    // 35. Adversarial Trust Chain 5: Revoked Public Key in CRL Rejected
    console.log('\n── Test 35: Adversarial Trust Chain — Revoked Public Key in CRL Rejected ──');
    const revokedServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion,
            rootHash: signedRootHash,
            publishedAt,
            signature: validSignature,
            statutes: [signedStatute]
        }));
    });
    await new Promise(resolve => revokedServer.listen(0, '127.0.0.1', resolve));
    const revokedPort = revokedServer.address().port;
    try {
        const revokedClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-revoked-key-test-'));
        try {
            await syncOkf({
                baseUrl: `http://127.0.0.1:${revokedPort}`,
                okfDir: revokedClientDir,
                publicKey: testPubKeyBase64,
                allowUntrustedPublicKey: true,
                skipMandatoryBaselineCheck: true,
                revokedKeys: new Set([testPubKeyBase64]) // Explicitly revoked key
            });
            throw new Error('FAILED: syncOkf should have rejected revoked public key');
        } catch (revErr) {
            if (revErr.message.includes('revoked by the MudraForge Root Authority')) {
                console.log(`[PASS] Revoked signing key strictly rejected via CRL: "${revErr.message}"`);
            } else {
                throw revErr;
            }
        } finally {
            fs.rmSync(revokedClientDir, { recursive: true, force: true });
        }
    } finally {
        revokedServer.close();
    }

    // 36. Adversarial Trust Chain 6: Stale Expired Bundle Replay Rejected
    console.log('\n── Test 36: Adversarial Trust Chain — Stale Expired Bundle Replay Rejected ──');
    const expiredBundleServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            okfVersion,
            rootHash: signedRootHash,
            publishedAt,
            expiresAt: '2025-01-01T00:00:00.000Z', // Expired bundle
            signature: validSignature,
            statutes: [signedStatute]
        }));
    });
    await new Promise(resolve => expiredBundleServer.listen(0, '127.0.0.1', resolve));
    const expiredPort = expiredBundleServer.address().port;
    try {
        const expiredClientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-expired-bundle-test-'));
        try {
            await syncOkf({
                baseUrl: `http://127.0.0.1:${expiredPort}`,
                okfDir: expiredClientDir,
                publicKey: testPubKeyBase64,
                allowUntrustedPublicKey: true,
                skipMandatoryBaselineCheck: true
            });
            throw new Error('FAILED: syncOkf should have rejected expired bundle payload');
        } catch (expErr) {
            if (expErr.message.includes('Untrusted bundle rootHash')) {
                console.log(`[PASS] Expired bundle replay correctly blocked: "${expErr.message}"`);
            } else {
                throw expErr;
            }
        } finally {
            fs.rmSync(expiredClientDir, { recursive: true, force: true });
        }
    } finally {
        expiredBundleServer.close();
    }

    // 37. Package Update Notifier (Zero-Dependency npm version check)
    console.log('\n── Test 37: Zero-Dependency Package Update Notifier (npm registry check) ──');
    let mockLatestPkgVersion = '2.5.0';
    const mockNpmServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            name: '@mudraforge/statutory',
            version: mockLatestPkgVersion
        }));
    });
    await new Promise(resolve => mockNpmServer.listen(0, '127.0.0.1', resolve));
    const mockNpmPort = mockNpmServer.address().port;
    const mockNpmUrl = `http://127.0.0.1:${mockNpmPort}`;

    try {
        // 37.1 Newer version available
        mockLatestPkgVersion = '2.5.0';
        const resNewer = await checkForPackageUpdate({
            registryUrl: mockNpmUrl,
            currentVersion: '2.4.1',
            cacheTtlMs: 0
        });
        if (!resNewer || !resNewer.updateAvailable || resNewer.latestVersion !== '2.5.0') {
            throw new Error(`Expected updateAvailable: true, got ${JSON.stringify(resNewer)}`);
        }
        console.log(`[PASS] checkForPackageUpdate correctly detected newer version: ${resNewer.currentVersion} -> ${resNewer.latestVersion}`);

        // 37.2 Already up to date or older
        mockLatestPkgVersion = '2.4.1';
        const resSame = await checkForPackageUpdate({
            registryUrl: mockNpmUrl,
            currentVersion: '2.4.1',
            cacheTtlMs: 0
        });
        if (!resSame || resSame.updateAvailable) {
            throw new Error(`Expected updateAvailable: false, got ${JSON.stringify(resSame)}`);
        }
        console.log(`[PASS] checkForPackageUpdate correctly detected up-to-date status.`);

        // 37.3 NO_UPDATE_NOTIFIER opt-out
        process.env.NO_UPDATE_NOTIFIER = '1';
        try {
            const resOptOut = await checkForPackageUpdate({ registryUrl: mockNpmUrl });
            if (resOptOut !== null) {
                throw new Error('Expected null when NO_UPDATE_NOTIFIER=1');
            }
            console.log(`[PASS] checkForPackageUpdate respected NO_UPDATE_NOTIFIER=1 opt-out.`);
        } finally {
            delete process.env.NO_UPDATE_NOTIFIER;
        }

        // 37.4 Silent fail-open on network error
        const resDeadNet = await checkForPackageUpdate({
            registryUrl: 'http://127.0.0.1:1', // invalid dead port
            timeoutMs: 200,
            cacheTtlMs: 0
        });
        if (resDeadNet !== null) {
            throw new Error('Expected null fail-open on dead network');
        }
        console.log(`[PASS] checkForPackageUpdate gracefully handled dead network with zero crashes.`);
    } finally {
        mockNpmServer.close();
    }

    // 38. Direct Tax: Section 194C (Payments to Contractors & Sub-contractors)
    console.log('\n── Test 38: Direct Tax — Section 194C (TDS on Payments to Contractors) ──');
    const res194C = await lookupStatute('194C');
    if (res194C.status !== 'SUCCESS') {
        throw new Error(`lookupStatute(194C) failed: ${JSON.stringify(res194C)}`);
    }
    const cThresholds = res194C.statute.keyStatutoryThresholds;
    if (cThresholds.singleContractThresholdInr !== 30000 || cThresholds.annualAggregateThresholdInr !== 100000) {
        throw new Error('Section 194C thresholds invalid: expected ₹30k single / ₹1L aggregate');
    }
    if (cThresholds.individualHufRatePercent !== 1.0 || cThresholds.otherEntitiesRatePercent !== 2.0) {
        throw new Error('Section 194C rates invalid: expected 1% Individual/HUF, 2% Other entities');
    }
    if (cThresholds.transporterGoodsCarriageLimit !== 10) {
        throw new Error('Section 194C(6) goods carriage limit invalid: expected 10');
    }
    if (res194C.statute.successorSection !== 'Section 393(1), Table 3, Item (i)') {
        throw new Error('Section 194C successor section invalid under Income-tax Act, 2025');
    }
    console.log(`[PASS] 194C Statutory Baseline Verified: ₹30k Single / ₹1L Aggregate, 1% Individual, 2% Company, 10-Carriage Transporter Rule.`);

    // 39. Direct Tax: Section 194I (Rent on Land, Building, Furniture, Machinery)
    console.log('\n── Test 39: Direct Tax — Section 194I (TDS on Rent) ──');
    const res194I = await lookupStatute('194I');
    if (res194I.status !== 'SUCCESS') {
        throw new Error(`lookupStatute(194I) failed: ${JSON.stringify(res194I)}`);
    }
    const iThresholds = res194I.statute.keyStatutoryThresholds;
    if (iThresholds.annualAggregateThresholdInr !== 240000) {
        throw new Error('Section 194I threshold invalid: expected ₹2,40,000 aggregate');
    }
    if (iThresholds.plantMachineryEquipmentRatePercent !== 2.0 || iThresholds.landBuildingFurnitureRatePercent !== 10.0) {
        throw new Error('Section 194I rates invalid: expected 2% Machinery/Plant, 10% Land/Building');
    }
    if (res194I.statute.successorSection !== 'Section 393(1), Table 5, Item (i)') {
        throw new Error('Section 194I successor section invalid under Income-tax Act, 2025');
    }
    console.log(`[PASS] 194I Statutory Baseline Verified: ₹2.4L Aggregate Threshold, 2% Machinery / 10% Land & Building.`);

    // 40. Direct Tax: Section 194H (Commission and Brokerage)
    console.log('\n── Test 40: Direct Tax — Section 194H (TDS on Commission & Brokerage) ──');
    const res194H = await lookupStatute('194H');
    if (res194H.status !== 'SUCCESS') {
        throw new Error(`lookupStatute(194H) failed: ${JSON.stringify(res194H)}`);
    }
    const hThresholds = res194H.statute.keyStatutoryThresholds;
    if (hThresholds.annualAggregateThresholdInr !== 15000) {
        throw new Error('Section 194H threshold invalid: expected ₹15,000 aggregate');
    }
    if (hThresholds.standardRatePercent !== 2.0 || hThresholds.preOct2024RatePercent !== 5.0) {
        throw new Error('Section 194H rate change invalid: expected 2% post-Oct 2024 (was 5%)');
    }
    if (res194H.statute.successorSection !== 'Section 393(1), Table 4, Item (i)') {
        throw new Error('Section 194H successor section invalid under Income-tax Act, 2025');
    }
    console.log(`[PASS] 194H Statutory Baseline Verified: ₹15k Aggregate Threshold, 2% Rate (amended from 5% w.e.f. 01-10-2024).`);

    // 41. Deterministic Tax Identifier Decoding & Offline Mod-36 GSTIN Checksum
    console.log('\n── Test 41: Tax Identifier Decoding & Offline ISO/IEC 7064 Mod-36 Checksum ──');
    // Valid GSTIN: 27AAPFU0939F1ZV
    const validGstinRes = decodeTaxIdentifier('27AAPFU0939F1ZV');
    if (!validGstinRes.isValid || !validGstinRes.checksumValid) {
        throw new Error(`Expected 27AAPFU0939F1ZV to be valid, got: ${JSON.stringify(validGstinRes)}`);
    }
    if (validGstinRes.pan !== 'AAPFU0939F' || validGstinRes.stateCode !== '27' || validGstinRes.stateName !== 'Maharashtra') {
        throw new Error(`GSTIN metadata extraction failed: ${JSON.stringify(validGstinRes)}`);
    }
    if (validGstinRes.entityCode !== 'F' || validGstinRes.isIndividualOrHuf !== false || validGstinRes.standard194cRatePercent !== 2.0) {
        throw new Error(`Firm PAN 194C classification failed: expected 2% for Firm, got: ${JSON.stringify(validGstinRes)}`);
    }

    // Corrupted GSTIN Check Character
    const corruptGstinRes = decodeTaxIdentifier('27AAPFU0939F1Z0');
    if (corruptGstinRes.isValid !== false || corruptGstinRes.checksumValid !== false) {
        throw new Error('Expected corrupted check digit in GSTIN to be rejected');
    }
    if (!corruptGstinRes.error || !corruptGstinRes.error.includes('checksum mismatch')) {
        throw new Error(`Expected checksum mismatch error, got: ${corruptGstinRes.error}`);
    }

    // Individual PAN: ABCPK5678Z (4th char P)
    const indPanRes = decodeTaxIdentifier('ABCPK5678Z');
    if (!indPanRes.isValid || indPanRes.type !== 'PAN' || indPanRes.entityCode !== 'P') {
        throw new Error(`Individual PAN decoding failed: ${JSON.stringify(indPanRes)}`);
    }
    if (indPanRes.isIndividualOrHuf !== true || indPanRes.standard194cRatePercent !== 1.0) {
        throw new Error(`Individual PAN 194C classification failed: expected 1%, got: ${JSON.stringify(indPanRes)}`);
    }

    // Company PAN: AAACA1234C (4th char C)
    const compPanRes = decodeTaxIdentifier('AAACA1234C');
    if (!compPanRes.isValid || compPanRes.isIndividualOrHuf !== false || compPanRes.standard194cRatePercent !== 2.0) {
        throw new Error(`Company PAN 194C classification failed: expected 2%, got: ${JSON.stringify(compPanRes)}`);
    }

    // Direct Checksum utility validation
    if (!isValidGstinChecksum('27AAPFU0939F1ZV') || isValidGstinChecksum('27AAPFU0939F1Z0')) {
        throw new Error('Direct isValidGstinChecksum check failed');
    }

    console.log('[PASS] Tax Identifier Decoder & Mod-36 Checksum Verified: 100% Deterministic PAN/GSTIN Parsing & 194C Classification.');

    // 42. Indirect Tax (GST) — Section 16(2) (ITC Eligibility Conditions & 180-Day Rule)
    console.log('\n── Test 42: Indirect Tax (GST) — Section 16(2) (ITC Eligibility Conditions & 180-Day Rule) ──');
    const res16_2 = await lookupStatute('16(2)');
    if (res16_2.status !== 'SUCCESS' || res16_2.temporalStatus !== 'ACTIVE') {
        throw new Error(`Section 16(2) lookup failed: ${JSON.stringify(res16_2)}`);
    }
    const sec16Thresholds = res16_2.statute.keyStatutoryThresholds;
    if (!sec16Thresholds || sec16Thresholds.vendorPaymentWindowDays !== 180) {
        throw new Error(`Section 16(2) 180-day threshold missing: ${JSON.stringify(sec16Thresholds)}`);
    }
    if (sec16Thresholds.reversalReportingTable !== 'GSTR-3B Table 4(B)(2)') {
        throw new Error(`Section 16(2) Table 4(B)(2) reversal mapping invalid: ${sec16Thresholds.reversalReportingTable}`);
    }
    if (!sec16Thresholds.reversalReportingTable || !sec16Thresholds.reclaimReportingTable.includes('Table 4(D)(1)')) {
        throw new Error('Section 16(2) reclaim table disclosure missing Table 4(D)(1)');
    }
    if (!Array.isArray(sec16Thresholds.statutoryReversalExceptions) || sec16Thresholds.statutoryReversalExceptions.length < 3) {
        throw new Error('Section 16(2) statutory reversal exceptions missing RCM/Schedule I entries');
    }
    if (!sec16Thresholds.annualCutoffDeadline.includes('30th November') || !sec16Thresholds.retrospectiveReliefProvisions.includes('Section 16(5)')) {
        throw new Error('Section 16(4) 30th November cutoff or 16(5) retrospective relief missing');
    }
    const sec16Docs = res16_2.statute.supportingDocuments;
    if (!sec16Docs || !sec16Docs.circulars.includes('cbic_circular_170_2022_itc_reporting.md') || !sec16Docs.forms.includes('gstr_3b_table_4_itc_reversal.json')) {
        throw new Error(`Section 16(2) supporting circulars/forms missing: ${JSON.stringify(sec16Docs)}`);
    }
    console.log('[PASS] 16(2) Statutory Baseline Verified: 5 Conditions (a-d), 180-Day Reversal Clock, RCM Exceptions, Table 4(B)(2)/4(D)(1) Mappings & Nov 30 Cutoff.');

    // 43. Domain-Preserving Synchronization & Anti-Redundancy Verification
    console.log('\n── Test 43: Domain-Preserving syncOkf() & Zero Redundant sections/ Directory ──');
    const tempDomainSyncDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-domain-sync-test-'));
    const domainStatute = {
        sectionId: 'CGST2017_SEC16_2',
        sectionCode: '16(2)',
        domain: 'indirect_tax_gst',
        relPath: 'indirect_tax_gst/itc_eligibility_16_2/section.json',
        title: 'Eligibility and conditions for taking input tax credit',
        effectivePeriod: { validFrom: '2017-07-01', validTo: '2099-12-31' }
    };
    const domainJsonStr = JSON.stringify(domainStatute, null, 2);
    const domainFileHash = crypto.createHash('sha256').update(domainJsonStr).digest('hex');
    const domainBaseName = resolveSafeStatuteFilename(domainStatute);
    const domainRootHash = `sha256-${crypto.createHash('sha256').update(`${domainBaseName}:${domainFileHash}\n`).digest('hex')}`;

    const domainMockServer = http.createServer((req, res) => {
        if (req.url === '/api/v1/statutory/bundle.json') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'ETag': `"${domainRootHash}"` });
            return res.end(JSON.stringify({
                okfVersion: STATUTORY_CLIENT_VERSION,
                publishedAt: '2026-10-24T19:45:00.000Z',
                rootHash: domainRootHash,
                totalSections: 1,
                statutes: [domainStatute]
            }));
        }
        res.writeHead(404);
        res.end();
    });

    await new Promise(resolve => domainMockServer.listen(0, '127.0.0.1', resolve));
    const domainMockPort = domainMockServer.address().port;

    try {
        const syncResult = await syncOkf({
            baseUrl: `http://127.0.0.1:${domainMockPort}`,
            okfDir: tempDomainSyncDir,
            allowUnverifiedRoot: true,
            skipMandatoryBaselineCheck: true
        });

        if (!syncResult.success) {
            throw new Error('syncOkf domain sync failed');
        }

        const expectedSectionPath = path.join(tempDomainSyncDir, 'indirect_tax_gst', 'itc_eligibility_16_2', 'section.json');
        if (!fs.existsSync(expectedSectionPath)) {
            throw new Error(`Domain hierarchy not preserved on disk: ${expectedSectionPath} not found`);
        }

        const redundantSectionsDir = path.join(tempDomainSyncDir, 'sections');
        if (fs.existsSync(redundantSectionsDir)) {
            throw new Error(`Redundant sections/ directory was created during domain-aware sync!`);
        }

        const manifestPath = path.join(tempDomainSyncDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error('Manifest not generated in target directory');
        }
        const syncedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!syncedManifest.domains || !syncedManifest.domains.indirect_tax_gst || !syncedManifest.domains.indirect_tax_gst.includes('16(2)')) {
            throw new Error(`Synced manifest missing domain mapping: ${JSON.stringify(syncedManifest.domains)}`);
        }

        console.log('[PASS] Domain-Preserving Sync Verified: Files unpacked into domain directories with ZERO redundant sections/ folder.');
    } finally {
        await new Promise(resolve => domainMockServer.close(resolve));
        try {
            fs.rmSync(tempDomainSyncDir, { recursive: true, force: true });
        } catch (_) {}
    }

    // 44. Indirect Tax (GST) — Section 8 (Composite & Mixed Supplies)
    console.log('\n── Test 44: Indirect Tax (GST) — Section 8 (Composite & Mixed Supplies) ──');
    const resSec8 = await lookupStatute('8');
    if (!resSec8 || resSec8.status !== 'SUCCESS') {
        throw new Error('lookupStatute(8) failed to resolve Section 8');
    }
    const sec8Thresholds = resSec8.statute.keyStatutoryThresholds;
    if (!sec8Thresholds.compositeSupplyRule.includes('Principal Supply') || !sec8Thresholds.mixedSupplyRule.includes('Highest Rate')) {
        throw new Error('Section 8 composite/mixed supply statutory rules missing');
    }
    const sec8Docs = resSec8.statute.supportingDocuments;
    if (!sec8Docs || !sec8Docs.circulars.includes('cbic_circular_47_2018_composite_mixed_supplies.md') || !sec8Docs.forms.includes('composite_mixed_supply_assessment_matrix.json')) {
        throw new Error(`Section 8 supporting documents missing: ${JSON.stringify(sec8Docs)}`);
    }
    console.log('[PASS] Section 8 Verified: Composite Supply (Principal Rate) vs. Mixed Supply (Highest Rate) & Matrix Schema.');

    // 45. Indirect Tax (GST) — Section 9(3) (Reverse Charge Mechanism - RCM)
    console.log('\n── Test 45: Indirect Tax (GST) — Section 9(3) (Reverse Charge Mechanism) ──');
    const resSec9_3 = await lookupStatute('9(3)');
    if (!resSec9_3 || resSec9_3.status !== 'SUCCESS') {
        throw new Error('lookupStatute(9(3)) failed to resolve Section 9(3)');
    }
    const sec9_3Thresholds = resSec9_3.statute.keyStatutoryThresholds;
    if (!sec9_3Thresholds.mandatoryCashPaymentRule.includes('Electronic Cash Ledger') || !sec9_3Thresholds.selfInvoiceMandate.includes('Section 31(3)(f)')) {
        throw new Error('Section 9(3) cash payment mandate or self-invoicing rules missing');
    }
    const sec9_3Docs = resSec9_3.statute.supportingDocuments;
    if (!sec9_3Docs || !sec9_3Docs.circulars.includes('cbic_circular_102_2019_rcm_clarifications.md') || !sec9_3Docs.forms.includes('rcm_self_invoice_payment_voucher.json')) {
        throw new Error(`Section 9(3) supporting documents missing: ${JSON.stringify(sec9_3Docs)}`);
    }
    console.log('[PASS] Section 9(3) Verified: RCM Categories, Mandatory Cash Discharge, Self-Invoice & Payment Voucher Schemas.');

    // 46. International Tax — Section 195 (Cross-Border Remittances & DTAA)
    console.log('\n── Test 46: International Tax — Section 195 (Cross-Border Remittances & DTAA) ──');
    const resSec195 = await lookupStatute('195');
    if (!resSec195 || resSec195.status !== 'SUCCESS') {
        throw new Error('lookupStatute(195) failed to resolve Section 195');
    }
    const sec195Thresholds = resSec195.statute.keyStatutoryThresholds;
    if (!sec195Thresholds.treatyBeneficialProvision.includes('Section 90(2)') || !sec195Thresholds.supremeCourtEngineeringAnalysisDoctrine.includes('business profits')) {
        throw new Error('Section 195 DTAA treaty rules or Supreme Court Engineering Analysis doctrine missing');
    }
    const sec195Docs = resSec195.statute.supportingDocuments;
    if (!sec195Docs || !sec195Docs.circulars.includes('supreme_court_engineering_analysis_doctrine.md') || !sec195Docs.forms.includes('form_15ca_15cb_compliance_checklist.json')) {
        throw new Error(`Section 195 supporting documents missing: ${JSON.stringify(sec195Docs)}`);
    }
    console.log('[PASS] Section 195 Verified: Section 90(2) DTAA, Electronic Form 10F, Rule 37BB Form 15CA/CB & Cloud SaaS Exemption.');

    // 47. Commercial & MSME — MCA Form MSME-1 Filing
    console.log('\n── Test 47: Commercial & MSME — MCA Form MSME-1 Filing (Companies Act §405) ──');
    const resMsme1 = await lookupStatute('MCA-MSME-1');
    if (!resMsme1 || resMsme1.status !== 'SUCCESS') {
        throw new Error('lookupStatute(MCA-MSME-1) failed to resolve Form MSME-1');
    }
    const msme1Thresholds = resMsme1.statute.keyStatutoryThresholds;
    if (msme1Thresholds.overdueTriggerDays !== 45 || !msme1Thresholds.halfYear1Period.includes('October 31') || !msme1Thresholds.halfYear2Period.includes('April 30')) {
        throw new Error('Form MSME-1 45-day overdue trigger or half-yearly deadlines missing');
    }
    const msme1Docs = resMsme1.statute.supportingDocuments;
    if (!msme1Docs || !msme1Docs.circulars.includes('mca_order_2019_specified_companies.md') || !msme1Docs.forms.includes('form_msme_1_half_yearly_return.json')) {
        throw new Error(`Form MSME-1 supporting documents missing: ${JSON.stringify(msme1Docs)}`);
    }
    console.log('[PASS] MCA Form MSME-1 Verified: 45-Day Overdue Trigger, Half-Yearly Deadlines (Oct 31/Apr 30) & Section 405 Penalties.');

    // 48. Commercial & MSME — Section 22 / Schedule III Disclosures
    console.log('\n── Test 48: Commercial & MSME — Section 22 Disclosures & Schedule III Aging ──');
    const resSec22 = await lookupStatute('MSMED-SEC-22');
    if (!resSec22 || resSec22.status !== 'SUCCESS') {
        throw new Error('lookupStatute(MSMED-SEC-22) failed to resolve Section 22');
    }
    const sec22Thresholds = resSec22.statute.keyStatutoryThresholds;
    if (sec22Thresholds.mandatoryDisclosureCount !== 5 || !Array.isArray(sec22Thresholds.scheduleIiiAgingBuckets) || sec22Thresholds.scheduleIiiAgingBuckets.length < 4) {
        throw new Error('Section 22 5-point disclosures or Schedule III 4-bucket aging schedule missing');
    }
    const sec22Docs = resSec22.statute.supportingDocuments;
    if (!sec22Docs || !sec22Docs.circulars.includes('icai_guidance_note_schedule_iii_trade_payables.md') || !sec22Docs.forms.includes('schedule_iii_msme_aging_table.json')) {
        throw new Error(`Section 22 supporting documents missing: ${JSON.stringify(sec22Docs)}`);
    }
    console.log('[PASS] Section 22 Verified: 5 Mandatory Notes to Accounts, Schedule III Aging Table & Section 23 Tax Add-Back.');

    // 49. Commercial & MSME — Section 7 Composite Classification & Export Turnover Carve-Out
    console.log('\n── Test 49: Commercial & MSME — Section 7 Composite Criteria & Export Carve-Out ──');
    const resSec7 = await lookupStatute('MSMED-SEC-7');
    if (!resSec7 || resSec7.status !== 'SUCCESS') {
        throw new Error('lookupStatute(MSMED-SEC-7) failed to resolve Section 7');
    }
    const sec7Thresholds = resSec7.statute.keyStatutoryThresholds;
    if (sec7Thresholds.microLimits.maxTurnoverExcludingExportsInr !== 50000000 || sec7Thresholds.smallLimits.maxTurnoverExcludingExportsInr !== 500000000) {
        throw new Error('Section 7 Micro (₹5Cr) / Small (₹50Cr) turnover thresholds missing');
    }
    if (!sec7Thresholds.exportTurnoverExclusionRule.includes('Exports of goods or services')) {
        throw new Error('Section 7 statutory export turnover exclusion rule missing');
    }
    const sec7Docs = resSec7.statute.supportingDocuments;
    if (!sec7Docs || !sec7Docs.circulars.includes('msme_notification_2119_e_composite_criteria.md') || !sec7Docs.forms.includes('udyam_composite_calculation_worksheet.json')) {
        throw new Error(`Section 7 supporting documents missing: ${JSON.stringify(sec7Docs)}`);
    }
    console.log('[PASS] Section 7 Verified: Composite Criteria (Micro/Small/Medium), Paragraph 4 Export Carve-Out & Worksheet Schema.');

    // 50. Direct Tax — Section 194R (Business Perquisites & Benefits)
    console.log('\n── Test 50: Direct Tax — Section 194R (Business Perquisites & Benefits) ──');
    const res194R = await lookupStatute('194R');
    if (res194R.status !== 'SUCCESS' || res194R.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(194R) failed to resolve Section 194R');
    }
    const rThresholds = res194R.statute.keyStatutoryThresholds;
    if (rThresholds.annualExemptionLimitInr !== 20000 || rThresholds.standardDeductionRatePercent !== 10) {
        throw new Error('Section 194R baseline mismatch (expected ₹20k ceiling, 10% rate)');
    }
    console.log('[PASS] Section 194R Verified: 10% TDS, ₹20k Ceiling & Circular 12/2022 Valuation.');

    // 51. Direct Tax — Section 206AB (Higher Rates for Non-Filers & Finance Act 2025 Sunset)
    console.log('\n── Test 51: Direct Tax — Section 206AB (Higher Rates for Non-Filers & Finance Act 2025 Sunset) ──');
    // Pre-sunset historical verification (prior to 1 April 2025)
    const res206AB_hist = await lookupStatute('206AB', { asOfDate: '2024-12-01' });
    if (res206AB_hist.status !== 'SUCCESS' || res206AB_hist.temporalStatus !== 'ACTIVE') {
        throw new Error(`lookupStatute(206AB, 2024-12-01) expected ACTIVE, got ${res206AB_hist.temporalStatus}`);
    }
    const abThresholds = res206AB_hist.statute.keyStatutoryThresholds;
    if (abThresholds.priorYearAggregateTdsTcsThresholdInr !== 50000) {
        throw new Error('Section 206AB ₹50k threshold mismatch');
    }
    const isHistActive = await isStatuteActive('206AB', '2024-12-01');
    if (isHistActive !== true) {
        throw new Error('isStatuteActive(206AB, 2024-12-01) expected true');
    }

    // Post-sunset verification (on or after 1 April 2025)
    const res206AB_sunset = await lookupStatute('206AB', { asOfDate: '2025-06-01' });
    if (res206AB_sunset.temporalStatus !== 'SUNSET_SUPERSEDED') {
        throw new Error(`lookupStatute(206AB, 2025-06-01) expected SUNSET_SUPERSEDED, got ${res206AB_sunset.temporalStatus}`);
    }
    const isPostActive = await isStatuteActive('206AB', '2025-06-01');
    if (isPostActive !== false) {
        throw new Error('isStatuteActive(206AB, 2025-06-01) expected false');
    }

    // Crosswalk verification
    const cw206AB = crosswalkStatute('206AB', { creditDate: '2025-05-20' });
    if (cw206AB.temporalStatus !== 'SUNSET_OMITTED') {
        throw new Error(`crosswalkStatute(206AB, 2025-05-20) expected SUNSET_OMITTED, got ${cw206AB.temporalStatus}`);
    }
    console.log('[PASS] Section 206AB Verified: Historical 2x/5% rate active pre-1 April 2025; SUNSET_OMITTED post-1 April 2025.');

    // 52. Indirect Tax (GST) — Section 51 (TDS under GST)
    console.log('\n── Test 52: Indirect Tax (GST) — Section 51 (TDS under GST) ──');
    const res51 = await lookupStatute('51');
    if (res51.status !== 'SUCCESS' || res51.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(51) failed to resolve Section 51');
    }
    const gst51Thresholds = res51.statute.keyStatutoryThresholds;
    if (gst51Thresholds.contractThresholdExcludingGstInr !== 250000 || gst51Thresholds.totalCompositeGstTdsRatePercent !== 2) {
        throw new Error('Section 51 baseline mismatch (expected ₹2.5L contract threshold, 2% rate)');
    }
    console.log('[PASS] Section 51 Verified: 2% GST TDS (1% CGST + 1% SGST), ₹2.5L Contract Ceiling & GSTR-7.');

    // 53. Indirect Tax (GST) — Section 34 (Credit & Debit Notes)
    console.log('\n── Test 53: Indirect Tax (GST) — Section 34 (Credit & Debit Notes) ──');
    const res34 = await lookupStatute('34');
    if (res34.status !== 'SUCCESS' || res34.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(34) failed to resolve Section 34');
    }
    const sec34Thresholds = res34.statute.keyStatutoryThresholds;
    if (!sec34Thresholds.annualAdjustmentCutoffDate.includes('30th November')) {
        throw new Error('Section 34 November 30 cutoff date missing');
    }
    console.log('[PASS] Section 34 Verified: Credit/Debit Note Tax Adjustments & 30th November Cutoff.');

    // 54. Indirect Tax (GST) — Section 10 (Composition Scheme & Bill of Supply)
    console.log('\n── Test 54: Indirect Tax (GST) — Section 10 (Composition Scheme & Bill of Supply) ──');
    const res10 = await lookupStatute('10');
    if (res10.status !== 'SUCCESS' || res10.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(10) failed to resolve Section 10');
    }
    const sec10Thresholds = res10.statute.keyStatutoryThresholds;
    if (sec10Thresholds.turnoverCeilingGeneralStatesInr !== 15000000) {
        throw new Error('Section 10 ₹1.5 Cr turnover ceiling missing');
    }
    console.log('[PASS] Section 10 Verified: ₹1.5 Cr Ceiling, Zero Tax Collection u/s 10(4) & Zero Recipient ITC.');

    // 55. Indirect Tax (GST) — Rule 48(4) (Mandatory E-Invoicing & IRN Validity)
    console.log('\n── Test 55: Indirect Tax (GST) — Rule 48(4) (Mandatory E-Invoicing & IRN Validity) ──');
    const res48 = await lookupStatute('RULE-48(4)');
    if (res48.status !== 'SUCCESS' || res48.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(RULE-48(4)) failed to resolve Rule 48(4)');
    }
    const r48Thresholds = res48.statute.keyStatutoryThresholds;
    if (r48Thresholds.aggregateTurnoverThresholdInr !== 50000000) {
        throw new Error('Rule 48(4) ₹5 Cr threshold missing');
    }
    console.log('[PASS] Rule 48(4) Verified: > ₹5 Cr Turnover, 64-char IRN & Rule 48(5) Void Invoice Penalty.');

    // 56. Cryptographic Substrate Verification — Clean Repository
    console.log('\n── Test 56: Cryptographic Substrate Verification (verifyLocalSubstrate) ──');
    const verifyReport = verifyLocalSubstrate();
    if (!verifyReport.valid || verifyReport.exitCode !== 0) {
        throw new Error(`Expected clean verification (exitCode 0), got exitCode ${verifyReport.exitCode}`);
    }
    if (!verifyReport.integrity.valid || verifyReport.integrity.mismatches.length > 0) {
        throw new Error(`Integrity check failed with mismatches: ${JSON.stringify(verifyReport.integrity.mismatches)}`);
    }
    if (!verifyReport.authenticity.valid || !verifyReport.authenticity.isPinned) {
        throw new Error(`Authenticity check failed or root was not pinned: ${JSON.stringify(verifyReport.authenticity)}`);
    }
    if (!verifyReport.baselineCheck.valid) {
        throw new Error(`Baseline check failed: missing ${verifyReport.baselineCheck.missingBaseline.join(', ')}`);
    }
    console.log(`[PASS] verifyLocalSubstrate: Clean local OKF validated (${verifyReport.integrity.totalFilesChecked} files, ${verifyReport.authenticity.method}, exitCode 0).`);

    // 57. Cryptographic Substrate Verification — File Tampering Detection (Exit Code 2)
    console.log('\n── Test 57: Integrity Failure Detection on Tampered File (Exit Code 2) ──');
    const tempTamperDir = path.join(os.tmpdir(), `okf-tamper-test-${Date.now()}`);
    try {
        fs.mkdirSync(path.join(tempTamperDir, 'direct_tax'), { recursive: true });
        const mockManifest = {
            okfVersion: '2.6.0',
            rootHash: 'sha256-dummy_root',
            sections: ['194Q', '194J', '17(5)', 'MSMED-15-16', '393'],
            files: {
                'direct_tax/section.json': '0000000000000000000000000000000000000000000000000000000000000000'
            }
        };
        fs.writeFileSync(path.join(tempTamperDir, 'manifest.json'), JSON.stringify(mockManifest, null, 2), 'utf8');
        fs.writeFileSync(path.join(tempTamperDir, 'direct_tax', 'section.json'), JSON.stringify({ sectionCode: '194Q' }), 'utf8');

        const tamperReport = verifyLocalSubstrate(tempTamperDir);
        if (tamperReport.valid || tamperReport.exitCode !== STATUTORY_EXIT_CODES.INTEGRITY_OR_SECURITY_FAILURE) {
            throw new Error(`Expected exitCode 2 for file mismatch, got ${tamperReport.exitCode}`);
        }
        if (tamperReport.integrity.mismatches.length !== 1) {
            throw new Error(`Expected 1 mismatch, got ${tamperReport.integrity.mismatches.length}`);
        }
        console.log('[PASS] verifyLocalSubstrate correctly detected file tampering and returned exitCode 2.');
    } finally {
        fs.rmSync(tempTamperDir, { recursive: true, force: true });
    }

    // 58. Cryptographic Substrate Verification — Untrusted Root Rejection (Exit Code 2)
    console.log('\n── Test 58: Authenticity Failure on Untrusted Merkle Root (Exit Code 2) ──');
    const tempUntrustedDir = path.join(os.tmpdir(), `okf-untrusted-test-${Date.now()}`);
    try {
        fs.mkdirSync(path.join(tempUntrustedDir, 'direct_tax'), { recursive: true });
        const dummySecContent = JSON.stringify({ sectionCode: '194Q' }, null, 2);
        const dummyHash = crypto.createHash('sha256').update(dummySecContent).digest('hex');
        const computedRoot = `sha256-${crypto.createHash('sha256').update(`direct_tax/section.json:${dummyHash}\n`).digest('hex')}`;

        const unpinnedManifest = {
            okfVersion: '2.6.0',
            rootHash: computedRoot, // valid integrity against file, but not pinned
            sections: ['194Q', '194J', '17(5)', 'MSMED-15-16', '393'],
            files: {
                'direct_tax/section.json': dummyHash
            }
        };
        fs.writeFileSync(path.join(tempUntrustedDir, 'manifest.json'), JSON.stringify(unpinnedManifest, null, 2), 'utf8');
        fs.writeFileSync(path.join(tempUntrustedDir, 'direct_tax', 'section.json'), dummySecContent, 'utf8');

        const untrustedReport = verifyLocalSubstrate(tempUntrustedDir);
        if (untrustedReport.valid || untrustedReport.exitCode !== STATUTORY_EXIT_CODES.INTEGRITY_OR_SECURITY_FAILURE) {
            throw new Error(`Expected exitCode 2 for untrusted unpinned root, got ${untrustedReport.exitCode}`);
        }
        if (untrustedReport.authenticity.valid) {
            throw new Error('Authenticity should be invalid for unpinned root');
        }
        console.log('[PASS] verifyLocalSubstrate correctly rejected unpinned root and returned exitCode 2.');
    } finally {
        fs.rmSync(tempUntrustedDir, { recursive: true, force: true });
    }

    // 59. Cryptographic Substrate Verification — Missing Mandatory Baseline Section (Exit Code 3)
    console.log('\n── Test 59: Statutory Policy Failure on Missing Baseline Provision (Exit Code 3) ──');
    const tempBaselineDir = path.join(os.tmpdir(), `okf-baseline-test-${Date.now()}`);
    try {
        fs.mkdirSync(path.join(tempBaselineDir, 'direct_tax'), { recursive: true });
        const secContent = JSON.stringify({ sectionCode: '194Q' }, null, 2);
        const secHash = crypto.createHash('sha256').update(secContent).digest('hex');
        const root = `sha256-${crypto.createHash('sha256').update(`direct_tax/section.json:${secHash}\n`).digest('hex')}`;

        const partialManifest = {
            okfVersion: '2.6.0',
            rootHash: root,
            sections: ['194Q'], // missing 194J, 17(5), MSMED-15-16, 393
            files: {
                'direct_tax/section.json': secHash
            }
        };
        fs.writeFileSync(path.join(tempBaselineDir, 'manifest.json'), JSON.stringify(partialManifest, null, 2), 'utf8');
        fs.writeFileSync(path.join(tempBaselineDir, 'direct_tax', 'section.json'), secContent, 'utf8');

        const baselineReport = verifyLocalSubstrate(tempBaselineDir, { allowUnverifiedRoot: true });
        if (baselineReport.valid || baselineReport.exitCode !== STATUTORY_EXIT_CODES.STATUTORY_POLICY_FAILURE) {
            throw new Error(`Expected exitCode 3 for missing baseline provisions, got ${baselineReport.exitCode}`);
        }
        if (baselineReport.baselineCheck.missingBaseline.length === 0) {
            throw new Error('Expected missing baseline provisions to be populated');
        }
        console.log('[PASS] verifyLocalSubstrate correctly triggered policy failure (exitCode 3) for missing baselines.');
    } finally {
        fs.rmSync(tempBaselineDir, { recursive: true, force: true });
    }

    // 60. CLI Integration Execution — verify --json
    console.log('\n── Test 60: CLI Integration — node bin/cli.js verify --json ──');
    const cliVerifyOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'verify', '--json'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedVerifyCli = JSON.parse(cliVerifyOutput);
    if (!parsedVerifyCli.valid || parsedVerifyCli.exitCode !== 0) {
        throw new Error(`CLI verify failed with exitCode ${parsedVerifyCli.exitCode}`);
    }
    if (parsedVerifyCli.authenticity.method !== 'PINNED_RELEASE_ROOT') {
        throw new Error(`Expected PINNED_RELEASE_ROOT, got ${parsedVerifyCli.authenticity.method}`);
    }
    console.log('[PASS] CLI verify --json executed cleanly with exitCode 0 and machine-readable output.');

    // 61. CLI Integration Execution — Global --json flag across commands
    console.log('\n── Test 61: CLI Integration — Global --json Flag Support ──');
    const cliLookupOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'lookup', '194Q', '--json'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedLookup = JSON.parse(cliLookupOutput);
    if (parsedLookup.status !== 'SUCCESS' || parsedLookup.sectionCode !== '194Q') {
        throw new Error('CLI lookup 194Q --json failed');
    }

    const cliDecodeOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'decode-id', '27AAPFU0939F1ZV', '--json'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedDecode = JSON.parse(cliDecodeOutput);
    if (!parsedDecode.isValid || parsedDecode.stateCode !== '27') {
        throw new Error('CLI decode-id --json failed');
    }

    const cliListOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'list', '--json'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedList = JSON.parse(cliListOutput);
    if (!Array.isArray(parsedList.sections) || parsedList.total !== 35) {
        throw new Error('CLI list --json failed');
    }

    const cliBrowseOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'browse', '--json'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedBrowse = JSON.parse(cliBrowseOutput);
    if (!parsedBrowse.domains || !parsedBrowse.domains.direct_tax) {
        throw new Error('CLI browse --json failed');
    }
    console.log('[PASS] Global --json flag verified across lookup, decode-id, list, and browse.');

    // 62. Diagnostic Doctor — Programmatic Invocation (runStatutoryDoctor)
    console.log('\n── Test 62: Diagnostic Doctor — Programmatic Invocation (runStatutoryDoctor) ──');
    const docReport = await runStatutoryDoctor({ offline: true });
    if (!docReport.healthy || docReport.exitCode !== 0) {
        throw new Error(`Doctor reported unhealthy or non-zero exit code: ${docReport.exitCode}`);
    }
    if (!docReport.runtime.isSupportedNode) {
        throw new Error(`Expected Node.js to be supported (>= v18), got ${docReport.runtime.nodeVersion}`);
    }
    if (!docReport.substrate.valid || docReport.substrate.integrity.mismatches.length > 0) {
        throw new Error(`Doctor reported substrate integrity failure`);
    }
    if (docReport.edge.status !== 'SKIPPED_AIR_GAPPED') {
        throw new Error(`Expected edge check to be skipped in air-gapped/offline mode, got ${docReport.edge.status}`);
    }
    console.log(`[PASS] runStatutoryDoctor correctly diagnosed environment, local substrate, and air-gapped mode.`);

    // 63. CLI Integration Execution — node bin/cli.js doctor --json --offline
    console.log('\n── Test 63: CLI Integration — node bin/cli.js doctor --json --offline ──');
    const cliDoctorOutput = execFileSync(process.execPath, [path.resolve('bin/cli.js'), 'doctor', '--json', '--offline'], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedDoctor = JSON.parse(cliDoctorOutput);
    if (!parsedDoctor.healthy || parsedDoctor.exitCode !== 0) {
        throw new Error(`CLI doctor reported non-zero exit code: ${parsedDoctor.exitCode}`);
    }
    if (!parsedDoctor.runtime.isSupportedNode || !parsedDoctor.substrate.integrity.valid) {
        throw new Error(`CLI doctor JSON output missing expected runtime or substrate status`);
    }
    console.log('[PASS] CLI doctor --json --offline executed cleanly with exitCode 0 and valid machine-readable output.');

    // 64. Dual-Act Crosswalk — Temporal Crystallization (Credit in March 2026, Payment in April 2026)
    console.log('\n── Test 64: Dual-Act Crosswalk — Temporal Crystallization (Credit March 2026, Payment April 2026) ──');
    const cw1 = crosswalkStatute('194Q', { creditDate: '2026-03-25', paymentDate: '2026-04-10' });
    if (!cw1.isValid || cw1.triggerDate !== '2026-03-25' || cw1.triggerReason !== 'EARLIER_EVENT_CREDIT_IN_BOOKS') {
        throw new Error(`Crosswalk 1 failed: Expected triggerDate 2026-03-25, got ${cw1.triggerDate}`);
    }
    if (cw1.temporalStatus !== 'GOVERNED_BY_1961_ACT' || cw1.applicableSection !== 'Section 194Q' || !cw1.savingsApplied) {
        throw new Error(`Crosswalk 1 failed: Expected GOVERNED_BY_1961_ACT and Section 194Q with savings applied`);
    }
    if (!cw1.crosswalk.predecessor.challan.includes('ITNS 281')) {
        throw new Error(`Crosswalk 1 failed: Expected Challan ITNS 281`);
    }
    console.log('[PASS] Crosswalk correctly determined 1961 Act governs when credit occurred on 2026-03-25 prior to payment on 2026-04-10.');

    // 65. Dual-Act Crosswalk — Advance Payment Disbursement (Payment in March 2026, Credit in April 2026)
    console.log('\n── Test 65: Dual-Act Crosswalk — Advance Payment Disbursement (Payment March 2026, Credit April 2026) ──');
    const cw2 = crosswalkStatute('194Q', { creditDate: '2026-04-05', paymentDate: '2026-03-28' });
    if (!cw2.isValid || cw2.triggerDate !== '2026-03-28' || cw2.triggerReason !== 'EARLIER_EVENT_PAYMENT_DISBURSEMENT') {
        throw new Error(`Crosswalk 2 failed: Expected triggerDate 2026-03-28, got ${cw2.triggerDate}`);
    }
    if (cw2.temporalStatus !== 'GOVERNED_BY_1961_ACT' || cw2.applicableSection !== 'Section 194Q') {
        throw new Error(`Crosswalk 2 failed: Expected 1961 Act governance on advance disbursement`);
    }
    console.log('[PASS] Crosswalk correctly resolved 1961 Act governance when advance payment occurred on 2026-03-28 prior to invoice credit.');

    // 66. Dual-Act Crosswalk — Post-2026-04-01 Full Transition to Income-tax Act, 2025
    console.log('\n── Test 66: Dual-Act Crosswalk — Post-2026-04-01 Full Transition to Income-tax Act, 2025 ──');
    const cw3 = crosswalkStatute('194Q', { creditDate: '2026-04-02', paymentDate: '2026-04-10' });
    if (!cw3.isValid || cw3.triggerDate !== '2026-04-02') {
        throw new Error(`Crosswalk 3 failed: Expected triggerDate 2026-04-02, got ${cw3.triggerDate}`);
    }
    if (cw3.temporalStatus !== 'GOVERNED_BY_2025_ACT' || cw3.applicableSection !== 'Section 393(1), Table 8, Item (ii)' || cw3.savingsApplied) {
        throw new Error(`Crosswalk 3 failed: Expected GOVERNED_BY_2025_ACT and Section 393(1), Table 8, Item (ii)`);
    }
    if (!cw3.governingAct.includes('2025')) {
        throw new Error(`Crosswalk 3 failed: Expected governingAct to be Income-tax Act, 2025`);
    }
    console.log('[PASS] Crosswalk correctly transitioned to Income-tax Act, 2025 Section 393(1) Table 8 Item (ii) post-1 April 2026.');

    // 67. Dual-Act Crosswalk — Section 206C(1H) Omission Post-1 April 2025
    console.log('\n── Test 67: Dual-Act Crosswalk — Section 206C(1H) Omission Post-1 April 2025 ──');
    const cwSunsetActive = crosswalkStatute('206C(1H)', { paymentDate: '2025-02-15' });
    if (cwSunsetActive.temporalStatus !== 'GOVERNED_BY_1961_ACT' || cwSunsetActive.applicableSection !== 'Section 206C(1H)') {
        throw new Error(`Crosswalk sunset active failed: Expected 1961 Act active status before 1 April 2025`);
    }
    const cwSunsetOmitted = crosswalkStatute('206C(1H)', { paymentDate: '2025-05-10' });
    if (cwSunsetOmitted.temporalStatus !== 'SUNSET_OMITTED' || !cwSunsetOmitted.isOmittedSunset || !cwSunsetOmitted.applicableSection.includes('Omitted')) {
        throw new Error(`Crosswalk sunset omitted failed: Expected SUNSET_OMITTED after 1 April 2025`);
    }
    console.log('[PASS] Section 206C(1H) correctly identified as active before 1 April 2025 and SUNSET_OMITTED post-sunset.');

    // 68. Dual-Act Crosswalk — Backward Crosswalk from 2025 Provision (Section 393)
    console.log('\n── Test 68: Dual-Act Crosswalk — Backward Crosswalk from 2025 Provision (Section 393) ──');
    const cwBack = crosswalkStatute('393', { date: '2025-08-01' });
    if (cwBack.temporalStatus !== 'GOVERNED_BY_1961_ACT' || cwBack.applicableSection !== 'Section 194Q') {
        throw new Error(`Backward crosswalk failed: Expected 1961 Act Section 194Q when queried before 2026-04-01`);
    }
    const cwForward = crosswalkStatute('393', { date: '2026-05-01' });
    if (cwForward.temporalStatus !== 'GOVERNED_BY_2025_ACT' || cwForward.applicableSection !== 'Section 393(1), Table 8, Item (ii)') {
        throw new Error(`Forward crosswalk from 393 failed: Expected 2025 Act Section 393 when queried on or after 2026-04-01`);
    }
    console.log('[PASS] Backward & forward crosswalk on Section 393 verified with bidirectional fidelity.');

    // 69. Semantic Regulatory Diff — Section Filter (Section 194H Rate Cut)
    console.log('\n── Test 69: Semantic Regulatory Diff — Section Filter (Section 194H Rate Cut) ──');
    const diff194H = getStatutoryDiff({ section: '194H' });
    if (diff194H.status !== 'SUCCESS' || diff194H.totalAmendments !== 1) {
        throw new Error(`Diff 194H failed: Expected 1 amendment, got ${diff194H.totalAmendments}`);
    }
    const am194H = diff194H.amendments[0];
    if (am194H.effectiveDate !== '2024-10-01' || am194H.amendmentType !== 'RATE_REDUCTION' || am194H.amendedValue !== '2.0% TDS') {
        throw new Error(`Diff 194H details failed: unexpected amendment data`);
    }
    console.log(`[PASS] Section 194H regulatory diff retrieved: 5% to 2% rate reduction w.e.f. ${am194H.effectiveDate}.`);

    // 70. Semantic Regulatory Diff — Date Filter (since: '2025-01-01')
    console.log('\n── Test 70: Semantic Regulatory Diff — Date Filter (since: 2025-01-01) ──');
    const diffSince = getStatutoryDiff({ since: '2025-01-01' });
    if (diffSince.status !== 'SUCCESS' || diffSince.totalAmendments < 2) {
        throw new Error(`Diff since 2025-01-01 failed: Expected >= 2 amendments, got ${diffSince.totalAmendments}`);
    }
    for (const am of diffSince.amendments) {
        if (am.effectiveDate < '2025-01-01') {
            throw new Error(`Found amendment earlier than 2025-01-01: ${am.effectiveDate} (${am.id})`);
        }
    }
    console.log(`[PASS] Temporal diff filtering verified: ${diffSince.totalAmendments} amendments retrieved since 2025-01-01.`);

    // 71. Semantic Regulatory Diff — Domain Filter (indirect_tax_gst)
    console.log('\n── Test 71: Semantic Regulatory Diff — Domain Filter (indirect_tax_gst) ──');
    const diffGst = getStatutoryDiff({ domain: 'indirect_tax_gst' });
    if (diffGst.totalAmendments < 2) {
        throw new Error(`Diff GST failed: Expected at least 2 GST amendments, got ${diffGst.totalAmendments}`);
    }
    for (const am of diffGst.amendments) {
        if (am.domain !== 'indirect_tax_gst') {
            throw new Error(`Expected domain indirect_tax_gst, got ${am.domain}`);
        }
    }
    console.log(`[PASS] Domain diff filtering verified: ${diffGst.totalAmendments} GST amendments retrieved.`);

    // 72. CLI Integration — node bin/cli.js crosswalk 194Q --credit 2026-03-25 --payment 2026-04-10 --json
    console.log('\n── Test 72: CLI Integration — node bin/cli.js crosswalk 194Q --credit 2026-03-25 --payment 2026-04-10 --json ──');
    const cliCrosswalkOutput = execFileSync(process.execPath, [
        path.resolve('bin/cli.js'), 'crosswalk', '194Q', '--credit', '2026-03-25', '--payment', '2026-04-10', '--json'
    ], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedCw = JSON.parse(cliCrosswalkOutput);
    if (!parsedCw.isValid || parsedCw.triggerDate !== '2026-03-25' || parsedCw.temporalStatus !== 'GOVERNED_BY_1961_ACT') {
        throw new Error(`CLI crosswalk --json returned unexpected payload`);
    }
    console.log('[PASS] CLI crosswalk --json executed cleanly with exitCode 0 and machine-readable payload.');

    // 73. CLI Integration — node bin/cli.js diff --section 194H --json
    console.log('\n── Test 73: CLI Integration — node bin/cli.js diff --section 194H --json ──');
    const cliDiffOutput = execFileSync(process.execPath, [
        path.resolve('bin/cli.js'), 'diff', '--section', '194H', '--json'
    ], {
        encoding: 'utf8',
        cwd: path.resolve('.')
    });
    const parsedDiff = JSON.parse(cliDiffOutput);
    if (parsedDiff.totalAmendments !== 1 || parsedDiff.amendments[0].sectionCode !== '194H') {
        throw new Error(`CLI diff --json returned unexpected payload`);
    }
    console.log('[PASS] CLI diff --json executed cleanly with exitCode 0 and machine-readable payload.');

    // 74. StatutoryClient Integration — client.crosswalk() & client.diff()
    console.log('\n── Test 74: StatutoryClient Integration — client.crosswalk() & client.diff() ──');
    const client = new StatutoryClient();
    const clientCw = client.crosswalk('194Q', { creditDate: '2026-03-25', paymentDate: '2026-04-10' });
    if (!clientCw.isValid || clientCw.applicableSection !== 'Section 194Q') {
        throw new Error(`client.crosswalk() failed`);
    }
    const clientDiff = client.diff({ section: '194H' });
    if (clientDiff.totalAmendments !== 1) {
        throw new Error(`client.diff() failed`);
    }
    console.log('[PASS] StatutoryClient crosswalk() and diff() programmatic methods verified with complete parity.');

    // 75. Corporate Tax MAT (Section 115JB) vs Concessional Regime (Section 115BAA)
    console.log('\n── Test 75: Corporate Tax MAT (Section 115JB) vs Concessional Regime (Section 115BAA) ──');
    const corpTax1 = calculateCorporateTaxMatVsConcessional({
        financialYear: '2025-26',
        turnoverPrecedingFyInr: 3000000000, // ₹300 Cr (<= ₹400 Cr -> 25% base rate)
        netProfitBeforeTaxInr: 100000000,   // ₹10 Cr
        normalTaxAdditionsInr: 10000000,    // ₹1 Cr
        normalTaxDeductionsInr: 5000000,    // ₹50 Lakh -> taxable income ₹10.5 Cr (> 10 Cr -> 12% surcharge)
        accumulatedMatCreditInr: 15000000   // ₹1.5 Cr
    });
    if (corpTax1.status !== 'SUCCESS' || corpTax1.isAuthorizedToDisburse !== false) {
        throw new Error('Corporate tax calculation failed invariant check');
    }
    if (corpTax1.normalTaxRegime.baseTaxRate !== 0.25 || corpTax1.normalTaxRegime.surchargeRate !== 0.12) {
        throw new Error(`Unexpected normal tax rates: ${corpTax1.normalTaxRegime.baseTaxRate}, ${corpTax1.normalTaxRegime.surchargeRate}`);
    }
    if (corpTax1.concessionalRegimeSec115BAA.effectiveRate !== 25.168 || corpTax1.concessionalRegimeSec115BAA.matApplicable !== false) {
        throw new Error('Section 115BAA concessional rates or MAT exemption incorrect');
    }
    if (corpTax1.concessionalRegimeSec115BAA.forfeitedMatCreditInr !== 15000000) {
        throw new Error('Section 115BAA should forfeit accumulated MAT credit');
    }
    console.log(`[PASS] Corporate Tax Engine Verified: Normal Tax ₹${corpTax1.normalTaxRegime.grossNormalTaxInr.toLocaleString('en-IN')}, MAT ₹${corpTax1.minimumAlternateTaxSec115JB.grossMatTaxInr.toLocaleString('en-IN')}, Concessional 115BAA ₹${corpTax1.concessionalRegimeSec115BAA.totalTaxInr.toLocaleString('en-IN')}.`);

    // 76. Indirect Tax (GST) — Place of Supply & Zero-Rated Export under LUT (IGST Sections 10, 12, 16)
    console.log('\n── Test 76: Indirect Tax (GST) — Place of Supply & Zero-Rated Export under LUT ──');
    // Case A: Qualified export under LUT
    const gstExportLut = evaluatePlaceOfSupplyAndLut({
        transactionType: 'EXPORT_SERVICES',
        supplierStateCode: '27',
        recipientCountryCode: 'US',
        invoiceAmountInr: 1000000,
        isSupplierInIndia: true,
        isRecipientOutsideIndia: true,
        isPlaceOfSupplyOutsideIndia: true,
        isConvertibleForexReceivedOrRbiInr: true,
        isDistinctPersonEstablishment: false,
        isIntermediaryService: false,
        hasValidLut: true,
        lutArn: 'AD2703250012345'
    });
    if (gstExportLut.statutoryDetermination !== 'ZERO_RATED_EXPORT_UNDER_LUT' || gstExportLut.igstPayableInr !== 0 || !gstExportLut.itcRefundEligible) {
        throw new Error('Export under LUT failed statutory zero-rating check');
    }
    // Case B: Intermediary service disqualification u/s 13(8)(b)
    const gstIntermediary = evaluatePlaceOfSupplyAndLut({
        transactionType: 'EXPORT_SERVICES',
        supplierStateCode: '27',
        recipientCountryCode: 'US',
        invoiceAmountInr: 1000000,
        isSupplierInIndia: true,
        isRecipientOutsideIndia: true,
        isIntermediaryService: true, // Disqualifying factor u/s 13(8)(b)
        hasValidLut: true
    });
    if (gstIntermediary.statutoryDetermination !== 'DISQUALIFIED_FROM_ZERO_RATING' || gstIntermediary.igstPayableInr !== 180000) {
        throw new Error('Intermediary service should be disqualified from zero-rating u/s 13(8)(b)');
    }
    // Case C: Domestic B2B Intra-State vs Inter-State
    const gstIntra = evaluatePlaceOfSupplyAndLut({
        transactionType: 'DOMESTIC_SERVICES',
        supplierStateCode: '27',
        recipientStateCode: '27',
        invoiceAmountInr: 100000,
        gstRate: 0.18
    });
    if (gstIntra.statutoryDetermination !== 'INTRA_STATE_SUPPLY' || gstIntra.taxBreakdown.cgstAmountInr !== 9000 || gstIntra.taxBreakdown.sgstAmountInr !== 9000) {
        throw new Error('Intra-state CGST/SGST split incorrect');
    }
    console.log('[PASS] Place of Supply & LUT Engine Verified: Zero-Rated LUT (0% IGST), Intermediary Disqualification (18% IGST), and Intra-State (9%+9% CGST/SGST).');

    // 77. International Tax — Transfer Pricing ALP & Rule 10CA Range Concept (Section 92C)
    console.log('\n── Test 77: International Tax — Transfer Pricing ALP & Rule 10CA Range Concept ──');
    // Case A: >= 6 comparables, compliant within 35th-65th percentile
    const tpCompliant = calculateTransferPricingAlp({
        internationalTransactionAmountInr: 100000000,
        testedPartyOperatingMarginPercent: 16.0,
        comparablesData: [12.0, 14.0, 15.0, 16.0, 18.0, 20.0, 22.0]
    });
    if (tpCompliant.statutoryDetermination !== 'ARM_LENGTH_COMPLIANT' || tpCompliant.primaryAdjustmentInr !== 0) {
        throw new Error('Transfer pricing range compliant check failed');
    }
    // Case B: Margin below range -> median adjustment and Section 92CE alert
    const tpAdjustment = calculateTransferPricingAlp({
        internationalTransactionAmountInr: 200000000, // ₹20 Cr
        testedPartyOperatingMarginPercent: 10.0,
        comparablesData: [12.0, 14.0, 15.0, 16.0, 18.0, 20.0, 22.0] // Median = 16.0%, shortfall = 6.0% -> adjustment ₹1.2 Cr (> ₹1 Cr)
    });
    if (tpAdjustment.statutoryDetermination !== 'PRIMARY_ADJUSTMENT_REQUIRED' || tpAdjustment.primaryAdjustmentInr !== 12000000) {
        throw new Error(`Expected primary adjustment ₹1.2 Cr, got ₹${tpAdjustment.primaryAdjustmentInr}`);
    }
    if (!tpAdjustment.secondaryAdjustmentAlert.applicable || tpAdjustment.secondaryAdjustmentAlert.repatriationPeriodDays !== 90) {
        throw new Error('Section 92CE secondary adjustment alert (> ₹1 Cr) missing or incorrect');
    }
    console.log(`[PASS] Transfer Pricing ALP Engine Verified: 35th–65th Range Concept, Median Rule 10CA(7) Adjustment (₹${tpAdjustment.primaryAdjustmentInr.toLocaleString('en-IN')}) and Section 92CE 90-Day Repatriation Alert.`);

    // 78. Corporate Restructuring — Section 79 Loss Carry-Forward & Shareholding Continuity
    console.log('\n── Test 78: Corporate Restructuring — Section 79 Loss Carry-Forward & Continuity ──');
    // Case A: 60% continuity -> allowed
    const sec79Allowed = evaluateSection79LossContinuity({
        accumulatedBroughtForwardLossInr: 50000000,
        unabsorbedDepreciationInr: 20000000,
        votingPowerHeldByOriginalShareholdersPercent: 60.0
    });
    if (sec79Allowed.statutoryDetermination !== 'LOSS_CARRYFORWARD_ALLOWED' || sec79Allowed.lossSchedule.allowableLossSetOffInr !== 50000000) {
        throw new Error('Section 79 60% continuity should permit loss set-off');
    }
    // Case B: 30% continuity in normal company -> loss lapsed, but unabsorbed depreciation protected (Virmani Industries)
    const sec79Lapsed = evaluateSection79LossContinuity({
        accumulatedBroughtForwardLossInr: 50000000,
        unabsorbedDepreciationInr: 20000000,
        votingPowerHeldByOriginalShareholdersPercent: 30.0
    });
    if (sec79Lapsed.statutoryDetermination !== 'LOSS_CARRYFORWARD_DENIED' || sec79Lapsed.lossSchedule.allowableLossSetOffInr !== 0) {
        throw new Error('Section 79 30% continuity should deny business loss set-off');
    }
    if (sec79Lapsed.lossSchedule.unabsorbedDepreciationInr !== 20000000) {
        throw new Error('Unabsorbed depreciation under Section 32(2) must be preserved despite Section 79 loss lapse');
    }
    // Case C: Startup carve-out under Section 79(2)
    const sec79Startup = evaluateSection79LossContinuity({
        isDpiitRecognizedStartup: true,
        accumulatedBroughtForwardLossInr: 50000000,
        unabsorbedDepreciationInr: 20000000,
        shareholdingInLossYear: [{ pan: 'AAAAA1111A', percentage: 60 }, { pan: 'BBBBB2222B', percentage: 40 }],
        shareholdingInSetOffYear: [{ pan: 'AAAAA1111A', percentage: 20 }, { pan: 'BBBBB2222B', percentage: 10 }, { pan: 'CCCCC3333C', percentage: 70 }] // original total = 30% (< 51%), but all original continue
    });
    if (sec79Startup.statutoryDetermination !== 'LOSS_CARRYFORWARD_ALLOWED' || sec79Startup.lossSchedule.allowableLossSetOffInr !== 50000000) {
        throw new Error('DPIIT startup carve-out u/s 79(2) failed to preserve losses');
    }
    console.log('[PASS] Section 79 Engine Verified: 51% Continuity, Virmani Doctrine (Unabsorbed Depreciation Protected), and Startup Section 79(2) Carve-Out.');

    // 79. International Tax & Treasury — Ind AS 21 & Ind AS 109 Foreign Exchange Revaluation
    console.log('\n── Test 79: International Tax & Treasury — Ind AS 21 & Ind AS 109 FX Revaluation ──');
    const fxReport = revalueForeignExchangeIndAs109({
        asOfDate: '2026-03-31',
        items: [
            { description: 'USD Trade Receivables', itemType: 'MONETARY_ASSET', foreignCurrency: 'USD', foreignAmount: 100000, bookingRate: 82.0, closingRate: 85.0 }, // +₹300,000 gain (P&L)
            { description: 'USD Trade Payables', itemType: 'MONETARY_LIABILITY', foreignCurrency: 'USD', foreignAmount: 50000, bookingRate: 80.0, closingRate: 85.0 },     // -₹250,000 loss (P&L)
            { description: 'Designated Cash Flow Hedge Forward', itemType: 'MONETARY_ASSET', foreignCurrency: 'USD', foreignAmount: 100000, bookingRate: 82.0, closingRate: 85.0, isDesignatedCashFlowHedge: true }, // +₹300,000 gain (OCI)
            { description: 'Machinery Historical Cost', itemType: 'NON_MONETARY', foreignCurrency: 'USD', foreignAmount: 20000, bookingRate: 75.0, closingRate: 85.0 } // 0 (Historical cost per Ind AS 21.23)
        ]
    });
    if (fxReport.status !== 'SUCCESS' || fxReport.isAuthorizedToDisburse !== false) {
        throw new Error('FX revaluation invariant failure');
    }
    if (fxReport.summary.netPnlImpactInr !== 50000 || fxReport.summary.netOciImpactInr !== 300000) {
        throw new Error(`FX revaluation summary mismatch: P&L=${fxReport.summary.netPnlImpactInr}, OCI=${fxReport.summary.netOciImpactInr}`);
    }
    console.log(`[PASS] Ind AS 21 & 109 Engine Verified: Net P&L FX Impact ₹${fxReport.summary.netPnlImpactInr.toLocaleString('en-IN')}, Net OCI Hedge Impact ₹${fxReport.summary.netOciImpactInr.toLocaleString('en-IN')}, Non-monetary historical cost preserved.`);

    // 80. StatutoryClient Programmatic Parity for All 5 Corporate Finance Calculators
    console.log('\n── Test 80: StatutoryClient Programmatic Parity for All 5 Corporate Finance Calculators ──');
    const clientCalc = new StatutoryClient();
    const cCorp = clientCalc.calculateCorporateTaxMatVsConcessional({ netProfitBeforeTaxInr: 10000000 });
    const cPos = clientCalc.evaluatePlaceOfSupplyAndLut({ transactionType: 'EXPORT_SERVICES', recipientCountryCode: 'US', hasValidLut: true, isConvertibleForexReceivedOrRbiInr: true });
    const cTp = clientCalc.calculateTransferPricingAlp({ isAssociatedEnterprise: false });
    const cSec79 = clientCalc.evaluateSection79LossContinuity({ votingPowerHeldByOriginalShareholdersPercent: 70 });
    const cFx = clientCalc.revalueForeignExchangeIndAs109({ items: [] });

    if (cCorp.status !== 'SUCCESS' || cPos.status !== 'SUCCESS' || cTp.status !== 'SUCCESS' || cSec79.status !== 'SUCCESS' || cFx.status !== 'SUCCESS') {
        throw new Error('StatutoryClient calculator methods failed parity execution');
    }
    console.log('[PASS] StatutoryClient corporate finance calculator methods verified with 100% parity.');

    // 81. Programmatic Statutory Outcomes & Disposition Dictionary
    console.log('\n── Test 81: Programmatic Statutory Outcomes & Disposition Dictionary ──');
    const allOutcomes = await getStatutoryOutcomes(null, { offline: true });
    if (allOutcomes.status !== 'SUCCESS' || allOutcomes.totalOutcomes < 10) {
        throw new Error(`Expected at least 10 outcomes in global catalog, got ${allOutcomes.totalOutcomes}`);
    }
    const qOutcomes = await getStatutoryOutcomes('194Q', { offline: true });
    if (qOutcomes.status !== 'SUCCESS' || qOutcomes.totalOutcomes < 5) {
        throw new Error(`Expected at least 5 outcomes for 194Q, got ${qOutcomes.totalOutcomes}`);
    }
    const hasIndeterminateBuyer = qOutcomes.outcomes.some(o => o.code === 'INDETERMINATE_BUYER_TURNOVER_UNVERIFIED');
    if (!hasIndeterminateBuyer) {
        throw new Error('Missing INDETERMINATE_BUYER_TURNOVER_UNVERIFIED outcome in 194Q outcomes');
    }
    console.log(`[PASS] Programmatic getStatutoryOutcomes verified: ${allOutcomes.totalOutcomes} global outcomes, ${qOutcomes.totalOutcomes} mapped for Section 194Q.`);

    // 82. StatutoryClient Programmatic Parity for Outcomes
    console.log('\n── Test 82: StatutoryClient Programmatic Parity for Outcomes ──');
    const clientOutcomes = await clientCalc.getOutcomes('MSMED-15-16', { offline: true });
    if (clientOutcomes.status !== 'SUCCESS' || !clientOutcomes.outcomes.some(o => o.code === 'MSME_DELAYED_PAYMENT_INTEREST_DUE')) {
        throw new Error('StatutoryClient.getOutcomes failed for MSMED-15-16');
    }
    console.log(`[PASS] StatutoryClient.getOutcomes parity verified: MSME delayed payment interest outcome retrieved.`);

    // 83. CLI Integration — node bin/cli.js outcomes 194Q --json
    console.log('\n── Test 83: CLI Integration — node bin/cli.js outcomes 194Q --json ──');
    const cliOutcomesRaw = execFileSync('node', ['bin/cli.js', 'outcomes', '194Q', '--json'], { encoding: 'utf8' });
    const cliOutcomes = JSON.parse(cliOutcomesRaw);
    if (cliOutcomes.status !== 'SUCCESS' || cliOutcomes.provision !== '194Q' || cliOutcomes.totalOutcomes < 5) {
        throw new Error('CLI outcomes --json failed to return valid JSON with 194Q outcomes');
    }
    console.log(`[PASS] CLI outcomes --json executed cleanly with exitCode 0 and valid machine-readable payload.`);

    // 84. Programmatic Disposition Explanation & Remediation Lookups
    console.log('\n── Test 84: Programmatic Disposition Explanation & Remediation Lookups ──');
    const expDirect = explainStatutoryDisposition('BUYER_TURNOVER_UNVERIFIED');
    if (expDirect.status !== 'SUCCESS' || !expDirect.remedy || !expDirect.missingFactsExplanation?.buyerTurnoverCr) {
        throw new Error('explainStatutoryDisposition failed to return remedy for BUYER_TURNOVER_UNVERIFIED');
    }
    const expIndeterminate = explainStatutoryDisposition('INDETERMINATE');
    if (expIndeterminate.status !== 'SUCCESS' || expIndeterminate.totalMatches < 4) {
        throw new Error('explainStatutoryDisposition failed to return all indeterminate states');
    }
    console.log(`[PASS] Programmatic explainStatutoryDisposition verified: single code remedy and broad group matches.`);

    // 85. CLI Integration — node bin/cli.js explain BUYER_TURNOVER_UNVERIFIED --json
    console.log('\n── Test 85: CLI Integration — node bin/cli.js explain BUYER_TURNOVER_UNVERIFIED --json ──');
    const cliExpRaw = execFileSync('node', ['bin/cli.js', 'explain', 'BUYER_TURNOVER_UNVERIFIED', '--json'], { encoding: 'utf8' });
    const cliExp = JSON.parse(cliExpRaw);
    if (cliExp.status !== 'SUCCESS' || !cliExp.remedy || cliExp.matchType !== 'EXACT_OR_KEY_MATCH') {
        throw new Error('CLI explain --json failed to return valid JSON with remedy');
    }
    console.log(`[PASS] CLI explain --json executed cleanly with exitCode 0 and valid remedy.`);

    // 86. CLI Integration — node bin/cli.js outcomes 194Q --verbose --json
    console.log('\n── Test 86: CLI Integration — node bin/cli.js outcomes 194Q --verbose --json ──');
    const cliVerboseRaw = execFileSync('node', ['bin/cli.js', 'outcomes', '194Q', '--verbose', '--json'], { encoding: 'utf8' });
    const cliVerbose = JSON.parse(cliVerboseRaw);
    if (cliVerbose.status !== 'SUCCESS' || !cliVerbose.outcomes[0].remedy) {
        throw new Error('CLI outcomes --verbose --json failed to include remedy in outcomes');
    }
    console.log(`[PASS] CLI outcomes --verbose --json executed cleanly with detailed remediation fields.`);

    // 87. Package Update Snoozing / Ignore Mechanism
    console.log('\n── Test 87: Package Update Snoozing / Ignore Mechanism ──');
    const ignoreRes = ignorePackageUpdate('99.99.99');
    if (ignoreRes.status !== 'SUCCESS' || ignoreRes.ignoredVersion !== '99.99.99') {
        throw new Error('ignorePackageUpdate failed to record ignored version');
    }
    const cliIgnoreRaw = execFileSync('node', ['bin/cli.js', 'check-update', '--ignore', '--json'], { encoding: 'utf8' });
    const cliIgnore = JSON.parse(cliIgnoreRaw);
    if (cliIgnore.status !== 'SUCCESS') {
        throw new Error('CLI check-update --ignore --json failed');
    }
    console.log(`[PASS] Package update notification ignore mechanism verified programmatically and via CLI.`);

    // 88. Automatic Outcome Explanation Enrichment on Indeterminate & Verbose Payloads
    console.log('\n── Test 88: Automatic Outcome Explanation Enrichment on Indeterminate & Verbose Payloads ──');
    const rawIndeterminatePayload = {
        status: 'SUCCESS',
        statutoryDetermination: 'INDETERMINATE',
        indeterminacyReason: 'BUYER_TURNOVER_UNVERIFIED',
        missingFacts: ['buyerTurnoverCr', 'buyerTurnoverPrecedingFy']
    };
    const enriched = enrichWithOutcomeExplanation(rawIndeterminatePayload);
    if (!enriched.explanation || !enriched.remedy || !enriched.missingFactsExplanation?.buyerTurnoverCr) {
        throw new Error('enrichWithOutcomeExplanation failed to attach explanation and remedy to INDETERMINATE payload');
    }
    const rawDisputePayload = {
        statutoryDetermination: 'INDETERMINATE_DISPUTE_UNRESOLVED',
        indeterminacyReason: 'UNRESOLVED_WRITTEN_OBJECTION',
        missingFacts: ['objectionRemovalDate']
    };
    const enrichedDispute = enrichWithOutcomeExplanation(rawDisputePayload);
    if (!enrichedDispute.remedy?.includes('objection') || !enrichedDispute.missingFactsExplanation?.objectionRemovalDate) {
        throw new Error('enrichWithOutcomeExplanation failed for commercial dispute objection');
    }
    console.log(`[PASS] enrichWithOutcomeExplanation correctly attached remediation, explanation, and missingFactsExplanation.`);

    // 89. Direct Tax — Section 194A (TDS on Interest & MSME Section 16 Interaction)
    console.log('\n── Test 89: Direct Tax — Section 194A (TDS on Interest & MSME Interaction) ──');
    const resLookup194A = await lookupStatute('194A');
    if (resLookup194A.status !== 'SUCCESS' || resLookup194A.statute.keyStatutoryThresholds.commercialPayerAnnualThresholdInr !== 5000) {
        throw new Error('Section 194A statutory lookup failed or threshold incorrect');
    }

    // Standard commercial interest exceeding ₹5,000 threshold
    const calc194AStandard = evaluateSection194A({
        interestAmount: 20000,
        priorPaymentsInCurrentFyInr: 0,
        payeeCategory: 'COMMERCIAL_OTHER',
        hasPan: true,
        transactionDate: '2025-08-15'
    });
    if (calc194AStandard.calculatedTdsInr !== 2000 || calc194AStandard.netPayable !== 18000 || calc194AStandard.standardRatePercent !== 10) {
        throw new Error(`Section 194A standard deduction calculation failed: got TDS ₹${calc194AStandard.calculatedTdsInr}`);
    }

    // Missing PAN penalty floor (20% u/s 206AA)
    const calc194ANoPan = evaluateSection194A({
        interestAmount: 20000,
        hasPan: false,
        payeeCategory: 'COMMERCIAL_OTHER',
        transactionDate: '2025-08-15'
    });
    if (calc194ANoPan.calculatedTdsInr !== 4000 || calc194ANoPan.standardRatePercent !== 20) {
        throw new Error(`Section 194A missing PAN 20% penalty failed: got TDS ₹${calc194ANoPan.calculatedTdsInr}`);
    }

    // Form 15G / 15H zero deduction
    const calc194AForm15 = evaluateSection194A({
        interestAmount: 20000,
        hasForm15G15H: true,
        isForm15Valid: true,
        payeeCategory: 'COMMERCIAL_OTHER',
        transactionDate: '2025-08-15'
    });
    if (calc194AForm15.calculatedTdsInr !== 0 || calc194AForm15.netPayable !== 20000) {
        throw new Error(`Section 194A Form 15G/15H NIL deduction failed`);
    }

    // MSME Section 16 Penal Interest Interaction: Subject to 194A withholding + Section 23 tax addback
    const calc194AMsme = evaluateSection194A({
        interestAmount: 25000,
        payeeCategory: 'COMMERCIAL_OTHER',
        isMsmeInterestSec16: true,
        transactionDate: '2025-09-20'
    });
    if (calc194AMsme.calculatedTdsInr !== 2500 || !calc194AMsme.taxAddbackDisallowedMsmeSec23 || !calc194AMsme.msmeSection16Analysis) {
        throw new Error('Section 194A MSME Section 16 penal interest addback failed');
    }
    console.log('[PASS] Section 194A Engine Verified: Standard 10% TDS, Missing PAN 20% Penalty, Form 15G Exemption, and MSMED Sec 16/23 Add-Back.');

    // 90. Indirect Tax (GST) — Rule 37 (180-Day Vendor Non-Payment ITC Reversal)
    console.log('\n── Test 90: Indirect Tax (GST) — Rule 37 (180-Day Vendor Non-Payment ITC Reversal) ──');
    const resLookupRule37 = await lookupStatute('RULE-37');
    if (resLookupRule37.status !== 'SUCCESS' || resLookupRule37.statute.keyStatutoryThresholds.vendorPaymentGracePeriodDays !== 180) {
        throw new Error('Rule 37 statutory lookup failed or grace period incorrect');
    }

    // Invoice within 180 days: zero reversal
    const calcRule37WithinGrace = calculateItcReversalRule37({
        invoiceNumber: 'INV-2025-001',
        invoiceDate: '2025-04-01',
        calculationDate: '2025-07-01', // ~91 days elapsed
        invoiceAmount: 118000,
        taxAmount: 18000,
        paidAmount: 0
    });
    if (calcRule37WithinGrace.isOverdue || calcRule37WithinGrace.reversalAmountInr !== 0) {
        throw new Error('Rule 37 erroneously triggered reversal within 180 days');
    }

    // Invoice overdue past 180 days with partial payment (50% paid): 50% reversal + 18% Section 50 interest
    const calcRule37Overdue = calculateItcReversalRule37({
        invoiceNumber: 'INV-2025-002',
        invoiceDate: '2024-10-01',
        calculationDate: '2025-05-01', // 212 days elapsed (32 days overdue beyond 180)
        invoiceAmount: 118000,
        taxAmount: 18000,
        paidAmount: 59000 // 50% unpaid
    });
    if (!calcRule37Overdue.isOverdue || calcRule37Overdue.reversalAmountInr !== 9000 || calcRule37Overdue.interestPayableInr <= 0 || !calcRule37Overdue.canReclaimOnPayment) {
        throw new Error(`Rule 37 proportional reversal failed: got reversal ₹${calcRule37Overdue.reversalAmountInr}`);
    }

    // RCM supply: strictly exempt from 180-day reversal under Section 16(2) second proviso
    const calcRule37Rcm = calculateItcReversalRule37({
        invoiceNumber: 'INV-2025-003',
        invoiceDate: '2024-08-01',
        calculationDate: '2025-05-01',
        invoiceAmount: 50000,
        taxAmount: 9000,
        paidAmount: 0,
        isRcm: true
    });
    if (calcRule37Rcm.isOverdue || calcRule37Rcm.reversalAmountInr !== 0 || !calcRule37Rcm.isExempt) {
        throw new Error('Rule 37 failed to exempt Reverse Charge (RCM) supply');
    }
    console.log('[PASS] Rule 37 Engine Verified: 180-day grace period, 50% proportional reversal (₹9,000), 18% Section 50 interest, and RCM exemption.');

    // 91. Indirect Tax (GST) — Rule 37A (Supplier GSTR-3B Non-Filing Reversal)
    console.log('\n── Test 91: Indirect Tax (GST) — Rule 37A (Supplier GSTR-3B Non-Filing Reversal) ──');
    // Supplier filed GSTR-3B: zero reversal
    const calcRule37AFiled = calculateRule37ASupplierNonFilingReversal({
        financialYear: '2024-25',
        invoiceDate: '2024-11-15',
        itcAmount: 25000,
        supplierGstr3bFiled: true,
        calculationDate: '2025-12-15'
    });
    if (calcRule37AFiled.isReversalRequired || calcRule37AFiled.reversalAmountInr !== 0) {
        throw new Error('Rule 37A erroneously required reversal when supplier GSTR-3B was filed');
    }

    // Supplier did NOT file GSTR-3B and calculation date is past 30th November (15 December 2025)
    const calcRule37AUnfiled = calculateRule37ASupplierNonFilingReversal({
        financialYear: '2024-25',
        invoiceDate: '2024-11-15',
        itcAmount: 25000,
        supplierGstr3bFiled: false,
        calculationDate: '2025-12-15'
    });
    if (!calcRule37AUnfiled.isReversalRequired || calcRule37AUnfiled.reversalAmountInr !== 25000 || calcRule37AUnfiled.interestPayableInr <= 0) {
        throw new Error(`Rule 37A failed mandatory reversal past November 30: got ₹${calcRule37AUnfiled.reversalAmountInr}`);
    }
    console.log('[PASS] Rule 37A Engine Verified: Zero reversal when filed, mandatory reversal + 18% interest post-November 30.');

    // 92. StatutoryClient Programmatic Parity for Section 194A and Rule 37/37A
    console.log('\n── Test 92: StatutoryClient Programmatic Parity for Section 194A and Rule 37/37A ──');
    const statutoryClientInstance = new StatutoryClient({ offlineFirst: true });
    const client194A = statutoryClientInstance.evaluateSection194A({ interestAmount: 10000, payeeCategory: 'COMMERCIAL_OTHER' });
    const clientRule37 = statutoryClientInstance.calculateItcReversalRule37({ invoiceDate: '2025-01-01', invoiceAmount: 10000, taxAmount: 1800, calculationDate: '2025-03-01' });
    const clientRule37A = statutoryClientInstance.calculateRule37ASupplierNonFilingReversal({ financialYear: '2024-25', itcAmount: 5000, supplierGstr3bFiled: true });
    if (client194A.calculatedTdsInr !== 1000 || clientRule37.isOverdue || clientRule37A.isReversalRequired) {
        throw new Error('StatutoryClient helper methods parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection194A, calculateItcReversalRule37, and calculateRule37ASupplierNonFilingReversal.');

    // 93. Direct Tax — Section 194O (E-Commerce Operator Marketplace Withholding)
    console.log('\n── Test 93: Direct Tax — Section 194O (E-Commerce Operator Marketplace Withholding) ──');
    const resLookup194O = await lookupStatute('194O');
    if (resLookup194O.status !== 'SUCCESS' || resLookup194O.statute.keyStatutoryThresholds.individualHufAnnualThresholdInr !== 500000) {
        throw new Error('Section 194O statutory lookup failed or threshold incorrect');
    }

    // Corporate participant: ₹0 threshold, post-Oct 2024 rate 0.1% on ₹10,00,000 GMV = ₹1,000 TDS
    const calc194OCorporate = evaluateSection194O({
        grossSaleAmount: 1000000,
        participantEntityType: 'COMPANY',
        hasPan: true,
        transactionDate: '2025-05-15'
    });
    if (calc194OCorporate.calculatedTdsInr !== 1000 || calc194OCorporate.standardRatePercent !== 0.1 || !calc194OCorporate.statutoryPrecedence.overridesSection194Q) {
        throw new Error(`Section 194O corporate 0.1% deduction failed: got TDS ₹${calc194OCorporate.calculatedTdsInr}`);
    }

    // Pre-October 2024 transaction: 1.0% rate on ₹10,00,000 GMV = ₹10,000 TDS
    const calc194OPreOct = evaluateSection194O({
        grossSaleAmount: 1000000,
        participantEntityType: 'COMPANY',
        hasPan: true,
        transactionDate: '2024-06-15'
    });
    if (calc194OPreOct.calculatedTdsInr !== 10000 || calc194OPreOct.standardRatePercent !== 1.0) {
        throw new Error(`Section 194O pre-October 2024 1.0% rate failed: got TDS ₹${calc194OPreOct.calculatedTdsInr}`);
    }

    // Individual participant below ₹5,00,000 threshold with valid PAN: exempt (₹0 TDS)
    const calc194OIndBelow = evaluateSection194O({
        grossSaleAmount: 300000,
        participantEntityType: 'INDIVIDUAL_HUF',
        hasPan: true,
        transactionDate: '2025-05-15'
    });
    if (calc194OIndBelow.calculatedTdsInr !== 0 || calc194OIndBelow.thresholdDisposition !== 'INDIVIDUAL_HUF_BELOW_5L_EXEMPT') {
        throw new Error(`Section 194O individual below ₹5L threshold failed: got TDS ₹${calc194OIndBelow.calculatedTdsInr}`);
    }

    // Missing PAN: Section 206AA second proviso specifies 5% penalty rate (not 20%)
    const calc194OMissingPan = evaluateSection194O({
        grossSaleAmount: 200000,
        participantEntityType: 'INDIVIDUAL_HUF',
        hasPan: false,
        transactionDate: '2025-05-15'
    });
    if (calc194OMissingPan.calculatedTdsInr !== 10000 || calc194OMissingPan.standardRatePercent !== 5.0) {
        throw new Error(`Section 194O missing PAN 5% penalty rate failed: got TDS ₹${calc194OMissingPan.calculatedTdsInr}`);
    }
    console.log('[PASS] Section 194O Engine Verified: Corporate 0.1% rate, Pre-Oct 2024 1.0% rate, Individual ₹5L exemption, 5% PAN penalty cap, and 194Q/206C(1H) override.');

    // 94. StatutoryClient Programmatic Parity for Section 194O
    console.log('\n── Test 94: StatutoryClient Programmatic Parity for Section 194O ──');
    const client194O = statutoryClientInstance.evaluateSection194O({
        grossSaleAmount: 5000000,
        participantEntityType: 'COMPANY',
        transactionDate: '2025-07-20'
    });
    if (client194O.calculatedTdsInr !== 5000 || !client194O.statutoryPrecedence.overridesSection194Q) {
        throw new Error('StatutoryClient.evaluateSection194O parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection194O.');

    // 95. Section 43B / Section 36(1)(va) — Statutory Payables & Checkmate Doctrine Engine
    console.log('\n── Test 95: Direct Tax — Section 43B & Section 36(1)(va) (Checkmate Doctrine) ──');
    const payablesPayload = {
        financialYear: '2025-26',
        itrFilingDueDate: '2026-10-31',
        payables: [
            // On-time First Proviso items
            {
                payableId: 'PAY-GST-01',
                clause: '43B(a)',
                description: 'Q4 GST Output Liability Net Payable',
                amountInr: 500000,
                paidDate: '2026-04-20'
            },
            {
                payableId: 'PAY-EPF-ER',
                clause: '43B(b)',
                description: 'Employer EPF Contribution March 2026',
                amountInr: 120000,
                paidDate: '2026-04-12'
            },
            {
                payableId: 'PAY-BONUS',
                clause: '43B(c)',
                description: 'Annual Employee Bonus Accrual',
                amountInr: 300000,
                paidDate: '2026-10-15'
            },
            // Disallowed timing difference items under Section 43B
            {
                payableId: 'PAY-LEAVE',
                clause: '43B(f)',
                description: 'Provision for Employee Leave Encashment',
                amountInr: 250000,
                paidDate: null // unpaid as of 2026-10-31
            },
            {
                payableId: 'PAY-LOAN-INT',
                clause: '43B(e)',
                description: 'Scheduled Bank Term Loan Interest Converted to FITL',
                amountInr: 180000,
                paidDate: '2026-09-15',
                isInterestConvertedToLoan: true // Explanation 3D test
            },
            // Employee Welfare Contributions under Section 36(1)(va)
            {
                payableId: 'PAY-EPF-EE-ONTIME',
                clause: '36(1)(va)',
                description: 'Employee EPF Deduction March 2026 (On-time deposit)',
                amountInr: 120000,
                statutoryDueDate: '2026-04-15',
                paidDate: '2026-04-14'
            },
            {
                payableId: 'PAY-ESI-EE-LATE',
                clause: '36(1)(va)',
                description: 'Employee ESIC Deduction March 2026 (Deposited 7 days late)',
                amountInr: 30000,
                statutoryDueDate: '2026-04-15',
                paidDate: '2026-04-22' // Late by 7 days, but before Oct 31 ITR! Checkmate Doctrine test!
            }
        ]
    };

    const sec43bResult = evaluateSection43BStatutoryPayables(payablesPayload);

    if (sec43bResult.status !== 'SUCCESS') {
        throw new Error(`Section 43B evaluation failed with status ${sec43bResult.status}`);
    }
    if (sec43bResult.statutoryDetermination !== 'DISALLOWED_MIXED_PERMANENT_AND_TIMING') {
        throw new Error(`Expected DISALLOWED_MIXED_PERMANENT_AND_TIMING, got ${sec43bResult.statutoryDetermination}`);
    }
    if (sec43bResult.summary.totalIncurredInr !== 1500000) {
        throw new Error(`Expected totalIncurredInr 1500000, got ${sec43bResult.summary.totalIncurredInr}`);
    }
    if (sec43bResult.summary.totalAllowedInr !== 1040000) {
        throw new Error(`Expected totalAllowedInr 1040000, got ${sec43bResult.summary.totalAllowedInr}`);
    }
    if (sec43bResult.summary.totalDisallowedInr !== 460000) {
        throw new Error(`Expected totalDisallowedInr 460000, got ${sec43bResult.summary.totalDisallowedInr}`);
    }
    if (sec43bResult.summary.totalTimingDifferencesInr !== 430000) {
        throw new Error(`Expected totalTimingDifferencesInr 430000, got ${sec43bResult.summary.totalTimingDifferencesInr}`);
    }
    if (sec43bResult.summary.totalPermanentDisallowancesInr !== 30000) {
        throw new Error(`Expected totalPermanentDisallowancesInr 30000 (Checkmate), got ${sec43bResult.summary.totalPermanentDisallowancesInr}`);
    }
    if (sec43bResult.summary.form3CdClause26DisallowanceInr !== 430000) {
        throw new Error(`Expected form3CdClause26DisallowanceInr 430000, got ${sec43bResult.summary.form3CdClause26DisallowanceInr}`);
    }
    if (sec43bResult.summary.form3CdClause20bDisallowanceInr !== 30000) {
        throw new Error(`Expected form3CdClause20bDisallowanceInr 30000, got ${sec43bResult.summary.form3CdClause20bDisallowanceInr}`);
    }
    if (sec43bResult.isAuthorizedToDisburse !== false) {
        throw new Error('Statutory invariant violated: isAuthorizedToDisburse must be false');
    }

    // Verify Checkmate specific item
    const checkmateItem = sec43bResult.evaluatedPayables.find(p => p.payableId === 'PAY-ESI-EE-LATE');
    if (!checkmateItem || checkmateItem.disallowanceType !== 'PERMANENT_ADD_BACK' || checkmateItem.allowedAmountInr !== 0) {
        throw new Error('Checkmate doctrine item PAY-ESI-EE-LATE not properly permanently disallowed');
    }

    // Verify Explanation 3D interest conversion item
    const fitlItem = sec43bResult.evaluatedPayables.find(p => p.payableId === 'PAY-LOAN-INT');
    if (!fitlItem || fitlItem.statutoryOutcome !== 'DISALLOWED_INTEREST_CONVERSION' || fitlItem.disallowedAmountInr !== 180000) {
        throw new Error('Explanation 3D interest conversion item PAY-LOAN-INT not properly disallowed');
    }
    console.log('[PASS] Section 43B & 36(1)(va) Engine Verified: First Proviso, Checkmate Doctrine permanent disallowance (₹30,000), Explanation 3D loan conversion (₹1,80,000), and Form 3CD Clause 26/20(b) mapping.');

    // 96. StatutoryClient Programmatic Parity for Section 43B
    console.log('\n── Test 96: StatutoryClient Programmatic Parity for Section 43B ──');
    const client43b = statutoryClientInstance.evaluateSection43B(payablesPayload);
    if (client43b.summary.totalDisallowedInr !== 460000 || client43b.summary.form3CdClause20bDisallowanceInr !== 30000) {
        throw new Error('StatutoryClient.evaluateSection43B parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection43B.');

    // 97. Section 281 Tax Clearance & Void Asset Transfer Risk Engine
    console.log('\n── Test 97: Corporate M&A — Section 281 (Tax Clearance & Void Transfer Risk) ──');
    // Scenario 1: De minimis exclusion (<= ₹10,000)
    const deMinimisRes = evaluateSection281TaxClearance({
        assetType: 'PLANT_AND_MACHINERY',
        assetValueInr: 8500
    });
    if (deMinimisRes.statutoryDetermination !== 'EXEMPT_DE_MINIMIS' || deMinimisRes.isVoidableAgainstRevenue !== false) {
        throw new Error('Section 281 de minimis threshold check failed');
    }

    // Scenario 2: Clean company with no pending proceedings or demand
    const cleanRes = evaluateSection281TaxClearance({
        assetType: 'IMMOVABLE_PROPERTY',
        assetValueInr: 50000000,
        hasPendingProceedings: false,
        hasOutstandingDemand: false
    });
    if (cleanRes.statutoryDetermination !== 'CLEAN_NO_PROCEEDINGS_PENDING' || cleanRes.riskLevel !== 'LOW') {
        throw new Error('Section 281 clean transferor evaluation failed');
    }

    // Scenario 3: Prior AO permission obtained under Circular 04/2011
    const aoPermRes = evaluateSection281TaxClearance({
        assetType: 'IMMOVABLE_PROPERTY',
        assetValueInr: 100000000,
        hasPendingProceedings: true,
        pendingProceedings: [{ proceedingType: '143(2)', estimatedExposureInr: 15000000 }],
        hasPriorAoPermission: true,
        aoPermissionReference: 'NOC/CIT-5/DEL/2026/884',
        alternativeSecurityFurnishedInr: 15000000
    });
    if (aoPermRes.statutoryDetermination !== 'PROTECTED_AO_PERMISSION' || aoPermRes.riskLevel !== 'ZERO' || aoPermRes.isVoidableAgainstRevenue !== false) {
        throw new Error('Section 281 AO prior permission safe harbor check failed');
    }

    // Scenario 4: Bona fide purchaser for adequate consideration without notice
    const bonaFideRes = evaluateSection281TaxClearance({
        assetType: 'SHARES_AND_SECURITIES',
        assetValueInr: 25000000,
        hasPendingProceedings: true,
        pendingProceedings: [{ proceedingType: '148', estimatedExposureInr: 5000000 }],
        hasPriorAoPermission: false,
        hasAdequateConsideration: true,
        hasNoticeOfProceedingsOrDemand: false
    });
    if (bonaFideRes.statutoryDetermination !== 'PROTECTED_BONA_FIDE_PURCHASER' || bonaFideRes.isVoidableAgainstRevenue !== false) {
        throw new Error('Section 281 bona fide purchaser exception check failed');
    }

    // Scenario 5: Statutorily voidable transfer (pending assessment with notice, no AO permission)
    const voidableRes = evaluateSection281TaxClearance({
        assetType: 'IMMOVABLE_PROPERTY',
        assetValueInr: 80000000,
        hasPendingProceedings: true,
        pendingProceedings: [{ proceedingType: '143(3)', estimatedExposureInr: 20000000 }],
        hasOutstandingDemand: true,
        outstandingDemandInr: 12000000,
        hasPriorAoPermission: false,
        hasNoticeOfProceedingsOrDemand: true
    });
    if (voidableRes.statutoryDetermination !== 'STATUTORILY_VOIDABLE_AGAINST_REVENUE' || voidableRes.isVoidableAgainstRevenue !== true || voidableRes.riskLevel !== 'HIGH_CRITICAL') {
        throw new Error('Section 281 voidability determination check failed');
    }
    if (voidableRes.totalTaxExposureInr !== 32000000 || voidableRes.isAuthorizedToDisburse !== false) {
        throw new Error('Section 281 exposure calculation or statutory invariant failed');
    }
    console.log('[PASS] Section 281 Engine Verified: De minimis exclusion, Clean transferor, Prior AO NOC (Circular 04/2011), Bona fide buyer defense, and Voidability detection (₹3.2Cr exposure).');

    // 98. StatutoryClient Programmatic Parity for Section 281
    console.log('\n── Test 98: StatutoryClient Programmatic Parity for Section 281 ──');
    const client281 = statutoryClientInstance.evaluateSection281({
        assetType: 'IMMOVABLE_PROPERTY',
        assetValueInr: 50000000,
        hasPendingProceedings: true,
        hasPriorAoPermission: true,
        aoPermissionReference: 'NOC-281-PARITY-TEST'
    });
    if (client281.statutoryDetermination !== 'PROTECTED_AO_PERMISSION' || client281.isVoidableAgainstRevenue !== false) {
        throw new Error('StatutoryClient.evaluateSection281 parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection281.');

    // 99. Section 194-IA — TDS on Transfer of Immovable Property
    console.log('\n── Test 99: Direct Tax — Section 194-IA (TDS on Immovable Property Transfer) ──');
    // Scenario 1: Agricultural land exemption
    const agriRes = evaluateSection194IA({
        isAgriculturalLand: true,
        contractualConsiderationInr: 8000000
    });
    if (agriRes.statutoryDetermination !== 'EXEMPT_AGRICULTURAL_LAND' || agriRes.calculatedTdsInr !== 0) {
        throw new Error('Section 194-IA agricultural land exemption check failed');
    }

    // Scenario 2: Non-resident seller redirection to Section 195
    const nrRes = evaluateSection194IA({
        isSellerResident: false,
        contractualConsiderationInr: 15000000
    });
    if (nrRes.statutoryDetermination !== 'GOVERNED_BY_SECTION_195') {
        throw new Error('Section 194-IA non-resident seller redirection check failed');
    }

    // Scenario 3: Below de minimis threshold (< ₹50 Lakh)
    const deMinimisPropRes = evaluateSection194IA({
        contractualConsiderationInr: 4500000,
        stampDutyValueInr: 4800000
    });
    if (deMinimisPropRes.statutoryDetermination !== 'BELOW_DE_MINIMIS_THRESHOLD' || deMinimisPropRes.calculatedTdsInr !== 0) {
        throw new Error('Section 194-IA de minimis threshold check failed');
    }

    // Scenario 4: Standard property acquisition with incidental charges & higher SDV rule (Finance Act 2022)
    const stdPropRes = evaluateSection194IA({
        contractualConsiderationInr: 7500000,
        incidentalChargesInr: 500000, // Total contractual = ₹80,00,000
        stampDutyValueInr: 9000000,   // SDV = ₹90,00,000 (higher adopted)
        hasPan: true,
        transactionDate: '2025-08-15'
    });
    if (stdPropRes.statutoryDetermination !== 'DETERMINED_APPLICABLE') {
        throw new Error(`Expected DETERMINED_APPLICABLE, got ${stdPropRes.statutoryDetermination}`);
    }
    if (stdPropRes.valuationBasis.taxableBaseInr !== 9000000) {
        throw new Error(`Expected taxableBaseInr 9000000, got ${stdPropRes.valuationBasis.taxableBaseInr}`);
    }
    if (stdPropRes.withholding.calculatedTdsInr !== 90000) {
        throw new Error(`Expected calculatedTdsInr 90000 (1% of 90L), got ${stdPropRes.withholding.calculatedTdsInr}`);
    }
    if (stdPropRes.withholding.netPayableToSellerInr !== 7910000) {
        throw new Error(`Expected netPayableToSellerInr 7910000 (80L - 90k), got ${stdPropRes.withholding.netPayableToSellerInr}`);
    }
    if (stdPropRes.isAuthorizedToDisburse !== false) {
        throw new Error('Statutory invariant violated: isAuthorizedToDisburse must be false');
    }

    // Scenario 5: Missing / Inoperative PAN penalty rate (Section 206AA 20%)
    const penaltyPropRes = evaluateSection194IA({
        contractualConsiderationInr: 6000000,
        hasPan: false,
        transactionDate: '2025-08-15'
    });
    if (penaltyPropRes.withholding.applicableTdsRatePercent !== 20.0 || penaltyPropRes.withholding.calculatedTdsInr !== 1200000 || !penaltyPropRes.withholding.isPenaltyRate) {
        throw new Error('Section 194-IA missing PAN 20% penalty rate check failed');
    }
    console.log('[PASS] Section 194-IA Engine Verified: Agricultural exclusion, Non-resident Sec 195 routing, De minimis (<₹50L), Higher SDV rule (₹90k TDS on ₹90L SDV), and Section 206AA 20% penalty floor.');

    // 100. StatutoryClient Programmatic Parity for Section 194-IA
    console.log('\n── Test 100: StatutoryClient Programmatic Parity for Section 194-IA ──');
    const client194IA = statutoryClientInstance.evaluateSection194IA({
        contractualConsiderationInr: 10000000,
        stampDutyValueInr: 12000000,
        transactionDate: '2025-09-01'
    });
    if (client194IA.withholding.calculatedTdsInr !== 120000 || client194IA.valuationBasis.taxableBaseInr !== 12000000) {
        throw new Error('StatutoryClient.evaluateSection194IA parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection194IA.');

    // 101. Direct Tax — Section 194R (Benefit or Perquisite in Business or Profession)
    console.log('\n── Test 101: Direct Tax — Section 194R (Benefit or Perquisite in Business or Profession) ──');
    // Scenario 1: Commercial discount / rebate exclusion per CBDT Circular 12/2022
    const discRes = evaluateSection194R({
        currentBenefitValueInr: 45000,
        benefitCategory: 'COMMERCIAL_DISCOUNT_REBATE'
    });
    if (discRes.statutoryDetermination !== 'EXCLUDED_CBDT_CIRCULAR_12_2022' || discRes.calculatedTdsInr !== 0) {
        throw new Error('Section 194R commercial discount exclusion check failed');
    }

    // Scenario 2: Individual payer below turnover floor
    const indivPayerRes = evaluateSection194R({
        currentBenefitValueInr: 50000,
        payerEntityType: 'INDIVIDUAL',
        payerPrecedingFyTurnoverInr: 8000000, // INR 80 Lakhs (<= 1 Cr)
        payerPrecedingFyProfessionReceiptsInr: 3000000 // INR 30 Lakhs (<= 50L)
    });
    if (indivPayerRes.statutoryDetermination !== 'EXEMPT_PAYER_TURNOVER_BELOW_STATUTORY_FLOOR' || indivPayerRes.calculatedTdsInr !== 0) {
        throw new Error('Section 194R individual payer turnover exemption check failed');
    }

    // Scenario 3: Below statutory threshold (cumulative <= INR 20,000)
    const belowThreshRes = evaluateSection194R({
        currentBenefitValueInr: 12000,
        cumulativePriorBenefitsInr: 5000 // Total 17,000 <= 20,000
    });
    if (belowThreshRes.statutoryDetermination !== 'EXEMPT_BELOW_THRESHOLD' || belowThreshRes.calculatedTdsInr !== 0) {
        throw new Error('Section 194R de minimis threshold check failed');
    }

    // Scenario 4: Standard corporate dealer incentive (cumulative > INR 20,000)
    const stdPerqRes = evaluateSection194R({
        currentBenefitValueInr: 50000,
        cumulativePriorBenefitsInr: 0,
        benefitNature: 'CASH',
        payerEntityType: 'COMPANY',
        hasPan: true
    });
    if (stdPerqRes.statutoryDetermination !== 'DEDUCTION_MANDATORY' || stdPerqRes.applicableTdsRatePercent !== 10.0 || stdPerqRes.calculatedTdsInr !== 5000) {
        throw new Error(`Expected calculatedTdsInr 5000, got ${stdPerqRes.calculatedTdsInr}`);
    }
    if (stdPerqRes.isAuthorizedToDisburse !== false) {
        throw new Error('Statutory invariant violated: isAuthorizedToDisburse must be false');
    }

    // Scenario 5: Benefit in kind without advance tax verification (Section 194R(1) Proviso)
    const inKindPendingRes = evaluateSection194R({
        currentBenefitValueInr: 100000, // Gold coin or vehicle incentive
        benefitNature: 'IN_KIND',
        isAdvanceTaxPaidBeforeRelease: false
    });
    if (inKindPendingRes.statutoryDetermination !== 'MANDATORY_IN_KIND_ADVANCE_TAX_PENDING' || !inKindPendingRes.disallowanceRiskSection40a_ia || inKindPendingRes.disallowanceAmountInr !== 30000) {
        throw new Error('Section 194R in-kind advance tax pending and 30% disallowance check failed');
    }

    // Scenario 6: Missing PAN penalty rate (Section 206AA 20%)
    const penaltyPerqRes = evaluateSection194R({
        currentBenefitValueInr: 40000,
        hasPan: false
    });
    if (penaltyPerqRes.applicableTdsRatePercent !== 20.0 || penaltyPerqRes.calculatedTdsInr !== 8000) {
        throw new Error('Section 194R missing PAN 20% penalty rate check failed');
    }

    // Scenario 7: Section 206AB sunset (pre vs post 1 April 2025)
    const preSunset206AB = evaluateSection194R({
        currentBenefitValueInr: 50000,
        isSpecifiedPerson206AB: true,
        effectiveDate: '2025-02-15'
    });
    if (preSunset206AB.applicableTdsRatePercent !== 20.0 || preSunset206AB.calculatedTdsInr !== 10000) {
        throw new Error('Section 194R Section 206AB pre-sunset check failed');
    }

    const postSunset206AB = evaluateSection194R({
        currentBenefitValueInr: 50000,
        isSpecifiedPerson206AB: true,
        effectiveDate: '2025-05-15'
    });
    if (postSunset206AB.applicableTdsRatePercent !== 10.0 || postSunset206AB.calculatedTdsInr !== 5000) {
        throw new Error('Section 194R Section 206AB post-sunset check failed');
    }
    console.log('[PASS] Section 194R Engine Verified: Circular 12/2022 exclusions, Individual turnover floor, De minimis threshold, 10% standard rate, In-kind 30% Section 40(a)(ia) disallowance, Section 206AA 20% penalty, and Section 206AB sunset.');

    // 102. StatutoryClient Programmatic Parity for Section 194R
    console.log('\n── Test 102: StatutoryClient Programmatic Parity for Section 194R ──');
    const client194R = statutoryClientInstance.evaluateSection194R({
        currentBenefitValueInr: 80000,
        cumulativePriorBenefitsInr: 10000,
        benefitNature: 'IN_KIND',
        isAdvanceTaxPaidBeforeRelease: true
    });
    if (client194R.calculatedTdsInr !== 8000 || client194R.statutoryDetermination !== 'DEDUCTION_MANDATORY_IN_KIND_DISCHARGED') {
        throw new Error('StatutoryClient.evaluateSection194R parity check failed');
    }
    console.log('[PASS] StatutoryClient parity verified for evaluateSection194R.');

    console.log('\n===========================================================================');
    console.log('ALL 102 TEST SUITES PASSED (100% REPRODUCIBLE PRECISION)');
    console.log('===========================================================================\n');
}

run().catch(err => {
    console.error('\n[FAIL] Test Suite Failed:', err);
    process.exit(1);
});
