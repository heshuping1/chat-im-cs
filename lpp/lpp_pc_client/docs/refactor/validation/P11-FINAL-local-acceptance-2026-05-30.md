# P11 最终本机验收记录

日期：2026-05-30

范围：`lpp/lpp_pc_client`

## 结论

除 Windows 实机验证和 Playwright 浏览器视觉截图外，当前环境可完成的 PC 端 P11 收尾治理已完成。

`npm run p10:audit` 结果：

```text
large-files: none
orphan-source-candidates: none
compat-store-imports: none
public-ability-signals: none
date-format-signals: none
type-escape-signals: none
global-css-signals: none
tracked-generated-artifacts: none
```

## 已完成目标

1. CSS owner 拆分：`app.css` 降至 108 行，`global-css-signals` 清零。
2. 旧 store 入口删除：`src/renderer/data/store.ts` 删除，core 迁移到 `src/renderer/data/workspace-ui/workspace-store-core.ts`，`compat-store-imports` 清零。
3. 桌面媒体/通知 owner 收敛：确认 main owner 并更新审计 allowlist，`public-ability-signals` 清零。
4. 孤儿源码处理：`performance-samples` 接入 diagnostics export，`orphan-source-candidates` 清零。
5. 残留命名清理：`legacy-message.css` 重命名为 `message-shared.css`；生产代码中的 `legacy` 默认附件 UI、read seq 合并变量和 contract 中间变量改为语义名。
6. PC 端运行：开发态已启动，`http://127.0.0.1:5173/` 返回 `200 OK`，Electron 进程存在。

## 最终验证命令

```bash
npm run p10:audit
npm run check:quick
npm run build
npm run test:coverage:core
npm run docs:check
git diff --check
rg -n "attachmentUi = \"legacy\"|attachmentUi\\?: \"legacy\"|attachmentUi === \"legacy\"|legacyReadSeq|legacyReads|legacyReadValidation|legacyMessage|legacy-message\\.css|src/rendere\\." src tests docs/refactor
curl -sS -I http://127.0.0.1:5173/
pgrep -fl "vite --host 127.0.0.1|electron \\.|concurrently|wait-on tcp:5173|VITE_DEV_SERVER_URL=http://127.0.0.1:5173"
```

## 验证结果

- `npm run p10:audit`：通过，所有代码健康 section 均为 `none`。
- `npm run check:quick`：通过。
- `npm run build`：通过；仍存在 SignalR 相关 Rollup 注释提示，属于既有第三方提示。
- `npm run test:coverage:core`：通过，59 个文件 / 262 个测试，覆盖率阈值通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。
- 精确残留命名扫描：通过，无命中。
- PC dev server：`HTTP/1.1 200 OK`。
- Electron：`electron .` 进程存在。

## 未执行项

- Windows 实机验证：当前环境不是 Windows，继续由 `P11-WIN-001` 跟踪。
- Playwright 自动视觉 smoke：本机缺少 Playwright Chromium 可执行文件；未新增浏览器下载依赖。

## 提交分组建议

当前工作区包含大量既有 PC 改动、P11 改动、移动端改动和未跟踪文档。建议不要一次性混合提交。

建议分组：

1. PC P11 cleanup：`docs/refactor/**`、`scripts/report-p10-code-health.mjs`、`src/renderer/styles/**`、`src/renderer/App.tsx`、`src/renderer/data/workspace-ui/workspace-store-core.ts`、`src/renderer/data/*/*-store.ts`、`src/renderer/data/diagnostics/diagnostics-package.ts`、`tests/unit/architecture-boundaries.spec.ts`、`tests/unit/im-core.spec.ts`。
2. PC earlier P10/P9 refactor：message/customer-service/data/gateway/runtime diagnostics 等较早阶段新增文件和测试。
3. Generated artifact cleanup：`playwright-report/index.html`、`test-results/.last-run.json`、`.gitignore`。
4. Mobile changes：`../lpp_mobile/**` 和 `../scripts/mobile/**`，不应混入 PC P11 cleanup commit。

## 后续

- 在 Windows 环境执行 `P11-WIN-001`。
- 若需要视觉自动化，先安装 Playwright Chromium 后再执行页面 smoke。
