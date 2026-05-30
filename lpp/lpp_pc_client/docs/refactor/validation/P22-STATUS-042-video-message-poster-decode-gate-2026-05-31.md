# P22-STATUS-042 Video Message Poster Decode Gate 验证记录

## 背景

消息窗口里的视频卡片偶发先出现黑屏、随后才显示封面。原因是旧实现拿到 `posterSrc` 字符串后立即进入 `has-poster` 分支，并把封面放在 CSS `background-image` 上；浏览器尚未加载或解码该背景图时，卡片先露出深色底色。该现象是否出现取决于封面缓存、网络、磁盘和图片解码时机。

## 风险边界

- 涉及：renderer 视频消息卡片、消息媒体 CSS、媒体展示静态单测。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖、播放器技术替换、发送链路和桌面播放器窗口。

## 改动摘要

- `VideoMessagePreview` 使用真实 `<img className="message-video-poster">` 承载可见封面，并通过 `onLoad/onError` 记录 `poster-loading/poster-ready/poster-failed`。
- `posterSrc` 变化时重置封面状态；只有图片真实解码后才进入 `has-poster` 视觉态。
- 移除消息卡片对 CSS `background-image` 的封面可见依赖；未解码或失败时使用浅色微信式占位和播放按钮，避免黑底闪烁。
- 保留 `<video poster={posterSrc}>` 作为浏览器原生兜底，不改变播放源、发送、缓存或桌面播放器链路。

## 验证

- TDD 红灯：新增 `media-message.spec.ts` 封面解码门控断言后，旧实现因缺少 `useEffect/useState` 和真实 poster `<img>` 按预期失败。
- `npx vitest run tests/unit/media-message.spec.ts`：通过，1 file / 13 tests passed。
- `npx vitest run tests/unit/media-message.spec.ts tests/unit/video-poster-runtime.spec.ts tests/unit/video-player-runtime.spec.ts`：通过，3 files / 27 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 首次打开含远端封面的视频消息，不应先黑屏再出封面。
- 本地刚发送视频、历史视频、刷新后恢复视频均应显示稳定封面或浅色占位。
- 封面加载失败时应显示中性视频占位，不显示黑块。
