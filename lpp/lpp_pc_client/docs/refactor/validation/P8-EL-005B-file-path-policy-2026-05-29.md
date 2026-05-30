# P8-EL-005B File Path Policy

日期：2026-05-29

## 变更

`src/main/media-storage.ts` 新增：

- `assertAllowedLocalMediaFilePath`

应用位置：

- `ensureLocalMediaFile` 处理 `file:` URL 时校验。
- `ensureLocalMediaFile` 处理本地绝对路径时校验。
- `main.ts` 的 `openFile` 校验。
- `main.ts` 的 `copyFilePath` 校验。

## 允许范围

允许路径必须位于：

```text
app.getPath('userData')
```

这覆盖本应用生成的媒体缓存、poster 缓存和安全 auth 文件所在根目录，但阻止 renderer 直接打开/复制用户任意本地文件路径。

## 后续

- 临时文件清理策略仍需 P8 后续任务继续细化。
- 远程下载域名白名单需要结合后端资源域名配置，不在本轮硬编码。
