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
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_LOCAL_OKF_DIR = path.resolve(__dirname, '..', 'okf');
export const DEFAULT_BASE_URL = 'https://api.mudraforge.in';
export const STATUTORY_CLIENT_VERSION = '2.4.2';

/**
 * Pinned official release Merkle root digests.
 * Prevents unauthorized bundle substitution attacks even if an attacker controls the remote endpoint.
 */
export const PINNED_RELEASE_ROOTS = new Set([
    'sha256-7fe98cf432db5d31ee6b65bbb9d77575ce8c9192eec6f318e3ad3382af0ba900', // v2.5.0 Edge Sync Bundle Root
    'sha256-96089fe2835d0b9493293a1e5205e0b6b46f16771c9380d1f571969b453ba80d', // v2.4.0 Local Static Manifest Root
    'sha256-d9612074241f7c2cc1d05fa5eee254996f21db56ad1ab71ac36a084ffd4169e1'  // Baseline Release Root
]);

/**
 * Canonical MudraForge Statutory Root Ed25519 Public Key (SPKI DER Base64).
 * Used for verifying digital signatures on remote statutory update bundles.
 */
export const MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY = 'MCowBQYDK2VwAyEAw/XsE6QGtQzdq3EUP3xFpPFHu1x87VSNreXmXr6W17s=';

/**
 * Authoritative set of trusted MudraForge Root Public Keys.
 * Public keys supplied through options that are not present in this set are rejected.
 */
export const TRUSTED_STATUTORY_PUBLIC_KEYS = new Set([
    MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY
]);

/**
 * Key metadata and validity windows for authorized root signing keys.
 */
export const TRUSTED_STATUTORY_KEYS_METADATA = {
    [MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY]: {
        keyId: 'mudraforge-root-2026-v1',
        algorithm: 'Ed25519',
        purpose: 'MudraForge Open Knowledge Format Statutory Root Authority',
        validFrom: '2026-01-01T00:00:00Z',
        validTo: '2027-12-31T23:59:59Z',
        status: 'ACTIVE'
    }
};

/**
 * Key Revocation List (CRL) for compromised or retired signing keys.
 * Signatures signed with any key in this set are strictly rejected, even if mathematically valid.
 */
export const REVOKED_STATUTORY_KEYS = new Set([]);
export const REVOKED_KEY_IDS = new Set([]);

/**
 * Baseline mandatory statutory provisions required in any synchronized OKF bundle.
 * If any of these provisions are missing, syncOkf() fails closed.
 */
export const MANDATORY_BASELINE_SECTIONS = ['194Q', '194J', '17(5)', 'MSMED-15-16', '393'];

/**
 * Determines whether the current process is running in a production environment across runtimes.
 */
export function isProductionEnvironment() {
    return process.env?.NODE_ENV === 'production'
        || process.env?.ENVIRONMENT === 'production'
        || process.env?.CF_PAGES === '1'
        || process.env?.CF_ENVIRONMENT === 'production'
        || process.env?.PRODUCTION === 'true';
}

/**
 * Verify Ed25519 digital signature of an OKF bundle payload.
 * Enforces key provenance, key revocation (CRL), expiration windows, and canonical hash binding.
 */
export function verifyBundleSignature(bundle, publicKeyBase64 = MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY, options = {}) {
    if (!bundle || !bundle.signature || !publicKeyBase64) return false;

    // 1. Key Revocation Check
    if (REVOKED_STATUTORY_KEYS.has(publicKeyBase64) || (options.revokedKeys && options.revokedKeys.has(publicKeyBase64))) {
        return false;
    }
    if (bundle.keyId && (REVOKED_KEY_IDS.has(bundle.keyId) || (options.revokedKeyIds && options.revokedKeyIds.has(bundle.keyId)))) {
        return false;
    }

    // 2. Bundle Expiration & Staleness Check
    if (bundle.expiresAt) {
        const expTime = new Date(bundle.expiresAt).getTime();
        if (!isNaN(expTime) && Date.now() > expTime) {
            return false;
        }
    }

    try {
        const canonicalString = `${bundle.okfVersion || ''}|${bundle.rootHash || ''}|${bundle.publishedAt || ''}`;
        const dataBytes = Buffer.from(canonicalString, 'utf8');
        const pubKeyDer = Buffer.from(publicKeyBase64, 'base64');
        const pubKey = crypto.createPublicKey({
            key: pubKeyDer,
            format: 'der',
            type: 'spki'
        });
        const sigBytes = Buffer.from(bundle.signature, 'base64');
        return crypto.verify(null, dataBytes, pubKey, sigBytes);
    } catch (_) {
        return false;
    }
}

/**
 * Fail-Closed Statutory Exception.
 * Raised when a statutory provision or rate cannot be authoritatively resolved,
 * enforcing the critical invariant that financial agents must never default to 0% withholding.
 */
