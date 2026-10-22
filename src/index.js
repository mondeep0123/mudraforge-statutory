/**
 * ═══════════════════════════════════════════════════════════════════════════
 * @mudraforge/statutory
 * Open Knowledge Format (OKF) — Public Statutory Commons Client
 * ═══════════════════════════════════════════════════════════════════════════
 * Zero dependencies. Runs in Node.js (v18+), Bun, Deno, Cloudflare Workers.
 * Supports both local offline OKF filesystem queries and live edge requests.
 * Includes first-class StatutoryClient for Free Commons & Enterprise Paid tiers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_LOCAL_OKF_DIR = path.resolve(__dirname, '..', 'okf');
export const DEFAULT_BASE_URL = 'https://api.mudraforge.in';

/**
 * Read the local version manifest from the filesystem.
 */
export function getLocalManifest(okfDir = DEFAULT_LOCAL_OKF_DIR) {
    try {
        const manifestPath = path.join(okfDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) return null;
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Helper to recursively find all JSON files in a directory.
 */
function findJsonFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(findJsonFilesRecursively(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'manifest.json') {
                results.push(fullPath);
            }
        }
    } catch (_) {}
    return results;
}

/**
 * Look up a statutory provision directly from the local OKF filesystem (0 network calls).
 * Supports domain hierarchies (direct_tax, indirect_tax_gst, msme, international_tax)
 * as well as flat sections directories.
 * Returns the statutory record along with associated circulars and compliance forms.
 */
export function lookupLocalStatute(section, okfDir = DEFAULT_LOCAL_OKF_DIR) {
    if (!section || typeof section !== 'string') {
        throw new Error('[@mudraforge/statutory] Section query must be a non-empty string.');
    }

    const rawClean = section.trim().toLowerCase();
    const normalized = rawClean.replace(/[()_-\s]+/g, '');

    if (!fs.existsSync(okfDir)) {
        throw new Error(`[@mudraforge/statutory] Local OKF directory not found at: ${okfDir}`);
    }

    const files = findJsonFilesRecursively(okfDir);
    for (const filePath of files) {
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (_) {
            continue;
        }

        // Must be a valid statutory record with sectionCode
        if (!data || !data.sectionCode) continue;

        let isMatch = false;

        // 1. Direct sectionCode / sectionId match
        if (data.sectionCode.toLowerCase() === rawClean || data.sectionId.toLowerCase() === rawClean) {
            isMatch = true;
        }

        // 2. Normalized alphanumeric match (handles "17_5", "17(5)", "17-5", "msmed_15_16")
        if (
            !isMatch && (
                data.sectionCode.toLowerCase().replace(/[()_-\s]+/g, '') === normalized ||
                data.sectionId.toLowerCase().replace(/[()_-\s]+/g, '') === normalized
            )
        ) {
            isMatch = true;
        }

        // 3. Aliases match
        if (
            !isMatch &&
            data.aliases &&
            data.aliases.some(
                a => a.toLowerCase() === rawClean || a.toLowerCase().replace(/[()_-\s]+/g, '') === normalized
            )
        ) {
            isMatch = true;
        }

        // 4. Folder or filename match (handles "tds_goods_194q", "194Q-tds-on-purchase...")
        if (!isMatch) {
            const fileName = path.basename(filePath).toLowerCase().replace(/\.json$/, '');
            const folderName = path.basename(path.dirname(filePath)).toLowerCase();
            if (
                fileName.startsWith(rawClean) || fileName.startsWith(normalized) ||
                folderName.includes(rawClean) || folderName.includes(normalized)
            ) {
                isMatch = true;
            }
        }

        if (isMatch) {
            // Attach supporting circulars and compliance forms if present in domain hierarchy
            const parentDir = path.dirname(filePath);
            const circularsDir = path.join(parentDir, 'circulars');
            const formsDir = path.join(parentDir, 'forms');

            data.supportingDocuments = {
                circulars: fs.existsSync(circularsDir) ? fs.readdirSync(circularsDir).filter(f => f.endsWith('.md')) : [],
                forms: fs.existsSync(formsDir) ? fs.readdirSync(formsDir).filter(f => f.endsWith('.json') || f.endsWith('.md')) : []
            };

            return data;
        }
    }
    return null;
}

