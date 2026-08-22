# scan-lun Icon & README Redesign

Date: 2026-08-22
Approach: A. Balanced redesign (recommended)

## Goal

Replace the existing app icon set with a custom flat/minimal design and rewrite `README.md` as a bilingual, usage-focused guide.

---

## Icon Design

### Concept
A **spiral-bound notebook page** icon on an **amber/orange** background. The page contains three horizontal lines, representing the three daily reflection questions (吾日三省吾身). The notebook shape also ties the app to its local journal/reflection purpose.

### Style
- Flat, minimal, no gradients
- Rounded app-icon squircle shape
- Notebook page with spiral binding on the left
- Three horizontal lines of varying length on the page, representing the three daily questions
- Two-color palette for maximum clarity at small sizes:
  - **Amber 500** `#F59E0B` — icon background
  - **Orange 50** `#FFF7ED` — notebook page, spiral, and lines
- Centered composition so the glyph reads clearly at 32×32

### Deliverables
Create or replace files under `src-tauri/icons/`:
- `32x32.png`
- `64x64.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.png`
- `icon.ico`
- `icon.icns`
- Windows tile sizes: `Square30x30Logo.png`, `Square44x44Logo.png`, `Square71x71Logo.png`, `Square89x89Logo.png`, `Square107x107Logo.png`, `Square142x142Logo.png`, `Square150x150Logo.png`, `Square284x284Logo.png`, `Square310x310Logo.png`, `StoreLogo.png`

Also create a reusable master:
- `docs/assets/icon.svg` — source SVG used to generate the PNG/ICO/ICNS set

### Configuration
`src-tauri/tauri.conf.json` already lists the required icon paths; no config change needed unless new sizes are added.

---

## README Redesign

### Language
Bilingual: each section starts with Chinese, followed immediately by the English translation under the same heading. Match the project's Chinese-first identity while making it accessible to international users.

### Scope
Replace the current `README.md` with a user-facing usage guide. Move developer-centric build/dev instructions to `docs/development.md`.

### Proposed Structure

1. **Hero**
   - App name + one-line description (Chinese / English)
   - Screenshot placeholder (to be filled later)
   - Download / install badges (placeholder)

2. **快速开始 / Quick Start**
   - Install package for your platform
   - Launch and grant permissions
   - First prompt walkthrough

3. **每日使用流程 / Daily Workflow**
   - Daily popup appears at configured time
   - Answer the three questions
   - Save / Remind later / Skip
   - Tray menu to open history or settings

4. **主要功能 / Features**
   - Scheduled daily prompt
   - Three custom reflection questions
   - Local SQLite storage
   - History view
   - Markdown / CSV export
   - Workday-only and auto-start options

5. **设置与隐私 / Settings & Privacy**
   - Reminder time, workday-only, auto-start
   - Data stored locally only
   - Export location chosen by user

6. **常见问题 / FAQ**
   - Where is data stored?
   - Can I sync across devices?
   - How do I reset or export data?

7. **开发 / Development**
   - Short paragraph with link to `docs/development.md`

8. **License**
   - MIT link

---

## Out of Scope

- Animated icons
- macOS/iOS squircle-specific mask adjustments beyond the standard icon set
- Multi-color icons
- Marketing website
- New screenshots (placeholders only)

---

## Success Criteria

- All `src-tauri/icons/*` files replaced by the new design
- `docs/assets/icon.svg` exists and matches the generated icon set
- `README.md` is bilingual and user-guide focused
- `docs/development.md` contains the moved dev/build content
- `pnpm tauri dev` still works (icon paths unchanged)
