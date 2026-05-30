# P8-EL-003A IPC Channel 盘点

日期：2026-05-29

## 固定 desktop IPC channels

当前固定 `desktop:*` channel 已映射到 `DesktopApiMethod`：

- notification：`desktop:notify`
- media：cache/open/edit/copy/save/reveal/video player
- file：`desktop:open-file`、`desktop:save-file`、`desktop:copy-file-path`
- auth：`desktop:read-auth-session/save-auth-session/clear-auth-session`
- screenshot：`desktop:capture-screenshot`
- diagnostics：`desktop:export-diagnostics`
- tray/version/external：`desktop:set-tray-status/get-app-version/open-external`

## 动态 channel

截图选择窗口仍使用动态 `desktop:screenshot-selection:*` channel。

该部分包含单独 BrowserWindow 和 `nodeIntegration: true`，归 P8-EL-004 截图窗口隔离处理，本任务不混改。
