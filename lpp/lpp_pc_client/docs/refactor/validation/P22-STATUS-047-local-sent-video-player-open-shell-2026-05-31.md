# P22-STATUS-047 Local Sent Video Player Open Shell 验证记录

## 背景

本机发送视频上传完成后，点击原视频窗口偶发先显示整页灰底“视频打开中 / 正在准备视频”。这说明播放器窗口已经打开，但模板初始没有拿到本地 `fileUrl` 或可见封面。对专业 IM 来说，本机刚发送的视频应优先用 app cache 下的本地文件直开，远端下载准备只作为历史消息、跨设备消息或缓存缺失时的兜底。

## 风险边界

- 涉及：renderer 视频打开运行时、消息视频打开诊断、Electron main 播放器窗口、播放器 HTML 模板、单测和文档。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、播放器技术替换、删除旧链路。
- `openVideoPlayer` payload contract 保持不变。

## 实现摘要

- `openDesktopVideoPlayer` 在打开前记录 `open.prepare` 诊断，包含 `sourceKind`、`hasLocalOpenUrl`、`openedWithInitialFileUrl` 和 `prepareElapsedMs`，不记录完整本地路径或远端 query。
- 消息窗口视频打开诊断新增 `video.open_prepare`，可区分本机缓存直开与远端准备降级。
- 播放器窗口对初始 `file://` 源直接写入模板；本地文件缓存校验成功后不再重复注入同一源，避免本地秒开路径被二次 reload。
- 播放器模板将 loading 可见延迟调整到 500ms，源等待提示延迟到 1500ms；移除旧“正在准备视频”文案，无源准备态改为 poster-first 或中性占位。

## 验证

- TDD 红灯：新增 `video-player-runtime.spec.ts`、`electron-template.spec.ts`、`media-message.spec.ts` 断言后，旧实现按预期失败，缺少 `open.prepare` 诊断、仍包含旧“正在准备视频”文案，loading 延迟仍为 320ms。
- 绿灯验证：
  - `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-message.spec.ts`：通过，40 tests。
  - `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-message.spec.ts tests/unit/video-player-document.spec.ts`：通过，41 tests。
  - `npm run build:electron`：通过，`dist/main/video-player-template.js` 同步包含 `loadingChromeDelayMs = 500` 和 `sourceWaitDelayMs = 1500`。
  - `npm run check:quick`：通过，包含 typecheck、Electron typecheck、core lint、hooks lint、架构边界、IPC validation、docs check、P19 audit 和 shape lint。
  - `npm run docs:check`：通过。
  - `git diff --check`：通过。

## 手工验收要点

1. 自己刚发送成功的视频点击后，正常本地缓存路径应直接展示封面/首帧并自动播放，不出现整页灰底“正在准备视频”。
2. 如果本地缓存缺失，才进入远端缓存准备态；准备态必须保持封面或中性占位，不空白。
3. 真实失败或编码不支持时仍显示明确失败文案和系统播放器兜底。
4. 诊断能区分本地缓存直开、远端降级准备、缓存缺失和播放器真正失败。
