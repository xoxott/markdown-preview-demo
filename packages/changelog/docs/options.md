[**changelog**](README.md)

***

[changelog](#/README.md) / options

## Functions

<a id="createoptions"></a>

### createOptions()

```ts
function createOptions(options?): Promise<ChangelogOption>;
```

Defined in: [options.ts:74](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/options.ts#L74)

创建完整的 Changelog 配置选项，包括 GitHub 仓库信息、Git 标签范围等

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | `Partial`\<[`ChangelogOption`](#/types.md#changelogoption)\> | 可选的自定义配置，会覆盖默认配置 |

#### Returns

`Promise`\<[`ChangelogOption`](#/types.md#changelogoption)\>

完整的 ChangelogOption 对象
