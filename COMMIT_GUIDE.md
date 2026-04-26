# 项目提交规范指南

## 提交方式

### 方式一：使用交互式工具提交（推荐）

```bash
pnpm commit:zh
```

`sa git-commit -l=zh-cn` 是一个**交互式命令**，会弹出选择框引导你：

1. 选择 commit type（feat、fix、refactor、style 等）
2. 选择影响范围（scope）
3. 输入提交描述
4. 自动生成符合 Conventional Commits 规范的提交信息

**注意**：此命令需要终端支持交互式输入，无法在 CI/CD 或非交互环境中使用。

### 方式二：手动提交（适用于自动化场景）

```bash
git add <files>
git commit -m "type(scope): description"
```

提交信息必须符合 Conventional Commits 规范：`type(scope): description`

## 可用的提交脚本

| 命令                  | 说明                     | 交互模式           |
| --------------------- | ------------------------ | ------------------ |
| `pnpm commit:zh`      | 中文交互式提交           | 交互式（需要终端） |
| `pnpm commit`         | 英文交互式提交           | 交互式（需要终端） |
| `git commit -m "..."` | 手动提交（符合规范即可） | 非交互式           |

## sa CLI 工具功能范围

`sa`（soybean-admin CLI）提供的全部命令：

| 命令                   | 说明                                               |
| ---------------------- | -------------------------------------------------- |
| `sa git-commit`        | 交互式生成 git commit（Conventional Commits 规范） |
| `sa git-commit-verify` | 校验 commit 消息格式                               |
| `sa cleanup`           | 删除 node_modules、dist 等目录                     |
| `sa update-pkg`        | 更新依赖版本                                       |
| `sa changelog`         | 生成 changelog                                     |
| `sa release`           | 发布版本（更新版本号、生成 changelog、提交代码）   |
| `sa gen-route`         | 自动生成路由文件                                   |

使用 `-l=zh-cn` 参数可切换为中文界面，如 `sa git-commit -l=zh-cn`。

## Git Hooks 自动校验

项目使用 `simple-git-hooks` 配置了两个 hook：

### pre-commit 钩子

自动运行 `pnpm lint:format`：

- `prettier --write .` — 格式化所有文件
- `eslint . --fix --ext .ts,.tsx,.js,.jsx,.vue` — 修复代码规范问题

### commit-msg 钘子

自动运行 `pnpm sa git-commit-verify` — 校验提交信息是否符合 Conventional Commits 规范。

## 按功能分批提交

当改动涉及多个功能模块时，应按功能分组提交，避免一次提交大量文件：

```bash
# 示例：先提交配置变更
git add eslint.config.js
git commit -m "chore(eslint): 更新 ESLint 配置"

# 再提交 bug 修复
git add src/views/utils/index.vue
git commit -m "fix(utils): 修复文档加载路径问题"

# 再提交 ESLint 修复
git add src/components/flow/
git commit -m "fix(flow): 修复 ESLint 错误"
```

## Conventional Commits 类型

| 类型     | 说明                         |
| -------- | ---------------------------- |
| feat     | 新功能                       |
| fix      | Bug 修复                     |
| docs     | 文档变更                     |
| style    | 格式化（不影响代码逻辑）     |
| refactor | 重构（不是新功能也不是修复） |
| perf     | 性能优化                     |
| optimize | 代码质量优化                 |
| test     | 测试相关                     |
| build    | 构建相关                     |
| ci       | CI/CD 相关                   |
| chore    | 杂项（不影响代码）           |
| revert   | 回滚提交                     |

## 错误处理

- 如果 pre-commit hook 校验失败，修复问题后重新暂存和提交
- 如果 commit-msg hook 校验失败，修改提交信息格式后重新提交
- 校验信息会显示具体错误文件和行号

## 注意事项

- 提交信息格式: `type(scope): description`
- 每次提交都会触发 `lint:format` 全量扫描，耗时约 2 分钟
- 尽量按功能模块分批提交，减少单次提交的文件数量
- 不要提交 `.env`、credentials 等敏感文件
