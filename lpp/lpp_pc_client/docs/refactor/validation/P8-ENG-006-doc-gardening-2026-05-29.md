# P8-ENG-006 Doc Gardening

日期：2026-05-29

## 修改范围

- 新增 `docs/refactor/文档巡检机制.md`。
- 新增 `scripts/report-refactor-doc-gaps.mjs`。
- 新增 `npm run docs:garden`。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run docs:garden` | 通过 | 先运行 `docs:check`，再输出巡检 signals。 |

## 本次巡检结果摘要

- `docs:check` 通过，硬性文档结构有效。
- 巡检报告显示 `PC端核心架构技术方案.md`、`PC端第一阶段重构详细方案.md`、任务矩阵和若干历史验证记录仍包含“后续/暂未/待开始”等线索。
- 这些线索不作为本轮失败项，作为后续 doc gardening 修复候选。

## 说明

本任务不自动修改巡检命中的文档，避免脚本误改设计语义；后续由 Codex 或工程师根据报告逐项确认。
