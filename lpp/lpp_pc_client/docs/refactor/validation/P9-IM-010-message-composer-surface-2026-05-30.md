# P9-IM-010 message composer surface 验证记录

日期：2026-05-30

## 目标

- 将 `MessageCenter.tsx` 内的输入区 presentation 配置抽到消息模块。
- 保留草稿、富文本 editor state、群 mention、截图快捷键、翻译和媒体发送行为。

## 变更

- 新增 `src/renderer/messages/components/MessageComposerSurface.tsx`。
- `MessageCenter.tsx` 改为传入会话态、草稿态和发送命令，不再直接拼 composer 工具栏。
- `MessageCenter.tsx` 行数从 2437 降到 2382。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-composer-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，2 个测试文件，8 个测试用例。

## 诊断日志

- 本次为 presentation 抽离，不新增运行时日志。
- 发送、上传、失败重试仍沿用既有 message center/send-state-machine 诊断链路。

## 结论

P9-IM-010 已完成。输入区外壳已从 `MessageCenter` 抽离，后续新增 composer 工具或调整输入区展示应优先修改 `MessageComposerSurface`。
