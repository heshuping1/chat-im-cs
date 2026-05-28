---
name: karpathy-guidelines
source: https://github.com/multica-ai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines
scope: project-local
---

# Karpathy Guidelines

用途：写代码、审查代码、重构代码时使用，降低 AI 编码中常见的过度设计、隐藏假设、大范围误改和缺少验证的问题。

## 1. Think Before Coding

编码前先想清楚。

- 不默默假设。
- 不隐藏困惑。
- 如果有多种理解，先说出来。
- 如果存在更简单方案，优先说明并选择简单方案。
- 如果需求不清楚，先指出不清楚的地方；高风险时先问。

## 2. Simplicity First

优先最小可行实现。

- 不做用户没有要求的功能。
- 不为一次性代码抽象新层。
- 不做臆想中的可配置、可扩展。
- 不为不可能发生的场景堆错误处理。
- 如果 200 行能写成 50 行，应回到更简单的实现。

## 3. Surgical Changes

只改必须改的地方。

- 不顺手优化无关代码、注释或格式。
- 不重构没有坏的代码。
- 匹配项目现有风格。
- 发现无关问题时可以说明，但不要擅自删除或重写。
- 只清理本次改动制造出来的未使用 import、变量、函数。

判断标准：每一行改动都应该能直接追溯到用户请求。

## 4. Goal-Driven Execution

用可验证目标驱动执行。

- “加校验”要落到可检查的无效输入场景。
- “修 bug”要能复现问题，并验证修复。
- “重构”要确认重构前后的行为没有变。
- 多步骤任务要有短计划，每一步最好对应一个检查方式。

示例：

```text
1. 明确入口和状态闭环 -> verify: 找到现有页面/Provider/API
2. 小范围实现 -> verify: dart analyze
3. 真机或构建验证 -> verify: flutter build apk --debug
```

强验收标准可以让任务闭环；“让它能用”这种弱标准需要先补清楚。
