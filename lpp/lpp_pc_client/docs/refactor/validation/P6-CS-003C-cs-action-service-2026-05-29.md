# P6-CS-003C CS Action Service

日期：2026-05-29

## 变更

新增 `src/renderer/data/customer-service/cs-action-service.ts`：

- `CustomerServiceThreadAction`
- `CustomerServiceThreadActionClient`
- `executeCustomerServiceThreadAction`

`ChatWorkspace.tsx` 的 claim/takeover/close API switch 已迁到 action service。页面仍负责 mutation 生命周期、toast、cache invalidate 和 close 后 cache patch；这些后续可继续下沉，但本轮不扩大行为面。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/cs-action-permissions.spec.ts tests/unit/cs-action-service.spec.ts tests/unit/cs-thread-state.spec.ts
```

结果：通过，3 files / 10 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 遗留风险

回复文本/媒体仍在 `ChatWorkspace.tsx`。后续如果继续细拆，应建立客服 send use case，并复用 `cs-action-permissions` 的 `reply/send_text/send_media` 权限结果。
