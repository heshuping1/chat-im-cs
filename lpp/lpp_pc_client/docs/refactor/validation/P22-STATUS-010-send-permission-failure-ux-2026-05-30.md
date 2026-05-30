# P22-STATUS-010 发送权限失败 UX 与门禁治理验证记录

日期：2026-05-30

## 目标

将服务端 `403/FORBIDDEN`、`MSG_MEMBER_FORBIDDEN` 等发送权限拒绝从用户可见失败文案中剥离。聊天界面只展示“发送失败，点击重试”和产品化短文案；真实 `status/code/requestId/path` 继续保留在 send diagnostics 和诊断包中。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不删除旧 store facade。

## 修改范围

- `src/renderer/data/message/message-retry-model.ts`
  - 增加发送失败展示分类：`retryable`、`blocked`、`unknown`。
  - 权限、禁言、会话冻结等 blocked 错误统一给用户展示 `当前会话暂不可发送`。
  - 红点 tooltip 固定为 `发送失败，点击重试`，避免暴露底层权限文案。
- `src/renderer/data/message/message-status-model.ts`
  - 失败状态消费展示模型，不再拼接 `localError` 到 tooltip。
- `src/renderer/media/runtime/uploadState.ts`
  - 文件/上传失败状态不再拼接底层错误原因。

## 诊断策略

`localError` 和 send diagnostics 仍保留真实失败原因，用于研发排障和诊断包导出；用户界面不展示 `HTTP 403`、`FORBIDDEN`、`当前账号没有权限执行此操作`、`requestId` 等技术细节。

## 本地门禁结论

客服工作台继续消费已有 `canReply/replyGate` 状态，不绕过客服状态机。普通 IM 当前只发现通知免打扰等本地字段，未发现稳定 `canSend/frozen/muted` 发送权限字段；因此本轮不伪造前端禁用条件，不新增权限接口，仍由服务端作为最终权限边界。

## 验证命令

```bash
npx vitest run tests/unit/message-retry-model.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/upload-state.spec.ts
npx vitest run tests/unit/api-error-model.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-retry-model.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/upload-state.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

- targeted message/status/upload tests：通过，23 个用例通过。
- API/status/view/retry/send-state/upload tests：通过，35 个用例通过。
- `p10:audit`：全部 `none`。
- `p12:audit`：CSS/组件无观察项；data/main 仍为既有 5 个职责例外观察项。
- `p19:audit`：无新增拆分候选，观察项均 documented。
- `check:quick`：通过。
- `build`：通过；仅保留 SignalR 依赖包 PURE 注释的 Rollup warning。
- `docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 服务端返回 generic `403/FORBIDDEN`：消息保留，红点显示，tooltip 为 `发送失败，点击重试`。
2. 服务端返回 `MSG_MEMBER_FORBIDDEN`：诊断保留真实 code，用户只看到产品化失败文案。
3. 网络失败：仍显示可重试失败态。
4. 点击红点：仍进入“重发该消息?”确认，不直接静默重发。
