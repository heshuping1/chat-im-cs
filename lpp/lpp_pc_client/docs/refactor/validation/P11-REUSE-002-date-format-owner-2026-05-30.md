# P11-REUSE-002 展示时间格式化收敛验证记录

日期：2026-05-30

范围：

- `src/renderer/lib/format.ts`
- `src/renderer/components/CustomerProfileWorkspace.tsx`
- `src/renderer/components/KnowledgeBasePage.tsx`
- `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`
- `src/renderer/messages/components/ConversationInfoPanel.tsx`
- `src/renderer/messages/hooks/useMessageMediaSendController.ts`
- `src/renderer/messages/hooks/useMessageTextSendController.ts`
- `src/renderer/messages/models/groupAvatarModel.ts`
- `src/renderer/messages/models/messageCacheMutationModel.ts`
- `src/renderer/messages/models/messageContextMenuModel.ts`
- `src/renderer/messages/models/messageConversationListModel.ts`

## 变更摘要

1. 页面短日期展示复用 `formatShortDate`，移除局部短日期格式化实现。
2. 新增 `timestampFromDateValue` 统一排序、近期判断里的日期转时间戳规则。
3. 新增 `currentIsoTimestamp` 统一本地消息、客服本地回显、收藏时间的 ISO 时间生成。
4. 未新增依赖，未替换技术；时间能力继续归属 `src/renderer/lib/format.ts`。

## 验证命令

```bash
rg -n "new Date\\(|toLocale(Date|Time|String)|Intl\\.DateTimeFormat" src/renderer/components/CustomerProfileWorkspace.tsx src/renderer/components/KnowledgeBasePage.tsx src/renderer/customer-service/hooks/useCustomerServiceSendController.ts src/renderer/messages/components/ConversationInfoPanel.tsx src/renderer/messages/hooks/useMessageMediaSendController.ts src/renderer/messages/hooks/useMessageTextSendController.ts src/renderer/messages/models/groupAvatarModel.ts src/renderer/messages/models/messageCacheMutationModel.ts src/renderer/messages/models/messageContextMenuModel.ts src/renderer/messages/models/messageConversationListModel.ts
npx tsc --noEmit --pretty false --skipLibCheck
npx vitest run tests/unit/format.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-context-menu-model.spec.ts
npm run p10:audit
npm run check:quick
npm run build
npm run test:coverage:core
```

## 验证结果

- date-format `rg`：无命中。
- `npx tsc --noEmit --pretty false --skipLibCheck`：通过。
- `npx vitest run tests/unit/format.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-context-menu-model.spec.ts`：通过，3 个文件 / 11 个测试。
- `npm run p10:audit`：通过；`date-format-signals` 为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 动态导入提示，属于既有提示。
- `npm run test:coverage:core`：通过，59 个文件 / 262 个测试；覆盖率阈值通过。

## 遗留事项

- Windows 实机验证按当前约束跳过，继续由 `P11-WIN-001` 跟踪。
