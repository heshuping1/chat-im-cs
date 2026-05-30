# P7-SHARED-001D Avatar Identity Tests

日期：2026-05-29

## 覆盖

新增 `tests/unit/cs-identity-view-model.spec.ts`，覆盖：

- profile 身份优先于 thread 身份。
- VIP 色调来自 profile/thread。
- avatar URL 按 profile/customer/thread 降级。
- 历史会话标题不作为真实展示名。
- 历史会话默认展示 `访客`。

`tests/unit/cs-workspace-view-model.spec.ts` 同步断言 workspace 输出 `identity`。
