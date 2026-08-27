#!/usr/bin/env node
/**
 * Generate a COMPLETE latest.json for the Tauri updater.
 *
 * Tauri 2 has two updater-artifact modes (bundle.createUpdaterArtifacts):
 *   - "v1Compatible" (legacy): Windows gets .msi.zip / .nsis.zip archives.
 *   - true (v2, what we use): the standard installers are RE-USED as the
 *     updater bundle. There are NO .zip/.tar.gz on Windows/Linux — the
 *     updater downloads the .msi/.exe/.AppImage directly and verifies the
 *     corresponding .msi.sig/.exe.sig/.AppImage.sig.
 *
 * So this script reads the release's existing assets (installer + its .sig)
 * and builds the platforms map with the v2 `{os}-{arch}-{bundle}` keys the
 * plugin actually looks up (e.g. "windows-x86_64-nsis"), plus the legacy
 * `{os}-{arch}` keys for older clients.
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/build-latest-json.mjs <tag> "<notes>"
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'xianglun918/scan-lun';
const tag = process.argv[2];
const notes = process.argv[3] ?? '';

if (!tag) {
  console.error('usage: build-latest-json.mjs <tag> ["notes"]');
  process.exit(2);
}

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8', env: process.env }).trim();
}

function getAssetContent(asset) {
  const id = asset.apiUrl.split('/').pop();
  return execSync(
    `gh api repos/${REPO}/releases/assets/${id} -H "Accept: application/octet-stream"`,
    { encoding: 'utf8', env: process.env },
  ).trim();
}

// 1. List all release assets.
const assets = JSON.parse(gh(`release view ${tag} --json assets`)).assets;

const isBundle = (a, suffix) =>
  a.name.endsWith(suffix) && !a.name.endsWith('.sig');
const findBundle = (suffix) => assets.find((a) => isBundle(a, suffix));
const findSig = (bundle) =>
  bundle ? assets.find((a) => a.name === `${bundle.name}.sig`) : undefined;

const BASE = `https://github.com/${REPO}/releases/download/${tag}`;
const platforms = {};

function addPlatform(key, bundle, sigAsset) {
  if (!bundle || !sigAsset) return;
  platforms[key] = {
    signature: getAssetContent(sigAsset),
    url: `${BASE}/${bundle.name}`,
  };
}

// ---- macOS: .app.tar.gz is still the updater bundle in v2 mode. ----
const darwinBundle = findBundle('.app.tar.gz');
if (darwinBundle && findSig(darwinBundle)) {
  const sig = getAssetContent(findSig(darwinBundle));
  const url = `${BASE}/${darwinBundle.name}`;
  platforms['darwin-universal'] = { signature: sig, url };
  platforms['darwin-aarch64'] = { signature: sig, url };
  platforms['darwin-x86_64'] = { signature: sig, url };
}

// ---- Windows: re-use the standard installers. ----
const nsisBundle = findBundle('-setup.exe'); // NSIS installer
const msiBundle = findBundle('.msi'); // WiX MSI installer

if (nsisBundle && findSig(nsisBundle)) {
  const sig = getAssetContent(findSig(nsisBundle));
  const url = `${BASE}/${nsisBundle.name}`;
  platforms['windows-x86_64-nsis'] = { signature: sig, url };
  // legacy key (no bundle suffix) — point it at NSIS as the recommended bundle.
  platforms['windows-x86_64'] = { signature: sig, url };
}
if (msiBundle && findSig(msiBundle)) {
  addPlatform('windows-x86_64-msi', msiBundle, findSig(msiBundle));
}

// ---- Linux: re-use the standard bundles. ----
const appImageBundle = findBundle('.AppImage');
const debBundle = findBundle('.deb');
const rpmBundle = findBundle('.rpm');

if (appImageBundle && findSig(appImageBundle)) {
  const sig = getAssetContent(findSig(appImageBundle));
  const url = `${BASE}/${appImageBundle.name}`;
  platforms['linux-x86_64-appimage'] = { signature: sig, url };
  platforms['linux-x86_64'] = { signature: sig, url };
}
if (debBundle && findSig(debBundle)) {
  addPlatform('linux-x86_64-deb', debBundle, findSig(debBundle));
}
if (rpmBundle && findSig(rpmBundle)) {
  addPlatform('linux-x86_64-rpm', rpmBundle, findSig(rpmBundle));
}

const latest = {
  version: tag.replace(/^v/, ''),
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};

const tmp = path.join(process.cwd(), 'latest.json');
fs.writeFileSync(tmp, JSON.stringify(latest, null, 2), 'utf8');
console.log('=== generated latest.json ===');
console.log(fs.readFileSync(tmp, 'utf8'));

gh(`release upload ${tag} ${tmp} --clobber`);
console.log('=== uploaded latest.json ===');
