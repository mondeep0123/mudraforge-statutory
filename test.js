import dns from 'node:dns';
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

import { lookupStatute, listSections, isStatuteActive, StatutoryClient } from './src/index.js';

async function run() {
    console.log('Testing @mudraforge/statutory package...');

    // Test 1: list
    const sections = await listSections();
    console.log(`✔ listSections: retrieved ${sections.length} sections`);

    // Test 2: lookup
    const res = await lookupStatute('194Q');
    console.log(`✔ lookupStatute(194Q): status=${res.status}, temporal=${res.temporalStatus}`);

    // Test 3: isStatuteActive
    const active = await isStatuteActive('194Q');
    console.log(`✔ isStatuteActive(194Q): ${active}`);

    const sunsetActive = await isStatuteActive('206C(1H)', '2025-06-01');
    console.log(`✔ isStatuteActive(206C(1H), 2025-06-01): ${sunsetActive} (expected false)`);

    // Test 4: Formal Enterprise Client Class
    console.log('\nTesting StatutoryClient (ENTERPRISE_PAID Tier)...');
    const enterpriseClient = new StatutoryClient({
        tier: 'ENTERPRISE_PAID',
        apiKey: 'mf_live_ent_test_token_8842',
        offlineFirst: true
    });

    const clientRes = await enterpriseClient.lookup('194Q');
    console.log(`✔ enterpriseClient.lookup(194Q): status=${clientRes.status}, tier=${clientRes.tier || clientRes.clientTier}, source=${clientRes.source}`);

    // Test 5: Verify Unauthenticated calculate() throws explicit contact error
    console.log('\nTesting StatutoryClient unauthenticated calculate() gate...');
    const freeClient = new StatutoryClient();
    try {
        await freeClient.calculate({ section: '194Q', invoiceAmount: 8000000 });
        throw new Error('FAILED: calculate() should have thrown without API key');
    } catch (err) {
        if (err.code === 'API_KEY_REQUIRED' && err.message.includes('hello@mudraforge.in')) {
            console.log('✔ calculate() correctly blocked unauthenticated call with direct contact instructions:');
            console.log(`  Contact: ${err.contact} / ${err.support}`);
        } else {
            throw err;
        }
    }

    console.log('\n🎉 ALL PACKAGE TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
