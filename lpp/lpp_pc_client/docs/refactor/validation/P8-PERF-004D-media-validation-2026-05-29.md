# P8-PERF-004D Media Validation

日期：2026-05-29

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `vitest run tests/unit/media-performance-policy.spec.ts tests/unit/image-precache.spec.ts tests/unit/video-poster-runtime.spec.ts tests/unit/media-message.spec.ts` | 通过 | 验证视频 preload 策略、图片预取候选、poster 规则和媒体消息模型。 |
| `tsc --noEmit --pretty false --skipLibCheck` | 通过 | renderer/shared 类型检查。 |
| `tsc -p tsconfig.electron.json --noEmit --pretty false` | 通过 | Electron 类型检查。 |

## 遗留风险

1. 图片预取仍是任务级 fire-and-forget，后续可补并发队列和取消能力。
2. 客服消息媒体区需要跟普通 IM 共用同一策略持续检查。
