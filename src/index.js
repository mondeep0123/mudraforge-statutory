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
 * Look up a statutory provision directly from the local OKF filesystem (0 network calls).
 * Supports sectionCode, sectionId, aliases, and rich descriptive filename matching.
 */
export function lookupLocalStatute(section, okfDir = DEFAULT_LOCAL_OKF_DIR) {
    if (!section || typeof section !== 'string') {
        throw new Error('[@mudraforge/statutory] Section query must be a non-empty string.');
    }

    const rawClean = section.trim().toLowerCase();
    const normalized = rawClean.replace(/[()_-\s]+/g, '');
    const sectionsDir = path.join(okfDir, 'sections');
    if (!fs.existsSync(sectionsDir)) {
        throw new Error(`[@mudraforge/statutory] Local OKF sections directory not found at: ${sectionsDir}`);
    }

    const files = fs.readdirSync(sectionsDir);
    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(sectionsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 1. Direct sectionCode / sectionId match
        if (data.sectionCode.toLowerCase() === rawClean || data.sectionId.toLowerCase() === rawClean) {
            return data;
        }

        // 2. Normalized alphanumeric match (handles "17_5", "17(5)", "17-5", "msmed_15_16")
        if (
            data.sectionCode.toLowerCase().replace(/[()_-\s]+/g, '') === normalized ||
            data.sectionId.toLowerCase().replace(/[()_-\s]+/g, '') === normalized
        ) {
            return data;
        }

        // 3. Aliases match
        if (
            data.aliases &&
            data.aliases.some(
                a => a.toLowerCase() === rawClean || a.toLowerCase().replace(/[()_-\s]+/g, '') === normalized
            )
        ) {
            return data;
        }

        // 4. Rich self-documenting filename prefix match
        const fileBase = file.toLowerCase().replace(/\.json$/, '');
        if (fileBase.startsWith(rawClean) || fileBase.startsWith(normalized)) {
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
 * Look up a statutory provision by section code or alias (Live Edge API).
 */
export async function lookupStatute(section, options = {}) {
    if (!section || typeof section !== 'string') {
        throw new Error('[@mudraforge/statutory] Section query must be a non-empty string.');
    }

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

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const err = new Error(errorJson.message || `Statutory lookup failed with HTTP ${response.status}`);
        err.status = response.status;
        err.error = errorJson.error;
        err.availableSections = errorJson.availableSections;
        throw err;
    }

    return await response.json();
}

/**
 * List all statutory sections currently indexed in the Open Knowledge Commons.
 */
export async function listSections(options = {}) {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    const url = new URL('/api/v1/statutory/sections', baseUrl);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': '@mudraforge/statutory/2.4.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to list statutory sections: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.sections || [];
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
        if (this.offlineFirst) {
            try {
                const local = lookupLocalStatute(section, this.okfDir);
                if (local) {
                    return {
                        status: 'SUCCESS',
                        temporalStatus: 'ACTIVE',
                        source: 'LOCAL_OKF_FS',
                        tier: this.tier,
                        asOfDate: options.asOfDate || new Date().toISOString().split('T')[0],
                        statute: local
                    };
                }
            } catch (_) {}
        }

        const remote = await lookupStatute(section, {
            baseUrl: this.baseUrl,
            asOfDate: options.asOfDate,
            apiKey: this.apiKey,
            tier: this.tier
        });

        return {
            ...remote,
            source: 'EDGE_API',
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
