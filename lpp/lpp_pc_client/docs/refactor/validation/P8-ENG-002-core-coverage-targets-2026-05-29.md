# P8-ENG-002 Core Coverage Targets

日期：2026-05-29

## 修改范围

- 新增 `docs/refactor/PC端核心覆盖率目标.md`。
- 新增 `npm run test:core`。

## 目标

- Gateway/Contract：90%+ 关键分支覆盖。
- Store/Application：85%+ 关键分支覆盖。
- Message/CS Domain：85%+ 关键分支覆盖。
- Electron Boundary：90%+ 边界用例覆盖。
- UI Component：风险驱动，不追求展示型组件全覆盖。

## 验证

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run test:core` | 通过 | 45 个测试文件，210 个测试通过。 |

## 说明

- 本轮不新增 `@vitest/coverage-v8`，避免依赖和阈值策略未确认时引入 churn。
- 后续若要硬卡覆盖率，需要先确认新增 devDependency、目录阈值和 CI 策略。
