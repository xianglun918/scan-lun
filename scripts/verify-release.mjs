#!/usr/bin/env node
/**
 * Final gate before a draft release goes public.
 *
 * Verifies the release is actually shippable, then flips the draft to
 * published. This is what prevents a broken updater from reaching users:
 * if latest.json is incomplete, publication never happens (and the cleanup
 * job deletes the draft).
 *
 * Checks:
 *   1. latest.json exists and parses
 *   2. its version equals the tag version (without "v")
 *   3. platforms cover macOS, Windows and Linux (new or legacy keys)
 *   4. every platform URL points to a real asset of this release
 *   5. every signature is valid base64 of a minisign signature file
 *   6. SHA256SUMS exists and is non-empty
 *
 * Usage:
 *   GITHUB_TOKEN=... node scripts/verify-release.mjs <tag> [--dry-run]
 */
import { execSync } from 'node:child_process';

const REPO = 'xianglun918/scan-lun';
const tag = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!tag) {
  console.error('usage: verify-release.mjs <tag> [--dry-run]');
  process.exit(2);
}

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8', env: process.env }).trim();
}

const release = JSON.parse(gh(`release view ${tag} --json assets,isDraft`));
const assets = release.assets;
const results = [];
const check = (ok, msg) => {
  results.push({ ok, msg });
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
};

// ---- 1. latest.json exists & parses ----
const latestAsset = assets.find((a) => a.name === 'latest.json');
let latest = null;
if (!latestAsset) {
  check(false, 'latest.json asset missing');
} else {
  const id = latestAsset.apiUrl.split('/').pop();
  try {
    latest = JSON.parse(
      execSync(
        `gh api repos/${REPO}/releases/assets/${id} -H "Accept: application/octet-stream"`,
        { encoding: 'utf8', env: process.env },
      ),
    );
    check(true, 'latest.json exists and parses');
  } catch {
    check(false, 'latest.json is not valid JSON');
  }
}

// ---- 2. version matches tag ----
if (latest) {
  check(
    latest.version === tag.replace(/^v/, ''),
    `version ${latest.version} matches tag ${tag}`,
  );
}

// ---- 3. platform coverage ----
if (latest) {
  const keys = Object.keys(latest.platforms ?? {});
  const has = (prefix, suffixes) =>
    keys.some((k) =>
      suffixes.some((s) => k === `${prefix}${s}`),
    );
  check(
    has('darwin', ['-universal', '-aarch64', '-x86_64']),
    'macOS platform present (darwin-universal/-aarch64/-x86_64)',
  );
  check(
    has('windows-x86_64', ['-nsis', '-msi', '']),
    'Windows platform present (windows-x86_64-nsis/-msi/legacy)',
  );
  check(
    has('linux-x86_64', ['-appimage', '-deb', '-rpm', '']),
    'Linux platform present (linux-x86_64-appimage/-deb/-rpm/legacy)',
  );

  // ---- 4. URLs point to real assets ----
  const names = new Set(assets.map((a) => a.name));
  for (const [key, entry] of Object.entries(latest.platforms ?? {})) {
    const file = entry.url?.split('/').pop();
    check(
      Boolean(file && names.has(file)),
      `${key}: url → ${file ?? '(missing)'} exists in release`,
    );

    // ---- 5. signature decodes to a minisign file ----
    let sigOk = false;
    try {
      sigOk = Buffer.from(entry.signature, 'base64')
        .toString('utf8')
        .startsWith('untrusted comment:');
    } catch {
      sigOk = false;
    }
    check(sigOk, `${key}: signature is a base64 minisign signature`);
  }
}

// ---- 6. SHA256SUMS ----
const sums = assets.find((a) => a.name === 'SHA256SUMS');
check(Boolean(sums && sums.size > 0), 'SHA256SUMS present and non-empty');

// ---- verdict ----
if (results.some((r) => !r.ok)) {
  console.error(`✗ verification FAILED for ${tag} — release stays draft (cleanup job will remove it)`);
  process.exit(1);
}

if (dryRun) {
  console.log(`✓ dry-run: ${tag} would be published now`);
  process.exit(0);
}

if (release.isDraft) {
  gh(`release edit ${tag} --draft=false`);
  console.log(`✓ ${tag} published`);
} else {
  console.log(`✓ ${tag} already published — nothing to do`);
}