/**
 * Check if a newer version of the OKF knowledge base is available on Cloudflare edge.
 */
export async function checkUpdates(options = {}) {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const localManifest = getLocalManifest(okfDir) || { okfVersion: '0.0.0' };

    const url = new URL('/api/v1/statutory/manifest.json', baseUrl);
    const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json', 'User-Agent': '@mudraforge/statutory/2.4.0' }
    });

    if (!res.ok) {
        throw new Error(`Failed to check remote version: HTTP ${res.status}`);
    }

    const remote = await res.json();
    const isOutdated = remote.okfVersion !== localManifest.okfVersion;

    return {
        localVersion: localManifest.okfVersion,
        latestVersion: remote.okfVersion,
        isOutdated,
        publishedAt: remote.publishedAt,
        changelog: remote.changelog,
        totalSections: remote.totalSections
    };
}

/**
 * Download and synchronize the latest OKF knowledge bundle to disk.
 * Saves files using self-documenting filenames combining Section Code + Description:
 * e.g. "194Q-tds-on-purchase-of-goods.json"
 */
export async function syncOkf(options = {}) {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const sectionsDir = path.join(okfDir, 'sections');

    fs.mkdirSync(sectionsDir, { recursive: true });

    const bundleUrl = new URL('/api/v1/statutory/bundle.json', baseUrl);
    const res = await fetch(bundleUrl.toString(), {
        headers: { 'Accept': 'application/json', 'User-Agent': '@mudraforge/statutory/2.4.0' }
    });

    if (!res.ok) {
        throw new Error(`Failed to download OKF bundle: HTTP ${res.status}`);
    }

    const bundle = await res.json();

    const manifest = {
        okfVersion: bundle.okfVersion,
        publishedAt: bundle.publishedAt,
        rootHash: bundle.rootHash,
        totalSections: bundle.totalSections,
        changelog: bundle.changelog,
        sections: bundle.statutes.map(s => s.sectionCode)
    };
    fs.writeFileSync(path.join(okfDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    for (const statute of bundle.statutes) {
        // Self-documenting naming convention: Section Code + Human Descriptive Title
        const safeCode = statute.sectionCode.replace(/[()]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '-');
        const shortTitle = (statute.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 45)
            .replace(/-+$/, '');
        const fileName = shortTitle ? `${safeCode}-${shortTitle}.json` : `${safeCode}.json`;
        fs.writeFileSync(path.join(sectionsDir, fileName), JSON.stringify(statute, null, 2), 'utf8');
    }

    return {
        success: true,
        okfVersion: bundle.okfVersion,
        syncedSections: bundle.statutes.length,
        destDir: okfDir
    };
}

/**
 * Compute the temporal validity status of a statutory record as of a specific date.
 * If asOfDate is omitted or 'CURRENT_ACTIVE', evaluates against active baseline.
 * Returns 'ACTIVE', 'SUNSET_SUPERSEDED', or 'FUTURE_PENDING'.
 */
export function computeTemporalStatus(statute, asOfDate) {
    if (!statute || !statute.effectivePeriod) return 'ACTIVE';
    if (!asOfDate || asOfDate === 'CURRENT_ACTIVE') return 'ACTIVE';

    const { validFrom, validTo } = statute.effectivePeriod;
    const queryDate = asOfDate.trim();

    if (validFrom && queryDate < validFrom) {
        return 'FUTURE_PENDING';
    }
    if (validTo && validTo !== 'OPEN_ENDED' && queryDate > validTo) {
        return 'SUNSET_SUPERSEDED';
    }
    return 'ACTIVE';
}

/**
 * Look up a statutory provision by section code or alias.
 * Offline-first: inspects local OKF filesystem before falling back to Cloudflare Edge API.
 */
export async function lookupStatute(section, options = {}) {
    if (!section || typeof section !== 'string') {
        throw new Error('[@mudraforge/statutory] Section query must be a non-empty string.');
    }

    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const asOfDate = options.asOfDate ? options.asOfDate.trim() : 'CURRENT_ACTIVE';

    // 1. Local-first resolution
    if (!options.forceEdge && fs.existsSync(okfDir)) {
        try {
            const local = lookupLocalStatute(section, okfDir);
            if (local) {
                const temporalStatus = computeTemporalStatus(local, asOfDate);
                return {
                    status: 'SUCCESS',
                    temporalStatus,
                    asOfDate,
                    source: 'LOCAL_OKF_FS',
                    statute: local
                };
            }
        } catch (_) {}
    }

    // 2. Edge API fallback
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const url = new URL('/api/v1/statutory/lookup', baseUrl);
    url.searchParams.set('section', section.trim());

    if (options.asOfDate) {
        url.searchParams.set('asOfDate', options.asOfDate.trim());
    }

    const headers = {
        'Accept': 'application/json',
        'User-Agent': '@mudraforge/statutory/2.4.0'
    };

    if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
    }
    if (options.tier) {
        headers['X-Mudra-Tier'] = options.tier;
    }

    let response;
    try {
        response = await fetch(url.toString(), {
            method: 'GET',
            headers
        });
    } catch (netErr) {
        // If network request failed (e.g. offline) and local statute is available, return local
        if (fs.existsSync(okfDir)) {
            const local = lookupLocalStatute(section, okfDir);
            if (local) {
                return {
                    status: 'SUCCESS',
                    temporalStatus: computeTemporalStatus(local, asOfDate),
                    asOfDate,
                    source: 'LOCAL_OKF_FS',
                    statute: local
                };
            }
        }
        throw new Error(`[@mudraforge/statutory] Network lookup failed and local statute not found: ${netErr.message}`);
    }

    if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const err = new Error(errorJson.message || `Statutory lookup failed with HTTP ${response.status}`);
        err.status = response.status;
        err.error = errorJson.error;
        err.availableSections = errorJson.availableSections;
        throw err;
    }

    const data = await response.json();
    return {
        ...data,
        source: 'EDGE_API'
    };
}

