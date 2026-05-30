# P9-PERF-001 CS thread windowing 验证记录

日期：2026-05-30

## 目标

- 复用 IM 长列表分段思路，降低客服会话池在长队列/长历史场景下的一次性渲染压力。
- 不引入虚拟列表依赖，不改变接口数据流。

## 变更

- 新增 `customer-service/models/threadListWindowing.ts`：
  - 默认渲染 120 条线程。
  - 每次展开增加 120 条。
  - 返回 `renderedThreads`、`hiddenAfterCount`、`windowed`、`totalCount`。
- `ThreadList.tsx` 接入分段窗口，筛选、搜索、当前/历史模式变化时重置展开数量。
- `app.css` 增加 `h-thread-more` 按钮样式。
- 新增 `thread-list-windowing.spec.ts`。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/thread-list-windowing.spec.ts tests/unit/message-list-windowing.spec.ts tests/unit/cs-workspace-view-model.spec.ts`
  - 结果：通过，3 个测试文件，11 个测试用例。

## 诊断日志

- 本次为渲染分段模型，不新增运行时日志字段。
- 后续 Windows 打包态采样时，应记录长队列数量、渲染窗口大小、展开次数和 P75/P95 响应时间。

## 结论

P9-PERF-001 已完成。客服线程列表已具备低成本分段渲染能力，剩余性能差距主要是 Windows 打包态 P75/P95 采样。
