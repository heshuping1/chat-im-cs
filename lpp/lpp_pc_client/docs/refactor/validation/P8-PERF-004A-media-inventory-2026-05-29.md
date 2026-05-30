# P8-PERF-004A Media Inventory

日期：2026-05-29

## 盘点结论

- 图片预取已有 `selectImagePrecacheCandidates`，最多选最近 24 个图片候选，避免全量预取。
- 图片和头像 object URL 已有 revoke 逻辑。
- 视频预览组件原 `preload="auto"`，长消息列表中多个视频会提前占用网络和内存。
- 视频 poster 生成结果缓存在 `videoPosterCache`，原实现没有条目上限。

## 约束

- 不替换现有媒体组件。
- 不引入新图片/视频处理库。
- 优先修正预加载策略和内存缓存上限，后续再做更完整的缩略图队列和并发控制。
