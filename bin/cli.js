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
    checkForPackageUpdate,
    decodeTaxIdentifier,
    STATUTORY_CLIENT_VERSION,
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
        case 'update': {
            let target = args[1];
            if (target === '--dest' || target === '-d') {
                target = args[2];
            } else if (target && target.startsWith('--dest=')) {
                target = target.slice(7);
            }
            await handleSync(target);
            break;
        }

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

        case 'decode-id':
        case 'validate-id':
        case 'check-id':
            if (!args[1]) {
                console.error('[ERROR] Please specify a PAN or GSTIN to decode, e.g. npx @mudraforge/statutory decode-id 27AAPFU0939F1ZV');
                process.exit(1);
            }
            handleDecodeId(args[1]);
            break;

        case 'help':
        default:
            printHelp();
            break;
    }

    // Non-intrusive background npm package update notice
    if (!['check-update', 'status', 'version'].includes(command)) {
        try {
            const updateInfo = await checkForPackageUpdate();
            if (updateInfo && updateInfo.updateAvailable) {
                console.log('───────────────────────────────────────────────────────────────────────────');
                console.log(`[NOTICE] A new version of @mudraforge/statutory is available: ${updateInfo.currentVersion} -> ${updateInfo.latestVersion}`);
                console.log(`Run: npm install @mudraforge/statutory@latest or npx @mudraforge/statutory@latest`);
                console.log('───────────────────────────────────────────────────────────────────────────\n');
            }
        } catch (_) {}
    }
}

async function handleCheckUpdate() {
    try {
        console.log('\n[INFO] Checking npm package version against registry.npmjs.org...');
        try {
            const pkgUpdate = await checkForPackageUpdate({ cacheTtlMs: 0 });
            if (pkgUpdate && pkgUpdate.updateAvailable) {
                console.log('───────────────────────────────────────────────────────────────────────────');
                console.log(`[WARN] New npm package version available: v${pkgUpdate.latestVersion} (installed: v${pkgUpdate.currentVersion})`);
                console.log(`Run: npm install @mudraforge/statutory@latest`);
                console.log('───────────────────────────────────────────────────────────────────────────');
            } else if (pkgUpdate) {
                console.log(`[OK] npm package code is up to date (v${pkgUpdate.currentVersion}).`);
            }
        } catch (_) {}

        console.log('\n[INFO] Checking OKF knowledge substrate status against Cloudflare edge...');
        const status = await checkUpdates();
        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`Local OKF Version:   ${status.localVersion}`);
        console.log(`Latest Edge Version: ${status.latestVersion}`);
        console.log(`Published At:        ${status.publishedAt}`);
        console.log(`Total Sections:      ${status.totalSections}`);
        console.log('───────────────────────────────────────────────────────────────────────────');

        if (status.isOutdated) {
            console.log(`[WARN] New legal data version available: v${status.latestVersion}`);
            console.log(`Changelog: ${status.changelog}`);
            try {
                const pkgUpdate = await checkForPackageUpdate();
                if (pkgUpdate && pkgUpdate.updateAvailable) {
                    console.log(`\n[RECOMMENDED] Update the npm package to receive the newest release roots:`);
                    console.log(`  npm install @mudraforge/statutory@latest`);
                    console.log(`  npx @mudraforge/statutory sync\n`);
                } else {
                    console.log(`Run: npx @mudraforge/statutory sync to pull the latest rules.\n`);
                }
            } catch (_) {
                console.log(`Run: npx @mudraforge/statutory sync to pull the latest rules.\n`);
            }
        } else {
            console.log(`[OK] OKF substrate is up to date (v${status.localVersion}).\n`);
        }
    } catch (err) {
        console.error(`[ERROR] Version check failed: ${err.message}`);
        process.exit(1);
    }
}

