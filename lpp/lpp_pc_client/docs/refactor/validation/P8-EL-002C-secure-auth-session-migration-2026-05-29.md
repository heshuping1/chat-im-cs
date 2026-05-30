# P8-EL-002C Secure Auth Session Migration

日期：2026-05-29

## 变更

`src/shared/desktop-api.ts`：

- 新增 `DesktopAuthSessionPayload`。
- 新增 `readAuthSession/saveAuthSession/clearAuthSession`。

`src/main/main.ts`：

- 新增 `desktop:read-auth-session`。
- 新增 `desktop:save-auth-session`。
- 新增 `desktop:clear-auth-session`。
- 使用 `safeStorage` 加密保存到 `userData/secure/auth-session.bin`。

`src/renderer/data/auth/auth-session.ts`：

- 桌面端持久化优先调用 secure desktop API。
- 旧 localStorage 登录态在桌面端会被迁移到 secure storage。
- 新增 `readDesktopStoredAuthSession`。

`src/renderer/data/store.ts` / `App.tsx`：

- 新增启动后异步恢复 secure auth session。

## 行为保持

- 浏览器开发环境继续使用 localStorage。
- env token 仍优先。
- workspace store 对外 `setAuthSession/clearAuthSession` 用法不变。
