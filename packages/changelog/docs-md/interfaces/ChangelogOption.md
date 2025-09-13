[**changelog v1.0.0**](../README.md)

***

[changelog](../README.md) / ChangelogOption

# Interface: ChangelogOption

Defined in: types.ts:64

生成 Changelog 的配置项

## Properties

### capitalize

> **capitalize**: `boolean`

Defined in: types.ts:91

是否将提交类型的首字母大写

***

### cwd

> **cwd**: `string`

Defined in: types.ts:70

项目的工作目录

#### Default

```ts
process.cwd()
```

***

### emoji

> **emoji**: `boolean`

Defined in: types.ts:98

是否在标题中使用 Emoji

#### Default

```ts
true
```

***

### from

> **from**: `string`

Defined in: types.ts:79

Changelog 的起始提交哈希或标签

***

### github

> **github**: `GithubConfig`

Defined in: types.ts:76

GitHub 相关配置

***

### output

> **output**: `string`

Defined in: types.ts:107

生成的 Changelog 输出文件路径

***

### prerelease?

> `optional` **prerelease**: `boolean`

Defined in: types.ts:118

是否将该版本标记为预发布（prerelease）

***

### regenerate

> **regenerate**: `boolean`

Defined in: types.ts:115

是否重新生成已有版本的 changelog

#### Example

```ts
当 v0.0.1 已存在 changelog 时，开启此选项会强制重新生成该版本内容
```

***

### tagDateMap

> **tagDateMap**: `Map`\<`string`, `string`\>

Defined in: types.ts:88

标签与发布日期的映射

***

### tags

> **tags**: `string`[]

Defined in: types.ts:85

仓库中所有的标签列表

***

### titles

> **titles**: `object`

Defined in: types.ts:101

标题配置

#### breakingChanges

> **breakingChanges**: `string`

破坏性变更（breaking change）部分的标题

***

### to

> **to**: `string`

Defined in: types.ts:82

Changelog 的结束提交哈希或标签

***

### types

> **types**: `Record`\<`string`, `string`\>

Defined in: types.ts:73

提交类型与对应标题的映射
