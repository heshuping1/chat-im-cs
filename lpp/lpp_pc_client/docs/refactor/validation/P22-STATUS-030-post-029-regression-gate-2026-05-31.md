# P22-STATUS-030 P22 后续回归门禁验证记录

日期：2026-05-31

## 目标

在 P22-STATUS-029 视频播放器坏缓存恢复完成后，继续按现有架构对媒体消息、发送状态、桌面播放器和治理门禁做一次后续回归检查。当前没有新的业务问题被明确登记，因此本轮只沉淀验证证据，不为通过验证的链路制造额外改动。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不替换技术栈。
- 不删除旧链路。
- 不扩大公共抽象。

## 修改范围

- `docs/refactor/PC端重构任务矩阵.md`
  - 新增 `P22-STATUS-030`，记录 P22-STATUS-029 后的回归门禁闭环。
- `docs/refactor/validation/P22-STATUS-030-post-029-regression-gate-2026-05-31.md`
  - 记录本轮验证命令、结果和未触发风险边界的结论。

## 验证命令

```bash
npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts tests/unit/message-domain.spec.ts tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-retry-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-failure-marker-style.spec.ts
npm run docs:check
npm run check:quick
npm run test:unit
```

结果：通过。

- 媒体/状态/播放器局部单测：12 个测试文件、65 tests 通过。
- `npm run docs:check`：通过，`refactor docs ok`。
- `npm run check:quick`：通过，含 TypeScript、Electron TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run test:unit`：88 个测试文件、406 tests 通过。

## 结论

1. P22-STATUS-029 后没有在本地验证中发现新的媒体消息、发送状态或桌面播放器回归。
2. `P22-STATUS-015` 仍是历史编号空洞，当前 docs 校验未将其视为阻塞；不为编号空洞补业务任务。
3. 本轮未新增运行时日志。原因：没有新增或修改核心链路行为，只沉淀回归验证证据。
