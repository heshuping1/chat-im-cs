# P16-RELEASE-001 Mac Release Verification 验证记录

日期：2026-05-30

任务：P16-RELEASE-001

范围：Mac 本地发布前验证闭环。

## 已执行命令

```bash
npm run p12:audit
npm run p10:audit
npm run check:quick
npm run build
npm run docs:check
git diff --check
```

结果：

1. `p12:audit`：`css-large-files = none`，`component-edge-files = none`；剩余 `data-main-edge-files` 已进入职责例外清单。
2. `p10:audit`：所有审计项为 `none`。
3. `check:quick`：通过。
4. `build`：通过；Vite build 仅输出 SignalR/Rollup PURE 注释提示。
5. `docs:check`：通过。
6. `git diff --check`：通过。

## 开发态启动

```bash
screen -S lpp-pc-client-dev -X quit 2>/dev/null || true
pgrep -fl "vite --host 127.0.0.1|electron \\.|concurrently|wait-on tcp:5173|VITE_DEV_SERVER_URL=http://127.0.0.1:5173" | awk '{print $1}' | xargs -r kill 2>/dev/null || true
screen -dmS lpp-pc-client-dev bash -lc 'cd /Users/eric/Documents/chat/chat-im-cs/lpp/lpp_pc_client && npm run dev > /tmp/lpp-pc-client-dev.log 2>&1'
sleep 8
curl -sS -I http://127.0.0.1:5173/ | sed -n '1,4p'
```

结果：

1. Vite HTTP 返回 `HTTP/1.1 200 OK`。
2. Electron/Vite 开发态进程保持运行。
3. 日志位置：`/tmp/lpp-pc-client-dev.log`。

## 未完成项

Windows 实机安装包、启动、托盘、截图、文件/视频、safeStorage、diagnostics、性能采样仍由 `P16-WIN-001` 独立验证。
