---
name: awesome-codex-skills
scope: project-local
---

# Awesome Codex Skills Usage

用途：作为查找和筛选 Codex skills 的能力入口，而不是默认全量安装清单。

LPP 项目使用方式：

- 当现有项目规则不足以覆盖任务时，先判断缺的是哪类能力。
- 优先使用当前 Codex 已有 skills 和本项目 `.codex/skills/*.md`。
- 确实需要外部 skill 时，先说明用途、安装位置和影响范围，再由用户确认。
- 项目专属能力优先写成 `.codex/skills/<name>.md`，不要直接污染全局 `~/.codex/skills`。

禁止：

- 因为清单存在就全量安装。
- 把不适合 LPP 的通用规则强行套进项目。
