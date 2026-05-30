# P18-RELEASE-001 Local Release Closure 验证记录

日期：2026-05-30

范围：P18 本地发布闭环和 Windows 验证交接。

## 已执行验证

1. `npm run check:quick`：通过。
2. `npm run test:coverage:core`：通过。
3. `npm run p12:audit`：通过。
4. `npm run p10:audit`：通过，全部为 `none`。
5. `npm run build`：通过；Vite 对 SignalR PURE 注释有非阻塞提示，构建成功。
6. `npm run docs:check`：通过。
7. `git diff --check`：通过。
8. 开发态已通过 `screen -dmS lpp-pc-client-dev ... npm run dev` 启动，`curl -I http://127.0.0.1:5173/` 返回 `HTTP/1.1 200 OK`。

## 运行时说明

开发态进程通过 `screen -ls` 可见 `lpp-pc-client-dev`，`pgrep` 可见 Vite、concurrently、wait-on、cross-env 和 Electron 进程。Electron DevTools 输出 `Autofill.enable` / `Autofill.setAddresses` 不存在的 Chromium DevTools 噪音，不影响 Vite HTTP 200。

## Windows 交接

Windows 实机验证仍归 `P16-WIN-001`：`npm run dist:win`、安装包、启动、托盘、截图、文件打开、视频预览、safeStorage 登录态恢复、diagnostics 导出和 `perf:samples`。
