# P8-EL-001B Desktop API Validation Schema

日期：2026-05-29

## 变更

新增 `src/shared/desktop-api-validation.ts`：

- `validateDesktopApiCall`
- `validateNotifyPayload`
- `validateCacheMediaFilePayload`
- `validateCacheMediaPosterPayload`
- `validateVideoPlayerPayload`
- `validateDiagnosticsPayload`
- `validateTrayStatus`

`src/shared/desktop-api.ts` 新增：

- `DesktopApiMethod`

## 校验规则

- 字符串必须为 string，拒绝 null byte，默认最大 4096 字符。
- `saveFile.content` 最大 5MB。
- diagnostics breadcrumbs/errors 最多保留 200 条。
- media kind 只允许 `image/video/file`。
- tray status 只允许 `online/busy/away/invisible`。
- poster data URL 必须以 `data:` 开头。

## 安全判断

这一步是边界输入校验，不是完整权限模型。文件路径权限、IPC channel 白名单、下载域名策略和截图窗口隔离继续拆到 P8 后续任务。
