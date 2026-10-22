#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory — Cryptographic OKF Manifest & Integrity Verifier
 * ═══════════════════════════════════════════════════════════════════════════
 * Calculates deterministic SHA-256 checksums for every statutory artifact
 * (section.json, circulars, forms) and computes a root Merkle hash.
 *
 * Usage:
 *   node scripts/generate_manifest.js         # Updates okf/manifest.json
 *   node scripts/generate_manifest.js --check # Verifies cryptographic integrity
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OKF_DIR = path.resolve(__dirname, '..', 'okf');
const MANIFEST_PATH = path.join(OKF_DIR, 'manifest.json');

const isCheckMode = process.argv.includes('--check');

function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
        } else if (entry.isFile() && entry.name !== 'manifest.json') {
            results.push(fullPath);
        }
    }
    return results;
}

function computeFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function run() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(isCheckMode ? '🔒 OKF CRYPTOGRAPHIC INTEGRITY VERIFIER' : '⚡ OKF MANIFEST & ROOT CHECKSUM GENERATOR');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    if (!fs.existsSync(OKF_DIR)) {
        console.error(`❌ OKF directory not found at: ${OKF_DIR}`);
        process.exit(1);
    }

    const allFiles = getFilesRecursively(OKF_DIR).sort();
    const fileHashes = {};
    const domains = {};
    const sections = [];

    for (const file of allFiles) {
        const relPath = path.relative(OKF_DIR, file).replace(/\\/g, '/');
        const hash = computeFileHash(file);
        fileHashes[relPath] = hash;

        // If it's a section.json, catalog it
        if (path.basename(file) === 'section.json') {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                const domain = relPath.split('/')[0];
                if (!domains[domain]) domains[domain] = [];
                if (data.sectionCode) {
                    domains[domain].push(data.sectionCode);
                    sections.push(data.sectionCode);
                }
            } catch (err) {
                console.error(`❌ Failed parsing ${relPath}: ${err.message}`);
                process.exit(1);
            }
        }
    }

    // Compute deterministic root hash from sorted file path:hash pairs
    const rootHasher = crypto.createHash('sha256');
    for (const [relPath, hash] of Object.entries(fileHashes)) {
        rootHasher.update(`${relPath}:${hash}\n`);
    }
    const rootHash = `sha256-${rootHasher.digest('hex')}`;

    if (isCheckMode) {
        if (!fs.existsSync(MANIFEST_PATH)) {
            console.error('❌ manifest.json does not exist. Run "npm run manifest" first.');
            process.exit(1);
        }

        const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        let mismatches = 0;

        if (existing.rootHash !== rootHash) {
            console.error(`❌ Root hash mismatch!`);
            console.error(`   Recorded: ${existing.rootHash}`);
            console.error(`   Computed: ${rootHash}`);
            mismatches++;
        }

        const recordedFiles = existing.files || {};
        for (const [relPath, hash] of Object.entries(fileHashes)) {
            if (!recordedFiles[relPath]) {
                console.error(`❌ Untracked file: ${relPath}`);
                mismatches++;
            } else if (recordedFiles[relPath] !== hash) {
                console.error(`❌ Checksum mismatch for: ${relPath}`);
                console.error(`   Expected: ${recordedFiles[relPath]}`);
                console.error(`   Actual:   ${hash}`);
                mismatches++;
            }
        }

        for (const recordedPath of Object.keys(recordedFiles)) {
            if (!fileHashes[recordedPath]) {
                console.error(`❌ Missing file recorded in manifest: ${recordedPath}`);
                mismatches++;
            }
        }

        if (mismatches > 0) {
            console.error(`\n❌ Integrity verification FAILED with ${mismatches} mismatch(es).`);
            process.exit(1);
        }

        console.log(`✔ All ${allFiles.length} OKF files matched their cryptographic SHA-256 signatures.`);
        console.log(`✔ Root Merkle digest verified: ${rootHash}`);
        console.log('\n🎉 CRYPTOGRAPHIC INTEGRITY VERIFICATION PASSED.\n');
        process.exit(0);
    }

    // Generate/Update mode
    let previous = {};
    if (fs.existsSync(MANIFEST_PATH)) {
        try {
            previous = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        } catch (_) {}
    }

    const updatedManifest = {
        okfVersion: previous.okfVersion || '2.4.0',
        publishedAt: new Date().toISOString(),
        rootHash,
        totalSections: sections.length,
        totalFiles: allFiles.length,
        changelog: previous.changelog || 'Automated cryptographic manifest signature.',
        domains,
        sections,
        files: fileHashes
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2) + '\n', 'utf8');

    console.log(`✔ Indexed ${sections.length} statutory sections across ${Object.keys(domains).length} domains.`);
    console.log(`✔ Hashed ${allFiles.length} statutory files.`);
    console.log(`✔ Root Merkle Hash: ${rootHash}`);
    console.log(`✔ Saved updated manifest to: ${MANIFEST_PATH}\n`);
}

run();