export class StatutoryIndeterminateError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'StatutoryIndeterminateError';
        this.code = details.code || 'STATUTORY_INDETERMINATE';
        this.failClosed = true;
        this.section = details.section || null;
        this.statutoryAdvice = details.statutoryAdvice || 'Fail-closed invariant triggered: Tax withholding must not default to 0% without authoritative statutory determination.';
        this.details = details;
    }
}

/**
 * Compare two semantic version strings (e.g. "2.4.0" vs "2.3.1").
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if equal.
 */
export function compareSemver(v1, v2) {
    const parse = (v) => (v || '0.0.0').replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
    const p1 = parse(v1);
    const p2 = parse(v2);
    for (let i = 0; i < 3; i++) {
        if (p1[i] > p2[i]) return 1;
        if (p1[i] < p2[i]) return -1;
    }
    return 0;
}

/**
 * Builds standard User-Agent header while respecting privacy flags (DO_NOT_TRACK / MUDRA_NO_TELEMETRY).
 */
export function buildUserAgent() {
    if (process.env?.DO_NOT_TRACK === '1' || process.env?.MUDRA_NO_TELEMETRY === '1') {
        return `@mudraforge/statutory/${STATUTORY_CLIENT_VERSION} (anonymous)`;
    }
    const runtime = process.release?.name || 'node';
    const version = process.version || 'unknown';
    const platform = process.platform || 'unknown';
    return `@mudraforge/statutory/${STATUTORY_CLIENT_VERSION} (${runtime}/${version}; ${platform})`;
}

/**
 * Enforce HTTPS transport to prevent man-in-the-middle attacks, allowing HTTP only for local loopback.
 */
export function assertSecureEndpoint(urlStr) {
    const parsed = new URL(urlStr);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
    if (parsed.protocol !== 'https:' && !isLocal) {
        throw new Error(`[@mudraforge/statutory] Insecure transport rejected for host "${parsed.hostname}". HTTPS is required to ensure cryptographic integrity of statutory data.`);
    }
}

/**
 * Sanitize statutory section filename and prevent directory traversal,
 * prototype pollution, and Windows reserved device name collisions.
 */
export function resolveSafeStatuteFilename(statute) {
    if (!statute || typeof statute.sectionCode !== 'string' || !statute.sectionCode.trim()) {
        throw new Error('[@mudraforge/statutory] Invalid statute entry: missing required sectionCode.');
    }

    const rawCode = statute.sectionCode.trim();
    const lowerCode = rawCode.toLowerCase();

    // Prototype pollution prevention
    if (lowerCode === '__proto__' || lowerCode === 'constructor' || lowerCode === 'prototype') {
        throw new Error(`[@mudraforge/statutory] Security violation: Forbidden sectionCode name "${rawCode}".`);
    }

    let safeCode = rawCode.replace(/[()]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '-');

    // Windows Reserved Device Names Protection (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (WINDOWS_RESERVED.test(safeCode)) {
        safeCode = `sec_${safeCode}`;
    }

    const shortTitle = (statute.title || '')
        .slice(0, 200)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 45)
        .replace(/-+$/, '');

    const baseName = shortTitle ? `${safeCode}-${shortTitle}.json` : `${safeCode}.json`;
    let sanitized = path.basename(baseName).replace(/[^a-zA-Z0-9_\-\.]/g, '');

    if (!sanitized || sanitized === '.' || sanitized === '..') {
        throw new Error(`[@mudraforge/statutory] Security violation: Malformed filename generated for section "${statute.sectionCode}".`);
    }

    const stem = path.parse(sanitized).name;
    if (WINDOWS_RESERVED.test(stem)) {
        sanitized = `sec_${sanitized}`;
    }

    return sanitized;
}

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
 * Safely parse JSON responses from remote endpoints, asserting Content-Type
 * to prevent uncaught SyntaxErrors when upstream proxies return HTML or text.
 */
async function safeJsonParse(res, contextMsg) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
        const textSnippet = (await res.text().catch(() => '')).slice(0, 120).replace(/\s+/g, ' ');
        throw new Error(
            `[@mudraforge/statutory] ${contextMsg} failed: Expected "application/json" response from remote edge, but received "${contentType || 'unknown'}". Response snippet: "${textSnippet}"`
        );
    }
    return await res.json();
}

/**
 * Helper to recursively find all JSON files in a directory.
 * Hardened against:
 * 1. Symlink traversal & circular recursion loops (tracked realpaths)
 * 2. Abandoned staging directories (.staging-sync-*) and hidden dotfolders (.git)
 */
