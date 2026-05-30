# P5-IM-005B Context Menu Action Map

日期：2026-05-29

## 变更

已完成：

- 新增/完善 `src/renderer/messages/models/messageContextMenuModel.ts`。
- 将 `MessageContextAction`、`MessageContextMenuState` 放到 feature model，避免 command model 依赖菜单 UI 组件。
- 新增 `getMessageContextActionAvailability`，集中维护复制、转发、收藏、撤回、媒体打开等 action 的显示/可用规则。
- `ChatContextMenus.tsx` 只根据 action availability 渲染按钮，不再直接散落业务判断。
- `MessageCenter.tsx` 使用 `createMessageContextMenuState` 生成菜单状态，并移除本地重复的菜单判定 helper。
- `useMessageCenterCommandModel.ts` 改为从 model 引入 `MessageContextAction`。

## 关键规则

| 规则 | 落点 | 说明 |
| --- | --- | --- |
| 服务端可用 | `isServerUsableMessage` | 排除 `pc-local-*`、sending、failed、local、recalled、`isRecalled`。 |
| 撤回 | `createMessageContextMenuState` | 自己发送、服务端可用、默认 2 分钟内。 |
| 视频文件动作 | `getMessageContextActionAvailability` | 视频未缓存时隐藏复制、打开、另存为、在文件夹中显示。 |
| 文本动作 | `isTextLikeMessage` | 复用文本提取规则，避免空文本消息显示复制/翻译。 |
| 媒体分类 | `isImageMessage` / `isVideoMessage` | 复用 media domain 的 `chatMediaItemsFromMessage`。 |

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-context-menu-model.spec.ts tests/unit/message-list-model.spec.ts tests/unit/message-center-diagnostics.spec.ts
```

结果：通过，3 files / 10 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 遗留风险

`handleMenuAction` 的执行实现仍在 `MessageCenter.tsx`。本轮完成 action map 和权限判断收敛；后续可继续抽 `messageActionUseCase`，但需要保持 desktop media runtime 与 mutation 行为不变。
