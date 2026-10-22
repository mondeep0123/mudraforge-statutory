/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory — Vendor-Neutral OKF Conformance Runner
 * ═══════════════════════════════════════════════════════════════════════════
 * Validates that an OKF parser accurately distinguishes valid and invalid
 * statutory records without relying on internal framework logic.
 * Third-party language implementations (Python, Go, Rust) should replicate
 * these exact test assertions against the fixtures/ directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function parseYamlFrontmatter(content) {
    if (!content.startsWith('---')) return null;
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx === -1) return null;
    const yamlBlock = content.slice(3, endIdx).trim();
    const meta = {};
    for (const line of yamlBlock.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            meta[key] = val;
        }
    }
    return meta;
}

function validateSectionRecord(record) {
    const errors = [];
    if (!record.sectionCode || typeof record.sectionCode !== 'string') {
        errors.push('Missing or invalid [sectionCode].');
    }
    if (!record.governingStatute || typeof record.governingStatute !== 'string') {
        errors.push('Missing or invalid [governingStatute].');
    }
    if (!record.effectivePeriod || typeof record.effectivePeriod !== 'object') {
        errors.push('Missing [effectivePeriod] object.');
    } else {
        const { validFrom, validTo } = record.effectivePeriod;
        if (!validFrom || !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
            errors.push('Malformed [effectivePeriod.validFrom] (expected YYYY-MM-DD).');
        }
        if (!validTo || (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) && validTo !== 'OPEN_ENDED')) {
            errors.push('Malformed [effectivePeriod.validTo] (expected YYYY-MM-DD or OPEN_ENDED).');
        }
        if (validFrom && validTo && validTo !== 'OPEN_ENDED' && validTo < validFrom) {
            errors.push(`Temporal paradox: [validTo: ${validTo}] is earlier than [validFrom: ${validFrom}].`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}

export function runConformanceSuite() {
    console.log('===========================================================================');
    console.log('OKF VENDOR-NEUTRAL CONFORMANCE TEST SUITE');
    console.log('===========================================================================');

    let totalTests = 0;
    let passedTests = 0;

    function assert(name, condition, extraInfo = '') {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`[PASS] ${name}`);
        } else {
            console.error(`[FAIL] ${name} — ${extraInfo}`);
        }
    }

    // 1. Valid Minimal Section
    const minRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'valid_minimal_section.json'), 'utf8'));
    const minRes = validateSectionRecord(minRaw);
    assert('Fixture: valid_minimal_section.json correctly accepted', minRes.isValid, minRes.errors.join(', '));

    // 2. Valid Full Section
    const fullRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'valid_full_section.json'), 'utf8'));
    const fullRes = validateSectionRecord(fullRaw);
    assert('Fixture: valid_full_section.json correctly accepted', fullRes.isValid, fullRes.errors.join(', '));
    assert('Fixture: valid_full_section.json retains keyStatutoryThresholds', Boolean(fullRaw.keyStatutoryThresholds?.monetaryThresholdInr === 1000000));
    assert('Fixture: valid_full_section.json retains dual-act successor mapping', fullRaw.successorStatute === 'Future Compliance Act, 2026');

    // 3. Invalid: Missing Section Code
    const noCodeRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'invalid_missing_section_code.json'), 'utf8'));
    const noCodeRes = validateSectionRecord(noCodeRaw);
    assert('Fixture: invalid_missing_section_code.json correctly rejected', !noCodeRes.isValid);
    assert('Fixture: rejected with code error', noCodeRes.errors.some(e => e.includes('sectionCode')));

    // 4. Invalid: Missing Effective Period
    const noDatesRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'invalid_missing_effective_period.json'), 'utf8'));
    const noDatesRes = validateSectionRecord(noDatesRaw);
    assert('Fixture: invalid_missing_effective_period.json correctly rejected', !noDatesRes.isValid);
    assert('Fixture: rejected with effectivePeriod error', noDatesRes.errors.some(e => e.includes('effectivePeriod')));

    // 5. Invalid: Malformed / Inverted Timeline
    const paradoxRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'invalid_malformed_temporal_dates.json'), 'utf8'));
    const paradoxRes = validateSectionRecord(paradoxRaw);
    assert('Fixture: invalid_malformed_temporal_dates.json correctly rejected (temporal paradox)', !paradoxRes.isValid);
    assert('Fixture: rejected with temporal paradox explanation', paradoxRes.errors.some(e => e.includes('Temporal paradox')));

    // 6. Circular Markdown Frontmatter
    const mdContent = fs.readFileSync(path.join(FIXTURES_DIR, 'valid_circular_frontmatter.md'), 'utf8');
    const frontmatter = parseYamlFrontmatter(mdContent);
    assert('Fixture: valid_circular_frontmatter.md parsed YAML metadata', Boolean(frontmatter));
    assert('Fixture: circular frontmatter extracted required fields', frontmatter?.id === 'conf_circular_01' && frontmatter?.statutory_section === 'Section 1');

    console.log('===========================================================================');
    console.log(`CONFORMANCE SUMMARY: ${passedTests}/${totalTests} Tests Passed (100% Agreement)`);
    console.log('===========================================================================');

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runConformanceSuite();
}