function findJsonFilesRecursively(dir, visited = new Set()) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    try {
        const realDir = fs.realpathSync(dir);
        if (visited.has(realDir)) return results;
        visited.add(realDir);

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            // Skip hidden dotfiles and staging folders (.staging-sync-*, .git, etc.)
            if (entry.name.startsWith('.')) continue;

            // Skip symbolic links to prevent directory escape and infinite traversal loops
            if (typeof entry.isSymbolicLink === 'function' && entry.isSymbolicLink()) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(findJsonFilesRecursively(fullPath, visited));
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

    const rawClean = section.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
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
        if (!data || !data.sectionCode || typeof data.sectionCode !== 'string') continue;

        let isMatch = false;
        const secCode = data.sectionCode.toLowerCase();
        const secId = (data.sectionId && typeof data.sectionId === 'string') ? data.sectionId.toLowerCase() : '';

        // 1. Direct sectionCode / sectionId match
        if (secCode === rawClean || (secId && secId === rawClean)) {
            isMatch = true;
        }

        // 2. Normalized alphanumeric match (handles "17_5", "17(5)", "17-5", "msmed_15_16")
        if (
            !isMatch && (
                secCode.replace(/[()_-\s]+/g, '') === normalized ||
                (secId && secId.replace(/[()_-\s]+/g, '') === normalized)
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
 * Supports HTTP 304 Not Modified validation via Merkle root ETag.
 */
export async function checkUpdates(options = {}) {
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    assertSecureEndpoint(baseUrl);

    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const localManifest = getLocalManifest(okfDir) || { okfVersion: '0.0.0', rootHash: null };

    const url = new URL('/api/v1/statutory/manifest.json', baseUrl);
    const headers = {
        'Accept': 'application/json',
        'User-Agent': buildUserAgent()
    };
    if (localManifest.rootHash) {
        headers['If-None-Match'] = `"${localManifest.rootHash}"`;
    }

    const res = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(options.timeoutMs || 15000)
    });

    if (res.status === 304) {
        return {
            localVersion: localManifest.okfVersion,
            latestVersion: localManifest.okfVersion,
            isOutdated: false,
            notModified: true,
            publishedAt: localManifest.publishedAt,
            changelog: localManifest.changelog || 'Up to date with edge Merkle digest',
            totalSections: localManifest.totalSections || localManifest.sections?.length || 0
        };
    }

    if (!res.ok) {
        throw new Error(`Failed to check remote version: HTTP ${res.status}`);
    }

    const remote = await safeJsonParse(res, 'checkUpdates');
    const isOutdated = remote.okfVersion !== localManifest.okfVersion || (remote.rootHash && remote.rootHash !== localManifest.rootHash);

    return {
        localVersion: localManifest.okfVersion,
        latestVersion: remote.okfVersion,
        isOutdated,
        notModified: false,
        publishedAt: remote.publishedAt,
        changelog: remote.changelog,
        totalSections: remote.totalSections,
        rootHash: remote.rootHash
    };
}

/**
 * Check if a newer version of the @mudraforge/statutory npm package is published on npmjs.com.
 * Uses a lightweight cached file in os.tmpdir() to prevent frequent network roundtrips.
 *
 * @param {Object} [options]
 * @param {string} [options.currentVersion] - Current installed version (defaults to STATUTORY_CLIENT_VERSION).
 * @param {number} [options.cacheTtlMs] - Cache duration in milliseconds (default: 24 hours).
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds (default: 1500ms).
 * @param {string} [options.registryUrl] - Registry endpoint (default: https://registry.npmjs.org/@mudraforge/statutory/latest).
 * @returns {Promise<{ updateAvailable: boolean, currentVersion: string, latestVersion: string } | null>}
 */
export async function checkForPackageUpdate(options = {}) {
    if (process.env.NO_UPDATE_NOTIFIER === '1' || process.env.CI === 'true') {
        return null;
    }

    const currentVersion = options.currentVersion || STATUTORY_CLIENT_VERSION;
    const cacheTtlMs = options.cacheTtlMs !== undefined ? options.cacheTtlMs : 24 * 60 * 60 * 1000;
    const timeoutMs = options.timeoutMs || 1500;
    const cacheFile = path.join(os.tmpdir(), '.mudraforge_statutory_npm_update.json');

    let cached = null;
    if (cacheTtlMs > 0) {
        try {
            if (fs.existsSync(cacheFile)) {
                const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                if (data && typeof data.lastChecked === 'number' && (Date.now() - data.lastChecked < cacheTtlMs)) {
                    cached = data;
                }
            }
        } catch (_) {}
    }

    let latestVersion = cached?.latestVersion;

    if (!latestVersion) {
        try {
            const url = options.registryUrl || 'https://registry.npmjs.org/@mudraforge/statutory/latest';
            const res = await fetch(url, {
                signal: AbortSignal.timeout(timeoutMs),
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.version && typeof json.version === 'string') {
                    latestVersion = json.version;
                    if (cacheTtlMs > 0) {
                        try {
                            fs.writeFileSync(cacheFile, JSON.stringify({
                                lastChecked: Date.now(),
                                latestVersion
                            }), 'utf8');
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {
            // Fail open and silent on network error, offline, or timeout
            return null;
        }
    }

    if (!latestVersion) return null;

    const cmp = compareSemver(latestVersion, currentVersion);
    return {
        updateAvailable: cmp > 0,
        currentVersion,
        latestVersion
    };
}

/**
 * Download and synchronize the latest OKF knowledge bundle to disk.
 * Hardened with:
 * 1. Transport Security (Enforced HTTPS)
 * 2. Pre-write integrity and schema validation
 * 3. Path Traversal & Containment Assertions
 * 4. Atomic Staging Directory Writes (Fail-closed)
 * 5. HTTP ETag 304 Cache Optimization
 */
export async function syncOkf(options = {}) {
    // Production Security Guard: Development bypasses cannot accidentally be enabled in production
    const isProduction = isProductionEnvironment();
    if (isProduction && options.allowUnverifiedRoot) {
        throw new Error('[@mudraforge/statutory] Security violation: options.allowUnverifiedRoot is strictly forbidden in production environments.');
    }
    if (isProduction && options.allowDowngrade) {
        throw new Error('[@mudraforge/statutory] Security violation: options.allowDowngrade is strictly forbidden in production environments.');
    }
    const effectiveKey = options.publicKey || MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY;
    if (REVOKED_STATUTORY_KEYS.has(effectiveKey) || (options.revokedKeys && options.revokedKeys.has(effectiveKey))) {
        throw new Error('[@mudraforge/statutory] Security violation: Statutory root signing key has been revoked by the MudraForge Root Authority.');
    }

    if (options.publicKey && !TRUSTED_STATUTORY_PUBLIC_KEYS.has(options.publicKey)) {
        if (isProduction) {
            throw new Error('[@mudraforge/statutory] Security violation: Untrusted public key provided. Only keys registered with the MudraForge Root Authority are accepted in production environments.');
        }
        if (!options.allowUntrustedPublicKey) {
            throw new Error('[@mudraforge/statutory] Security violation: Untrusted public key provided. Set options.allowUntrustedPublicKey=true for non-production testing fixtures.');
        }
    }

    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    assertSecureEndpoint(baseUrl);

    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const sectionsDir = path.join(okfDir, 'sections');
    const localManifest = getLocalManifest(okfDir);

    const bundleUrl = new URL('/api/v1/statutory/bundle.json', baseUrl);
    const headers = {
        'Accept': 'application/json',
        'User-Agent': buildUserAgent()
    };

    // If local manifest has rootHash and force is not requested, check ETag
    if (!options.force && localManifest && localManifest.rootHash) {
        headers['If-None-Match'] = `"${localManifest.rootHash}"`;
    }

    const res = await fetch(bundleUrl.toString(), {
        headers,
        signal: AbortSignal.timeout(options.timeoutMs || 25000)
    });

    if (res.status === 304) {
        return {
            success: true,
            notModified: true,
            okfVersion: localManifest.okfVersion,
            syncedSections: localManifest.sections?.length || 0,
            destDir: okfDir,
            message: 'Local OKF snapshot already matches edge Merkle root (HTTP 304).'
        };
    }

    if (!res.ok) {
        throw new Error(`Failed to download OKF bundle: HTTP ${res.status}`);
    }

    // Guard against memory bombs (> 10MB)
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    if (contentLength > 10485760) {
        throw new Error(`[@mudraforge/statutory] Bundle size exceeds 10MB security threshold (${contentLength} bytes).`);
    }

    const bundle = await safeJsonParse(res, 'syncOkf');

    // 1. Structural & Cryptographic Pre-validation
    if (!bundle || typeof bundle !== 'object') {
        throw new Error('[@mudraforge/statutory] Invalid bundle payload: expected JSON object.');
    }
    if (!Array.isArray(bundle.statutes) || bundle.statutes.length === 0) {
        throw new Error('[@mudraforge/statutory] Invalid bundle payload: missing statutes array.');
    }
    if (bundle.statutes.length > 500) {
        throw new Error(`[@mudraforge/statutory] Security violation: Bundle exceeds maximum allowable section ceiling of 500 (received ${bundle.statutes.length}).`);
    }
    if (!bundle.okfVersion || typeof bundle.okfVersion !== 'string') {
        throw new Error('[@mudraforge/statutory] Invalid bundle payload: missing okfVersion.');
    }
    if (!bundle.rootHash || !bundle.rootHash.startsWith('sha256-')) {
        throw new Error('[@mudraforge/statutory] Invalid bundle payload: missing or malformed SHA-256 rootHash.');
    }

    // 1.5 Monotonic Rollback & Downgrade Attack Prevention
    if (!options.allowDowngrade) {
        // Authoritative baseline: use local manifest version if present;
        // if manifest is wiped or missing, anchor to the hardcoded package version.
        const baselineVersion = (localManifest && localManifest.okfVersion) 
            ? localManifest.okfVersion 
            : STATUTORY_CLIENT_VERSION;

        const cmp = compareSemver(bundle.okfVersion, baselineVersion);
        if (cmp < 0) {
            throw new Error(`[@mudraforge/statutory] Security violation: Rollback attack detected. Remote bundle version (v${bundle.okfVersion}) is older than installed baseline (v${baselineVersion}). Set options.allowDowngrade=true to force downgrade.`);
        }
        if (cmp === 0 && localManifest && bundle.publishedAt && localManifest.publishedAt) {
            const remoteTime = new Date(bundle.publishedAt).getTime();
            const localTime = new Date(localManifest.publishedAt).getTime();
            if (!isNaN(remoteTime) && !isNaN(localTime) && remoteTime < localTime) {
                throw new Error(`[@mudraforge/statutory] Security violation: Rollback attack detected. Remote bundle published timestamp (${bundle.publishedAt}) is older than installed snapshot (${localManifest.publishedAt}). Set options.allowDowngrade=true to force downgrade.`);
            }
        }
    }

    // 2. Atomic Staging Pipeline
    const stagingDir = path.join(okfDir, `.staging-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    fs.mkdirSync(stagingDir, { recursive: true });

    try {
        const fileHashes = {};
        const syncedSectionCodes = [];
        const seenCodes = new Set();

        for (const statute of bundle.statutes) {
            // Verify core required statutory fields
            if (!statute.sectionCode || !statute.title || !statute.effectivePeriod) {
                throw new Error(`[@mudraforge/statutory] Malformed statute record: missing required metadata for ${JSON.stringify(statute.sectionCode || 'unknown')}.`);
            }

            const codeKey = statute.sectionCode.toLowerCase().trim();
            if (seenCodes.has(codeKey)) {
                throw new Error(`[@mudraforge/statutory] Integrity violation: Duplicate sectionCode "${statute.sectionCode}" detected in bundle.`);
            }
            seenCodes.add(codeKey);

            const fileName = resolveSafeStatuteFilename(statute);
            const targetPath = path.resolve(stagingDir, fileName);

            // Path Traversal Containment Assertion
            if (!targetPath.startsWith(path.resolve(stagingDir) + path.sep)) {
                throw new Error(`[@mudraforge/statutory] Security violation: Path traversal detected in filename "${fileName}".`);
            }

            const jsonStr = JSON.stringify(statute, null, 2);
            fs.writeFileSync(targetPath, jsonStr, 'utf8');

            const fileHash = crypto.createHash('sha256').update(jsonStr).digest('hex');
            fileHashes[fileName] = fileHash;
            syncedSectionCodes.push(statute.sectionCode);
        }

        // 2.5 Cryptographic Root Merkle Digest Verification
        // Deterministically compute root hash and verify against bundle.rootHash
        const rootHasher = crypto.createHash('sha256');
        for (const [relPath, hash] of Object.entries(fileHashes).sort(([a], [b]) => a.localeCompare(b))) {
            rootHasher.update(`${relPath}:${hash}\n`);
        }
        const computedRoot = `sha256-${rootHasher.digest('hex')}`;
        if (bundle.rootHash !== computedRoot) {
            throw new Error(`[@mudraforge/statutory] Cryptographic integrity violation: Bundle rootHash mismatch. Expected "${bundle.rootHash}", computed "${computedRoot}".`);
        }

        // 2.6 Cryptographic Trust Anchor & Origin Authenticity Enforcement
        // Production Guard: Development bypasses cannot accidentally be enabled in production
        if (isProduction && options.allowUnverifiedRoot) {
            throw new Error('[@mudraforge/statutory] Security violation: options.allowUnverifiedRoot is strictly forbidden in production environments.');
        }

        // Caller-specified expected root constraints (exact pinning)
        if (options.expectedRootHash && bundle.rootHash !== options.expectedRootHash) {
            throw new Error(`[@mudraforge/statutory] Security violation: Bundle rootHash "${bundle.rootHash}" is not authorized. Expected rootHash "${options.expectedRootHash}".`);
        }

        if (Array.isArray(options.authorizedRootHashes) && !options.authorizedRootHashes.includes(bundle.rootHash)) {
            throw new Error(`[@mudraforge/statutory] Security violation: Bundle rootHash "${bundle.rootHash}" is not present in authorized root digests.`);
        }

        // Authenticity Anchor:
        // Supplying expectedRootHash or authorizedRootHashes does NOT bypass origin authentication.
        // Every bundle must either be signed by an authorized Ed25519 key or match an immutable pinned root,
        // unless explicitly opted into allowUnverifiedRoot in non-production environments.
        if (!options.allowUnverifiedRoot) {
            let isSignatureValid = false;
            if (bundle.signature) {
                isSignatureValid = verifyBundleSignature(bundle, options.publicKey || MUDRAFORGE_STATUTORY_ROOT_PUBLIC_KEY, options);
            }
            const isPinned = PINNED_RELEASE_ROOTS.has(bundle.rootHash);

            if (!isSignatureValid && !isPinned) {
                throw new Error(`[@mudraforge/statutory] Security violation: Untrusted bundle rootHash "${bundle.rootHash}". Bundle is neither cryptographically signed by MudraForge Root Authority nor pinned in authorized release roots. Set options.allowUnverifiedRoot=true for local non-production fixtures.`);
            }
        }

        // 2.7 Required & Allowed Sections Verification
        // If requiredSections is omitted, default to MANDATORY_BASELINE_SECTIONS unless explicitly opted out
        const effectiveRequired = Array.isArray(options.requiredSections)
            ? options.requiredSections
            : (options.skipMandatoryBaselineCheck ? [] : MANDATORY_BASELINE_SECTIONS);

        for (const reqCode of effectiveRequired) {
            if (!seenCodes.has(reqCode.toLowerCase().trim())) {
                throw new Error(`[@mudraforge/statutory] Integrity violation: Bundle is missing required statutory provision "${reqCode}".`);
            }
        }

        if (Array.isArray(options.allowedSections)) {
            const allowedSet = new Set(options.allowedSections.map(s => s.toLowerCase().trim()));
            for (const code of seenCodes) {
                if (!allowedSet.has(code)) {
                    throw new Error(`[@mudraforge/statutory] Security violation: Bundle contains unexpected unauthorized section "${code}".`);
                }
            }
        }

        // 3. Atomically deploy from staging to destination
        fs.mkdirSync(sectionsDir, { recursive: true });

        const stagedFiles = fs.readdirSync(stagingDir);
        for (const stagedFile of stagedFiles) {
            const srcPath = path.join(stagingDir, stagedFile);
            const destPath = path.join(sectionsDir, stagedFile);

            // Safety assertion on destination path containment
            const resolvedDest = path.resolve(destPath);
            if (!resolvedDest.startsWith(path.resolve(sectionsDir) + path.sep)) {
                throw new Error(`[@mudraforge/statutory] Security violation: Destination path traversal detected in "${stagedFile}".`);
            }

            try {
                fs.renameSync(srcPath, destPath);
            } catch {
                fs.copyFileSync(srcPath, destPath);
                fs.unlinkSync(srcPath);
            }
        }

        // 4. Write verified manifest
        const manifest = {
            okfVersion: bundle.okfVersion,
            publishedAt: bundle.publishedAt || new Date().toISOString(),
            rootHash: bundle.rootHash,
            totalSections: bundle.statutes.length,
            changelog: bundle.changelog || 'Synchronized from Cloudflare Edge API',
            sections: syncedSectionCodes
        };
        fs.writeFileSync(path.join(okfDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

        return {
            success: true,
            notModified: false,
            okfVersion: bundle.okfVersion,
            rootHash: bundle.rootHash,
            syncedSections: bundle.statutes.length,
            destDir: okfDir
        };
    } finally {
        // Clean up temporary staging directory
        try {
            if (fs.existsSync(stagingDir)) {
                fs.rmSync(stagingDir, { recursive: true, force: true });
            }
        } catch (_) {}
    }
}

/**
 * Compute the temporal validity status of a statutory record as of a specific date.
 * If asOfDate is omitted or 'CURRENT_ACTIVE', evaluates against active baseline.
 * Returns 'ACTIVE', 'SUNSET_SUPERSEDED', or 'FUTURE_PENDING'.
 */
export function computeTemporalStatus(statute, asOfDate) {
    if (!statute || !statute.effectivePeriod) return 'ACTIVE';
    const queryDate = (!asOfDate || asOfDate === 'CURRENT_ACTIVE')
        ? new Date().toISOString().split('T')[0]
        : asOfDate.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        throw new Error(`[@mudraforge/statutory] Invalid date format "${asOfDate}". Date must be in ISO 8601 YYYY-MM-DD format.`);
    }

    const { validFrom, validTo } = statute.effectivePeriod;

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
 * 
 * Supports explicit retrieval modes:
 * - 'auto' (default): Checks local OKF snapshot first; queries Cloudflare Edge API if unbundled or stale.
 * - 'local': Resolves strictly from local filesystem (0 network calls; fails if provision not bundled).
 * - 'edge': Resolves directly against Cloudflare Edge API (requires network connectivity).
 * 
 * To ensure epistemic rigor, responses explicitly distinguish between an offline static snapshot
 * and a live, edge-verified statutory lookup.
 */
export async function lookupStatute(section, options = {}) {
    if (!section || typeof section !== 'string' || !section.trim()) {
        throw new Error('[@mudraforge/statutory] Section query must be a non-empty string.');
    }

    const cleanSection = section.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (cleanSection.length > 64) {
        throw new Error('[@mudraforge/statutory] Section query exceeds maximum allowable length of 64 characters.');
    }

    const mode = options.mode || (options.forceEdge ? 'edge' : 'auto');
    const okfDir = options.okfDir || DEFAULT_LOCAL_OKF_DIR;
    const asOfDate = options.asOfDate ? options.asOfDate.trim() : 'CURRENT_ACTIVE';

    if (asOfDate !== 'CURRENT_ACTIVE' && !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
        throw new Error(`[@mudraforge/statutory] Invalid date format "${asOfDate}". Date must be in ISO 8601 YYYY-MM-DD format.`);
    }

    // 1. Strict Local Mode
    if (mode === 'local') {
        if (!fs.existsSync(okfDir)) {
            const dirErr = new Error(`[@mudraforge/statutory] Local OKF directory not found at: ${okfDir}`);
            dirErr.code = 'DIRECTORY_NOT_FOUND';
            throw dirErr;
        }
        const local = lookupLocalStatute(cleanSection, okfDir);
        if (!local) {
            const notFoundErr = new Error(`[@mudraforge/statutory] Section [${cleanSection}] not found in local OKF snapshot (${okfDir}).`);
            notFoundErr.code = 'SECTION_NOT_FOUND';
            throw notFoundErr;
        }
        return {
            status: 'SUCCESS',
            temporalStatus: computeTemporalStatus(local, asOfDate),
            asOfDate,
            source: 'LOCAL_OKF_FS',
            retrievalMode: 'LOCAL_SNAPSHOT',
            snapshotVersion: local.version || '2.4.0',
            isOfflineSnapshot: true,
            advisory: 'Offline statutory snapshot. For real-time gazetted amendments, sync with Edge API or run in edge mode.',
            statute: local
        };
    }

    // 2. Auto Mode: Local-first check
    if (mode === 'auto' && fs.existsSync(okfDir)) {
        try {
            const local = lookupLocalStatute(cleanSection, okfDir);
            if (local) {
                return {
                    status: 'SUCCESS',
                    temporalStatus: computeTemporalStatus(local, asOfDate),
                    asOfDate,
                    source: 'LOCAL_OKF_FS',
                    retrievalMode: 'LOCAL_SNAPSHOT',
                    snapshotVersion: local.version || '2.4.0',
                    isOfflineSnapshot: true,
                    advisory: 'Offline statutory snapshot. For real-time gazetted amendments, sync with Edge API or run in edge mode.',
                    statute: local
                };
            }
        } catch (_) {}
    }

    // 3. Edge API query
    const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    assertSecureEndpoint(baseUrl);

    const url = new URL('/api/v1/statutory/lookup', baseUrl);
    url.searchParams.set('section', cleanSection);

    if (options.asOfDate) {
        url.searchParams.set('asOfDate', options.asOfDate.trim());
    }

    const headers = {
        'Accept': 'application/json',
        'User-Agent': buildUserAgent()
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
            headers,
            signal: AbortSignal.timeout(options.timeoutMs || 15000)
        });
    } catch (netErr) {
        // In auto mode, if network failed but local is available, fall back with explicit flag
        if (mode === 'auto' && fs.existsSync(okfDir)) {
            const local = lookupLocalStatute(cleanSection, okfDir);
            if (local) {
                return {
                    status: 'SUCCESS',
                    temporalStatus: computeTemporalStatus(local, asOfDate),
                    asOfDate,
                    source: 'LOCAL_OKF_FS',
                    retrievalMode: 'LOCAL_SNAPSHOT_FALLBACK',
                    snapshotVersion: local.version || '2.4.0',
                    isOfflineSnapshot: true,
                    advisory: `Edge query unreachable (${netErr.message}); degraded to offline snapshot.`,
                    statute: local
                };
            }
        }
        const connErr = new Error(`[@mudraforge/statutory] Edge query failed: ${netErr.message}`);
        connErr.code = 'EDGE_NETWORK_ERROR';
        throw connErr;
    }

    if (!response.ok) {
        const isJson = (response.headers.get('content-type') || '').toLowerCase().includes('application/json');
        const errorJson = isJson ? await response.json().catch(() => ({})) : {};
        const err = new Error(errorJson.message || `Statutory lookup failed with HTTP ${response.status}`);
        err.status = response.status;
        err.code = response.status === 404 ? 'SECTION_NOT_FOUND' : 'EDGE_API_ERROR';
        err.error = errorJson.error;
        err.availableSections = errorJson.availableSections;
        throw err;
    }

    const data = await safeJsonParse(response, 'lookupStatute');
    return {
        ...data,
        source: 'EDGE_API',
        retrievalMode: 'EDGE_LIVE',
        isOfflineSnapshot: false
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
    assertSecureEndpoint(baseUrl);
    const url = new URL('/api/v1/statutory/sections', baseUrl);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': buildUserAgent()
            },
            signal: AbortSignal.timeout(options.timeoutMs || 15000)
        });

        if (response.ok) {
            const data = await safeJsonParse(response, 'listSections');
            if (data.sections && data.sections.length > 0) {
                // Merge local sections if local filesystem has newly added or unbundled provisions
                const localSecs = getLocalSections();
                const remoteCodes = new Set(data.sections.map(s => (s.sectionCode || '').toLowerCase()));
                const merged = [...data.sections];
                for (const loc of localSecs) {
                    if (!remoteCodes.has((loc.sectionCode || '').toLowerCase())) {
                        merged.push(loc);
                    }
                }
                return merged;
            }
        }
    } catch (_) {
        // Fall back gracefully to local OKF filesystem
    }

    return getLocalSections();
}

/**
 * Check if a statute was actively in force as of a specific date (or today).
 * Enforces fail-closed invariants: if failClosed is enabled, network or parse failures
 * raise StatutoryIndeterminateError rather than falsely reporting inactive status (preventing 0% withholding defaults).
 */
export async function isStatuteActive(section, asOfDate, options = {}) {
    try {
        const result = await lookupStatute(section, { ...options, asOfDate });
        return result.temporalStatus === 'ACTIVE';
    } catch (err) {
        if (err.code === 'SECTION_NOT_FOUND') {
            return false;
        }
        if (options.failClosed) {
            throw new StatutoryIndeterminateError(
                `Fail-closed check blocked: Unable to determine temporal status for [${section}]: ${err.message}`,
                { section, asOfDate, originalError: err }
            );
        }
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
    async calculate(payload = {}, options = {}) {
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

        // Validate safe integer financial thresholds
        if (payload.invoiceAmount !== undefined && (
            typeof payload.invoiceAmount !== 'number' || 
            !Number.isFinite(payload.invoiceAmount) || 
            payload.invoiceAmount < 0 || 
            payload.invoiceAmount > Number.MAX_SAFE_INTEGER
        )) {
            throw new Error('[@mudraforge/statutory] Financial numerical validation error: invoiceAmount must be a non-negative finite number not exceeding Number.MAX_SAFE_INTEGER.');
        }
        if (payload.priorFyPurchases !== undefined && (
            typeof payload.priorFyPurchases !== 'number' || 
            !Number.isFinite(payload.priorFyPurchases) || 
            payload.priorFyPurchases < 0 || 
            payload.priorFyPurchases > Number.MAX_SAFE_INTEGER
        )) {
            throw new Error('[@mudraforge/statutory] Financial numerical validation error: priorFyPurchases must be a non-negative finite number not exceeding Number.MAX_SAFE_INTEGER.');
        }
        if (payload.principal !== undefined && (
            typeof payload.principal !== 'number' || 
            !Number.isFinite(payload.principal) || 
            payload.principal < 0 || 
            payload.principal > Number.MAX_SAFE_INTEGER
        )) {
            throw new Error('[@mudraforge/statutory] Financial numerical validation error: principal must be a non-negative finite number not exceeding Number.MAX_SAFE_INTEGER.');
        }

        assertSecureEndpoint(this.baseUrl);

        const url = new URL('/api/v1/statutory/calculate', this.baseUrl);
        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Mudra-Tier': this.tier,
                'User-Agent': `@mudraforge/statutory/${STATUTORY_CLIENT_VERSION} (${this.tier})`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(options.timeoutMs || 20000)
        });

        if (!res.ok) {
            const isJson = (res.headers.get('content-type') || '').toLowerCase().includes('application/json');
            const errJson = isJson ? await res.json().catch(() => ({})) : {};
            const err = new Error(errJson.message || `Statutory calculation failed with HTTP ${res.status}`);
            err.status = res.status;
            err.error = errJson.error;
            err.contact = errJson.contact || 'hello@mudraforge.in';
            throw err;
        }

        return await safeJsonParse(res, 'StatutoryClient.calculate');
    }

    /**
     * Check active status with optional fail-closed protection.
     */
    async isStatuteActive(section, asOfDate, options = {}) {
        return await isStatuteActive(section, asOfDate, { ...options, baseUrl: this.baseUrl, okfDir: this.okfDir });
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
