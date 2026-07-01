# Mobile Release Test Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Android and iOS formal-release test cases, a release test report template, and a repeatable issue tracking ledger for `lpp_mobile`.

**Architecture:** This is a documentation governance change. New focused release documents live under `lpp/lpp_mobile/docs/release/`, and existing release entry points link to them as hard gates.

**Tech Stack:** Markdown documentation, existing LPP mobile release docs, shell verification with `rg` and file reads.

---

### Task 1: Formal Release Test Cases

**Files:**
- Create: `lpp/lpp_mobile/docs/release/04-正式版测试用例.md`

- [ ] **Step 1: Add platform-scoped release test cases**

Create a Markdown file with sections for Android and iOS, shared P0 flows, platform specialties, evidence requirements, and pass/fail status fields.

- [ ] **Step 2: Verify coverage**

Run:

```bash
rg -n "Android|iOS|登录|注册|消息|在线客服|问题编号" lpp/lpp_mobile/docs/release/04-正式版测试用例.md
```

Expected: output contains platform names and P0 test areas.

### Task 2: Test Report Template And Issue Ledger

**Files:**
- Create: `lpp/lpp_mobile/docs/release/05-正式版测试报告模板.md`
- Create: `lpp/lpp_mobile/docs/release/06-发布问题跟踪台账.md`

- [ ] **Step 1: Add the report template**

Create a reusable report template with build metadata, environment, devices, command results, scenario results, issue table, release decision, and evidence paths.

- [ ] **Step 2: Add the issue tracking ledger**

Create a standing issue ledger with stable issue IDs, first-found version, platform, severity, status, owner, report links, and regression history.

- [ ] **Step 3: Verify report-to-ledger linkage**

Run:

```bash
rg -n "问题编号|关联台账|发布结论|S0|S1" lpp/lpp_mobile/docs/release/05-正式版测试报告模板.md lpp/lpp_mobile/docs/release/06-发布问题跟踪台账.md
```

Expected: both documents include issue IDs, severity, release decision, and tracking fields.

### Task 3: Release Entry Point Updates

**Files:**
- Modify: `lpp/lpp_mobile/docs/README.md`
- Modify: `lpp/lpp_mobile/docs/06-APP端发布文档.md`
- Modify: `lpp/lpp_mobile/docs/release/01-发布检查清单.md`
- Modify: `lpp/lpp_mobile/docs/release/02-发布回归范围.md`
- Modify: `lpp/lpp_mobile/docs/release/03-版本变更记录.md`
- Modify: `lpp/lpp_mobile/docs/constraints/05-测试与验收规则.md`

- [ ] **Step 1: Link new docs from release entry points**

Update release reading order and effective-doc tables so the formal test case, report template, and issue ledger are mandatory release materials.

- [ ] **Step 2: Add formal-release hard gates**

State that every formal release must run Android and iOS regression, produce a report, and register failed or blocked items in the report and issue ledger.

- [ ] **Step 3: Verify no placeholder language remains**

Run:

```bash
rg -n "TBD|TODO|待补|待定" lpp/lpp_mobile/docs/release/04-正式版测试用例.md lpp/lpp_mobile/docs/release/05-正式版测试报告模板.md lpp/lpp_mobile/docs/release/06-发布问题跟踪台账.md
```

Expected: no output.

### Task 4: Final Verification

**Files:**
- All files touched above.

- [ ] **Step 1: Verify document links**

Run:

```bash
rg -n "04-正式版测试用例|05-正式版测试报告模板|06-发布问题跟踪台账" lpp/lpp_mobile/docs
```

Expected: release entry points and README reference all three docs.

- [ ] **Step 2: Review changed files**

Run:

```bash
git diff -- lpp/lpp_mobile/docs docs/superpowers/plans/2026-07-01-mobile-release-test-governance.md
```

Expected: only documentation governance files are changed.
