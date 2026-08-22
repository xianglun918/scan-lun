# scan-lun Icon & README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing icon set with a custom spiral-notebook design and rewrite `README.md` as a bilingual user guide.

**Architecture:** A single source SVG drives all platform icon formats. The existing README's developer content is moved to `docs/development.md`, and `README.md` is rewritten as a Chinese-first bilingual end-user guide.

**Tech Stack:** SVG, Tauri icon generator (`cargo tauri icon` / `pnpm tauri icon`), Rust, Node.js/pnpm, Markdown.

**Spec:** `docs/superpowers/specs/2026-08-22-icon-and-readme-design.md`

## Global Constraints

- No new runtime dependencies for the app.
- Icon must work at 32×32 (tray / menu bar) and 128×128 (app icon).
- Keep `src-tauri/tauri.conf.json` icon list unchanged.
- README stays in the project root and must remain valid Markdown.
- All existing dev/build instructions must be preserved, just relocated.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `docs/assets/icon.svg` | Source of truth for the app icon. |
| `src-tauri/icons/*` | Generated platform icons consumed by Tauri. |
| `docs/development.md` | Developer setup, build, and release instructions moved from README. |
| `README.md` | New bilingual end-user usage guide. |
| `docs/superpowers/specs/2026-08-22-icon-and-readme-design.md` | Approved design reference. |

---

### Task 1: Create the source SVG icon

**Files:**
- Create: `docs/assets/icon.svg`

**Interfaces:**
- Produces: `docs/assets/icon.svg` — 1024×1024 viewBox SVG matching the approved notebook design.

- [ ] **Step 1: Draw the approved icon in SVG**

Create `docs/assets/icon.svg` with:
- 1024×1024 canvas
- Amber 500 `#F59E0B` rounded background
- Orange 50 `#FFF7ED` notebook page with spiral binding on the left
- Three centered horizontal lines of varying length on the page
- Centered composition

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="224" fill="#F59E0B"/>
  <rect x="224" y="176" width="560" height="672" rx="64" fill="#FFF7ED"/>
  <line x1="192" y1="272" x2="288" y2="272" stroke="#FFF7ED" stroke-width="32" stroke-linecap="round"/>
  <line x1="192" y1="400" x2="288" y2="400" stroke="#FFF7ED" stroke-width="32" stroke-linecap="round"/>
  <line x1="192" y1="528" x2="288" y2="528" stroke="#FFF7ED" stroke-width="32" stroke-linecap="round"/>
  <line x1="192" y1="656" x2="288" y2="656" stroke="#FFF7ED" stroke-width="32" stroke-linecap="round"/>
  <line x1="192" y1="784" x2="288" y2="784" stroke="#FFF7ED" stroke-width="32" stroke-linecap="round"/>
  <line x1="352" y1="352" x2="672" y2="352" stroke="#F59E0B" stroke-width="48" stroke-linecap="round"/>
  <line x1="352" y1="496" x2="608" y2="496" stroke="#F59E0B" stroke-width="48" stroke-linecap="round"/>
  <line x1="352" y1="640" x2="512" y2="640" stroke="#F59E0B" stroke-width="48" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Validate SVG opens cleanly in a browser**

Open `docs/assets/icon.svg` in a browser or image viewer and confirm no rendering errors.

- [ ] **Step 3: Commit**

```bash
git add docs/assets/icon.svg
git commit -m "assets: add source SVG for notebook icon"
```

---

### Task 2: Generate the platform icon set

**Files:**
- Modify: all files under `src-tauri/icons/`
- Test: verify icon sizes via CLI or script

**Interfaces:**
- Consumes: `docs/assets/icon.svg`
- Produces: `src-tauri/icons/32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png`, `icon.ico`, `icon.icns`, and all `Square*.png` + `StoreLogo.png` files.

- [ ] **Step 1: Convert SVG to a high-res PNG**

Use a local tool to render `docs/assets/icon.svg` to a 1024×1024 or 512×512 PNG:

Option A (macOS with ImageMagick):
```bash
convert -background none docs/assets/icon.svg -resize 1024x1024 /tmp/icon-src.png
```

Option B (Python with cairosvg):
```bash
python3 -c "import cairosvg; cairosvg.svg2png(url='docs/assets/icon.svg', write_to='/tmp/icon-src.png', output_width=1024, output_height=1024)"
```

- [ ] **Step 2: Generate platform icons with Tauri CLI**