/**
 * List all statutory sections currently indexed in the Open Knowledge Commons.
 * Attempts Edge API first, gracefully falling back to local OKF filesystem if offline.
 */
export async function listSections(options = {}) {
    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;

    function getLocalSections() {
        const results = [];
        if (!fs.existsSync(okfDir)) return results;
        const files = findJsonFilesRecursively(okfDir);
        for (const file of files) {
            if (path.basename(file) === 'section.json') {
                try {
                    const sec = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (sec.sectionCode) {
                        results.push({
                            sectionCode: sec.sectionCode,
                            section: sec.statutorySection || sec.title || sec.sectionCode,
                            validFrom: sec.effectivePeriod?.validFrom || '',
                            validTo: sec.effectivePeriod?.validTo || 'OPEN_ENDED',
                            governingStatute: sec.governingStatute || '',
                            tier: sec.tier || 'PUBLIC_COMMONS_FREE'
                        });
                    }
                } catch (_) {}
            }
        }
        return results;
    }

    if (options.localOnly) {
        return getLocalSections();
    }

    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const url = new URL('/api/v1/statutory/sections', baseUrl);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': '@mudraforge/statutory/2.4.0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.sections && data.sections.length > 0) {
                return data.sections;
            }
        }
    } catch (_) {
        // Fall back gracefully to local OKF filesystem
    }

    return getLocalSections();
}

/**
 * Check if a statute was actively in force as of a specific date (or today).
 */
export async function isStatuteActive(section, asOfDate) {
    try {
        const result = await lookupStatute(section, { asOfDate });
        return result.temporalStatus === 'ACTIVE';
    } catch {
        return false;
    }
}

