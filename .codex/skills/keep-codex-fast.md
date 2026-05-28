---
name: keep-codex-fast
scope: project-local
---

# Keep Codex Fast Usage

用途：保持 Codex 在 LPP 项目中的响应速度和上下文质量。

执行规则：

- 优先 `rg` 精准搜索，不整仓读取。
- 优先读入口文件、调用链、API contract 和相关 Provider/datasource。
- 不把大段日志、整文件、整仓内容塞进上下文，除非任务必须。
- 长任务沉淀到 `docs/`，避免重复解释。
- 最终回复只汇报用户需要知道的结果、文件和验证。

适用场景：

- 项目很大、上下文很多。
- 用户连续追加需求。
- 需要在多个模块之间切换，但每次只处理一个清晰目标。
