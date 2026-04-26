# 项目提交流程

## 方式一：使用交互式脚本提交（推荐）

### 第一步：暂存文件

按功能模块分批暂存，不要一次 `git add .`：

```bash
# 按功能暂存，例如只暂存组件修改
git add src/components/flow/
# 或暂存特定文件
git add src/views/utils/index.vue
```

### 第二步：运行交互式提交命令

```bash
pnpm commit:zh
```

### 第三步：交互选择提交类型

命令会弹出选择框，列出以下 14 种类型：

| 类型     | 说明                                          |
| -------- | --------------------------------------------- |
| feat     | 新功能                                        |
| feat-wip | 开发中的功能，比如某功能的部分代码            |
| fix      | 修复 Bug                                      |
| docs     | 只涉及文档更新                                |
| typo     | 代码或文档勘误，比如错误拼写                  |
| style    | 修改代码风格，不影响代码含义的变更            |
| refactor | 代码重构，既不修复 bug 也不添加功能的代码变更 |
| perf     | 可提高性能的代码更改                          |
| optimize | 优化代码质量的代码更改                        |
| test     | 添加缺失的测试或更正现有测试                  |
| build    | 影响构建系统或外部依赖项的更改                |
| ci       | 对 CI 配置文件和脚本的更改                    |
| chore    | 没有修改 src 或测试文件的其他变更             |
| revert   | 还原先前的提交                                |

用方向键选择，回车确认。

### 第四步：交互选择提交范围

选择提交类型后，命令会弹出第二个选择框，列出以下 10 种范围：

| 范围       | 说明           |
| ---------- | -------------- |
| projects   | 项目           |
| packages   | 包             |
| components | 组件           |
| hooks      | 钩子函数       |
| utils      | 工具函数       |
| types      | TS 类型声明    |
| styles     | 代码风格       |
| deps       | 项目依赖       |
| release    | 发布项目新版本 |
| other      | 其他的变更     |

用方向键选择，回车确认。

### 第五步：输入描述信息

选择范围后，命令会提示输入描述信息：

- 普通描述：直接输入，如 `修复 ESLint 错误`
- 破坏性改动：以 `!` 开头，如 `!重构 API 接口`

最终生成的提交信息格式：`类型(范围)!: 描述`（`!` 仅在破坏性改动时出现）

示例：

- `fix(components): 修复 ESLint 错误`
- `feat(hooks): 新增文件上传钩子`
- `refactor(packages)!: 重构请求模块架构`

### 第六步：等待 Git Hooks 自动校验

脚本内部实际执行的是 `git commit -m "提交信息"`，此时会自动触发 Git Hooks：

**1. pre-commit 钩子**（自动执行 `pnpm lint:format`）：

- `prettier --write .` — 格式化所有文件
- `eslint . --fix --ext .ts,.tsx,.js,.jsx,.vue` — 修复代码规范问题
- 耗时约 2 分钟（全量扫描）

**2. commit-msg 钩子**（自动执行 `pnpm sa git-commit-verify`）：

- 校验提交信息是否符合正则：`/[a-z]+(\(.+\))?!?: .+/`
- 格式不对则报错，提交失败

### 第七步：检查结果

- **成功**：提交完成，继续暂存下一批文件
- **pre-commit 失败**：查看 eslint/prettier 报错，修复问题后重新 `git add` + `pnpm commit:zh`
- **commit-msg 失败**：提交信息格式不对，重新运行 `pnpm commit:zh`

---

## 方式二：手动提交（适用于 CLI/自动化场景）

当无法使用交互式 `pnpm commit:zh` 时（如在 Claude Code CLI 中），可手动提交：

### 第一步：暂存文件

```bash
git add <具体文件或目录>
```

### 第二步：运行 lint:format（模拟 pre-commit 钩子）

```bash
pnpm lint:format
```

此命令会执行：

- `prettier --write .` — 格式化
- `eslint . --fix --ext .ts,.tsx,.js,.jsx,.vue` — 修复规范问题

### 第三步：重新暂存（lint:format 可能修改了文件）

```bash
git add <具体文件或目录>
```

### 第四步：手动提交（遵循 Conventional Commits 格式）

```bash
git commit -m "type(scope): description"
```

提交信息格式必须严格遵循：`类型(范围): 描述`

**类型必须是以下之一**：feat、feat-wip、fix、docs、typo、style、refactor、perf、optimize、test、build、ci、chore、revert

**范围必须是以下之一**：projects、packages、components、hooks、utils、types、styles、deps、release、other

示例：

```bash
git commit -m "fix(components): 修复 ESLint 错误"
git commit -m "feat(hooks): 新增文件上传钩子"
git commit -m "chore(deps): 更新依赖版本"
git commit -m "refactor(packages)!: 重构请求模块架构"
```

### 第五步：等待 Git Hooks

手动 `git commit` 同样会触发 pre-commit 和 commit-msg 钩子，校验流程与方式一完全一致。

---

## 重要规则

- **严禁使用 `--no-verify`** 绕过钩子校验
- **按功能分批提交**：不要一次 `git add .` 全量暂存
- **每次提交等待 lint:format 完成**：约 2 分钟，不要中断
- **lint:format 修改文件后必须重新 git add**：否则修改不会被包含在提交中
- **提交信息必须符合格式**：`类型(范围): 描述`，否则 commit-msg 钩子会拒绝
- **不要提交敏感文件**：`.env`、credentials、密钥等

## 完整流程对比

| 步骤         | 方式一（pnpm commit:zh） | 方式二（手动提交）      |
| ------------ | ------------------------ | ----------------------- |
| 暂存文件     | `git add <files>`        | `git add <files>`       |
| 运行格式化   | 自动（pre-commit hook）  | `pnpm lint:format` 手动 |
| 选择类型     | 交互式选择框             | 手动写在 `-m` 参数中    |
| 选择范围     | 交互式选择框             | 手动写在 `-m` 参数中    |
| 输入描述     | 交互式输入框             | 手动写在 `-m` 参数中    |
| 校验提交信息 | 自动（commit-msg hook）  | 自动（commit-msg hook） |
