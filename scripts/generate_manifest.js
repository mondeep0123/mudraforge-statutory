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
    let content = fs.readFileSync(filePath);
    if (filePath.endsWith('.json') || filePath.endsWith('.md')) {
        // Strip CRLF to ensure cross-platform deterministic SHA-256 integrity
        content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    }
    return crypto.createHash('sha256').update(content).digest('hex');
}

function run() {
    console.log('===========================================================================');
    console.log(isCheckMode ? 'OKF CRYPTOGRAPHIC INTEGRITY VERIFIER' : 'OKF MANIFEST & ROOT CHECKSUM GENERATOR');
    console.log('===========================================================================\n');

    if (!fs.existsSync(OKF_DIR)) {
        console.error(`[ERROR] OKF directory not found at: ${OKF_DIR}`);
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
                console.error(`[ERROR] Failed parsing ${relPath}: ${err.message}`);
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
            console.error('[ERROR] manifest.json does not exist. Run "npm run manifest" first.');
            process.exit(1);
        }

        const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        let mismatches = 0;

        if (existing.rootHash !== rootHash) {
            console.error(`[ERROR] Root hash mismatch!`);
            console.error(`   Recorded: ${existing.rootHash}`);
            console.error(`   Computed: ${rootHash}`);
            mismatches++;
        }

        const recordedFiles = existing.files || {};
        for (const [relPath, hash] of Object.entries(fileHashes)) {
            if (!recordedFiles[relPath]) {
                console.error(`[ERROR] Untracked file: ${relPath}`);
                mismatches++;
            } else if (recordedFiles[relPath] !== hash) {
                console.error(`[ERROR] Checksum mismatch for: ${relPath}`);
                console.error(`   Expected: ${recordedFiles[relPath]}`);
                console.error(`   Actual:   ${hash}`);
                mismatches++;
            }
        }

        for (const recordedPath of Object.keys(recordedFiles)) {
            if (!fileHashes[recordedPath]) {
                console.error(`[ERROR] Missing file recorded in manifest: ${recordedPath}`);
                mismatches++;
            }
        }

        if (mismatches > 0) {
            console.error(`\n[ERROR] Integrity verification failed with ${mismatches} mismatch(es).`);
            process.exit(1);
        }

        console.log(`[OK] All ${allFiles.length} OKF files matched their cryptographic SHA-256 signatures.`);
        console.log(`[OK] Root Merkle digest verified: ${rootHash}`);
        console.log('\nCRYPTOGRAPHIC INTEGRITY VERIFICATION PASSED (0 MISMATCHES).\n');
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
        okfVersion: '2.9.0',
        publishedAt: new Date().toISOString(),
        rootHash,
        totalSections: sections.length,
        totalFiles: allFiles.length,
        changelog: 'Expanded statutory commons with 5 Corporate Finance Domains: Corporate Tax MAT vs 115BAA, Place of Supply & Zero-Rated Export LUT, Transfer Pricing ALP & Rule 10CA, Section 79 Loss Continuity, and Ind AS 21 & 109 FX Revaluation.',
        domains,
        sections,
        files: fileHashes
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2) + '\n', 'utf8');

    console.log(`[OK] Indexed ${sections.length} statutory sections across ${Object.keys(domains).length} domains.`);
    console.log(`[OK] Hashed ${allFiles.length} statutory files.`);
    console.log(`[OK] Root Merkle Hash: ${rootHash}`);
    console.log(`[OK] Saved updated manifest to: ${MANIFEST_PATH}\n`);
}

run();
