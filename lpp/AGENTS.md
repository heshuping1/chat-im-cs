# LPP Agent Guide

适用范围：`lpp/`

这个文件是 LPP 多端工程的路由入口。更具体的规则以子项目自己的 `AGENTS.md` 为准。

## 当前工作重心

当前阶段默认优先处理 PC 客服 IM 客户端：`lpp_pc_client/**`。

移动端 `lpp_mobile/**` 不是禁止范围；只是当前没有明确移动端需求时，不主动扩展到 App 功能或移动端代码。

## 子项目入口

| 影响范围 | 必读入口 |
| --- | --- |
| PC 客服 IM 客户端 | `lpp_pc_client/AGENTS.md` |
| 移动端 | `lpp_mobile/AGENTS.md` |
| API 合同文档 | `docs/api-contracts/AGENTS.md` |

## PC 端强制规则

只要任务会读取、修改、测试或评审 `lpp_pc_client/**`，必须先阅读：

1. `lpp_pc_client/AGENTS.md`
2. `lpp_pc_client/docs/refactor/README.md`

如果任务涉及架构、重构、公共能力、Electron、安全、性能或工程门禁，还必须继续阅读：

1. `lpp_pc_client/docs/refactor/PC端核心架构技术方案.md`
2. `lpp_pc_client/docs/refactor/PC端重构任务矩阵.md`
3. 当前任务所属阶段或计划文档。

## 执行原则

1. 不跨端复用未经确认的实现细节。
2. 不把 PC 端重构规则套到移动端，除非移动端文档也采纳。
3. 跨端公共合同优先查看 `docs/api-contracts`。
4. 如果任务范围不清，先用文件路径判断应该进入哪个子项目入口。
