#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory CLI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    lookupStatute,
    lookupLocalStatute,
    listSections,
    checkUpdates,
    syncOkf,
    getLocalManifest,
    DEFAULT_LOCAL_OKF_DIR
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : 'help';

async function main() {
    switch (command) {
        case 'init-skill':
        case 'install-skill':
            await handleInitSkill(args[1]);
            break;

        case 'check-update':
        case 'status':
        case 'version':
            await handleCheckUpdate();
            break;

        case 'sync':
        case 'pull':
        case 'update':
            await handleSync();
            break;

        case 'browse':
        case 'nav':
            await handleBrowse();
            break;

        case 'lookup':
        case 'get':
            if (!args[1]) {
                console.error('[ERROR] Please specify a section to lookup, e.g. npx @mudraforge/statutory lookup 194Q');
                process.exit(1);
            }
            await handleLookup(args[1], args[2]);
            break;

        case 'list':
        case 'sections':
            await handleList();
            break;

        case 'help':
        default:
            printHelp();
            break;
    }
}

async function handleCheckUpdate() {
    try {
        console.log('\n[INFO] Checking OKF knowledge substrate status against Cloudflare edge...');
        const status = await checkUpdates();
        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`Local OKF Version:   ${status.localVersion}`);
        console.log(`Latest Edge Version: ${status.latestVersion}`);
        console.log(`Published At:        ${status.publishedAt}`);
        console.log(`Total Sections:      ${status.totalSections}`);
        console.log('───────────────────────────────────────────────────────────────────────────');

        if (status.isOutdated) {
            console.log(`[WARN] New version available: v${status.latestVersion}`);
            console.log(`Changelog: ${status.changelog}`);
            console.log(`Run: npx @mudraforge/statutory sync to pull the latest rules.\n`);
        } else {
            console.log(`[OK] OKF substrate is up to date (v${status.localVersion}).\n`);
        }
    } catch (err) {
        console.error(`[ERROR] Version check failed: ${err.message}`);
        process.exit(1);
    }
}

async function handleSync() {
    try {
        console.log('\n[INFO] Synchronizing local OKF filesystem with Cloudflare edge...');
        const res = await syncOkf();
        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`[OK] Successfully synced OKF v${res.okfVersion}`);
        console.log(`Downloaded sections: ${res.syncedSections}`);
        console.log(`Saved to: ${res.destDir}`);
        console.log('───────────────────────────────────────────────────────────────────────────\n');
    } catch (err) {
        console.error(`[ERROR] Sync failed: ${err.message}`);
        process.exit(1);
    }
}

async function handleBrowse() {
    const manifest = getLocalManifest();

    console.log('\n===========================================================================');
    console.log(`OPEN KNOWLEDGE FORMAT (OKF) — LOCAL BROWSER [v${manifest ? manifest.okfVersion : 'Local'}]`);
    console.log('===========================================================================');

    const domainDisplayNames = {
        direct_tax: 'DIRECT TAX (Income Tax & TDS/TCS)',
        indirect_tax_gst: 'INDIRECT TAX (Goods & Services Tax - GST)',
        msme_commercial: 'MSME & COMMERCIAL LAW',
        international_tax: 'CROSS-BORDER & INTERNATIONAL TAX'
    };

    let totalDisplayed = 0;

    if (manifest && manifest.domains) {
        for (const [domainKey, sectionCodes] of Object.entries(manifest.domains)) {
            console.log(`\n${domainDisplayNames[domainKey] || domainKey.toUpperCase()}`);
            console.log('───────────────────────────────────────────────────────────────────────────');
            for (const code of sectionCodes) {
                const data = lookupLocalStatute(code);
                if (!data) continue;
                totalDisplayed++;
                const validToDisplay = data.effectivePeriod.validTo === 'OPEN_ENDED' || !data.effectivePeriod.validTo ? 'Open-ended (In force)' : data.effectivePeriod.validTo;
                const docCount = data.supportingDocuments 
                    ? ` (${data.supportingDocuments.circulars.length} circulars, ${data.supportingDocuments.forms.length} forms)`
                    : '';
                console.log(`• Section ${data.sectionCode.padEnd(12)} | ${data.governingStatute}`);
                console.log(`  ↳ ${data.title}`);
                console.log(`  ↳ Validity: ${data.effectivePeriod.validFrom} to ${validToDisplay}${docCount}`);
            }
        }
    } else {
        const sectionsDir = path.join(DEFAULT_LOCAL_OKF_DIR, 'sections');
        if (fs.existsSync(sectionsDir)) {
            const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.json'));
            files.forEach((f, idx) => {
                const data = JSON.parse(fs.readFileSync(path.join(sectionsDir, f), 'utf8'));
                totalDisplayed++;
                console.log(`[${idx + 1}] Section ${data.sectionCode.padEnd(12)} | ${data.governingStatute}`);
                console.log(`    ↳ ${data.title}`);
                console.log(`    ↳ Valid: ${data.effectivePeriod.validFrom} to ${data.effectivePeriod.validTo}`);
                console.log('');
            });
        }
    }

    if (totalDisplayed === 0) {
        console.log('[WARN] No local OKF sections found. Run "npx @mudraforge/statutory sync" to download.');
        return;
    }

    console.log('\n───────────────────────────────────────────────────────────────────────────');
    console.log('To inspect details & circulars: npx @mudraforge/statutory lookup <section_code>');
    console.log('To sync latest edge catalog:    npx @mudraforge/statutory sync\n');
}

