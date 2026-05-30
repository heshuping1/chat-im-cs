# P8-PERF-003C Message List Render Migration

日期：2026-05-29

## 修改范围

- `MessageListPanel` 接入分段渲染模型。
- 新增顶部“查看更早 N 条消息”按钮。
- 分段生效时写入 `window.__lppMessageCenterDiagnostics`：
  - `event: message-list.windowed`
  - `phase: render`
  - `reason: long_message_list_windowed`

## 保持行为

- 搜索打开：全量渲染。
- 历史筛选打开：全量渲染。
- 未读跳转存在：全量渲染。
- 多选、右键、头像点击、媒体预览和发送状态渲染逻辑不变。

## 可排查问题

- 诊断包中 `diagnostics.message-center.records` 可看到 `hiddenBeforeCount`、`renderedCount`、`totalCount`。
- 若用户反馈长会话卡顿，可先确认是否触发窗口化渲染。
