# P4-MSG-006A Message ViewModel Validation

日期：2026-05-29

## 变更

新增消息展示 ViewModel：

- `src/renderer/data/message/message-view-model.ts`
- `tests/unit/message-view-model.spec.ts`

覆盖字段：

- sender：名称、头像、fallbackInitial、mine。
- bubble：ownership class、reply quote。
- content：消息类型、preview、translation。
- status：delivery、statusText、timeText。
- actions：context menu、upload action task id。

## 技术判断

不新增依赖，不替换技术。复用已有 `message-domain` 的 delivery normalizer 和 `im-message-normalize` 的 type/preview 规则，避免重新造解析器。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-view-model.spec.ts
```

结果：通过，2 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。Message ViewModel 是纯展示模型，问题可通过单测和 DTO/ViewModel 输入输出定位；发送状态和 Gateway/API 问题仍走对应底层诊断日志。

## 遗留风险

当前只是第一版薄 ViewModel，消息操作权限、撤回/收藏/转发动作矩阵仍在页面侧，后续 P5/P6 页面瘦身继续下沉。
