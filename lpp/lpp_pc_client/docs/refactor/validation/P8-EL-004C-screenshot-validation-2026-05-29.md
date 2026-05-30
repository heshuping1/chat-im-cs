# P8-EL-004C Screenshot Validation

日期：2026-05-29

## 验证

- `tsc -p tsconfig.electron.json --noEmit --pretty false`
- `tsc --noEmit --pretty false --skipLibCheck`
- `git diff --check -- src/main/main.ts src/preload/screenshot-selector-preload.cts`

## 残余风险

- 截图权限仍依赖系统屏幕录制权限。
- 截图编辑 HTML 仍是 main 中的长 inline HTML，后续如继续增长，应拆为独立 asset。
- 截图功能没有做端到端点击验证，本轮只做结构安全和类型验证。
