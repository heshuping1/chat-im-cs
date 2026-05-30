# P7-SHARED-004B Media Action Payload

日期：2026-05-29

## 结论

媒体 action payload 已通过 `media/domain/mediaMessage.ts` 收敛，当前无需新增抽象。

## 已满足项

- IM 和客服共用 `messageMediaActionPayload`。
- IM 和客服共用 `resolveMessageMediaUrl`。
- 文件名统一通过 `messageMediaFileName` 降级。
- 图片、视频、文件类型通过 `messageMediaKind` 派生。

## 本轮不改代码的原因

- 继续抽象会进入 Electron 文件动作和 IPC 边界，风险等级超过 P7。
- 当前已有测试覆盖，优先保留稳定公共能力。
- 后续 P8 处理 `desktopApi` typed boundary 时再统一 payload 校验。
