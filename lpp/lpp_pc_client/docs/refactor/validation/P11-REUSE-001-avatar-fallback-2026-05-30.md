# P11-REUSE-001 头像 fallback 收敛验证记录

日期：2026-05-30

范围：

- `src/renderer/components/PcAvatar.tsx`
- `src/renderer/components/ChatMessageBubble.tsx`
- `src/renderer/customer-service/components/ServiceMessageBubble.tsx`
- `src/renderer/customer-service/components/CustomerServiceMessageStage.tsx`
- `src/renderer/messages/components/MessageListPanel.tsx`
- `src/renderer/data/message/message-view-model.ts`
- `scripts/report-p10-code-health.mjs`

## 变更摘要

1. 页面和 feature 层不再调用 `avatarInitial` 预计算头像首字母。
2. `ChatMessageBubble` / `ServiceMessageBubble` 改传 `conversationFallbackName`，`message-view-model` 暴露 `fallbackName`，最终由 `PcAvatar` 统一生成头像 fallback。
3. `senderAvatarUrlFallback` / `mineAvatarUrlFallback` 更名为 `senderAvatarUrl` / `mineAvatarUrl`，避免把 URL override 语义误写成头像 fallback 实现。
4. `p10:audit` 将 `initials` 收窄为单词边界，避免误报发送状态变量 `initialStatus`。

## 验证命令

```bash
rg -n "fallbackInitial|senderAvatarUrlFallback|mineAvatarUrlFallback|avatarInitial" src/renderer tests/unit
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/message-view-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/cs-identity-view-model.spec.ts
npm run p10:audit
npm run check:quick
```

## 验证结果

- `rg -n "fallbackInitial|senderAvatarUrlFallback|mineAvatarUrlFallback|avatarInitial" src/renderer tests/unit`：仅剩 `PcAvatar.tsx` owner 和 `architecture-boundaries.spec.ts` 边界测试。
- `npx tsc --noEmit --pretty false --skipLibCheck`：通过。
- `npx vitest run tests/unit/message-view-model.spec.ts tests/unit/group-avatar-model.spec.ts tests/unit/cs-identity-view-model.spec.ts`：通过，3 个文件 / 9 个测试。
- `npm run p10:audit`：通过；manual avatar initial 信号清零，`public-ability-signals` 仅剩桌面媒体和通知信号。
- `npm run check:quick`：通过。

## 遗留事项

- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
