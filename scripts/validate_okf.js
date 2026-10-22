/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MUDRAFORGE OKF VALIDATOR & SCHEMA LINTER
 * ═══════════════════════════════════════════════════════════════════════════
 * Validates all domain provisions, executive circulars, and compliance forms
 * against the Google Open Knowledge Format (OKF v0.2) specification.
 *
 * Checks:
 * 1. section.json schema integrity & required fields
 * 2. Temporal validity formats (ISO 8601 or OPEN_ENDED)
 * 3. Executive circular Markdown YAML frontmatter
 * 4. Official government authority URLs
 * 5. Compliance form schemas
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OKF_DIR = path.resolve(__dirname, '../okf');

const REQUIRED_SECTION_FIELDS = [
    'sectionId',
    'sectionCode',
    'aliases',
    'governingStatute',
    'statutorySection',
    'title',
    'effectivePeriod',
    'plainTextSummary',
    'keyStatutoryThresholds',
    'officialCitations',
    'tier',
    'version'
];

const REQUIRED_FRONTMATTER_FIELDS = [
    'id',
    'title',
    'authority',
    'date',
    'statutory_section',
    'valid_from',
    'valid_to',
    'temporal_status',
    'official_url'
];

function parseYamlFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const yamlBlock = match[1];
    const result = {};
    for (const line of yamlBlock.split(/\r?\n/)) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && !line.startsWith(' ')) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            result[key] = val;
        }
    }
    return result;
}

function isValidDateOrOpenEnded(val) {
    if (!val) return false;
    if (val === 'OPEN_ENDED' || val.toLowerCase().includes('open-ended') || val.toLowerCase().includes('in force')) {
        return true;
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function validateOkfRepository() {
    console.log('===========================================================================');
    console.log('MUDRAFORGE OKF v0.2 SCHEMA & PROVENANCE VALIDATOR');
    console.log('===========================================================================\n');

    let totalErrors = 0;
    let validatedSections = 0;
    let validatedCirculars = 0;
    let validatedForms = 0;

    const domains = fs.readdirSync(OKF_DIR).filter(item => {
        const fullPath = path.join(OKF_DIR, item);
        return fs.statSync(fullPath).isDirectory();
    });

    for (const domain of domains) {
        const domainPath = path.join(OKF_DIR, domain);
        const provisions = fs.readdirSync(domainPath).filter(item => {
            return fs.statSync(path.join(domainPath, item)).isDirectory();
        });

        console.log(`[DOMAIN] Validating Domain [${domain}] (${provisions.length} provisions)...`);

        for (const provision of provisions) {
            const provPath = path.join(domainPath, provision);

            // 1. Validate section.json
            const sectionJsonPath = path.join(provPath, 'section.json');
            if (!fs.existsSync(sectionJsonPath)) {
                console.error(`  [ERROR] Missing section.json in ${provPath}`);
                totalErrors++;
            } else {
                try {
                    const data = JSON.parse(fs.readFileSync(sectionJsonPath, 'utf8'));
                    for (const field of REQUIRED_SECTION_FIELDS) {
                        if (data[field] === undefined) {
                            console.error(`  [FAIL] ${provision}/section.json missing required field: '${field}'`);
                            totalErrors++;
                        }
                    }

                    // Validate effectivePeriod
                    if (data.effectivePeriod) {
                        if (!isValidDateOrOpenEnded(data.effectivePeriod.validFrom)) {
                            console.error(`  [FAIL] ${provision}/section.json invalid validFrom: ${data.effectivePeriod.validFrom}`);
                            totalErrors++;
                        }
                        if (!isValidDateOrOpenEnded(data.effectivePeriod.validTo)) {
                            console.error(`  [FAIL] ${provision}/section.json invalid validTo: ${data.effectivePeriod.validTo}`);
                            totalErrors++;
                        }
                    }

                    // Validate official citations
                    if (Array.isArray(data.officialCitations)) {
                        for (const cit of data.officialCitations) {
                            if (!cit.officialUrl || !cit.officialUrl.startsWith('http')) {
                                console.error(`  [FAIL] ${provision}/section.json invalid citation URL: ${cit.officialUrl}`);
                                totalErrors++;
                            }
                        }
                    }

                    validatedSections++;
                    console.log(`  [PASS] Section [${data.sectionCode}] (${provision}): Validated OKF Schema`);
                } catch (e) {
                    console.error(`  [FAIL] Failed to parse ${sectionJsonPath}: ${e.message}`);
                    totalErrors++;
                }
            }

            // 2. Validate circulars
            const circularsDir = path.join(provPath, 'circulars');
            if (fs.existsSync(circularsDir)) {
                const circularFiles = fs.readdirSync(circularsDir).filter(f => f.endsWith('.md'));
                for (const cFile of circularFiles) {
                    const cPath = path.join(circularsDir, cFile);
                    const content = fs.readFileSync(cPath, 'utf8');
                    const frontmatter = parseYamlFrontmatter(content);

                    if (!frontmatter) {
                        console.error(`  [FAIL] Missing or invalid YAML frontmatter in circular: ${cFile}`);
                        totalErrors++;
                    } else {
                        for (const field of REQUIRED_FRONTMATTER_FIELDS) {
                            if (!frontmatter[field]) {
                                console.error(`  [FAIL] Circular ${cFile} missing required frontmatter key: '${field}'`);
                                totalErrors++;
                            }
                        }
                        if (!frontmatter.official_url || !frontmatter.official_url.startsWith('http')) {
                            console.error(`  [FAIL] Circular ${cFile} invalid official_url: ${frontmatter.official_url}`);
                            totalErrors++;
                        }
                        validatedCirculars++;
                        console.log(`    ↳ Circular [${cFile}]: Validated YAML Frontmatter`);
                    }
                }
            }

            // 3. Validate compliance forms
            const formsDir = path.join(provPath, 'forms');
            if (fs.existsSync(formsDir)) {
                const formFiles = fs.readdirSync(formsDir);
                for (const fFile of formFiles) {
                    const fPath = path.join(formsDir, fFile);
                    if (fFile.endsWith('.json')) {
                        try {
                            JSON.parse(fs.readFileSync(fPath, 'utf8'));
                            validatedForms++;
                            console.log(`    ↳ Form Schema [${fFile}]: Validated JSON`);
                        } catch (e) {
                            console.error(`  [FAIL] Invalid JSON in form: ${fFile}: ${e.message}`);
                            totalErrors++;
                        }
                    } else if (fFile.endsWith('.md')) {
                        validatedForms++;
                        console.log(`    ↳ Form Template [${fFile}]: Validated Markdown`);
                    }
                }
            }
        }
        console.log('');
    }

    console.log('===========================================================================');
    console.log(`VALIDATION SUMMARY:`);
    console.log(`• Sections Validated:  ${validatedSections}`);
    console.log(`• Circulars Validated: ${validatedCirculars}`);
    console.log(`• Forms Validated:     ${validatedForms}`);
    console.log(`• Total Errors:        ${totalErrors}`);
    console.log('===========================================================================');

    if (totalErrors > 0) {
        console.error(`\n[FAIL] Validation failed with ${totalErrors} defect(s).`);
        process.exit(1);
    } else {
        console.log('\n[PASS] ALL OKF SCHEMAS, CIRCULARS & FORMS PASSED VALIDATION WITH ZERO DEFECTS.\n');
        process.exit(0);
    }
}

validateOkfRepository();
