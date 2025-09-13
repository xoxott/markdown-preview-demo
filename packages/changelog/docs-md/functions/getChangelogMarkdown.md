[**changelog v1.0.0**](../README.md)

***

[changelog](../README.md) / getChangelogMarkdown

# Function: getChangelogMarkdown()

> **getChangelogMarkdown**(`options?`, `showTitle?`): `Promise`\<\{ `commits`: `GitCommit`[]; `markdown`: `string`; `options`: [`ChangelogOption`](../interfaces/ChangelogOption.md); \}\>

Defined in: index.ts:18

根据两个 Git 标签（或提交区间）生成对应的 changelog Markdown 文本

## Parameters

### options?

`Partial`\<[`ChangelogOption`](../interfaces/ChangelogOption.md)\>

changelog 配置项（部分字段可覆盖默认配置）

### showTitle?

`boolean` = `true`

是否在生成的 markdown 中包含标题

## Returns

`Promise`\<\{ `commits`: `GitCommit`[]; `markdown`: `string`; `options`: [`ChangelogOption`](../interfaces/ChangelogOption.md); \}\>

包含以下内容的对象：
- `markdown`: 生成的 changelog 文本
- `commits`: 提交记录列表
- `options`: 最终合并的配置项
