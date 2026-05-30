# Repository Agent Guide

适用范围：整个仓库。

这个文件只做任务路由和入口指引。具体工程规则以子目录内更近的 `AGENTS.md` 为准。

## 当前工作重心

当前阶段默认优先处理 PC 客服 IM 客户端：`lpp/lpp_pc_client/**`。

移动端 `lpp/lpp_mobile/**` 不是禁止范围；只是当前没有明确移动端需求时，不主动扩展到 App 功能或移动端代码。

## 必须路由规则

1. 任何任务如果会读取或修改 `lpp/lpp_pc_client/**`，必须先阅读 `lpp/lpp_pc_client/AGENTS.md`。
2. 任何任务如果会读取或修改 `lpp/lpp_mobile/**`，必须先阅读 `lpp/lpp_mobile/AGENTS.md`。
3. 任何任务如果会读取或修改 `lpp/docs/api-contracts/**`，必须先阅读 `lpp/docs/api-contracts/AGENTS.md`。
4. 跨端任务必须分别阅读涉及端的 `AGENTS.md`，并按更严格的边界规则执行。

## 文档读取顺序

新任务先判断影响范围：

1. 只涉及单端：读对应端的 `AGENTS.md`，再读该端文档入口。
2. 涉及 PC 端：读 `lpp/lpp_pc_client/AGENTS.md`，再读 `lpp/lpp_pc_client/docs/refactor/README.md`。
3. 涉及移动端：读 `lpp/lpp_mobile/AGENTS.md`。
4. 涉及接口合同：读 `lpp/docs/api-contracts/AGENTS.md`。

如果文档之间冲突，优先级为：

1. 当前用户明确指令。
2. 更近目录的 `AGENTS.md`。
3. 本文件。
4. 模块 README 或技术方案。

## PC 端特别提醒

PC 端是当前重构重点。修改 PC 端代码前，不能只看 README 或任务矩阵，必须先读：

1. `lpp/lpp_pc_client/AGENTS.md`
2. `lpp/lpp_pc_client/docs/refactor/README.md`
3. `lpp/lpp_pc_client/docs/refactor/PC端核心架构技术方案.md`
4. `lpp/lpp_pc_client/docs/refactor/PC端重构任务矩阵.md`

执行 PC 端任务时，必须遵守 PC 端架构边界、诊断日志、公共能力复用和验证记录要求。
