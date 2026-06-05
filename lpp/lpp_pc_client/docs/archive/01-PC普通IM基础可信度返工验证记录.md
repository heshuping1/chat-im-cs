# PC 普通 IM 基础可信度返工验证记录

日期：2026-05-27

范围：仅 PC 普通 IM。未修改 App、在线客服、主题系统。

## 返工目标

本轮只验证和修复 PC 普通 IM 的基础可信度，不新增功能：

- 自己发送的任何消息不能产生未读红点、未读筛选数量、新消息提示或提醒。
- 图片/文件发送必须先进入待发送附件区，发送成功后消息区可见，失败保留附件并提示。
- 未读/已读规则必须稳定：非当前会话别人消息加未读，当前会话别人消息直接已读，refetch 不自动清未读。

## 已修复前端兜底

- 会话列表、未读筛选、导航消息提醒统一使用 `effectiveConversationUnreadCount`。
- `isSelfLastMessage` 覆盖 `senderUserId`、`senderId`、`fromUserId`、`senderPlatformUserId`、`platformUserId`、`senderLppId`、`lppId`、嵌套 sender/from/author/user、`isSelf`、`isMine`、`direction: "out"` 等字段。
- Gateway 收到自己消息时不增加 unread，不推提醒，并按当前账号本地已读处理。
- 本机 local echo 发送 text/image/file 后同步更新会话最近消息，强制 `unreadCount: 0`。
- 如果服务端返回“最后一条是自己消息但 unreadCount > 0”，前端展示层强制按 0 处理，并已在 `docs/05-服务端支持.md` 记录服务端一致性缺口。

## 专项覆盖

### 自己消息未读

- pull/refetch：最后一条是自己 text，且服务端返回 `unreadCount > 0`，前端红点为 0。
- pull/refetch：最后一条是自己 image，且服务端返回 `unreadCount > 0`，前端红点为 0。
- push：自己 image 到非当前会话，不增加红点。
- push：别人 image 到非当前会话，正常增加红点。
- 当前打开会话发送图片后，不出现红点，不出现“↑↑ N 条新消息”。
- 未读筛选 tab 不展示由自己消息造成的假未读会话。

### 图片/文件发送

- 选择图片后显示“待发送 N 项”附件条。
- 图片可删除，可点击预览。
- 选择文件后显示文件名和大小，可删除。
- 点击发送后走 upload + send。
- 上传失败后附件保留，显示失败原因，可重新点击发送。
- 发送成功后附件清空，消息区展示图片/文件。
- 切换会话时待发送附件按会话隔离，避免 A 会话附件误发到 B 会话。

### 未读/已读

- 后台 pull/refetch 到非当前会话的别人消息，不自动 markRead，红点保留。
- 点击会话后 markRead，并显示“↑↑ N 条新消息”。
- 当前打开会话收到别人 push，直接 markRead，不显示红点。
- 自己消息不参与未读、新消息提示、消息提醒。

## 人工验证记录

- 截图场景复核：当前账号自己发送图片后，消息气泡显示为“我/已发送”，会话列表不应出现红点。
- 对应专项已覆盖：`Push自己图片`、`Pull自己图片`、当前会话发送 `paste-image.png` 后断言 `Jason` 会话无 `.e-avatar-unread` 且无“↑↑”新消息提示。
- 需要真实环境继续观察：服务端若仍返回 self lastMessage 携带 `unreadCount > 0`，前端已兜底，但服务端应按 `docs/05-服务端支持.md` 修正，避免多端状态不一致。

## 必跑命令

```bash
npm run typecheck
npx playwright test tests/browser/workspace-smoke.spec.ts -g "updates IM unread from both pull and push paths without reminder cards|PC ordinary IM closure verifies normalize, sending, and interactions" --workers=1
npx playwright test tests/browser/workspace-smoke.spec.ts -g "PC ordinary IM closure|PC ordinary IM stage two|PC ordinary IM stage three|PC ordinary IM stage four|updates IM unread|marks incoming messages" --workers=1
```

## 验收结论

只有以上命令通过，且人工复核“自己发送图片不出现红点”后，PC 普通 IM 才允许进入后续功能工作。
