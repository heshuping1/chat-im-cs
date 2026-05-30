# P10-STABILITY-001 renderer startup validation

日期：2026-05-30

范围：

- `src/renderer/components/AppErrorBoundary.tsx`
- `src/renderer/App.tsx`
- `src/renderer/styles/app.css`

## 变更摘要

1. 新增顶层 `AppErrorBoundary`，捕获 React 渲染错误并复用 `runtime-error-diagnostics` 写入诊断。
2. 将 authenticated shell 页面渲染收敛到 `ActiveModulePage`，避免多处条件渲染导致无页面输出难排查。
3. 对运行期异常 `activeModule` 值回退到 `messages`，并同步修正 workspace-ui 状态。
4. 增加可见错误页样式，避免启动失败表现为无内容白屏。

## 验证命令

```bash
npx vitest run tests/unit/runtime-error-diagnostics.spec.ts tests/unit/architecture-boundaries.spec.ts
```

结果：通过，2 个测试文件、11 个测试通过。

```bash
npx tsc --noEmit --pretty false --skipLibCheck
```

结果：首次发现 `ErrorInfo.componentStack` 可为 `null`，修正后通过。

```bash
npx tsc -p tsconfig.electron.json --noEmit --pretty false
```

结果：通过。

```bash
npm run check:quick
```

结果：通过，包含 renderer/electron TS、`lint:core`、architecture/desktop API 单测、docs check、shape lint。

```bash
npm run build
```

结果：通过。Rollup 仍输出 SignalR `/*#__PURE__*/` 注释位置告警，属于既有第三方依赖构建告警。

```bash
npm run p10:audit
```

结果：通过。仍报告既有 P10 后续信号：`MessageCenter`、`MessageComposer`、`ContactsPage`、`LexicalChatInput`、`CustomerProfileWorkspace` 超 800 行，`performance-samples.ts` 保留项，头像/日期/CSS/type escape 等治理信号。

```bash
npm run docs:check
```

结果：通过，`refactor docs ok`。

```bash
git diff --check
```

结果：通过。

```bash
npm run dev
```

结果：通过，Vite 已监听 `http://127.0.0.1:5173/`，Electron 已启动。开发者工具仍输出 Chromium Autofill protocol 噪音，不是应用渲染错误。

## 未执行

- Windows 实机验证：按用户要求跳过，继续归 `P10-OTHER-002` / `P10-WIN-001`。
- Playwright 浏览器截图：本机缺少 Playwright Chromium executable；未执行浏览器下载，避免在本次稳定性修复中引入新的工具安装动作。
