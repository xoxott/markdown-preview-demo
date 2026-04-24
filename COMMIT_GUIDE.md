# 项目提交规范指南

## 提交流程（必须严格遵守）

### 第一步：暂存文件

```bash
git add .
```

### 第二步：运行代码校验（模拟提交钩子行为）

```bash
pnpm run lint:format
```

此命令会执行：

- `prettier --write .` - 格式化所有文件
- `eslint . --fix --ext .ts,.tsx,.js,.jsx,.vue` - 修复代码规范问题

### 第三步：直接提交（绕过交互式工具）

```bash
git commit -m "commit message"
```

### 校验机制说明

项目使用 Git Hooks 进行自动化校验：

- **pre-commit 钩子**: 自动运行 `pnpm lint:format`（格式化+修复）
- **commit-msg 钩子**: 自动运行 `pnpm sa git-commit-verify`（验证提交信息格式）

### 错误处理

- 如果校验失败，修复问题后重新暂存和提交
- 校验信息会显示具体错误文件和行号
- 提交信息必须符合 conventional commits 规范

### 注意事项

- 提交信息格式: `type(scope): description`，如 `fix(utils): 修复 storage.ts 的 window 引用问题`
- 类型可选值: feat, fix, docs, style, refactor, perf, optimize, test, build, ci, chore, revert 等
- 保持代码质量和规范一致性
