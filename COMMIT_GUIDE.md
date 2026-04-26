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

## 提交类型（`pnpm commit:zh` 第一步选择）

| 类型       | 说明                                         |
| ---------- | -------------------------------------------- |
| feat       | 新功能                                       |
| feat-wip   | 开发中的功能，比如某功能的部分代码           |
| fix        | 修复 Bug                                     |
| docs       | 只涉及文档更新                               |
| typo       | 代码或文档勘误，比如错误拼写                 |
| style      | 修改代码风格，不影响代码含义的变更           |
| refactor   | 代码重构，既不修复 bug 也不添加功能的代码变更 |
| perf       | 可提高性能的代码更改                         |
| optimize   | 优化代码质量的代码更改                       |
| test       | 添加缺失的测试或更正现有测试                 |
| build      | 影响构建系统或外部依赖项的更改               |
| ci         | 对 CI 配置文件和脚本的更改                   |
| chore      | 没有修改 src 或测试文件的其他变更             |
| revert     | 还原先前的提交                               |

## 提交范围（`pnpm commit:zh` 第二步选择）

| 范围      | 说明         |
| --------- | ------------ |
| projects  | 项目         |
| packages  | 包           |
| components | 组件         |
| hooks     | 钩子函数     |
| utils     | 工具函数     |
| types     | TS 类型声明  |
| styles    | 代码风格     |
| deps      | 项目依赖     |
| release   | 发布项目新版本 |
| other     | 其他的变更   |

提交信息最终格式：`类型(范围): 描述`，例如 `fix(components): 修复 ESLint 错误`

## 错误处理

- 如果 pre-commit hook 校验失败，修复问题后重新暂存和提交
- 如果 commit-msg hook 校验失败，修改提交信息格式后重新提交
- 校验信息会显示具体错误文件和行号

## 注意事项

- 提交信息格式: `type(scope): description`
- 每次提交都会触发 `lint:format` 全量扫描，耗时约 2 分钟
- 尽量按功能模块分批提交，减少单次提交的文件数量
- 不要提交 `.env`、credentials 等敏感文件
