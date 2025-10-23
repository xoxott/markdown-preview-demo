[**changelog**](README.md)

***

[changelog](#/README.md) / markdown

## Functions

<a id="generatemarkdown"></a>

### generateMarkdown()

```ts
function generateMarkdown(params): string;
```

Defined in: [markdown.ts:188](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/markdown.ts#L188)

根据 commits 和配置信息生成完整 Markdown changelog

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | \{ `commits`: [`GitCommit`](#/types.md#gitcommit)[]; `options`: [`ChangelogOption`](#/types.md#changelogoption); `showTitle`: `boolean`; `contributors`: [`ResolvedAuthor`](#/types.md#resolvedauthor)[]; \} | - |
| `params.commits` | [`GitCommit`](#/types.md#gitcommit)[] | Git 提交数组 |
| `params.options` | [`ChangelogOption`](#/types.md#changelogoption) | Changelog 配置 |
| `params.showTitle` | `boolean` | 是否显示版本标题 |
| `params.contributors` | [`ResolvedAuthor`](#/types.md#resolvedauthor)[] | 贡献者列表 |

#### Returns

`string`

Markdown 字符串

***

<a id="isversioninmarkdown"></a>

### isVersionInMarkdown()

```ts
function isVersionInMarkdown(newVersion, mdPath): Promise<boolean>;
```

Defined in: [markdown.ts:253](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/markdown.ts#L253)

判断指定版本是否已经存在于 changelog Markdown 文件中

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `newVersion` | `string` | 新版本号 |
| `mdPath` | `string` | changelog 文件路径 |

#### Returns

`Promise`\<`boolean`\>

true 已存在，false 不存在

***

<a id="writemarkdown"></a>

### writeMarkdown()

```ts
function writeMarkdown(
   md, 
   mdPath, 
regenerate): Promise<void>;
```

Defined in: [markdown.ts:280](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/markdown.ts#L280)

写入或更新 changelog Markdown 文件

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `md` | `string` | `undefined` | 生成的 Markdown 内容 |
| `mdPath` | `string` | `undefined` | changelog 文件路径 |
| `regenerate` | `boolean` | `false` | 是否重新生成（覆盖原有内容） |

#### Returns

`Promise`\<`void`\>
