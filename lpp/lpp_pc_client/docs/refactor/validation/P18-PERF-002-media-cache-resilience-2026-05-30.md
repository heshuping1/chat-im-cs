# P18-PERF-002 Media Cache Resilience 验证记录

日期：2026-05-30

范围：媒体缓存和本地下载生命周期稳定性。

## 修改范围

1. `FileMessageContent` 的远程文件 fallback 下载改为 5 秒后释放 object URL，避免点击下载后立即 revoke。
2. 图片 cache/open/status 能力统一通过消息 runtime owner 读取当前 desktopApi。
3. 既有媒体 domain、message view model、media policy 测试继续覆盖媒体降级路径。

## 验证结果

1. `npx vitest run tests/unit/message-domain.spec.ts tests/unit/message-center-view-model.spec.ts`：通过。
2. `npm run check:quick`：通过。

## 遗留风险

Windows 文件打开、保存和 reveal 行为仍需实机验证。
