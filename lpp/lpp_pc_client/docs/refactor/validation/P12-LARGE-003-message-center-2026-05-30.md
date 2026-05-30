# P12-LARGE-003 MessageCenter 瘦身验证

日期：2026-05-30

## 变更

- 新增 `src/renderer/messages/components/MessageCenterConversationStage.tsx`。
- 将消息中心聊天区、资料 dock、消息列表、composer、overlay 和 dialogs 的纯展示装配从 `MessageCenter.tsx` 拆出。
- `MessageCenter.tsx` 从 785 行降至 621 行。

## 验证命令

```bash
wc -l src/renderer/components/MessageCenter.tsx src/renderer/messages/components/MessageCenterConversationStage.tsx
npx tsc --noEmit --pretty false --skipLibCheck
npm run p12:audit
```

## 结果

- 类型检查通过。
- `MessageCenter.tsx` 已低于 P12 组件 700 行观察线。
- `p12:audit` 的 `component-edge-files` 已清零。

## 遗留

- `data-main-edge-files` 仍作为 P12 后续观察项；本任务未改变消息发送、已读、菜单、Gateway 或 API 核心链路。
