# P22-STATUS-025 文件完成态与来源文案验证记录

日期：2026-05-31

## 目标

补齐文件消息闭环：成功态右侧 icon 恢复 `ZIP/PDF/APK/FILE` 类型文字；上传有确定进度时圆弧从 12 点方向推进且不自旋；暂停无进度时冻结 0%；文件来源文案先对齐当前客户端程序名。来源的真正 owner 已在 P22-STATUS-026 收敛为 app metadata。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/media/components/FileMessageCard.tsx`
  - 当时先把来源文案对齐为当前客户端程序名；P22-STATUS-026 已把具体程序名从该组件移出。
  - 无上传控件时显示文件类型 glyph；上传/暂停/发送/失败时显示居中控件。
- `src/renderer/media/runtime/uploadState.ts`
  - 暂停态缺少进度时固定为 0%，避免退回 indeterminate 自旋。
- `src/renderer/styles/messages/message-media-content.css`
  - 确定进度态显式 `animation: none`，圆弧从 12 点方向开始。
  - 移除消息气泡内针对文件类型 glyph 的旧字号覆盖，避免成功态类型被隐藏或异常缩放。
- `tests/unit/upload-state.spec.ts`、`tests/unit/media-message.spec.ts`
  - 补充成功态类型、默认来源、确定进度不自旋、暂停冻结的断言。

## 验证命令

```bash
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts
npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

- TDD 红灯：新增断言后，旧实现因来源仍为 `PC 客户端`、暂停无进度时 `controlProgress` 为 `undefined` 而失败，证明测试覆盖了本轮闭环缺口。
- 单元验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts` 通过，2 个测试文件、20 tests。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、36 tests。
- `npm run p10:audit`：通过，全部 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`；data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过，`ai-context-split-candidates = none`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 文件发送成功后右侧 icon 显示 `ZIP/PDF/APK/FILE` 类型文字。
2. 文件上传中有进度时圆弧按进度推进，不默认自旋。
3. 暂停态圆弧冻结，中心显示继续。
4. 文件底部来源显示当前客户端程序名；后续以 P22-STATUS-026 的 app metadata owner 为准。
5. 底部不恢复进度条、暂停、取消按钮。
