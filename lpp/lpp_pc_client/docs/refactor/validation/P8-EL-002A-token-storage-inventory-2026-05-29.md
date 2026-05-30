# P8-EL-002A Token Storage 盘点

日期：2026-05-29

## 当前 token 来源

| 来源 | 字段 | 说明 |
| --- | --- | --- |
| 登录接口 | `tenantToken/platformToken/refreshToken/platformRefreshToken` | 登录后写入 `AuthSession`。 |
| 企业切换 | `tenant.accessToken/tenant.refreshToken` | 切换企业后更新当前租户 token。 |
| env 配置 | `VITE_TENANT_TOKEN/VITE_API_BASE_URL` | 开发/配置型登录态，优先级高于持久化存储。 |

## 旧风险

- `auth-session.ts` 原先把完整 `AuthSession` JSON 写入 `localStorage:lpp.pc.authSession`。
- localStorage 属于 renderer 可访问存储，XSS 或调试注入时更容易暴露 token。
- 诊断日志已有脱敏，但持久化介质仍需要迁移。

## 迁移约束

- renderer 运行时仍需要 token 调 API/Gateway，所以“完全不进 renderer 内存”不是当前阶段目标。
- 本阶段目标是移除桌面端持久化明文 token。
- 浏览器开发模式没有 Electron `desktopApi`，仍保留 localStorage 兼容。
