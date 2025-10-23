[**changelog**](README.md)

***

[changelog](#/README.md) / github

## Functions

<a id="hastagongithub"></a>

### hasTagOnGitHub()

```ts
function hasTagOnGitHub(
   tag, 
   repo, 
githubToken): Promise<boolean>;
```

Defined in: [github.ts:25](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/github.ts#L25)

检查指定 tag 是否已经存在于 GitHub 仓库中

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tag` | `string` | 标签名 |
| `repo` | `string` | 仓库全名（格式：owner/repo） |
| `githubToken` | `string` | GitHub Token |

#### Returns

`Promise`\<`boolean`\>

存在返回 true，否则返回 false

***

<a id="sendrelease"></a>

### sendRelease()

```ts
function sendRelease(options, content): Promise<void>;
```

Defined in: [github.ts:45](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/github.ts#L45)

创建或更新 GitHub Release

- 如果 release 已存在，则更新内容
- 如果 release 不存在，则新建

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`ChangelogOption`](#/types.md#changelogoption) | changelog 配置项，包含 GitHub 仓库信息、tag 等 |
| `content` | `string` | 生成的 changelog markdown 内容 |

#### Returns

`Promise`\<`void`\>

***

<a id="isreposhallow"></a>

### isRepoShallow()

```ts
function isRepoShallow(): Promise<boolean>;
```

Defined in: [github.ts:119](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/github.ts#L119)

判断当前仓库是否为浅克隆（shallow clone）

#### Returns

`Promise`\<`boolean`\>

若为浅克隆返回 true，否则 false
