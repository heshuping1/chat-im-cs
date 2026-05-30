# P17-SMELL-003 Desktop Capability Owner 验证记录

日期：2026-05-30

变更：新增 `messages/runtime/screenshotCapture.ts`，`MessageComposer` 不再直接调用 `window.desktopApi.captureScreenshot`；架构边界白名单改为允许 runtime owner。

未改变边界：不改变截图按钮、快捷键、取消错误处理和 dataUrl 转 File 行为。

验证：

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts
```

结果：结构测试通过。
