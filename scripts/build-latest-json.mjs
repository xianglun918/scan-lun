#!/usr/bin/env node
/**
 * Build + upload latest.json for the Tauri updater.
 *
 * WHY: tauri-action v0/v1 has a bug — its `buildProject()` returns
 * `artifacts.filter(p => existsSync(p.path))` BEFORE the `.zip` / `.sig`
 * files are generated, so the updater JSON never gets uploaded. We work
 * around it by generating + uploading `latest.json` ourselves, per-platform,
 * after the build finishes.
 *
 * Usage (run in a GitHub Actions job that just built a platform bundle):
 *   GITHUB_TOKEN=... node scripts/build-latest-json.mjs \
 *     --platform <darwin|windows|linux> \
 *     --arch <aarch64|x86_64> \
 *     --tag <v1.0.3> \
 *     --bundle-dir <abs path to bundle dir> \
 *     --notes "<release notes>"
 *
 * It reads the built `*.sig` files from the bundle dir, merges with any
 * existing latest.json on the release, and uploads the merged file.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8', env: process.env }).trim();
}

const REPO = 'xianglun918/scan-lun';
const platform = arg('platform');
const arch = arg('arch');
const tag = arg('tag');
const bundleDir = arg('bundle-dir');
const notes = arg('notes', '') ?? '';

if (!platform || !arch || !tag || !bundleDir) {
  console.error(
    'usage: build-latest-json.mjs --platform <darwin|windows|linux> --arch <aarch64|x86_64> --tag <v> --bundle-dir <dir> [--notes "..."]',
  );
  process.exit(2);
}

const ASSET_URL_PREFIX = `https://github.com/${REPO}/releases/download/${tag}`;

// ---- 1. Find .sig files + their corresponding bundles in the bundle dir ----
// A .sig named `foo.msi.zip.sig` corresponds to bundle `foo.msi.zip`.
// We look for the "primary" updater bundle per platform:
//   darwin  -> *.app.tar.gz (sig: *.app.tar.gz.sig)
//   windows -> *.msi.zip (preferred, updaterJsonPreferNsis=false) or *.nsis.zip
//   linux   -> *.AppImage.tar.gz
function sigForPrimaryBundle() {
  const sigs = fs
    .readdirSync(bundleDir, { recursive: true })
    .filter((f) => f.endsWith('.sig'));

  const prefer = (patterns) => {
    for (const p of patterns) {
      const hit = sigs.find((s) => s.endsWith(p));
      if (hit) return hit;
    }
    return null;
  };

  if (platform === 'darwin') {
    return { sig: prefer(['.app.tar.gz.sig']) };
  }
  if (platform === 'windows') {
    return { sig: prefer(['.msi.zip.sig', '.nsis.zip.sig', '.msi.sig', '.exe.sig']) };
  }
  if (platform === 'linux') {
    return { sig: prefer(['.AppImage.tar.gz.sig', '.AppImage.sig', '.deb.sig', '.rpm.sig']) };
  }
  throw new Error(`unknown platform: ${platform}`);
}

const { sig: sigRelPath } = sigForPrimaryBundle();
if (!sigRelPath) {
  console.error(`no signature found in ${bundleDir}`);
  process.exit(0); // not fatal — nothing to upload
}

// bundle file = sig file minus the trailing `.sig`
const bundleRelPath = sigRelPath.slice(0, -'.sig'.length);
const sigContent = fs.readFileSync(path.join(bundleDir, sigRelPath), 'utf8').trim();
const bundleName = path.basename(bundleRelPath);
const bundleUrl = `${ASSET_URL_PREFIX}/${bundleName}`;

console.log(`using bundle: ${bundleName}`);
console.log(`sig file:    ${sigRelPath} (${sigContent.length} chars)`);

// ---- 2. Read any existing latest.json on the release ----
let existing = { version: '', notes: '', pub_date: '', platforms: {} };
try {
  const assets = JSON.parse(
    gh(`api repos/${REPO}/releases/tags/${tag}/assets --paginate`),
  );
  const lj = assets.find((a) => a.name === 'latest.json');
  if (lj) {
    const data = execSync(
      `gh api repos/${REPO}/releases/assets/${lj.id} -H "Accept: application/octet-stream"`,
      { encoding: 'utf8', env: process.env },
    );
    existing = JSON.parse(data);
  }
} catch (e) {
  console.warn(`no existing latest.json (${e.message})`);
}

// ---- 3. Merge this platform into the content ----
const osKey = platform === 'darwin' ? 'darwin' : platform; // windows | linux
const archKey = arch === 'x64' ? 'x86_64' : arch;

// legacy `{os}-{arch}` key
existing.platforms[`${osKey}-${archKey}`] = {
  signature: sigContent,
  url: bundleUrl,
};

// macOS universal: also cover darwin-aarch64 + darwin-x86_64
if (platform === 'darwin' && archKey === 'universal') {
  existing.platforms['darwin-aarch64'] = {
    signature: sigContent,
    url: bundleUrl,
  };
  existing.platforms['darwin-x86_64'] = {
    signature: sigContent,
    url: bundleUrl,
  };
}

// new `{os}-{arch}-{bundle}` format (bundle name derived from extension)
const ext = path.extname(bundleRelPath);
const bundleType = ext.replace(/^\./, '').split('.').shift() || 'app';
existing.platforms[`${osKey}-${archKey}-${bundleType}`] = {
  signature: sigContent,
  url: bundleUrl,
};

if (!existing.version) existing.version = tag.replace(/^v/, '');
if (!existing.notes) existing.notes = notes;
if (!existing.pub_date) existing.pub_date = new Date().toISOString();

// ---- 4. Write + upload ----
const tmp = path.join(process.cwd(), 'latest.json');
fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
console.log('latest.json:');
console.log(fs.readFileSync(tmp, 'utf8'));

gh(`release upload ${tag} ${tmp} --clobber`);
console.log('uploaded latest.json');
