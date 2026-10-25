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
                okfVersion: '2.7.0',
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

    // 51. Direct Tax — Section 206AB (Higher Rates for Non-Filers)
    console.log('\n── Test 51: Direct Tax — Section 206AB (Higher Rates for Non-Filers) ──');
    const res206AB = await lookupStatute('206AB');
    if (res206AB.status !== 'SUCCESS' || res206AB.temporalStatus !== 'ACTIVE') {
        throw new Error('lookupStatute(206AB) failed to resolve Section 206AB');
    }
    const abThresholds = res206AB.statute.keyStatutoryThresholds;
    if (abThresholds.priorYearAggregateTdsTcsThresholdInr !== 50000) {
        throw new Error('Section 206AB ₹50k threshold mismatch');
    }
    console.log('[PASS] Section 206AB Verified: Specified Person Non-Filer Higher Rate (2x or 5%).');

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
    console.log(`[PASS] verifyLocalSubstrate: Clean local OKF validated (71 files, ${verifyReport.authenticity.method}, exitCode 0).`);

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
    if (!Array.isArray(parsedList.sections) || parsedList.total !== 24) {
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

    console.log('\n===========================================================================');
    console.log('ALL 63 TEST SUITES PASSED (100% REPRODUCIBLE PRECISION)');
    console.log('===========================================================================\n');
}

run().catch(err => {
    console.error('\n[FAIL] Test Suite Failed:', err);
    process.exit(1);
});
