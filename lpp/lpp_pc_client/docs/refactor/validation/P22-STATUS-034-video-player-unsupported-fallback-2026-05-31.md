# P22-STATUS-034 视频播放器不支持格式兜底验证记录

日期：2026-05-31

## 目标

修复 Electron 内置播放器遇到不支持编码或异常媒体源时只显示“视频加载失败，点击重试”的卡死体验。本轮不引入新播放器依赖，先把失败状态拆清楚：下载/缓存失败显示“视频准备失败”，Chromium 不支持的格式显示“视频格式暂不支持”，并把主按钮切换为“用系统播放器打开”。下载按钮和现有倍速控制继续保留。

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

- `src/main/video-player-template.ts`
  - 增加 `canPlayCurrentType()` 和基础 MIME 预检，结合 `video.error.code === 4` 判断 `unsupported`。
  - `unsupported` 状态下主按钮从“重试”切换为“用系统播放器打开”，点击复用既有 `openMediaFile` 能力。
  - `setVideoFailure` 默认展示“视频准备失败”，用于缓存/下载失败。
  - 保留现有倍速、下载、封面和系统播放器入口。
- `tests/unit/electron-template.spec.ts`
  - 覆盖 unsupported 主按钮、系统播放器兜底、下载失败文案和倍速文案。
- `docs/refactor/PC端重构任务矩阵.md`
  - 新增 `P22-STATUS-034`。
  - 登记 `P23-PLAYER-001` 为 mpv/libmpv 技术评估任务，状态为待确认。

## 验证命令

```bash
npx vitest run tests/unit/electron-template.spec.ts
npx vitest run tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/video-player-runtime.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts
```

结果：通过。

- TDD 红灯：新增 `canPlayCurrentType()`、`openCurrentInSystem()`、“视频准备失败”和“用系统播放器打开”断言后，旧模板失败。
- 播放器局部验证：4 个测试文件、9 tests 通过。

## 诊断日志

- 是否新增日志：否。
- 原因：本轮只修正播放器窗口内状态分流和兜底动作；缓存下载失败仍沿用既有 `media.cache_failed` 诊断。
- 可排查方式：Electron runtime diagnostics 中检索 `media.cache_failed`；播放器 UI 可区分准备失败与格式不支持。

## 开源播放器评估结论

- Video.js 不作为本 bug 的解决方向：它仍依赖 HTML5 `<video>`/Chromium 解码能力，不能解决 HEVC/H.265 或特殊封装的本地文件不可播。
- 若后续产品要求“内置全格式播放”，优先评估 mpv/libmpv。该方向涉及 native 依赖、安装包体积、Windows 打包签名、更新策略和安全边界，已登记为 `P23-PLAYER-001`，需要负责人确认后再执行。
