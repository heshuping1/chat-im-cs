# P22-STATUS-006 消息刷新稳定性验证

日期：2026-05-30

## 任务

- 任务编号：P22-STATUS-006
- 范围：普通 IM 活跃会话消息查询、消息轮询结构共享、媒体卡片稳定渲染。
- 风险边界：不改 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract、Zustand persist key；不新增依赖；不替换技术栈；不删除旧链路。

## 根因

活跃会话消息 query 以 2.5 秒间隔持续轮询，并且后台也轮询。服务端返回的消息内容即使没有变化，前端仍会得到一批新对象引用，导致消息列表、视频封面和媒体卡片被重复重建，用户看到的效果就是“消息一直刷新”。

## 修改

1. 在 `data/message` owner 中新增 `reuseStableMessageItems` 纯函数。
2. 消息内容未变化时复用旧 `MessageItemDto` 对象；`body/readAt/isRead/status/readCount` 等真实变化时仍使用新对象。
3. 活跃会话消息 query 保持原 query key 不变，接入 `structuralSharing`。
4. 高频轮询从 2.5 秒调整为 30 秒低频兜底，并关闭后台轮询；窗口聚焦时允许刷新。

## 未改变

- 未改变 IM 消息接口。
- 未改变 React Query query key。
- 未改变 Gateway 事件和 query invalidation 规则。
- 未改变 Electron IPC/main/preload。
- 未改变 Zustand persist key。

## 验证命令

```bash
npx vitest run tests/unit/message-domain.spec.ts tests/unit/message-center-view-model.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

## 人工验收建议

- 打开包含视频消息的会话，静置 1 分钟，消息卡片不应每 2.5 秒闪动或重建。
- 点击视频消息后返回列表，列表中的封面不应被轮询刷新成黑屏。
- Gateway 新消息、发送成功、已读变化仍应正常刷新。
