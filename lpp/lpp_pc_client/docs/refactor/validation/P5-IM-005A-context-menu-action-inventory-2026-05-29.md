# P5-IM-005A Context Menu Action Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/messages/components/ChatContextMenus.tsx`
- `src/renderer/messages/models/messageContextMenuModel.ts`

## 消息右键动作入口

| 动作 | 入口 | 当前执行 owner | 权限/显示条件 |
| --- | --- | --- | --- |
| `multi_select` | 消息右键菜单 | `MessageCenter.handleMenuAction` | 服务端可用消息 |
| `reply` | 消息右键菜单 | `MessageCenter.handleMenuAction` | 服务端可用消息 |
| `ai_reply` | 消息右键菜单 | `MessageCenter.handleMenuAction` | 文本消息 |
| `copy` | 消息右键菜单 | `MessageCenter.handleMenuAction` | 文本消息 |
| `copy_image` | 消息右键菜单 | `copyDesktopImage` | 图片媒体消息 |
| `copy_media` | 消息右键菜单 | `copyDesktopMediaFile` | 可复制的非图片媒体，视频需已缓存 |
| `open_media` | 消息右键菜单 | desktop media runtime / video player | 媒体消息，视频需已缓存 |
| `edit_media` | 消息右键菜单 | `editDesktopMediaFile` | 非视频媒体消息 |
| `translate` | 消息右键菜单 | `translateMutation` | 文本消息 |
| `voice_to_text` | 消息右键菜单 | `voiceToTextMutation` | 服务端可用语音消息 |
| `save_media_as` | 消息右键菜单 | `saveDesktopMediaAs` | 媒体消息，视频需已缓存 |
| `reveal_in_folder` | 消息右键菜单 | `revealDesktopMediaInFolder` | 媒体消息，视频需已缓存 |
| `forward` | 消息右键菜单 | `ForwardDialog` | 服务端可用消息 |
| `favorite` | 消息右键菜单 | `favoriteMutation` | 服务端可用消息 |
| `recall` | 消息右键菜单 | `recallMutation` | 自己发送、服务端可用、2 分钟内 |
| `delete` | 消息右键菜单 | `deleteMutation` | 始终允许本地删除入口 |

## 发现的问题

1. 右键菜单 JSX 原来直接组合 `hasMedia/isImage/isVideo/isText/serverUsable/recallable`，页面知道过多动作权限细节。
2. `MessageContextAction` 原来定义在 UI 组件里，command model 反向依赖 UI 组件类型，边界不理想。
3. 撤回条件、服务端可用条件、视频缓存条件需要可测试，否则容易出现“菜单可点但命令失败”的体验。

## 结论

本轮不改命令执行逻辑，不改变 Electron/desktop media runtime。先把动作类型、菜单状态和权限判断收敛到消息 feature model，保留页面作为临时执行 owner。
