# P19-ROUTE-001 AI File Routing Validation

日期：2026-05-30

任务：P19-ROUTE-001

## 修改范围

- 新增 `docs/refactor/PC端AI文件路由表.md`。
- 按普通 IM、在线客服、Gateway、媒体、Electron、CSS、设置等场景记录先读入口、再读文件、禁止边界和验证命令。

## 边界确认

- 路由表只约束读取和修改路径，不改变运行时代码边界。
- 不新增依赖，不替换技术栈。

## 验证命令

```bash
npx vitest run tests/unit/architecture-boundaries.spec.ts
npm run docs:check
```

## 结果

通过。`architecture-boundaries` 已校验 AI 路由表存在并包含普通 IM、在线客服、Gateway、Electron 和 CSS 场景；`docs:check` 通过。
