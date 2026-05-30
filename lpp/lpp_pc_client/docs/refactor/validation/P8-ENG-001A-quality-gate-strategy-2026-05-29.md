# P8-ENG-001A Quality Gate Strategy

日期：2026-05-29

## 决策

本轮不新增 ESLint/Prettier 依赖，先建立无新增依赖的等价 quick check。

## 理由

- 当前任务目标是快速推进重构效果，新增 lint 技术栈会带来规则选择、格式化 churn 和历史违规处理成本。
- 项目已经具备 TypeScript strict、Vitest 和新增架构边界测试，可以先形成轻量门禁。
- 后续如果需要 ESLint/Prettier，应单独确认依赖和规则集，并作为 P8-ENG 后续任务执行。
