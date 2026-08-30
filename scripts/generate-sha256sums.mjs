#!/usr/bin/env node
/**
 * Generate and upload SHA256SUMS for all release assets.
 *
 * Uses GitHub's per-asset `digest` field (sha256, computed server-side), so no
 * downloads are needed. Falls back to downloading + hashing locally for assets
 * without a digest (should not happen for freshly uploaded assets).
 *
 * latest.json and SHA256SUMS itself are excluded (latest.json content changes
 * per regeneration, which would stale its own checksum).
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/generate-sha256sums.mjs <tag>
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const REPO = 'xianglun918/scan-lun';
const tag = process.argv[2];

if (!tag) {
  console.error('usage: generate-sha256sums.mjs <tag>');
  process.exit(2);
}

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8', env: process.env }).trim();
}

const assets = JSON.parse(gh(`release view ${tag} --json assets`)).assets;

const lines = [];
for (const asset of assets) {
  if (asset.name === 'SHA256SUMS' || asset.name === 'latest.json') continue;

  // Metadata call returns the REST asset object incl. `digest` ("sha256:<hex>").
  const id = asset.apiUrl.split('/').pop();
  const meta = JSON.parse(gh(`api repos/${REPO}/releases/assets/${id}`));
  let hex = meta.digest?.replace(/^sha256:/, '');

  if (!hex) {
    // Fallback: download and hash locally.
    console.warn(`! no digest for ${asset.name}, downloading to hash...`);
    const buf = execSync(
      `gh api repos/${REPO}/releases/assets/${id} -H "Accept: application/octet-stream"`,
      { env: process.env, maxBuffer: 1024 * 1024 * 1024 },
    );
    hex = crypto.createHash('sha256').update(buf).digest('hex');
  }

  lines.push(`${hex}  ${asset.name}`);
  console.log(`${hex}  ${asset.name}`);
}

if (!lines.length) {
  console.error('✗ no assets to checksum');
  process.exit(1);
}

fs.writeFileSync('SHA256SUMS', lines.join('\n') + '\n', 'utf8');
gh(`release upload ${tag} SHA256SUMS --clobber`);
fs.rmSync('SHA256SUMS');
console.log(`✓ SHA256SUMS uploaded (${lines.length} assets)`);
