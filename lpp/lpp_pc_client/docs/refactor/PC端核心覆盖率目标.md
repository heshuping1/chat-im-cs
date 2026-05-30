# PC 端核心覆盖率目标

日期：2026-05-29

## 目标

核心 domain/application 代码优先保证“关键路径有测试、边界有测试、诊断可查”，不为了百分比写脆弱测试。

## 分层目标

| 层级 | 目标 | 说明 |
| --- | --- | --- |
| Gateway/Contract | 90%+ 关键分支覆盖 | raw event、合同降级、invalid/ignored/handled 必测。 |
| Store/Application | 85%+ 关键分支覆盖 | auth、settings、read model、reminder、send queue 必测。 |
| Message/CS Domain | 85%+ 关键分支覆盖 | 消息模型、客服状态机、缓存、发送链路必测。 |
| Electron Boundary | 90%+ 边界用例覆盖 | desktopApi validation、IPC channel、路径策略、secure storage 必测。 |
| UI Component | 风险驱动 | 复杂交互和回归高发组件补测试，不追求展示型组件全覆盖。 |

## 当前可执行门禁

- `npm run test:core`
  - Gateway
  - IM
  - Message
  - CS
  - Auth
  - Contract
  - Diagnostics
  - Desktop API validation
  - Architecture boundaries
- `npm run test:coverage:core`
  - 覆盖核心 domain/model/diagnostics 边界，不覆盖展示型 UI 和大部分 hooks 装配层。
  - 当前硬阈值：lines 60%、statements 60%、functions 55%、branches 45%。
  - 当前实测：lines 72.99%、statements 69.18%、functions 74.70%、branches 58.76%。

## 覆盖率门禁演进

已引入 `@vitest/coverage-v8`，但遵循渐进策略：

1. 第一阶段只卡核心目录，不卡展示型 UI。
2. `check:quick` 不跑 coverage，避免日常快速验证变慢。
3. 阈值先守住当前核心底座，后续每批补测后再上调。
4. hooks、API clients、展示组件按风险逐步纳入。
