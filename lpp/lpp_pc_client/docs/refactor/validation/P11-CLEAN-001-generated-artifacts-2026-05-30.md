# P11-CLEAN-001 generated artifacts validation

日期：2026-05-30

范围：

- `.gitignore`
- `playwright-report/index.html`
- `test-results/.last-run.json`
- `scripts/report-p10-code-health.mjs`
- `docs/refactor/PC端P11深度清理任务清单.md`

## 变更摘要

1. 删除已被 git 跟踪的 Playwright HTML 报告和 test-results 状态文件。
2. 在 PC 客户端 `.gitignore` 中加入 `playwright-report/` 和 `test-results/`。
3. 扩展 `npm run p10:audit`，增加 `tracked-generated-artifacts` 区块，持续报告被 git 跟踪的构建/测试产物。
4. 新增 P11 深度清理任务清单，把剩余大文件、重复能力、CSS、type escape、Windows 验证拆成可执行任务。

## 验证命令

```bash
git ls-files playwright-report test-results dist
```

结果：变更前报告 `playwright-report/index.html` 和 `test-results/.last-run.json`；本任务将两者删除。

```bash
git check-ignore -v playwright-report test-results dist
```

结果：`dist` 已被忽略；本任务补充忽略 `playwright-report/` 和 `test-results/`。

## 待补验证

```bash
npm run p10:audit
```

结果：通过，`tracked-generated-artifacts` 输出 `none`。

```bash
npm run check:quick
```

结果：通过，包含 renderer/electron TS、`lint:core`、architecture/desktop API 单测、docs check、shape lint。

```bash
npm run build
```

结果：通过。Rollup 仍输出 SignalR `/*#__PURE__*/` 注释位置告警，属于既有第三方依赖构建告警。

```bash
npm run docs:check
```

结果：通过，`refactor docs ok`。

```bash
git diff --check
```

结果：通过。
