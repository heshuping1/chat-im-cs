# P22-STATUS-033 视频播放器快速开窗验证记录

日期：2026-05-31

## 目标

修复视频“打开很慢”和播放器内“视频加载失败”排查困难的问题。旧实现会在 `openVideoPlayerWindow` 里先完整执行 `ensureLocalMediaFile`，下载和写入缓存完成后才创建播放器窗口；大视频或慢网络下用户长时间只看到聊天气泡的打开中状态。

本轮改为播放器窗口先打开，先显示封面和“正在准备视频”状态；后台缓存完成后通过页面内 hook 注入本地 `file://` 视频源。如果缓存失败，播放器窗口直接展示失败原因。`desktop:open-video-player` 的 IPC channel、payload 和 preload 暴露不变。

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

- `src/main/video-player-window.ts`
  - 移除开窗前同步等待视频缓存的阻塞路径。
  - 创建窗口后后台执行 `ensureLocalMediaFile`，成功后注入缓存本地 URL，失败后注入失败文案。
  - 本地 `file:` / `data:` 源仍可作为初始视频源直接加载。
- `src/main/video-player-template.ts`
  - 支持 `fileUrl` 暂未准备好时先渲染播放器壳、封面和准备状态。
  - 暴露页面内 `window.__lppSetVideoSource` / `window.__lppSetVideoFailure` hook，供 main 进程在缓存完成后更新播放器状态。
  - 下载和系统播放器入口使用当前视频源，避免缓存源注入后仍引用旧值。
- `tests/unit/electron-template.spec.ts`
  - 覆盖无 `fileUrl` 的快速开窗模板、视频源注入 hook 和失败 hook。

## 验证命令

```bash
npx vitest run tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
npx tsc -p tsconfig.electron.json --noEmit --pretty false
```

结果：通过。

- 局部播放器验证：4 个测试文件、9 tests 通过。
- Electron TypeScript：通过。

## 诊断日志

- 是否新增日志：否。
- 原因：本轮复用既有 `ensureLocalMediaFile` 和 `media.cache_failed` 诊断；只调整窗口创建时机和模板内状态注入。
- 可排查方式：缓存下载失败仍进入 Electron runtime diagnostics；播放器窗口内同步显示用户可见失败原因。

## 遗留说明

如果缓存成功但 Chromium 仍报 `MEDIA_ERR_SRC_NOT_SUPPORTED`，通常是视频编码不被 Electron 内置 Chromium 支持。此时播放器会保留系统播放器入口，后续如要自动转系统播放器，需要单独做产品确认。
