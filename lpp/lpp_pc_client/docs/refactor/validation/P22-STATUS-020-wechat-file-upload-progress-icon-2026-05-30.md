# P22-STATUS-020 微信式文件上传进度与文件类型可见验证记录

日期：2026-05-30

## 目标

修正文件上传卡片右侧 icon 的状态承载：上传时必须用确定圆环表达进度，`sending` 阶段不能退化成无限转圈，`ZIP/PDF` 等文件类型在上传、暂停、失败过程中都必须保持可见。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不人为拖慢上传，不伪造网络进度。

## 修改范围

- `src/renderer/media/runtime/uploadState.ts`
  - 文件 `sending` 改为确定进度态，`controlProgress = 95`。
  - 文件上传有进度时 meta 保持 `上传中`，进度只由 icon 圆环表达。
- `src/renderer/media/components/FileMessageCard.tsx`
  - 为文件类型新增独立视觉层，避免上传控件覆盖 `ZIP/PDF` 等类型。
- `src/renderer/styles/messages/message-media-content.css`
  - 文件上传控件不再整块覆盖 icon，改为围绕文件类型的圆形进度环和小型操作 glyph。
- `tests/unit/upload-state.spec.ts`、`tests/unit/media-message.spec.ts`
  - 补充 `sending` 确定进度、文件类型层和禁止全覆盖遮罩的断言。

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

- TDD 红灯：新增断言后，旧实现因 `上传中 45%`、缺少 `message-file-type-layer` 失败，证明计划中的两个偏差可被测试捕获。
- 单元验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts` 通过，2 个测试文件、19 个用例通过。
- 专项验证：`npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/message-status-model.spec.ts tests/unit/message-view-model.spec.ts` 通过，4 个测试文件、35 个用例通过。
- `npm run p10:audit`：通过，所有观察项为 `none`。
- `npm run p12:audit`：通过，CSS/组件观察项为 `none`；data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过，无 `ai-context-split-candidates`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 上传 `.7z/.zip` 时右侧 icon 始终能看到 `ZIP` 或压缩包类型。
2. 文件上传有真实进度时圆环按进度推进，不一直转圈。
3. 文件上传完成但发送 API 未返回时，显示 `发送中` 和接近完成的确定进度，文件仍不可打开。
4. 暂停、失败、重试状态不遮挡文件类型。
