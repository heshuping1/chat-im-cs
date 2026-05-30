# P20-FEAT-004 视频发送失败诊断验证

日期：2026-05-30

## 任务

- 任务编号：P20-FEAT-004
- 范围：普通 IM 媒体发送失败诊断、诊断包导出。
- 风险边界：不改 API DTO、React Query query key、Gateway event、Electron IPC contract、Zustand persist key；不新增依赖。

## 结论

本次排查没有在 `/tmp/lpp-pc-client-dev.log` 或 electron-runtime 诊断中找到本次视频发送失败的 `status/code/requestId/failureStage`。原因是 send 诊断此前只保存在 renderer 内存 buffer 和开发者控制台，shell 与磁盘日志无法稳定读取；同时 API `path` 字段会被误脱敏为 `[local-path]`，影响定位失败 endpoint。

已修复为：

1. `logChatSendDiagnostic` 将最近 send 诊断同步写入有界本地诊断缓存 `lpp.sendDiagnostics.buffer.v1`。
2. 设置页导出的 diagnostics package 在 renderer 内存 buffer 丢失时，会从该缓存补采 `send` 记录。
3. 诊断脱敏保留 `/api/client/v1/...` endpoint path，只脱敏真实本地文件路径、文件名和 token。

## 当前线索

- 当前机器仍有两套 PC dev/Electron 进程：一套占用 `5173`，另一套启动 Vite 失败但仍启动 Electron。
- 后启动 Electron 反复报 IndexedDB `LOCK`，会造成本地缓存和日志混乱。
- 截图中的“发送失败，点击重试”只能证明消息按失败态保留，不能证明失败阶段。
- 若下一次诊断显示 `failureStage=send` 且 `status=403/code=*FORBIDDEN*`，根据合同和已有错误模型，高概率是服务端按当前账号身份判定群禁言、非成员或无权限；前端应保留失败消息和重试，但不能伪造成发送成功。

## 验证命令

```bash
npx vitest run tests/unit/send-state-machine.spec.ts tests/unit/diagnostics-package.spec.ts
```

结果：通过，2 个文件 7 个用例。

## 后续排查步骤

1. 只保留一套 PC dev/Electron 进程，避免 IndexedDB LOCK 和日志分裂。
2. 重试发送同一视频。
3. 从设置页导出诊断包，查看 `diagnostics.send.records` 最新失败记录中的 `failureStage/status/code/requestId/path/video.hasVideoUrl/video.hasThumbnailUrl`。
4. 如果是 `upload` 或 `poster_upload` 失败，继续查媒体上传接口；如果是 `send` 失败且 403，交给服务端/账号权限确认。
