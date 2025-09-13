[**changelog v1.0.0**](../README.md)

***

[changelog](../README.md) / generateChangelog

# Function: generateChangelog()

> **generateChangelog**(`options?`): `Promise`\<`void`\>

Defined in: index.ts:94

根据两个 Git 标签区间，生成 changelog 文件（如 `CHANGELOG.md`）

## Parameters

### options?

`Partial`\<[`ChangelogOption`](../interfaces/ChangelogOption.md)\>

changelog 配置项（部分字段可覆盖默认配置）

## Returns

`Promise`\<`void`\>

## Description

- 如果目标 changelog 文件中已存在该版本的内容，且未开启 `regenerate`，则不会重复生成。
- 否则会写入或覆盖 changelog。
