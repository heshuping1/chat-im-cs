# P22-STATUS-029 桌面视频打开失败与坏缓存恢复验证记录

日期：2026-05-31

## 目标

修复桌面视频播放器显示“视频加载失败，点击重试”的问题。当前风险点是历史缓存中可能已经存在 JSON/HTML 错误页或鉴权失败响应，旧逻辑只判断文件存在和大小，导致反复打开同一个不可播缓存文件。本轮在不改变 IPC contract 的前提下，让视频缓存命中时先进行轻量内容嗅探，发现坏缓存后重新下载。

## 风险边界

- 不改变 API DTO wire shape。
- 不改变 React Query query key。
- 不改变 Gateway event。
- 不改变 Electron IPC/preload/main contract。
- 不改变 Zustand persist key。
- 不新增依赖。
- 不替换播放器技术栈。

## 修改范围

- `src/main/media-storage.ts`
  - 视频缓存命中时只读取文件头部进行 JSON/HTML 错误内容嗅探；命中坏缓存时记录脱敏诊断并重新下载覆盖，避免大视频整文件读入内存。
  - 远端下载时即使服务端 `content-type` 不准确，也会嗅探 JSON/HTML 错误 payload，避免把错误页写成视频缓存。
- `src/main/video-player-template.ts`
  - 修复倍速按钮文案，避免 `textContent` 或初始 DOM 出现 HTML 实体字符串。
- `tests/unit/media-storage.spec.ts`
  - 覆盖历史坏视频缓存被重新下载覆盖。
- `tests/unit/electron-template.spec.ts`
  - 覆盖播放器状态机仍稳定，且倍速文案不泄漏实体字符串。

## 验证命令

```bash
npx vitest run tests/unit/media-storage.spec.ts tests/unit/electron-template.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
npm run p10:audit
npm run p12:audit
npm run p19:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：通过。

- 单项验证：`npx vitest run tests/unit/media-storage.spec.ts tests/unit/electron-template.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts` 通过，4 个测试文件、8 tests。
- `npm run p10:audit`：通过；除既有 `src/renderer/App.tsx` orphan 观察项外，其余为 `none`。
- `npm run p12:audit`：通过；CSS/组件观察项为 `none`，data/main 边缘文件仍为既有已登记观察项。
- `npm run p19:audit`：通过；`ai-context-split-candidates = none`。
- `npm run check:quick`：通过，含 TypeScript、core lint、架构边界、desktop API validation、docs、P19 和 shape 检查。
- `npm run build`：通过；仅保留 SignalR 依赖包既有 Rollup `/*#__PURE__*/` 注释提示。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 人工验收要点

1. 点击历史视频时，不再反复打开旧的 JSON/HTML 坏缓存。
2. 如果重新下载成功，播放器应能加载本地视频文件。
3. 如果视频 codec 不被 Electron Chromium 支持，播放器应稳定展示失败/不支持态，并保留系统播放器入口。
4. 播放器底部倍速按钮显示 `倍速`，不显示 `&#20493;&#36895;`。
