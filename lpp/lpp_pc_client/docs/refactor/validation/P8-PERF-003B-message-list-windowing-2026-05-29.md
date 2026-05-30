# P8-PERF-003B Message List Windowing

日期：2026-05-29

## 修改范围

- 新增 `src/renderer/messages/models/messageListWindowing.ts`。
- 默认渲染最近 240 条消息。
- 每次点击“查看更早”向前扩展 240 条。

## 设计理由

- 不新增依赖，避免为了列表虚拟化引入新的滚动系统和定位风险。
- 模型是纯函数，便于单测确认窗口边界。
- UI 层只消费 `renderedMessages` 和 `hiddenBeforeCount`，后续替换为真正虚拟列表时接口清晰。

## 回滚方式

- `MessageListPanel` 改回直接渲染 `messages.map`。
- 删除 `messageListWindowing.ts` 和对应测试。
