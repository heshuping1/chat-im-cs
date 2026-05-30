# P9-ENG-009 lint coverage gates 验证记录

日期：2026-05-30

## 目标

- 将已重构核心目录纳入 ESLint hard gate。
- 将核心 domain/model/diagnostics 纳入覆盖率 hard gate。
- 避免一次性把历史 UI、hooks、API clients 全量纳入导致重构节奏被历史债务拖住。

## 变更

- 新增 devDependencies：
  - `eslint`
  - `@eslint/js`
  - `typescript-eslint`
  - `eslint-plugin-react-hooks`
  - `@vitest/coverage-v8`
- 新增 `eslint.config.js`：
  - 使用 ESLint flat config。
  - 启用 TypeScript recommended。
  - 启用 React hooks rules-of-hooks。
  - `no-explicit-any` 暂不硬卡，避免历史迁移被一次性阻塞。
- 新增脚本：
  - `lint:core`
  - `test:coverage:core`
- `check:quick` 接入 `lint:core`。
- `PC端核心覆盖率目标.md` 更新当前覆盖率 hard gate 策略和实测值。

## 当前覆盖率门禁

`test:coverage:core` 只覆盖核心 domain/model/diagnostics 和 Electron runtime diagnostics：

- lines：阈值 60%，实测 72.85%。
- statements：阈值 60%，实测 69.04%。
- functions：阈值 55%，实测 74.87%。
- branches：阈值 45%，实测 58.66%。

## 验证

- `npm run lint:core`
  - 结果：通过。
- `npm run test:coverage:core`
  - 结果：通过，55 个测试文件，251 个测试用例。
- `npm run check:quick`
  - 结果：通过。
- `npm audit --audit-level=high`
  - 结果：失败，仍有 12 个 high severity。

## npm audit 结论

- 主要风险来自当前 Electron 与 electron-builder 生态：
  - `electron <=39.8.4`，修复建议为 `electron@42.3.0`，属于 breaking change。
  - `electron-builder` 依赖链中的 `tar`，修复建议为 `electron-builder@26.8.1`，属于 breaking change。
  - 另有 `glob`、`tmp` 等 transitive high 风险。
- 本任务不执行 `npm audit fix --force`，避免把 Electron 主版本升级混入 lint/coverage gate。
- 后续应单独创建 Electron 运行时和打包链升级评估任务。

## 结论

P9-ENG-009 已完成。工程门禁从类型/结构/文档/shape 升级为类型 + lint + 核心覆盖率 + 结构 + 文档的组合门禁；Electron 依赖安全升级作为独立任务处理。