```bash
cd src-tauri
cargo tauri icon /tmp/icon-src.png --output icons
```

If `cargo tauri` is unavailable, use `pnpm tauri icon /tmp/icon-src.png --output icons` from the project root.

- [ ] **Step 3: Verify all expected icon files exist**

Expected files:
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/64x64.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.png`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.icns`
- all `Square*.png`
- `StoreLogo.png`

Run `ls -la src-tauri/icons/` and confirm each exists and is non-zero bytes.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/icons/
git commit -m "assets: regenerate icon set from notebook SVG"
```

---

### Task 3: Relocate developer documentation

**Files:**
- Create: `docs/development.md`
- Modify: `README.md` (remove dev sections, add link)

**Interfaces:**
- Produces: `docs/development.md` containing the current README's Development, Build, Requirements, and Project Structure sections.

- [ ] **Step 1: Extract dev content from README**

Read current `README.md` and copy these sections into `docs/development.md`:
- Tech Stack
- Requirements
- Development (`pnpm install`, `pnpm tauri dev`)
- Build (`pnpm tauri build` + output paths + release workflow note)
- Project Structure

Keep section titles and code blocks intact.

- [ ] **Step 2: Write `docs/development.md`**

Use the extracted content. Add a short intro explaining this is the developer guide.

- [ ] **Step 3: Verify the new file renders**

Open `docs/development.md` in a Markdown previewer or run `markdownlint` if available.

- [ ] **Step 4: Commit**

```bash
git add docs/development.md
git commit -m "docs: move developer setup and build instructions to docs/development.md"
```

---

### Task 4: Rewrite README.md as bilingual user guide

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `docs/development.md` (referenced via link)
- Produces: `README.md` — Chinese-first bilingual user guide.

- [ ] **Step 1: Write new README.md**

Sections, each with Chinese heading + Chinese paragraph, then English heading + English paragraph:

1. **Hero**
   - App name and tagline
   - Screenshot placeholder comment `<!-- TODO: 补充截图 -->`
   - Badges placeholder

2. **快速开始 / Quick Start**
   - Install for your platform
   - Launch the app
   - First-time prompt

3. **每日使用流程 / Daily Workflow**
   - Daily popup at scheduled time
   - Answer the three questions
   - Save / Remind later / Skip
   - Tray menu for history and settings

4. **主要功能 / Features**
   - Daily scheduled prompt
   - Custom three questions
   - Local SQLite storage
   - History view
   - Markdown / CSV export
   - Workday-only and auto-start

5. **设置与隐私 / Settings & Privacy**
   - Reminder time, workday-only, auto-start
   - Local-only data
   - Export location chosen by user

6. **常见问题 / FAQ**
   - Where is data stored?
   - Can I sync across devices?
   - How do I reset or export data?

7. **开发 / Development**
   - Short paragraph + link to `docs/development.md`

8. **许可证 / License**
   - MIT link + copyright

- [ ] **Step 2: Validate Markdown**

Run a Markdown linter or preview the file. Ensure no broken internal links.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as bilingual user guide"
```

---

### Task 5: Verify the app still packages correctly

**Files:**
- Test: `src-tauri/tauri.conf.json` icon paths
- Test: build command

**Interfaces:**
- Consumes: all icon files and config

- [ ] **Step 1: Confirm icon paths in config**

Read `src-tauri/tauri.conf.json` and confirm the `bundle.icon` array still references existing files.

- [ ] **Step 2: Run a smoke test**

```bash
pnpm install --frozen-lockfile
pnpm tauri dev
```

If `tauri dev` cannot run in this environment, at least run:

```bash
cd src-tauri
cargo check
```

- [ ] **Step 3: Final review**

Check `git status` and `git diff --stat` to confirm only intended files changed.

- [ ] **Step 4: Commit any fixes**

If fixes were required, commit them. Otherwise mark complete.

---

## Self-Review

**Spec coverage:**
- Icon concept (notebook + three lines) → Task 1 + Task 2
- Amber/orange flat style → Task 1
- Replace all icon files → Task 2
- Create SVG master → Task 1
- Bilingual README → Task 4
- Move dev content → Task 3
- Verify build → Task 5

**Placeholder scan:**
- No "TBD" or "TODO" in final files. Screenshot placeholder is intentional and marked `<!-- TODO -->`.

**Type consistency:**
- File paths in `tauri.conf.json` unchanged; generated icon set matches expected names.
