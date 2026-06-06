# PC 端 AI 文件路由表

状态：有效

日期：2026-05-30

用途：让后续 AI 或工程师按场景读取必要文件，避免一开始打开过多大文件。若路由表与任务矩阵冲突，以 `PC端重构任务矩阵.md` 和当前任务清单为准。

## 1. 通用读取顺序

本路由表服务于 PC `AGENTS.md` 的 L1/L2 任务，目标是让 AI 和工程师按场景读取最小必要上下文。

1. 所有 PC 任务先读 `AGENTS.md`。
2. L0 任务到此为止，不要求读取 README、核心架构方案或任务矩阵。
3. L1 普通小改动读本路由表，按场景进入 owner 文件。
4. L2 架构/状态/协议/Gateway/Electron/性能任务先读 `PC端核心架构技术方案.md`，再按主题读取 `architecture/` 冷参考。
5. L3 复杂重构、跨 owner 或需要验证证据时，再读 `PC端重构任务矩阵.md`、相关计划和 `validation/`。

新会话默认原则：

1. 先按任务风险分级和场景读入口文件，不要一开始全量打开大文件。
2. 文件不要太大，也不要过碎；是否拆分由 owner、职责、上下文成本和测试定位决定，不由行数单独决定。
3. 如果一个需求需要同时理解 UI、DTO、cache、Gateway、Electron，先停下来画 owner 边界，再改代码。
4. 如果路由表没有覆盖当前场景，先补路由表或任务矩阵，再进入实现。
## 2. 场景路由