async function handleInitSkill(targetDir) {
    const destDir = targetDir || path.join(process.cwd(), '.agents', 'skills', 'indian-statutory-commons');
    const sourceSkillPath = path.join(__dirname, '..', 'SKILL.md');

    if (!fs.existsSync(sourceSkillPath)) {
        console.error('[ERROR] Could not find source SKILL.md in package root.');
        process.exit(1);
    }

    fs.mkdirSync(destDir, { recursive: true });
    const destSkillPath = path.join(destDir, 'SKILL.md');
    fs.copyFileSync(sourceSkillPath, destSkillPath);

    console.log('\n[OK] MudraForge Indian Statutory Commons Skill installed successfully.');
    console.log(`Installed at: ${destSkillPath}`);
    console.log('AI agent skill configuration ready for runtime discovery.\n');
}

async function handleLookup(section, asOfDate) {
    try {
        // Try local OKF first
        const local = lookupLocalStatute(section);
        let s = local;
        let temporalStatus = 'ACTIVE';

        if (s) {
            console.log(`\n[LOCAL OKF CACHE] Loaded section [${section}] from disk.`);
            if (asOfDate) {
                if (asOfDate < s.effectivePeriod.validFrom) temporalStatus = 'PRE_EFFECTIVE';
                else if (s.effectivePeriod.validTo && asOfDate > s.effectivePeriod.validTo) temporalStatus = 'SUNSET_SUPERSEDED';
            }
        } else {
            console.log(`\n[EDGE LOOKUP] Querying MudraForge Live Commons for [${section}]${asOfDate ? ` (as-of: ${asOfDate})` : ''}...`);
            const remote = await lookupStatute(section, { asOfDate });
            s = remote.statute;
            temporalStatus = remote.temporalStatus;
        }

        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`Section:         ${s.statutorySection} (${s.governingStatute})`);
        console.log(`Title:           ${s.title}`);
        console.log(`Temporal Status: ${temporalStatus}`);
        console.log(`Effective Dates: ${s.effectivePeriod.validFrom} to ${s.effectivePeriod.validTo}`);
        console.log(`Successor:       ${s.successorSection} (${s.successorStatute})`);
        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`Summary:`);
        console.log(`   ${s.plainTextSummary}`);
        console.log('\nKey Thresholds:');
        for (const [k, v] of Object.entries(s.keyStatutoryThresholds)) {
            console.log(`   • ${k}: ${v}`);
        }
        console.log('\nOfficial Citations:');
        for (const c of s.officialCitations) {
            console.log(`   • ${c.instrument} (${c.authority}): ${c.officialUrl}`);
        }

        if (s.supportingDocuments && (s.supportingDocuments.circulars?.length > 0 || s.supportingDocuments.forms?.length > 0)) {
            console.log('\nSupporting Circulars & Compliance Forms:');
            if (s.supportingDocuments.circulars?.length > 0) {
                console.log(`   • Circulars & Guidance: ${s.supportingDocuments.circulars.join(', ')}`);
            }
            if (s.supportingDocuments.forms?.length > 0) {
                console.log(`   • Forms & Returns:     ${s.supportingDocuments.forms.join(', ')}`);
            }
        }
        console.log('───────────────────────────────────────────────────────────────────────────\n');
    } catch (err) {
        console.error(`[ERROR] Lookup failed: ${err.message}`);
        if (err.availableSections) {
            console.log(`Available sections: ${err.availableSections.join(', ')}`);
        }
        process.exit(1);
    }
}

async function handleList() {
    try {
        console.log('\n[INFO] Fetching indexed statutory sections from MudraForge Commons...');
        const sections = await listSections();
        console.log('───────────────────────────────────────────────────────────────────────────');
        for (const s of sections) {
            const displayValidTo = (s.validTo === 'OPEN_ENDED' || s.validTo === '2099-12-31') ? 'In Force' : s.validTo;
            console.log(`• [${s.sectionCode.padEnd(12)}] ${s.section.padEnd(25)} | Valid: ${s.validFrom} to ${displayValidTo}`);
        }
        console.log('───────────────────────────────────────────────────────────────────────────\n');
    } catch (err) {
        console.error(`[ERROR] Failed to list sections: ${err.message}`);
        process.exit(1);
    }
}

function printHelp() {
    console.log(`
MudraForge Statutory Commons CLI (@mudraforge/statutory)

Usage:
  npx @mudraforge/statutory <command> [options]

Commands:
  browse                    Interactively browse local OKF statutory filesystem
  lookup <section> [date]   Look up section details & temporal status (e.g. 194Q 2025-06-01)
  check-update              Check if newer OKF versions or legal changes exist on Cloudflare edge
  sync                      Download/sync latest versioned OKF bundle to disk
  list                      List all indexed statutory sections
  init-skill [path]         Install SKILL.md into your agent workspace (defaults to .agents/skills/)
  help                      Show this help message
`);
}

main().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
});
