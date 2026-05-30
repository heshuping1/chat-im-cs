# P7-SHARED-004A Media Preview 盘点

日期：2026-05-29

## 已有公共能力

- `src/renderer/media/domain/mediaMessage.ts`
  - `chatMediaItemsFromMessage`
  - `messageMediaFileName`
  - `messageMediaKind`
  - `hasOpenableMessageMedia`
  - `resolveMessageMediaUrl`
  - `messageMediaActionPayload`
  - `messageVideoPlayerPayload`
- `src/renderer/components/MessageBodyView.tsx`
  - 统一图片、视频、文件、联系人卡片主体渲染。
- `src/renderer/media/components/*`
  - 图片 frame、视频 preview、文件 card 已拆分。

## 使用情况

- `MessageCenter.tsx` 已使用 `resolveMessageMediaUrl/messageMediaActionPayload/messageMediaFileName`。
- `ChatWorkspace.tsx` 已使用同一批 media domain helper。
- `tests/unit/media-message.spec.ts` 已覆盖 URL、文件名和 action payload。

## 风险边界

- `open/save/reveal/edit/copy` 最终会走 `desktopApi`，属于 Electron IPC 安全边界。
- P7 只确认前端 view payload 收敛，不修改 preload、IPC channel、文件系统策略。
- IPC 白名单、payload 校验进入 P8。