| 场景 | 先读入口 | 再读文件 | 禁止边界 | 验证命令 |
| --- | --- | --- | --- | --- |
| 普通 IM 页面装配 | `src/renderer/components/MessageCenter.tsx` | `src/renderer/messages/hooks/useMessageCenterViewModel.ts`、`src/renderer/messages/components/MessageCenterConversationStage.tsx`、`src/renderer/messages/components/MessageDialogsLayer.tsx` | 页面不得解释 raw DTO、不得写 cache、不得直接 desktopApi | `npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| IM 文本发送 | `src/renderer/messages/hooks/useMessageTextSendController.ts` | `src/renderer/messages/models/messageCacheMutationModel.ts`、`src/renderer/data/send/send-queue.ts`、`src/renderer/messages/models/messageConversationTypeModel.ts` | 不改变 query key、send queue 状态机、DTO wire shape | `npx vitest run tests/unit/send-queue.spec.ts tests/unit/message-cache-mutation-model.spec.ts` |
| IM 媒体发送 | `src/renderer/messages/hooks/useMessageMediaSendController.ts` | `src/renderer/media/runtime/videoPosterRuntime.ts`、`src/renderer/media/domain/mediaMessage.ts`、`src/renderer/media/runtime/uploadState.ts`、`src/renderer/messages/runtime/messageMediaDesktopActions.ts` | 组件不得直接调用 desktopApi；新增媒体类型先明确 owner；媒体成功态必须等待上传和发送 API 完整完成，禁止人为拖慢真实上传或污染发送 payload；XHR 无 `percent` 时必须用 `loaded/File.size` 兜底成确定进度；视频缺少连续 progress 事件时可使用 `uploadState` 本地 display ticker 只驱动本地 UI，上传中不得展示 100%；视频上传快慢判断必须写 send diagnostics 证据，不靠肉眼猜 | `npx vitest run tests/unit/media-message.spec.ts tests/unit/message-domain.spec.ts tests/unit/upload-state.spec.ts tests/unit/send-state-machine.spec.ts` |
| 消息内容展示 | `src/renderer/components/MessageBodyView.tsx` | `src/renderer/messages/components/message-content/MessageMediaParts.tsx`、`src/renderer/messages/components/message-content/FileMessageContent.tsx`、`src/renderer/media/components/FileMessageCard.tsx`、`src/renderer/media/components/VideoMessagePreview.tsx`、`src/renderer/components/MessageNonMediaParts.tsx` | 展示组件不得处理 API client、Gateway event、cache merge；图片不得渲染内部上传控件；视频上传/失败只保留封面内圆形控件，上传中/发送中不得显示文字 pill；视频确定进度必须由 `progressMode` 驱动，不能靠 `typeof progress` 退回旋转，视频上传路径不得再使用 `is-indeterminate` 或自旋动画；文件不得恢复底部进度条/暂停/取消，文件上传/失败状态必须由文件卡片右侧 icon 内控件和 meta 自承载；文件成功态必须显示 `ZIP/PDF/APK/FILE` 类型文字，上传/暂停/继续/重试控件必须居中，文件上传圆弧必须是 SVG 静态确定进度，缺进度停在 0%，不得使用默认自旋或灰色禁用态；文件来源必须从 app metadata/productName 显式传入，不能在 `FileMessageCard` 内硬编码具体程序名 | `npx vitest run tests/unit/message-domain.spec.ts tests/unit/media-message.spec.ts tests/unit/upload-state.spec.ts` |
| 消息状态与回执 | `src/renderer/data/message/message-status-model.ts` | `src/renderer/data/message/message-retry-model.ts`、`src/renderer/data/message/message-view-model.ts`、`src/renderer/components/ChatMessageBubble.tsx`、`src/renderer/messages/components/MessageListPanel.tsx`、`src/renderer/customer-service/components/ServiceMessageBubble.tsx`、`src/renderer/styles/messages/message-center.css` | 不新增群聊 read receipt 请求；失败/已读/重发规则不得写回页面组件；文本/图片使用气泡左侧状态位；视频和文件本地上传、暂停、失败、取消不走外侧状态位，分别由视频 overlay 和文件卡片承载；权限类失败不得把 403/FORBIDDEN/账号无权限直接展示给用户，真实原因只进 diagnostics | `npx vitest run tests/unit/message-status-model.spec.ts tests/unit/message-retry-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/message-failure-marker-style.spec.ts tests/unit/message-domain.spec.ts` |
| 消息刷新稳定性 | `src/renderer/messages/hooks/useActiveImConversationQueries.ts` | `src/renderer/data/message/message-domain.ts`、`src/renderer/messages/hooks/useMessageListData.ts`、`src/renderer/data/message-core.ts` | 不改变 React Query key；不要用高频轮询掩盖 Gateway/cache 问题；媒体展示稳定性在 model/query owner 处理 | `npx vitest run tests/unit/message-domain.spec.ts tests/unit/message-center-view-model.spec.ts` |
| 媒体本地物化 | `src/renderer/media/runtime/mediaMaterialization.ts` | `src/renderer/data/gateway/gateway-im-side-effects.ts`、`src/renderer/data/gateway/gateway-cs-side-effects.ts`、`src/renderer/messages/hooks/useMessageAuxiliaryData.ts`、`src/renderer/customer-service/hooks/useCustomerServiceThreadLifecycle.ts`、`src/renderer/messages/hooks/useMessageMediaSendController.ts`、`src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`、`src/main/media-storage.ts` | UI 组件不得作为图片/视频/文件落盘主入口；Gateway raw payload 必须先由 adapter/side-effect 归一化成 `MessageItemDto`；发送成功后的本地文件必须登记到同一物化索引；不新增 IPC，继续复用 `desktopApi.cacheMediaFile` | `npx vitest run tests/unit/media-materialization.spec.ts tests/unit/gateway-im-side-effects.spec.ts tests/unit/gateway-cs-side-effects.spec.ts tests/unit/media-storage.spec.ts tests/unit/architecture-boundaries.spec.ts` |
| 桌面视频打开 | `src/renderer/media/runtime/videoPlayer.ts` | `src/main/video-player-window.ts`、`src/main/video-player-template.ts`、`src/main/media-storage.ts` | 不改 `openVideoPlayer` IPC contract；播放器失败优先查缓存文件是否为 JSON/HTML 错误页、鉴权下载和 codec 支持；坏缓存必须重下，不能反复打开旧坏文件；模板文案不得用实体字符串写入 `textContent` | `npx vitest run tests/unit/video-player-runtime.spec.ts tests/unit/electron-template.spec.ts tests/unit/media-storage.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts` |
| 已读/未读 | `src/renderer/data/im-read-model.ts` | `src/renderer/data/im-read/im-read-service.ts`、`src/renderer/data/im-read/im-read-store.ts`、`src/renderer/messages/hooks/useDirectReadReceiptSync.ts` | 不改变已读 query key、旧 facade 删除需单独确认 | `npx vitest run tests/unit/im-read-service.spec.ts tests/unit/im-read-store.spec.ts` |
| Gateway 事件 | `src/renderer/components/GatewayBridge.tsx` | `src/renderer/data/gateway/gateway-event-router.ts`、`src/renderer/data/gateway/gateway-im-side-effects.ts`、`src/renderer/data/gateway/gateway-cs-side-effects.ts`、`src/renderer/data/gateway/gateway-event-adapter.ts` | raw event 必须 adapter 后进入 router/handler；不改 event 名称 | `npx vitest run tests/unit/gateway-event-adapter.spec.ts tests/unit/gateway-query-invalidation.spec.ts` |
| 在线客服工作台 | `src/renderer/components/ChatWorkspace.tsx` | `src/renderer/customer-service/hooks/useCustomerServiceWorkspaceController.ts`、`src/renderer/data/customer-service/cs-cache-adapter.ts`、`src/renderer/customer-service/models/cs-action-service.ts` | 组件不得直接合并 thread/message/queue cache | `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-thread-state.spec.ts tests/unit/cs-action-service.spec.ts` |
| 客服发送 | `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts` | `src/renderer/data/customer-service/cs-cache-adapter.ts`、`src/renderer/media/runtime/videoPosterMedia.ts`、`src/renderer/media/runtime/uploadState.ts`、`src/renderer/customer-service/models/cs-thread-state.ts` | 不改变接口返回结构、thread cache owner、队列状态规则；媒体成功态必须等待上传和发送 API 完整完成，禁止人为拖慢真实上传或污染发送 payload；XHR 无 `percent` 时必须用 `loaded/File.size` 兜底成确定进度；视频缺少连续 progress 事件时可使用 `uploadState` 本地 display ticker 只驱动本地 UI，上传中不得展示 100%；视频上传快慢判断必须写 send diagnostics 证据，不靠肉眼猜 | `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-action-service.spec.ts tests/unit/upload-state.spec.ts tests/unit/send-state-machine.spec.ts` |
| 联系人 | `src/renderer/components/ContactsPage.tsx` | `src/renderer/data/contact-directory.ts`、`src/renderer/data/contact-directory-permissions.ts`、`src/renderer/contacts/hooks/useContactsDirectoryController.ts`、`src/renderer/components/ContactDetailViews.tsx`、`src/renderer/components/ContactSidePanel.tsx` | 页面不得直接解释 API DTO 或新增头像 fallback；客户身份通讯录不得显示客户/组织入口，客服身份才展示客户画像与组织成员 | `npx vitest run tests/unit/contact-directory.spec.ts` |
| 客户信息 | `src/renderer/components/CustomerProfileWorkspace.tsx` | `src/renderer/components/CustomerProfileModel.ts`、`src/renderer/components/CustomerProfileActionRows.tsx`、`src/renderer/messages/hooks/useMessageContactProfileController.ts`、`src/renderer/messages/components/ConversationInfoPanel.tsx`、`src/renderer/customer-service/components/*Profile*` | 共用模型/UI，不在 workspace 内直接请求接口；普通 IM profile-card 失败降级展示，在线客服资料失败可提示；备注/标签以 profile-extra 和好友接口为准 | `npx vitest run tests/unit/customer-profile-workspace.spec.ts tests/unit/customer-profile-model.spec.ts tests/unit/message-lookup-ui.spec.ts` |
| 注册/登录 | `src/renderer/components/LoginPage.tsx` | `src/renderer/components/auth/AuthPageParts.tsx`、`src/renderer/data/auth/auth-flow-model.ts`、`src/renderer/data/api/auth-client.ts`、`src/renderer/data/api/types.ts`、`src/renderer/styles/account/auth.css`、`src/renderer/data/auth/auth-session.ts` | 可新增认证 API DTO；不得改变 `lpp.pc.authSession` persist key；不得绕过 `setAuthSession`；服务地址和 tenantId 只作为高级设置/测试兼容；注册成功必须复用登录与空间选择链路，不新增 Electron IPC、Gateway event 或 React Query key | `npx vitest run tests/unit/auth-api.spec.ts tests/unit/auth-flow-model.spec.ts tests/unit/auth-page.spec.ts tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts` |
| 名片消息与好友关系 | `src/renderer/components/MessageNonMediaParts.tsx` | `src/renderer/messages/models/contactCardModel.ts`、`src/renderer/messages/components/ConversationInfoViews.tsx`、`src/renderer/messages/components/MessageStartDialogs.tsx`、`src/renderer/data/api/contacts-client.ts`、`src/renderer/data/api/messages-client.ts` | 不改 Gateway event、不改 Electron IPC；发送 `contact_card` 必须按服务端 `body.contactCard` 合同；好友关系 query key 只新增或失效，不重命名旧 key；群成员查看禁用不得影响群头像、消息头像和 @ 数据 | `npx vitest run tests/unit/contact-card-model.spec.ts tests/unit/contact-card-api.spec.ts tests/unit/media-message.spec.ts tests/unit/message-list-model.spec.ts` |
| 消息页加好友与申请提醒 | `src/renderer/messages/components/MessageStartDialogs.tsx` | `src/renderer/components/ContactAddFriendDialog.tsx`、`src/renderer/contacts/hooks/useContactAddFriendController.ts`、`src/renderer/contacts/hooks/useFriendRequestReminderController.ts`、`src/renderer/contacts/models/friendRequestReminderModel.ts`、`src/renderer/components/ReminderCenter.tsx`、`src/renderer/components/Sidebar.tsx` | 好友申请提醒只消费 `pc-friend-requests` 查询 diff，不解析 Gateway payload；添加好友复用现有好友搜索/申请接口，不新增 IPC 或 persist key | `npx vitest run tests/unit/friend-request-reminder.spec.ts tests/unit/message-lookup-ui.spec.ts tests/unit/contact-directory.spec.ts` |
| 设置与诊断 | `src/renderer/components/MePage.tsx` | `src/renderer/settings/models/settingsCatalog.ts`、`src/renderer/settings/components/SettingsRows.tsx`、`src/renderer/settings/runtime/diagnosticsExport.ts`、`src/main/runtime-diagnostics.ts` | 设置页不得直接 IPC；内部 source/capability 只用于治理，普通 UI 不常驻展示同步/本机等标签；未支持能力不得伪装成可用 switch；diagnostics 必须脱敏 | `npx vitest run tests/unit/settings-catalog.spec.ts tests/unit/settings-diagnostics.spec.ts tests/unit/pc-settings.spec.ts` |
| Electron IPC/preload | `src/shared/desktop-api.ts` | `src/shared/desktop-api-validation.ts`、`src/preload/preload.cts`、`src/main/main.ts`、`src/main/screenshot-selection-window.ts` | 不新增无校验 IPC；renderer 能力不得扩大 | `npx vitest run tests/unit/desktop-api-validation.spec.ts tests/unit/electron-runtime-diagnostics.spec.ts` |
| 视频/截图模板 | `src/main/video-player-template.ts` | `src/main/video-player-window.ts`、`src/main/screenshot-selection-template.ts`、`tests/unit/electron-template.spec.ts` | 不改变 preload、IPC contract、URL 转义策略 | `npx vitest run tests/unit/electron-template.spec.ts` |
| CSS shell | `src/renderer/styles/shared/porcelain-shell.css` | `src/renderer/styles/app.css`、`src/renderer/styles/shared/*`、`src/renderer/styles/pages/*` | 不把 feature 深层样式写回 app.css；不跨 feature 覆盖 | `npm run p19:audit && npm run docs:check` |
| CSS 消息 | `src/renderer/styles/messages/message-center.css` | `src/renderer/styles/messages/message-shared.css`、`src/renderer/styles/messages/message-media-content.css`、`src/renderer/styles/messages/composer-shell.css` | 不把客服样式写进消息 owner；不新增深层不可删覆盖 | `npm run p19:audit && npm run check:quick` |

## 3. 修改前检查

每次开始代码治理时记录：

```text
任务编号：
文件 owner：
当前职责：
不负责：
稳定入口：
是否改变 API/query key/IPC/Gateway：
是否需要新增依赖：
对应测试：
```

若答案无法从本路由表定位，先补路由表或任务矩阵，再改代码。
