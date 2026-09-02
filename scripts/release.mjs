#!/usr/bin/env node
/**
 * Lockstep release: bump versions, promote changelog, commit, tag, push.
 *
 * Version source of truth: src-tauri/tauri.conf.json (the only version the
 * bundler/updater reads). The script keeps package.json, src-tauri/Cargo.toml
 * and src-tauri/Cargo.lock in lockstep with it.
 *
 * Usage:
 *   node scripts/release.mjs <patch|minor|x.y.z> [--dry-run]
 *
 * Steps:
 *   1. worktree must be clean (git status --porcelain empty)
 *   2. next version must be > current and not exist as a remote tag
 *   3. CHANGELOG.md must contain a "## [Unreleased]" section
 *   4. bump tauri.conf.json / package.json / Cargo.toml / Cargo.lock
 *   5. CHANGELOG: "## [Unreleased]" -> "## [Unreleased]" + "## [x.y.z] - date",
 *      and maintain the footer compare-links ([Unreleased] -> new tag,
 *      add a new [x.y.z] link)
 *   6. commit "Release vx.y.z", tag vx.y.z, push branch + tag
 *      (tag push triggers the release workflow)
 *
 * Do NOT re-run for a version whose tag was already pushed — recover via
 * workflow_dispatch on build-binaries (see .omo/release-process.md).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const bumpArg = process.argv.slice(2).find((a) => !a.startsWith('--'));

if (!bumpArg) {
  console.error('usage: release.mjs <patch|minor|x.y.z> [--dry-run]');
  process.exit(2);
}

const FILES = {
  tauriConf: 'src-tauri/tauri.conf.json',
  packageJson: 'package.json',
  cargoToml: 'src-tauri/Cargo.toml',
  cargoLock: 'src-tauri/Cargo.lock',
  changelog: 'CHANGELOG.md',
};

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
}

function parseVersion(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (!m) throw new Error(`invalid semver: ${s}`);
  return m.slice(1, 4).map(Number);
}

function cmpVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// ---- 1. current & next version ----
const tauriConf = JSON.parse(fs.readFileSync(FILES.tauriConf, 'utf8'));
const current = tauriConf.version;
const cur = parseVersion(current);
let next;
if (bumpArg === 'patch' || bumpArg === 'minor') {
  next =
    bumpArg === 'patch'
      ? `${cur[0]}.${cur[1]}.${cur[2] + 1}`
      : `${cur[0]}.${cur[1] + 1}.0`;
} else {
  next = bumpArg; // explicit x.y.z, validated by parseVersion
}
parseVersion(next); // throws if invalid
if (cmpVersion(parseVersion(next), cur) <= 0) {
  console.error(`✗ next version ${next} must be > current ${current}`);
  process.exit(1);
}

// ---- 2. clean worktree ----
const dirty = git('status --porcelain');
if (dirty && !dryRun) {
  console.error('✗ worktree is dirty — commit or stash first:\n' + dirty);
  process.exit(1);
}
if (dirty) console.warn('⚠ dry-run: worktree is dirty (would abort for real)');

// ---- 3. remote tag must not exist ----
const tagName = `v${next}`;
let remoteTag = '';
try {
  remoteTag = git(`ls-remote --tags origin refs/tags/${tagName}`);
} catch (err) {
  if (!dryRun) throw err;
  console.warn('⚠ dry-run: could not reach origin to check remote tag');
}
if (remoteTag && !dryRun) {
  console.error(`✗ remote tag ${tagName} already exists — do NOT re-run release; recover via workflow_dispatch`);
  process.exit(1);
}

// ---- 4. changelog must have [Unreleased] ----
const changelog = fs.readFileSync(FILES.changelog, 'utf8');
if (!changelog.includes('## [Unreleased]')) {
  console.error('✗ CHANGELOG.md has no "## [Unreleased]" section — add it before releasing');
  process.exit(1);
}

// ---- plan ----
console.log(`release plan: v${current} → ${tagName}`);
console.log(`  bump : ${FILES.tauriConf}, ${FILES.packageJson}, ${FILES.cargoToml}, ${FILES.cargoLock}`);
console.log(`  log  : "## [Unreleased]" → "## [Unreleased]" + "## [${next}] - <today>"`);
console.log(`  links: [Unreleased] → compare/v${next}...HEAD; add [${next}]: compare/v${current}...v${next}`);
console.log(`  git  : commit "Release ${tagName}" + tag ${tagName} + push ${git('rev-parse --abbrev-ref HEAD')}`);
if (dryRun) {
  console.log('dry-run complete, no changes made.');
  process.exit(0);
}

// ---- 5. write version bumps ----
tauriConf.version = next;
fs.writeFileSync(FILES.tauriConf, JSON.stringify(tauriConf, null, 2) + '\n');

const pkg = JSON.parse(fs.readFileSync(FILES.packageJson, 'utf8'));
pkg.version = next;
fs.writeFileSync(FILES.packageJson, JSON.stringify(pkg, null, 2) + '\n');

// First `version = "..."` in Cargo.toml is the [package] version.
const toml = fs.readFileSync(FILES.cargoToml, 'utf8').replace(
  /^version\s*=\s*"[^"]*"/m,
  `version = "${next}"`,
);
fs.writeFileSync(FILES.cargoToml, toml);

// Cargo.lock: the [[package]] block whose name is "scan-lun".
const lock = fs.readFileSync(FILES.cargoLock, 'utf8').replace(
  /(name\s*=\s*"scan-lun"\s*\nversion\s*=\s*)"[^"]*"/,
  `$1"${next}"`,
);
fs.writeFileSync(FILES.cargoLock, lock);

// ---- 6. changelog: promote Unreleased, keep a fresh placeholder + fix footer links ----
const today = new Date().toISOString().slice(0, 10);

// Repo base URL, derived from the existing [Unreleased] compare link so it
// never drifts if the repo is renamed or moved.
const repoBase = (
  changelog.match(/\[Unreleased\]:\s*(https?:\/\/\S+)/)?.[1] ??
  'https://github.com/xianglun918/scan-lun'
).replace(/\/compare\/[^/]+$/, '');

let nextChangelog = changelog.replace(
  '## [Unreleased]',
  `## [Unreleased]\n\n## [${next}] - ${today}`,
);

// Footer compare-links: [Unreleased] now points at the new tag, and the new
// version gets its own compare link (current...next) inserted right below it.
nextChangelog = nextChangelog.replace(
  /\[Unreleased\]:\s*https?:\/\/\S+/,
  `[Unreleased]: ${repoBase}/compare/v${next}...HEAD`,
);
nextChangelog = nextChangelog.replace(
  /(\[Unreleased\]:\s*https?:\/\/\S+\n)/,
  `$1[${next}]: ${repoBase}/compare/v${current}...v${next}\n`,
);

fs.writeFileSync(FILES.changelog, nextChangelog, 'utf8');

// ---- 7. commit, tag, push ----
git(
  `add ${FILES.tauriConf} ${FILES.packageJson} ${FILES.cargoToml} ${FILES.cargoLock} ${FILES.changelog}`,
);
git(`commit -m "Release ${tagName}"`);
git(`tag ${tagName}`);
const branch = git('rev-parse --abbrev-ref HEAD');
git(`push origin ${branch} ${tagName}`);
console.log(`✓ released ${tagName} — CI will build, verify, and publish.`);
