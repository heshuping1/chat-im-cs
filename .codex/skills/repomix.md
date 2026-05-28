---
name: repomix
scope: project-local
---

# Repomix Usage

用途：当需要跨大量文件理解项目结构，而普通 `rg` 和聚焦读取不足时，才考虑生成项目上下文包。

LPP 项目默认不使用整仓打包。优先顺序：

1. 使用 `rg` 搜索符号、接口、页面、Provider、datasource。
2. 阅读少量关键文件。
3. 只在跨模块关系复杂、上下文不足、用户明确同意时，再使用 repomix 类工具。

使用约束：

- 不把敏感 token、账号、接口返回完整泄露到外部服务。
- 不用 repo pack 替代阅读项目规则和 API contract。
- 生成内容只作为理解辅助，最终仍以源码和项目文档为准。
