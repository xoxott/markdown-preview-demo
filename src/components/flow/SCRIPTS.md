# 推荐的 package.json 脚本配置

为了更好地使用 Flow 组件的测试和性能基准功能，建议在项目的 `package.json` 中添加以下脚本：

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:flow": "vitest src/components/flow/__tests__",
    "bench": "vitest bench",
    "bench:flow": "vitest src/components/flow/__tests__/performance.bench.ts",
    "typecheck": "vue-tsc --noEmit --skipLibCheck"
  }
}
```

## 脚本说明

### 测试相关

- **`pnpm test`** - 运行所有测试
- **`pnpm test:ui`** - 启动测试 UI 界面
- **`pnpm test:coverage`** - 运行测试并生成覆盖率报告
- **`pnpm test:flow`** - 仅运行 Flow 组件的测试

### 性能基准测试

- **`pnpm bench`** - 运行所有性能基准测试
- **`pnpm bench:flow`** - 仅运行 Flow 组件的性能基准测试

### 类型检查

- **`pnpm typecheck`** - 运行 TypeScript 类型检查

## 使用示例

```bash
# 开发时运行测试（监听模式）
pnpm test

# 查看测试 UI
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage

# 运行性能基准测试
pnpm bench:flow

# 类型检查
pnpm typecheck
```

## CI/CD 集成

在 CI/CD 流程中建议运行：

```bash
# 1. 类型检查
pnpm typecheck

# 2. 运行测试并生成覆盖率
pnpm test:coverage

# 3. 运行性能基准测试（可选）
pnpm bench
```

## 覆盖率目标

- **单元测试覆盖率**: 80%+
- **关键路径覆盖率**: 100%

查看覆盖率报告：

```bash
pnpm test:coverage
# 报告位置: coverage/index.html
```

