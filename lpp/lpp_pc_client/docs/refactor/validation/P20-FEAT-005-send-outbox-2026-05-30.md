# P20-FEAT-005 发送失败消息持久化与重试闭环验证

日期：2026-05-30

## 任务

- 任务编号：P20-FEAT-005
- 范围：普通 IM、客服消息本地发送箱；文本/图片/视频/文件失败消息刷新恢复；媒体 Blob 保留与重试。
- 风险边界：不改 API DTO wire shape、React Query query key、Gateway event、Electron IPC contract、Zustand persist key；不新增依赖；不删除旧链路。

## 根因

失败消息此前只存在 React Query 缓存和页面 React state。刷新或重启后这些内存状态会重建，而服务端历史只保存成功消息，因此本地失败消息会消失。

## 修改 Owner

1. 新增 `src/renderer/data/send/send-outbox.ts` 作为唯一 IndexedDB outbox owner。
2. 普通 IM：
   - 文本/媒体发送前写 outbox。
   - 上传、暂停、取消、失败、成功状态同步 patch/cleanup outbox。
   - 会话打开时从 outbox 恢复本地失败消息与媒体重试任务。
3. 客服：
   - 文本增加本地 echo 和 outbox。
   - 媒体发送状态同步 outbox。
   - 线程打开时恢复失败消息和可重试媒体任务。

## 行为结论

- 失败消息是客户端本地事实，不要求服务端保存。
- `queued/uploading/sending/paused` 刷新后统一恢复为 `failed`，提示“发送中断，点击重试”。
- 媒体 Blob 按 `apiBaseUrl + tenant + user + channel + target` 隔离，保留 30 天；成功发送或删除 outbox 记录时清理 Blob。
- Blob 丢失时消息仍保留，错误提示为“本地文件已失效，请重新选择”。
- 重试复用原 `localMessageId/clientMsgId`，避免重复本地消息。

## 验证命令

```bash
npx vitest run tests/unit/send-outbox.spec.ts
npx vitest run tests/unit/im-local-outgoing.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/cs-cache-adapter.spec.ts tests/unit/upload-state.spec.ts tests/unit/video-poster-runtime.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/send-outbox.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

## 待补人工验证

- 普通 IM 视频发送失败后刷新，失败消息仍在，封面仍在，可重试。
- 客服视频发送失败后刷新，失败消息仍在，可重试。
- 断网刷新、权限 403 刷新、上传中刷新都不丢消息。
- 成功后消息不重复，outbox 不残留。
