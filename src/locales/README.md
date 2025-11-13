# 国际化配置说明

## 目录结构

```
src/locales/
├── langs/           # TypeScript 格式的语言文件（源文件）
│   ├── zh-cn.ts    # 中文简体
│   └── en-us.ts    # 英文
├── langs-json/      # JSON 格式的语言文件（自动生成，用于 i18n Ally）
│   ├── zh-CN.json
│   └── en-US.json
├── index.ts         # i18n 配置入口
├── locale.ts        # 语言映射
└── README.md        # 本文件
```

## 工作流程

### 1. 编辑语言文件

直接编辑 `langs/` 目录下的 TypeScript 文件：
- `zh-cn.ts` - 中文翻译
- `en-us.ts` - 英文翻译

### 2. 转换为 JSON（用于 i18n Ally）

编辑完成后，运行以下命令将 TypeScript 文件转换为 JSON 格式：

```bash
pnpm i18n:convert
```

或者：

```bash
node convert-locales.mjs
```

这会自动更新 `langs-json/` 目录下的 JSON 文件。

### 3. i18n Ally 配置

i18n Ally 插件已配置为读取 `langs-json/` 目录下的 JSON 文件，这样可以在编辑器中：
- 实时查看翻译内容
- 鼠标悬停显示所有语言的翻译
- 自动补全翻译键
- 检测缺失的翻译

## 注意事项

1. **不要直接编辑** `langs-json/` 目录下的文件，它们是自动生成的
2. 每次修改 `langs/` 下的 TypeScript 文件后，记得运行 `pnpm i18n:convert`
3. `langs-json/` 目录已添加到 `.gitignore`，不会提交到版本控制

## 使用示例

在 Vue 组件中使用：

```vue
<template>
  <div>
    {{ $t('common.confirm') }}
  </div>
</template>

<script setup>
import { $t } from '@/locales';

const message = $t('page.login.common.loginSuccess');
</script>
```

## 为什么需要 JSON 文件？

i18n Ally 插件对 JSON 格式的支持最好，而项目使用 TypeScript 格式是为了：
- 类型安全
- 更好的代码提示
- 统一的代码风格

因此我们维护两份格式：
- TypeScript 作为源文件（手动编辑）
- JSON 作为辅助文件（自动生成，供 i18n Ally 使用）

