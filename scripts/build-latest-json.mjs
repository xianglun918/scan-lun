#!/usr/bin/env node
/**
 * Generate a COMPLETE latest.json for the Tauri updater by reading the
 * release's existing assets (updater bundles + their .sig files), merging
 * all platforms into one document, and uploading it.
 *
 * WHY this exists: tauri-action v1 uploads the macOS updater bundle but
 * silently drops the Windows `.msi.zip`/`.nsis.zip` and Linux
 * `.AppImage.tar.gz` bundles (its buildProject() filters artifacts with
 * existsSync() before those files are written). It also races when 3
 * platform jobs each upload their own partial latest.json in parallel.
 *
 * So instead of letting tauri-action own latest.json, we:
 *   1. (in the build job) upload the raw updater bundles + .sig ourselves
 *   2. (in this dedicated job, after all builds) read every asset, build
 *      one complete latest.json, and upload it.
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

// 2. Locate each platform's updater bundle + matching .sig.
const findBundle = (suffix) =>
  assets.find((a) => a.name.endsWith(suffix) && !a.name.endsWith('.sig'));
const findSig = (bundle) =>
  bundle ? assets.find((a) => a.name === `${bundle.name}.sig`) : undefined;

const darwinBundle = findBundle('.app.tar.gz');
const winMsiBundle = findBundle('.msi.zip');
const winNsisBundle = findBundle('.nsis.zip');
const linuxBundle = findBundle('.AppImage.tar.gz');

const BASE = `https://github.com/${REPO}/releases/download/${tag}`;
const platforms = {};

// macOS — universal build covers both arches via the same bundle.
if (darwinBundle && findSig(darwinBundle)) {
  const sig = getAssetContent(findSig(darwinBundle));
  const url = `${BASE}/${darwinBundle.name}`;
  platforms['darwin-universal'] = { signature: sig, url };
  platforms['darwin-aarch64'] = { signature: sig, url };
  platforms['darwin-x86_64'] = { signature: sig, url };
}

// Windows — prefer WiX (.msi.zip), fall back to NSIS (.nsis.zip).
const winBundle = winMsiBundle ?? winNsisBundle;
if (winBundle && findSig(winBundle)) {
  const sig = getAssetContent(findSig(winBundle));
  platforms['windows-x86_64'] = { signature: sig, url: `${BASE}/${winBundle.name}` };
}

// Linux — AppImage updater bundle.
if (linuxBundle && findSig(linuxBundle)) {
  const sig = getAssetContent(findSig(linuxBundle));
  platforms['linux-x86_64'] = { signature: sig, url: `${BASE}/${linuxBundle.name}` };
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
