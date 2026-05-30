# P9-ENG-008 code shape allowlist cleared 验证记录

日期：2026-05-30

## 目标

- 在历史大文件均低于 900 行后，清空 `lint:shape` 大文件 allowlist。
- 让后续新增代码重新撑大 `MessageCenter.tsx`、`ChatWorkspace.tsx`、`MePage.tsx`、`main.ts` 时直接被 quick check 拦截。

## 变更

- 更新 `scripts/check-code-shape.mjs`，将 `largeFileAllowlist` 清空。
- 当前关键文件行数：
  - `src/renderer/components/MessageCenter.tsx`：883 行。
  - `src/renderer/components/ChatWorkspace.tsx`：465 行。
  - `src/renderer/components/MePage.tsx`：893 行。
  - `src/main/main.ts`：886 行。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-workspace-view-model.spec.ts tests/unit/cs-action-service.spec.ts tests/unit/message-composer-model.spec.ts tests/unit/send-state-machine.spec.ts`
  - 结果：通过，5 个测试文件，19 个测试用例。
- `git diff --check`
  - 结果：通过。

## 诊断日志

- 本次为工程门禁收紧，不新增运行时日志字段。

## 结论

P9-ENG-008 已完成。后续任何源码文件超过 900 行，如果不在明确任务中重新加入 allowlist，将导致 `npm run check:quick` 失败。
