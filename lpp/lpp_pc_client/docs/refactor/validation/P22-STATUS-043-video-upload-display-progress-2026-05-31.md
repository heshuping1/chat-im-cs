# P22-STATUS-043 Video Upload Display Progress Ticker 验证记录

## 背景

视频上传链路有时只收到 0 和完成态，消息卡片里的上传圆环看起来会从 0 直接跳到完成。问题不是上传必须变慢，而是浏览器/XHR progress 事件可能稀疏，专业 IM 需要在缺少连续事件时仍给用户稳定、可解释的过程反馈。

## 风险边界

- 涉及：renderer 上传展示模型、IM/客服媒体发送控制器、视频卡片上传进度来源、单测和文档。
- 不涉及：API DTO、React Query query key、Gateway event、Electron IPC/preload/main、Zustand persist key、新依赖、技术替换、删除旧链路或扩大公共抽象。

## 改动摘要

- `uploadState` 新增视频上传 display progress ticker：每 150ms 根据阶段时钟推进展示进度；真实 XHR progress 有值时与本地时钟取较大值，并受阶段上限约束。
- 视频 `uploading_media` 展示进度封顶 78，其中无真实进度时本地时钟最多推进到 72；`uploading_poster` 进入 78-88；`sending` 固定 95；服务端确认后 overlay 退出，不显示 100% 上传圆环。
- IM 与客服发送控制器在视频上传开始时启动 ticker，真实 progress 继续进入 diagnostics；进度 callback 只更新本地展示进度，不污染发送 payload。
- 发送中不再 patch `uploadProgress: 100`，改为 95，避免服务端确认前出现“已经完成”的误导。
- 视频上传中央控件增加微型百分比文本，和确定圆弧使用同一个 display progress；它不是上传中文字 pill，成功前不会显示 100%，用于让稀疏 progress 场景的过程反馈可被用户明确感知。
- 路由表补充规则：本地 display ticker 只驱动 UI，不能拖慢真实上传、不能污染发送 payload。

## 验证

- TDD 红灯：新增 `upload-state.spec.ts` 与 `media-message.spec.ts` 断言后，旧实现按预期失败，表现为缺少 ticker helper、视频 raw 100 仍按旧模型映射、IM/客服控制器仍写 `uploadProgress: 100`。
- `npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts`：通过，2 files / 25 tests passed。
- `npx vitest run tests/unit/upload-state.spec.ts tests/unit/media-message.spec.ts tests/unit/send-outbox.spec.ts`：通过，3 files / 30 tests passed。
- `npm run check:quick`：通过。
- `npm run docs:check`：通过。
- `git diff --check`：通过。

## 手工验收提示

- 上传 2 秒左右完成的视频时，圆环应从 0 开始有可见推进，不再静止到完成态。
- 如果浏览器只回调一次 100% progress，视频上传阶段也只能显示到阶段上限，不直接显示 100。
- 上传完成并进入发送 API 等待时最多显示 95；服务端确认后 overlay 退出，卡片变为可播放。
- 暂停、失败或取消后进度冻结；重试后重新进入可推进状态。
