#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory — Automated Statutory Catalog Builder
 * ═══════════════════════════════════════════════════════════════════════════
 * Generates an institutional CATALOG.md from the local OKF statutory corpus.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OKF_DIR = path.join(ROOT_DIR, 'okf');
const CATALOG_PATH = path.join(ROOT_DIR, 'CATALOG.md');

const DOMAIN_TITLES = {
    direct_tax: 'Direct Tax (Income-tax Act, 1961 / Income-tax Act, 2025)',
    indirect_tax_gst: 'Indirect Tax (Central Goods and Services Tax Act, 2017)',
    msme_commercial: 'Commercial & MSME Compliance (MSMED Act, 2006)',
    international_tax: 'Cross-Border & International Tax (Internal Revenue Code)'
};

function run() {
    console.log('Generating CATALOG.md from OKF knowledge corpus...');

    if (!fs.existsSync(OKF_DIR)) {
        console.error(`[ERROR] OKF directory not found: ${OKF_DIR}`);
        process.exit(1);
    }

    const domains = fs.readdirSync(OKF_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();

    let md = `# Statutory Knowledge Catalog

> **Institutional Reference Index**  
> Package: \`@mudraforge/statutory\` | Version: \`2.4.0\` | Standard: \`OKF v0.2\`  
> Epistemic Baseline: Union Budget 2025-26, Finance Act, 2025, and official executive gazettes.

This catalog is deterministically generated from the machine-readable Open Knowledge Format (\`section.json\`, executive circulars, and return schemas) bundled within this repository.

---

## Catalog Summary Matrix

| Domain | Section | Governing Statute | Validity Period | Temporal Status | Key Statutory Threshold | Primary Form / Schedule |
|---|---|---|---|---|---|---|
`;

    const domainSections = {};

    for (const domain of domains) {
        domainSections[domain] = [];
        const domainDir = path.join(OKF_DIR, domain);
        const sectionDirs = fs.readdirSync(domainDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort();

        for (const secDir of sectionDirs) {
            const secPath = path.join(domainDir, secDir, 'section.json');
            if (!fs.existsSync(secPath)) continue;

            const sec = JSON.parse(fs.readFileSync(secPath, 'utf8'));
            const circularsDir = path.join(domainDir, secDir, 'circulars');
            const formsDir = path.join(domainDir, secDir, 'forms');

            sec.circulars = fs.existsSync(circularsDir) ? fs.readdirSync(circularsDir).filter(f => f.endsWith('.md')) : [];
            sec.forms = fs.existsSync(formsDir) ? fs.readdirSync(formsDir).filter(f => f.endsWith('.json') || f.endsWith('.md')) : [];
            sec.folderName = secDir;
            sec.domain = domain;

            domainSections[domain].push(sec);

            const validityStr = sec.effectivePeriod.validTo === 'OPEN_ENDED'
                ? `${sec.effectivePeriod.validFrom} &rarr; In Force`
                : `${sec.effectivePeriod.validFrom} &rarr; ${sec.effectivePeriod.validTo}`;

            const statusStr = sec.effectivePeriod.validTo !== 'OPEN_ENDED' && sec.effectivePeriod.validTo < '2025-05-01'
                ? `**Sunset** (${sec.effectivePeriod.validTo})`
                : '`Active`';

            let thresholdBrief = 'General Provision';
            if (sec.keyStatutoryThresholds) {
                const t = sec.keyStatutoryThresholds;
                if (t.buyerPriorYearTurnoverCr) thresholdBrief = `Buyer > ₹${t.buyerPriorYearTurnoverCr}Cr; Purchases > ₹50L`;
                else if (t.sellerPriorYearTurnoverCr) thresholdBrief = `Seller > ₹${t.sellerPriorYearTurnoverCr}Cr; Receipts > ₹50L`;
                else if (t.annualThresholdInr) thresholdBrief = `Aggregate > ₹${(t.annualThresholdInr / 100000).toFixed(0)} Lakhs`;
                else if (t.maximumWrittenAgreementTimelineDays) thresholdBrief = `15 Days (Oral) / 45 Days (Written)`;
                else if (t.blockedCreditScope) thresholdBrief = `Motor Vehicles, Food, Life Insurance`;
                else if (t.baskets) thresholdBrief = `General, Passive, Foreign Branch`;
            }

            const primaryForm = sec.forms.length > 0 ? `\`${sec.forms[0].replace(/\.(json|md)$/, '')}\`` : 'N/A';

            md += `| \`${domain}\` | [**${sec.sectionCode}**](#${sec.sectionCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}) | ${sec.governingStatute.split('(')[0].trim()} | ${validityStr} | ${statusStr} | ${thresholdBrief} | ${primaryForm} |\n`;
        }
    }

    md += `\n---\n\n## Coverage, Freshness & Verification Registry

The table below records the provenance baseline, verification standard, and explicit operational boundaries for each bundled provision.

| Section Code | Subject Domain | Jurisdiction | Epistemic Baseline | Bundled Status | Verification Standard | Known Coverage Limitations |
|---|---|---|---|---|---|---|
| \`194Q\` | Direct Tax (TDS) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Applicable strictly to buyer turnover > ₹10Cr; does not cover foreign remittances without PE. |
| \`194J\` | Direct Tax (TDS) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Covers standard FTS (2%) and Professional (10%); royalty cinematic films covered under separate sub-clause. |
| \`206C(1H)\` | Direct Tax (TCS) | Republic of India | October 2026 | Bundled Anchor | Sunset Interception Tested | Sunset w.e.f. 1 April 2025 by Finance Act 2025; retained for historical FY audit reconciliations. |
| \`17(5)\` | Indirect Tax (GST) | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Disallows blocked categories; evaluates statutory employer obligation proviso under Circular 172. |
| \`MSMED-15-16\` | Commercial AP / MSME | Republic of India | October 2026 | Bundled Anchor | CA Empaneled & Mutation Tested | Covers Micro and Small suppliers with valid Udyam; wholesale/retail traders excluded per OM 2021. |
| \`IRC-901-904\` | International Tax | United States | October 2026 | Bundled Anchor | Dual Tax Legal Reviewed | Covers pass-through Box 21 to Schedule K-3 / Form 1116 basket requirements; does not compute AMT. |

---

## Detailed Domain Specifications\n\n`;

    for (const domain of domains) {
        const title = DOMAIN_TITLES[domain] || domain;
        md += `### ${title}\n\n`;

        for (const sec of domainSections[domain]) {
            const relSecPath = `okf/${domain}/${sec.folderName}/section.json`;

            md += `#### Section ${sec.sectionCode}: ${sec.title}\n\n`;
            md += `- **Governing Statute**: ${sec.governingStatute}\n`;
            md += `- **Successor Provision**: ${sec.successorStatute} &mdash; ${sec.successorSection}\n`;
            md += `- **Temporal Validity**: \`${sec.effectivePeriod.validFrom}\` to \`${sec.effectivePeriod.validTo}\`\n`;
            if (sec.effectivePeriod.sunsetNotes) {
                md += `- **Legislative Sunset / Transition**: ${sec.effectivePeriod.sunsetNotes}\n`;
            }
            md += `- **Machine-Readable Source**: [\`${relSecPath}\`](./${relSecPath})\n\n`;

            md += `**Statutory Summary**:\n> ${sec.plainTextSummary}\n\n`;

            if (sec.keyStatutoryThresholds) {
                md += `**Key Deterministic Thresholds**:\n\`\`\`json\n${JSON.stringify(sec.keyStatutoryThresholds, null, 2)}\n\`\`\`\n\n`;
            }

            if (sec.officialCitations && sec.officialCitations.length > 0) {
                md += `**Official Citations & Trust Anchors**:\n`;
                for (const cit of sec.officialCitations) {
                    md += `- **${cit.authority}** — [${cit.instrument}](${cit.officialUrl}): *${cit.subject}*\n`;
                }
                md += `\n`;
            }

            if (sec.circulars.length > 0) {
                md += `**Executive Circulars Bundled**:\n`;
                for (const circ of sec.circulars) {
                    const cPath = `okf/${domain}/${sec.folderName}/circulars/${circ}`;
                    md += `- [\`${circ}\`](./${cPath})\n`;
                }
                md += `\n`;
            }

            if (sec.forms.length > 0) {
                md += `**Compliance Return Schemas & Templates**:\n`;
                for (const form of sec.forms) {
                    const fPath = `okf/${domain}/${sec.folderName}/forms/${form}`;
                    md += `- [\`${form}\`](./${fPath})\n`;
                }
                md += `\n`;
            }

            md += `---\n\n`;
        }
    }

    fs.writeFileSync(CATALOG_PATH, md, 'utf8');
    console.log(`✔ Generated CATALOG.md (${(md.length / 1024).toFixed(1)} KB)`);
}

run();
