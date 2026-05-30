# PC P12 Continuous Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continue PC client cleanup after P11 by tracking and reducing large CSS and near-threshold component files without changing the core architecture or adding dependencies.

**Architecture:** P12 keeps the P10/P11 hard gates intact and adds a separate size-health audit for long-term cleanup. CSS is split by owner while preserving `App.tsx` import order; React component slimming keeps public props stable and moves focused presentation fragments into sibling files.

**Tech Stack:** Electron, React, TypeScript, Vite, Node.js audit scripts, Vitest, existing refactor docs.

---

### Task 1: P12 Size Audit

**Files:**
- Create: `scripts/report-p12-size-health.mjs`
- Modify: `package.json`
- Create: `docs/refactor/validation/P12-AUDIT-001-size-baseline-2026-05-30.md`

- [ ] **Step 1: Add the P12 audit script**

Create `scripts/report-p12-size-health.mjs` that scans `src/main`, `src/preload`, `src/shared`, and `src/renderer`, then prints CSS files at or above 2000 lines, TS/TSX component files at or above 700 lines, and data/main/preload files at or above 450 lines.

- [ ] **Step 2: Add the npm script**

Modify `package.json`:

```json
"p12:audit": "node scripts/report-p12-size-health.mjs"
```

- [ ] **Step 3: Run the baseline**

Run:

```bash
npm run p12:audit
```

Expected: the command lists current P12 size candidates and exits successfully.

- [ ] **Step 4: Record validation**

Create `docs/refactor/validation/P12-AUDIT-001-size-baseline-2026-05-30.md` with the command output summary and the next prioritized candidate.

- [ ] **Step 5: Verify P10 remains clean**

Run:

```bash
npm run p10:audit
npm run docs:check
git diff --check
```

Expected: `p10:audit` remains all `none`; docs and diff checks pass.

### Task 2: Split Porcelain Shell CSS

**Files:**
- Modify: `src/renderer/styles/shared/porcelain-shell.css`
- Create: `src/renderer/styles/shared/porcelain-app-shell.css`
- Create: `src/renderer/styles/customer-service/customer-service-skin.css`
- Create: `src/renderer/styles/messages/composer-rich-input.css`
- Modify: `src/renderer/App.tsx`
- Create: `docs/refactor/validation/P12-CSS-001-porcelain-split-2026-05-30.md`

- [ ] **Step 1: Inventory selectors**

Run:

```bash
rg -n "^/\\*|^\\.[a-zA-Z0-9_-]+" src/renderer/styles/shared/porcelain-shell.css
```

Expected: sections are grouped around app shell, customer-service skin, page skin, and composer rich input.

- [ ] **Step 2: Move app shell selectors**

Move global app shell and sidebar skin selectors into `src/renderer/styles/shared/porcelain-app-shell.css`.

- [ ] **Step 3: Move customer-service skin selectors**

Move online-service skin selectors into `src/renderer/styles/customer-service/customer-service-skin.css`.

- [ ] **Step 4: Move composer rich input selectors**

Move composer rich input and attachment-card selectors into `src/renderer/styles/messages/composer-rich-input.css`.

- [ ] **Step 5: Preserve cascade order**

Update `src/renderer/App.tsx` so new CSS imports appear immediately after `porcelain-shell.css` and before more specific page owner CSS.

- [ ] **Step 6: Verify**

Run:

```bash
npm run p12:audit
npm run check:quick
npm run build
```

Expected: `porcelain-shell.css` drops below 2000 lines; checks pass.

### Task 3: Split Message Shared CSS

**Files:**
- Modify: `src/renderer/styles/messages/message-shared.css`
- Create: `src/renderer/styles/messages/message-primitives.css`
- Create: `src/renderer/styles/messages/message-attachments.css`
- Modify: `src/renderer/App.tsx`
- Create: `docs/refactor/validation/P12-CSS-002-message-shared-split-2026-05-30.md`

- [ ] **Step 1: Inventory selectors**

Run:

```bash
rg -n "^/\\*|^\\.[a-zA-Z0-9_-]+" src/renderer/styles/messages/message-shared.css
```

- [ ] **Step 2: Move message primitives**

Move shared message list, bubble, and meta primitives into `message-primitives.css`.

- [ ] **Step 3: Move attachment styles**

Move message attachment, media preview, and file card selectors into `message-attachments.css`.

- [ ] **Step 4: Preserve cascade order**

Update `src/renderer/App.tsx` so message primitives and attachments import after `message-shared.css` and before `message-center.css`.

- [ ] **Step 5: Verify**

Run:

```bash
npm run p12:audit
npm run check:quick
npm run build
```

Expected: `message-shared.css` drops below 2000 lines; checks pass.

### Task 4: Slim MessageComposer

**Files:**
- Modify: `src/renderer/components/MessageComposer.tsx`
- Create: `src/renderer/components/MessageComposerAttachmentList.tsx`
- Create: `src/renderer/components/MessageComposerScreenshotAction.ts`

- [ ] **Step 1: Confirm size and seams**

Run:

```bash
wc -l src/renderer/components/MessageComposer.tsx
rg -n "attachment|screenshot|translation|function|const .* =" src/renderer/components/MessageComposer.tsx
```

- [ ] **Step 2: Extract attachment list**

Move the stacked attachment list markup into `MessageComposerAttachmentList.tsx`, preserving labels and remove callbacks.

- [ ] **Step 3: Extract screenshot action**

Move screenshot capture guards and conversion into `MessageComposerScreenshotAction.ts`.

- [ ] **Step 4: Verify**

Run:

```bash
npx vitest run tests/unit/message-composer-model.spec.ts tests/unit/send-queue.spec.ts
npm run check:quick
```

Expected: `MessageComposer.tsx` drops below 700 lines and tests pass.
