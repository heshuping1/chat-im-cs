# ADR-0001: Electron Boundary And Secure Session

## Status

Accepted

## Date

2026-05-29

## Related Tasks

- P8-EL-001
- P8-EL-002
- P8-EL-003
- P8-EL-004
- P8-EL-005

## Context

PC 客服 IM 客户端需要同时运行 renderer、preload、main。原实现中 desktop 能力边界缺少统一 runtime validation，auth session 曾存在 localStorage 风险，截图窗口启用 Node 能力，本地文件动作也缺少统一路径策略。

## Decision

- `desktopApi` 作为 renderer 唯一桌面能力入口。
- preload/main 进入 IPC 前后复用 shared validation。
- desktop IPC channel 必须在白名单注册。
- 桌面端 auth session 使用 Electron `safeStorage` 写入 userData 下的加密文件。
- 截图选择窗口使用独立 preload，关闭 `nodeIntegration`。
- 本地文件路径只允许应用 userData 缓存目录。

## Alternatives Considered

### 保留 renderer localStorage token

- 优点：改动小。
- 缺点：XSS 或 renderer 注入后可直接读取长期 token。
- 结论：不接受。

### 直接暴露 ipcRenderer

- 优点：开发灵活。
- 缺点：能力边界不可控，后续安全审计成本高。
- 结论：不接受。

## Consequences

- 正面影响：Electron 能力边界可查、可测、可验证。
- 代价：新增 validation 和 secure session 迁移逻辑。
- 风险：浏览器开发环境仍保留 localStorage 回退。
- 回滚方式：恢复 auth localStorage 读写、恢复固定 ipcMain handler；仅用于紧急回滚。

## Validation

- `vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/auth-session.spec.ts`
- `tsc -p tsconfig.electron.json --noEmit --pretty false`
- `tsc --noEmit --pretty false --skipLibCheck`
