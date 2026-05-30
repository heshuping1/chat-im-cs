# P22-STATUS-035 Video Player Build Sync Fallback 验证记录

## 背景

用户复测仍看到旧的“视频加载失败，点击重试”体验。排查确认 PC 端 Electron 入口为 `package.json main = dist/main/main.js`，`Command+Shift+R` 只刷新 renderer，不能让 `src/main/video-player-template.ts` 的改动进入正在运行的 Electron main/template。

## 风险边界

- 涉及：Electron main/template、`dist/main/*` 构建产物同步。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload contract、Zustand persist key、新依赖、技术替换、删除旧链路、扩大公共抽象。
- IPC 约束：继续使用现有 `openVideoPlayer` 和 `openMediaFile` 能力，不新增 preload API。

## 改动摘要

- `video-player-template` 增加 `canOpenCurrentInSystem()`，只要当前已有可打开的视频 URL，任意 `<video>` 播放错误都把主操作切换为“用系统播放器打开”。
- 保留 code 4 / `canPlayType` 空值的不支持格式判断；未知播放错误不再停留在只能重试的失败态。
- 运行 `npm run build:electron` 同步 `dist/main/video-player-template.js`，确认运行产物包含系统播放器兜底逻辑。
- 任务矩阵补充 `P22-STATUS-035`，明确 Electron main/template 改动必须重启 Electron 进程验证，`Command+Shift+R` 不足以验证。

## 验证

- `npx vitest run tests/unit/electron-template.spec.ts`：先 RED，新增用例确认缺少任意视频错误的系统播放器主兜底。
- `npx vitest run tests/unit/electron-template.spec.ts`：GREEN，5 tests passed。
- `npm run build:electron`：通过。
- `rg -n "视频格式暂不支持|用系统播放器打开|canOpenCurrentInSystem|内置播放器无法播放，建议使用系统播放器" dist/main/video-player-template.js src/main/video-player-template.ts`：通过，source 与 dist 均包含新兜底逻辑。
- `npx vitest run tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/video-player-runtime.spec.ts`：通过，3 files / 7 tests passed。
- `npm run docs:check`：通过，refactor docs ok。
- `git diff --check`：通过。
- `npm run check:quick`：通过，包含 TypeScript、Electron TypeScript、core lint、architecture/desktop API 单测、docs check、P19 audit 和 shape check。

## 手工验收提示

Electron main/template 改动必须完全重启 PC 客户端后验证：

1. 关闭当前播放器窗口和主应用进程。
2. 使用 `npm run dev`，或 build 后使用 `npm start` 重新启动。
3. 再打开不支持编码的视频，预期窗口快速展示封面，播放失败后主按钮显示“用系统播放器打开”。

`Command+Shift+R` 仅刷新 renderer，不会更新 `dist/main/*` 或已加载的 Electron main/template。
