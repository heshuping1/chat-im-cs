# P5-IM-004C Composer Send Tests And Diagnostics

日期：2026-05-29

## 覆盖范围

测试文件：

- `tests/unit/send-queue.spec.ts`
- `tests/unit/send-state-machine.spec.ts`
- `tests/unit/message-center-diagnostics.spec.ts`

覆盖：

- 空 composer send 不触发任何发送回调。
- 文本与附件按可见顺序发送。
- 单个 part 失败后继续发送后续 part，并上报失败。
- 上传/暂停/恢复/发送成功状态迁移。
- 非法状态迁移不改变当前状态。
- 页面命令诊断脱敏。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/send-queue.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/message-center-diagnostics.spec.ts
```

结果：通过，8 tests。

## 诊断日志

现有诊断：

- `P4-MSG-005C`：IM local echo、upload、send success/fail、upload action。
- `P5-IM-001E`：Composer 触发的 command entry，例如 `send_text`、`send_media`。

敏感信息：

- 不记录发送正文，只记录长度。
- 不记录本地文件路径，只记录 kind/mimeType/sizeBytes。

## 遗留风险

当前仍是 unit 层覆盖。Composer DOM 交互、截图快捷键和真实上传进度建议在后续 browser smoke/E2E 中补。
