[**changelog**](README.md)

***

[changelog](#/README.md) / git

## Functions

<a id="gettotalgittags"></a>

### getTotalGitTags()

```ts
function getTotalGitTags(): Promise<string[]>;
```

Defined in: [git.ts:14](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L14)

获取所有符合语义化版本的 git 标签，并进行排序

#### Returns

`Promise`\<`string`[]\>

按 semver 升序排序后的标签列表

***

<a id="gettagdatemap"></a>

### getTagDateMap()

```ts
function getTagDateMap(): Promise<Map<string, string>>;
```

Defined in: [git.ts:29](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L29)

获取每个 git tag 对应的日期映射表

#### Returns

`Promise`\<`Map`\<`string`, `string`\>\>

Map<标签名, 日期字符串(YYYY-MM-DD)>

***

<a id="getfromtotags"></a>

### getFromToTags()

```ts
function getFromToTags(tags): object[];
```

Defined in: [git.ts:64](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L64)

生成版本之间的 from-to 区间，用于生成 CHANGELOG 对比范围

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tags` | `string`[] | git 标签列表 |

#### Returns

`object`[]

版本区间对

***

<a id="getcurrentgitbranch"></a>

### getCurrentGitBranch()

```ts
function getCurrentGitBranch(): Promise<string>;
```

Defined in: [git.ts:110](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L110)

获取当前 Git 指针位置：若有 tag 返回 tag，否则返回分支名

#### Returns

`Promise`\<`string`\>

当前 tag 或分支名

***

<a id="getgithubrepo"></a>

### getGitHubRepo()

```ts
function getGitHubRepo(): Promise<string>;
```

Defined in: [git.ts:123](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L123)

获取 GitHub 仓库名称 (格式: owner/repo)

#### Returns

`Promise`\<`string`\>

仓库名称字符串

#### Throws

当无法从 remote.origin.url 解析时抛出异常

***

<a id="isprerelease"></a>

### isPrerelease()

```ts
function isPrerelease(version): boolean;
```

Defined in: [git.ts:138](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L138)

判断是否为预发布版本

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `version` | `string` | 版本号 |

#### Returns

`boolean`

是否为 pre-release 版本

***

<a id="getfirstgitcommit"></a>

### getFirstGitCommit()

```ts
function getFirstGitCommit(): Promise<string>;
```

Defined in: [git.ts:149](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L149)

获取第一个 git 提交记录（commit hash）

#### Returns

`Promise`\<`string`\>

第一个提交的 hash

***

<a id="getgitcommits"></a>

### getGitCommits()

```ts
function getGitCommits(from?, to?): Promise<GitCommit[]>;
```

Defined in: [git.ts:263](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L263)

获取解析后的 git 提交记录

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `from?` | `string` | `undefined` | 起始提交/标签 |
| `to?` | `string` | `'HEAD'` | 结束提交/标签，默认为 HEAD |

#### Returns

`Promise`\<[`GitCommit`](#/types.md#gitcommit)[]\>

解析后的提交数据

***

<a id="getgitcommitsandresolvedauthors"></a>

### getGitCommitsAndResolvedAuthors()

```ts
function getGitCommitsAndResolvedAuthors(
   commits, 
   github, 
   resolvedLogins?): Promise<{
  commits: GitCommit[];
  contributors: ResolvedAuthor[];
}>;
```

Defined in: [git.ts:345](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/git.ts#L345)

获取解析后的提交及贡献者信息

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `commits` | [`GitCommit`](#/types.md#gitcommit)[] | 已解析的提交列表 |
| `github` | [`GithubConfig`](#/types.md#githubconfig) | GitHub 配置 |
| `resolvedLogins?` | `Map`\<`string`, `string`\> | 已缓存的邮箱-login 映射（可选） |

#### Returns

`Promise`\<\{
  `commits`: [`GitCommit`](#/types.md#gitcommit)[];
  `contributors`: [`ResolvedAuthor`](#/types.md#resolvedauthor)[];
\}\>
