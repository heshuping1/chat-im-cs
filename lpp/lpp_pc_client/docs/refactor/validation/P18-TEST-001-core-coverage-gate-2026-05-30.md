# P18-TEST-001 Core Coverage Gate 验证记录

日期：2026-05-30

范围：核心测试门槛提升。

## 修改范围

`npm run test:coverage:core` 阈值从：

```text
lines 60 / functions 55 / branches 45 / statements 60
```

提升到：

```text
lines 65 / functions 70 / branches 55 / statements 63
```

## 验证结果

`npm run test:coverage:core`：通过，61 个测试文件、273 个测试通过。

当前覆盖率：

```text
Statements 64.08%
Branches   55.73%
Functions  72.10%
Lines      67.40%
```

## 遗留风险

下一轮提升应优先补 Gateway side-effects、message cache mutation、group avatar model 等低覆盖 owner，不再继续单纯提高数字。
