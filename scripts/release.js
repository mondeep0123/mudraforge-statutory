import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version;
const tagName = `v${version}`;

console.log('===========================================================================');
console.log(`MUDRAFORGE STATUTORY — UNIFIED RELEASE RUNNER [${tagName}]`);
console.log('===========================================================================');

// 1. Run Verification Gates
console.log('\n[1/4] Running cryptographic manifest check and regression test suite...');
execSync('node scripts/generate_manifest.js --check', { cwd: rootDir, stdio: 'inherit' });
execSync('node test.js', { cwd: rootDir, stdio: 'inherit' });

// 2. Publish to NPM Registry
console.log(`\n[2/4] Publishing ${pkg.name}@${version} to NPM registry...`);
execSync('npm publish --access public', { cwd: rootDir, stdio: 'inherit' });

// 3. Create Git Tag
console.log(`\n[3/4] Creating git tag ${tagName}...`);
try {
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
    console.warn(`[WARN] Git tag ${tagName} may already exist locally: ${err.message}`);
}

// 4. Push Tag to GitHub (triggers GitHub Actions release workflow)
console.log(`\n[4/4] Pushing ${tagName} to GitHub origin...`);
execSync(`git push origin ${tagName}`, { cwd: rootDir, stdio: 'inherit' });

console.log('\n===========================================================================');
console.log(`[SUCCESS] Unified release ${tagName} published to NPM and tagged on GitHub!`);
console.log('GitHub Actions will now automatically create the official GitHub Release.');
console.log('===========================================================================\n');
