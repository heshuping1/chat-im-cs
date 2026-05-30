# P8-EL-003C Main IPC Payload Validation

日期：2026-05-29

## 变更

`handleDesktopIpc` 在 main handler 执行前调用：

```ts
validateDesktopApiCall(method, args)
```

这让 `desktopApi` IPC 形成双层校验：

1. preload：renderer 进入 IPC 前校验。
2. main：实际高权限动作执行前再次校验。

## 测试

`tests/unit/desktop-api-validation.spec.ts` 新增 channel 白名单唯一性测试。

## 后续

- 动态截图 channel 与截图窗口 `nodeIntegration` 进入 P8-EL-004。
- 文件路径权限、缓存目录策略进入 P8-EL-005。
