# P9-IM-007 IM read view model 验证记录

日期：2026-05-30

## 目标

- 将 `MessageCenter.tsx` 与 `Sidebar.tsx` 中重复的 read state 合并逻辑收敛到 IM read 数据层。
- 将 read state meaningful change 判断从页面组件下沉，减少页面承载核心未读/已读规则。

## 变更

- 新增 `src/renderer/data/im-read/im-read-view-model.ts`。
- `MessageCenter.tsx` 和 `Sidebar.tsx` 改为复用 `mergeUnifiedReadStateForIdentity`。
- `MessageCenter.tsx` 改为复用 `readStateMeaningfullyChanged`。
- 新增 `tests/unit/im-read-view-model.spec.ts`。

## 验证

- `vitest run tests/unit/im-read-view-model.spec.ts tests/unit/im-read-service.spec.ts tests/unit/im-read-store.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，11 个测试用例。
- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。

## 结论

P9-IM-007 已完成。IM read view model 已成为 sidebar 与 MessageCenter 的共享能力，减少了重复实现和页面层 read 规则负担。