/**
 * Execute a deterministic statutory calculation via the MudraForge Cloudflare Edge API.
 * Note: Calculation engines are NOT bundled locally in this client package.
 * They execute on the MudraForge edge runtime and require an Enterprise API key.
 * To obtain an API key, email MudraForge directly at hello@mudraforge.in or support@mudraforge.in.
 */
export async function calculate(payload = {}, options = {}) {
    const apiKey = options.apiKey || process.env?.MUDRA_STATUTORY_API_KEY || null;
    const client = new StatutoryClient({ ...options, apiKey });
    return await client.calculate(payload);
}

/**
 * Formalized Enterprise & Commons Client Class.
 * Provides offline-first resolution, automatic Cloudflare edge fallbacks,
 * and authenticated enterprise tier entitlements with System-1 reasoning & analysis modes.
 */
export class StatutoryClient {
    /**
     * @param {Object} [options]
     * @param {string} [options.apiKey] Enterprise API key (obtain from hello@mudraforge.in)
     * @param {'PUBLIC_COMMONS_FREE' | 'ENTERPRISE_PAID'} [options.tier] Client subscription tier
     * @param {string} [options.baseUrl] Custom edge base URL
     * @param {string} [options.okfDir] Path to local OKF directory
     * @param {boolean} [options.offlineFirst=true] Query local filesystem before hitting edge
     */
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env?.MUDRA_STATUTORY_API_KEY || null;
        this.tier = options.tier || (this.apiKey ? 'ENTERPRISE_PAID' : 'PUBLIC_COMMONS_FREE');
        this.baseUrl = options.baseUrl || process.env?.MUDRA_STATUTORY_BASE_URL || DEFAULT_BASE_URL;
        this.okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
        this.offlineFirst = options.offlineFirst !== false;
    }

    /**
     * Resolve a statutory provision with offline-first speed and enterprise tier attestation.
     */
    async lookup(section, options = {}) {
        const res = await lookupStatute(section, {
            ...options,
            baseUrl: this.baseUrl,
            okfDir: this.okfDir,
            apiKey: this.apiKey,
            tier: this.tier,
            forceEdge: !this.offlineFirst
        });

        return {
            ...res,
            tier: this.tier,
            clientTier: this.tier,
            authenticated: Boolean(this.apiKey)
        };
    }

    /**
     * Request a deterministic statutory calculation via the Cloudflare Edge API.
     * Requires an Enterprise API key.
     */
    async calculate(payload = {}) {
        if (!this.apiKey) {
            const err = new Error(
                '[@mudraforge/statutory] Deterministic calculation engines (Section 194Q excess math, ' +
                'MSMED 3x RBI compounding interest, Section 194J FTS vs Professional) require an Enterprise API key.\n' +
                'Direct contact is required: email hello@mudraforge.in or support@mudraforge.in to request access.'
            );
            err.code = 'API_KEY_REQUIRED';
            err.contact = 'hello@mudraforge.in';
            err.support = 'support@mudraforge.in';
            throw err;
        }

        const url = new URL('/api/v1/statutory/calculate', this.baseUrl);
        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Mudra-Tier': this.tier,
                'User-Agent': `@mudraforge/statutory/2.4.0 (${this.tier})`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const err = new Error(errJson.message || `Statutory calculation failed with HTTP ${res.status}`);
            err.status = res.status;
            err.error = errJson.error;
            err.contact = errJson.contact || 'hello@mudraforge.in';
            throw err;
        }

        return await res.json();
    }

    /**
     * Check active status.
     */
    async isStatuteActive(section, asOfDate) {
        return await isStatuteActive(section, asOfDate);
    }

    /**
     * List all indexed sections.
     */
    async listSections() {
        return await listSections({ baseUrl: this.baseUrl });
    }

    /**
     * Check for newer upstream OKF releases on edge.
     */
    async checkUpdates() {
        return await checkUpdates({ baseUrl: this.baseUrl, okfDir: this.okfDir });
    }

    /**
     * Sync local filesystem with upstream edge bundle.
     */
    async sync() {
        return await syncOkf({ baseUrl: this.baseUrl, okfDir: this.okfDir });
    }
}
