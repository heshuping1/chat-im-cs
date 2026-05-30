# P8-EL-002B Secure Token Storage Strategy

日期：2026-05-29

## 策略

桌面端使用 Electron main 进程 `safeStorage`：

1. renderer 调用 `window.desktopApi.saveAuthSession`。
2. preload 通过 P8-EL-001 validation 校验 payload。
3. main 进程使用 `safeStorage.encryptString` 加密后写入 `userData/secure/auth-session.bin`。
4. App 启动后异步读取 `window.desktopApi.readAuthSession` 并恢复 workspace auth state。
5. 清理登录态时同时清理 secure file 和旧 localStorage key。

## 回退

- Electron `safeStorage` 不可用时，main 保存会失败。
- 浏览器开发环境没有 `desktopApi`，继续使用原 localStorage。
- 旧 localStorage 登录态仍可读；桌面端成功迁移到 secure storage 后移除旧 key。

## 不做的事

- 不改变 API Authorization header 传递方式。
- 不改变 Gateway accessTokenFactory。
- 不把 token 从 renderer 内存完全移出，该目标需要后续主进程代理 API/Gateway，范围更大。
