[**changelog v1.0.0**](../README.md)

***

[changelog](../README.md) / generateTotalChangelog

# Function: generateTotalChangelog()

> **generateTotalChangelog**(`options?`, `showProgress?`): `Promise`\<`void`\>

Defined in: index.ts:117

根据所有 Git 标签区间，生成完整的 changelog 文件（覆盖写入）

## Parameters

### options?

`Partial`\<[`ChangelogOption`](../interfaces/ChangelogOption.md)\>

changelog 配置项（部分字段可覆盖默认配置）

### showProgress?

`boolean` = `true`

是否显示进度条（默认显示）

## Returns

`Promise`\<`void`\>

## Description

- 会生成包含所有版本记录的完整 changelog
- 结果会写入指定的输出文件（默认是 `CHANGELOG.md`）
- 与 `generateChangelog` 不同的是，该函数会强制覆盖写入所有版本内容
