# P9-CS-003 CS workspace presentation 验证记录

日期：2026-05-30

## 目标

- 将客服工作台主 JSX 中的稳定 presentation 组件抽离。
- 保留 query、mutation、发送/上传控制、线程 action 和通知逻辑在 `ChatWorkspace.tsx` 中，避免一次性改动客服核心链路。

## 变更

- 新增 `src/renderer/customer-service/components/CustomerServiceComposerSurface.tsx`。
- 新增 `src/renderer/customer-service/components/CustomerServiceThreadActionButton.tsx`。
- 新增 `src/renderer/customer-service/components/ServiceMessageBubble.tsx`。
- 新增 `src/renderer/customer-service/components/CustomerServiceWorkspaceHeader.tsx`。
- 新增 `src/renderer/customer-service/components/CustomerServiceReceptionStrip.tsx`。
- 新增 `src/renderer/customer-service/components/CustomerServiceMessageStage.tsx`。
- `ChatWorkspace.tsx` 复用 `useWindowDismiss`，移除局部窗口关闭监听。
- `ChatWorkspace.tsx` 行数从 1217 降到 995。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/cs-action-permissions.spec.ts tests/unit/cs-workspace-view-model.spec.ts tests/unit/message-composer-model.spec.ts`
  - 结果：通过，3 个测试文件，14 个测试用例。
- `vitest run tests/unit/cs-workspace-view-model.spec.ts tests/unit/message-view-model.spec.ts`
  - 结果：通过，2 个测试文件，7 个测试用例。
- `vitest run tests/unit/cs-action-permissions.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-workspace-view-model.spec.ts`
  - 结果：通过，3 个测试文件，14 个测试用例。
- `vitest run tests/unit/cs-workspace-view-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-context-menu-model.spec.ts`
  - 结果：通过，3 个测试文件，13 个测试用例。
- `vitest run tests/unit/cs-workspace-view-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，2 个测试文件，8 个测试用例。

## 诊断日志

- 本次为客服 presentation 抽离，不新增运行时日志。
- 客服发送/上传仍保留既有 `logChatSendDiagnostic`，线程动作仍保留 `logCustomerServiceThreadStateTransition`。

## 结论

P9-CS-003 已完成。客服工作台 presentation 已分层到客服组件目录，`ChatWorkspace` 主职责进一步收敛到数据、发送/上传和线程 action 编排。
