[**changelog v1.0.0**](../README.md)

***

[changelog](../README.md) / getTotalChangelogMarkdown

# Function: getTotalChangelogMarkdown()

> **getTotalChangelogMarkdown**(`options?`, `showProgress?`): `Promise`\<`string`\>

Defined in: index.ts:45

根据所有 Git 标签区间，生成完整的 changelog Markdown 文本

## Parameters

### options?

`Partial`\<[`ChangelogOption`](../interfaces/ChangelogOption.md)\>

changelog 配置项（部分字段可覆盖默认配置）

### showProgress?

`boolean` = `true`

是否显示进度条（默认显示）

## Returns

`Promise`\<`string`\>

拼接好的完整 changelog 文本
