# P9-API-001 API contract fixtures boundary 验证记录

日期：2026-05-30

## 目标

- 将 raw DTO 字段兼容集中在数据层 contract normalizer，不让页面/feature 层直接解释后端字段。
- 用 fixture 样本固化 IM + 客服核心 API 合同的 modern、snake_case、legacy alias、degraded、invalid 行为。

## 变更

- 新增 `tests/unit/api-contract-fixtures.ts`，覆盖：
  - IM 会话 modern direct DTO。
  - IM 会话 legacy group alias DTO。
  - IM 会话缺失 identity 阻断。
  - IM 消息 modern text DTO。
  - IM 消息 snake_case media DTO。
  - IM 消息缺失 id/seq 阻断。
  - 客服会话 queued temp session DTO。
  - 客服会话 legacy closed direct alias DTO。
  - 客户资料 display/risk/tags DTO。
  - 客服消息 fallback identity degraded DTO。
- 新增 `api-contract-fixtures.spec.ts` 统一跑 fixture 断言。
- `architecture-boundaries.spec.ts` 增加页面/feature 禁止直连 API contract normalizer 的结构测试。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/api-contract-fixtures.spec.ts tests/unit/architecture-boundaries.spec.ts tests/unit/im-conversation-contract.spec.ts tests/unit/im-message-contract.spec.ts tests/unit/cs-contract.spec.ts tests/unit/cs-message-contract.spec.ts`
  - 结果：通过，6 个测试文件，33 个测试用例。

## 诊断日志

- 本次为 API 合同门禁和 fixture 样本，不新增运行时日志字段。
- 运行时合同异常仍由既有 `contract-diagnostics` 记录。

## 结论

P9-API-001 已完成。API/Contract 从“已有 normalizer 但样本覆盖需补强”推进为可验证边界：新增接口变更必须补 fixture，页面/feature 不允许绕过数据层直接使用 contract normalizer。
