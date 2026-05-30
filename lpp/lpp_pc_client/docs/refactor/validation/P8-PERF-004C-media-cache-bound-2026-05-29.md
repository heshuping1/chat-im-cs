# P8-PERF-004C Media Cache Bound

日期：2026-05-29

## 修改范围

- `videoPosterRuntime` 新增 `rememberVideoPoster`。
- `videoPosterCache` 最多保留 120 个条目，超出时按插入顺序淘汰最旧记录。

## 设计理由

- poster 可能是 data URL 或本地 file URL，长会话不断生成 poster 时不能无界增长。
- 120 个条目能覆盖普通会话最近视频预览，又不会长期占用过多内存。
- 缓存淘汰只影响 poster 快速命中，不影响视频消息本身展示。