async function handleSync(targetDir) {
    try {
        let dest = undefined;
        if (targetDir) {
            dest = path.resolve(process.cwd(), targetDir);
            const cwd = path.resolve(process.cwd());
            const relative = path.relative(cwd, dest);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                console.error('[ERROR] Target sync directory must be within current workspace directory.');
                process.exit(1);
            }
        }
        console.log(`\n[INFO] Synchronizing local OKF filesystem with Cloudflare edge${dest ? ` into "${dest}"` : ''}...`);
        const res = await syncOkf(dest ? { okfDir: dest } : {});
        console.log('───────────────────────────────────────────────────────────────────────────');
        console.log(`[OK] Successfully synced OKF v${res.okfVersion}`);
        console.log(`Downloaded sections: ${res.syncedSections}`);
        console.log(`Saved to: ${res.destDir}`);
        console.log('───────────────────────────────────────────────────────────────────────────\n');
    } catch (err) {
        if (err.message && err.message.includes('Untrusted bundle rootHash')) {
            console.error('\n' + '─'.repeat(75));
            console.error('[NOTICE] Cryptographic verification required an updated release anchor.');
            console.error(err.message.replace('[@mudraforge/statutory] ', ''));
            console.error('─'.repeat(75) + '\n');
        } else {
            console.error(`[ERROR] Sync failed: ${err.message}`);
        }
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
    const resolvedDest = path.resolve(destDir);
    const cwd = path.resolve(process.cwd());

    // Path traversal boundary check preventing prefix collisions
    const relative = path.relative(cwd, resolvedDest);
    if (targetDir && (relative.startsWith('..') || path.isAbsolute(relative))) {
        console.error('[ERROR] Target directory must be within current workspace directory.');
        process.exit(1);
    }

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
    const cleanSection = (section || '').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (asOfDate && !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate.trim())) {
        console.error(`[ERROR] Invalid date format: "${asOfDate}". Date must be in ISO 8601 YYYY-MM-DD format.`);
        process.exit(1);
    }

    try {
        // Try local OKF first
        const local = lookupLocalStatute(cleanSection);
        let s = local;
        let temporalStatus = 'ACTIVE';

        if (s) {
            console.log(`\n[LOCAL OKF CACHE] Loaded section [${cleanSection}] from disk.`);
            if (asOfDate) {
                if (asOfDate < s.effectivePeriod.validFrom) temporalStatus = 'PRE_EFFECTIVE';
                else if (s.effectivePeriod.validTo && asOfDate > s.effectivePeriod.validTo) temporalStatus = 'SUNSET_SUPERSEDED';
            }
        } else {
            console.log(`\n[EDGE LOOKUP] Querying MudraForge Live Commons for [${cleanSection}]${asOfDate ? ` (as-of: ${asOfDate})` : ''}...`);
            const remote = await lookupStatute(cleanSection, { asOfDate });
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

function handleDecodeId(rawId) {
    const res = decodeTaxIdentifier(rawId);
    console.log('\n===========================================================================');
    console.log('INDIAN TAX IDENTIFIER DECODER & OFFLINE MOD-36 VALIDATOR');
    console.log('===========================================================================');
    if (!res.isValid) {
        console.log(`Input:        ${rawId}`);
        console.log(`Type:         ${res.type || 'UNKNOWN'}`);
        console.log(`Status:       INVALID`);
        console.log(`Failure:      ${res.error}\n`);
        return;
    }

    console.log(`Identifier:   ${res.gstin || res.pan}`);
    console.log(`Type:         ${res.type}`);
    if (res.type === 'GSTIN') {
        console.log(`Mod-36 Check: VALID (Check Character: "${res.gstin[14]}")`);
        console.log(`State:        [${res.stateCode}] ${res.stateName}`);
    }
    console.log(`PAN:          ${res.pan}`);
    console.log(`Entity Code:  [${res.entityCode}] ${res.entityType}`);
    console.log(`Class:        ${res.isIndividualOrHuf ? 'Individual / HUF' : 'Company / Non-Individual'}`);
    console.log(`Sec 194C TDS: ${res.standard194cRatePercent}% (Statutory Rate)`);
    console.log('───────────────────────────────────────────────────────────────────────────\n');
}

function printHelp() {
    console.log(`
MudraForge Statutory Commons CLI (@mudraforge/statutory)

Usage:
  npx @mudraforge/statutory <command> [options]

Commands:
  browse                    Interactively browse local OKF statutory filesystem
  lookup <section> [date]   Look up section details & temporal status (e.g. 194Q 2025-06-01)
  decode-id <pan_or_gstin>  Offline ISO Mod-36 checksum, state name, and PAN entity decoding
  check-update              Check if newer OKF versions or legal changes exist on Cloudflare edge
  sync [path]               Download/sync latest versioned OKF bundle to disk (default: package okf/ or custom dir)
  list                      List all indexed statutory sections
  init-skill [path]         Install SKILL.md into your agent workspace (defaults to .agents/skills/)
  help                      Show this help message
`);
}

main().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
});
