[**changelog**](README.md)

---

[changelog](#/README.md) / types

## Interfaces

<a id="gitcommitauthor"></a>

### GitCommitAuthor

Defined in: [types.ts:2](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L2)

Git 提交的作者信息

#### Extended by

- [`ResolvedAuthor`](#/types.md#resolvedauthor)

#### Properties

| Property                   | Type     | Description    | Defined in                                                                                                                                     |
| -------------------------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="name"></a> `name`   | `string` | 作者的姓名     | [types.ts:4](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L4) |
| <a id="email"></a> `email` | `string` | 作者的邮箱地址 | [types.ts:6](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L6) |

---

<a id="rawgitcommit"></a>

### RawGitCommit

Defined in: [types.ts:10](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L10)

原始的 Git 提交信息（未解析）

#### Extended by

- [`GitCommit`](#/types.md#gitcommit)

#### Properties

| Property                           | Type                                            | Description         | Defined in                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="message"></a> `message`     | `string`                                        | 提交标题（subject） | [types.ts:12](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L12) |
| <a id="body"></a> `body`           | `string`                                        | 提交正文（body）    | [types.ts:14](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L14) |
| <a id="shorthash"></a> `shortHash` | `string`                                        | 提交的短哈希值      | [types.ts:16](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L16) |
| <a id="author"></a> `author`       | [`GitCommitAuthor`](#/types.md#gitcommitauthor) | 提交作者            | [types.ts:18](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L18) |

---

<a id="reference"></a>

### Reference

Defined in: [types.ts:22](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L22)

提交中引用的对象（如哈希、Issue、Pull Request）

#### Properties

| Property                   | Type                                      | Description                           | Defined in                                                                                                                                       |
| -------------------------- | ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="type"></a> `type`   | `"hash"` \| `"issue"` \| `"pull-request"` | 引用的类型                            | [types.ts:24](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L24) |
| <a id="value"></a> `value` | `string`                                  | 引用的值（哈希、Issue 编号、PR 编号） | [types.ts:26](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L26) |

---

<a id="resolvedauthor"></a>

### ResolvedAuthor

Defined in: [types.ts:30](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L30)

已解析并关联到 GitHub 的作者信息

#### Extends

- [`GitCommitAuthor`](#/types.md#gitcommitauthor)

#### Properties

| Property                       | Type       | Description                  | Inherited from                                                              | Defined in                                                                                                                                       |
| ------------------------------ | ---------- | ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="name-1"></a> `name`     | `string`   | 作者的姓名                   | [`GitCommitAuthor`](#/types.md#gitcommitauthor).[`name`](#/types.md#name)   | [types.ts:4](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L4)   |
| <a id="email-1"></a> `email`   | `string`   | 作者的邮箱地址               | [`GitCommitAuthor`](#/types.md#gitcommitauthor).[`email`](#/types.md#email) | [types.ts:6](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L6)   |
| <a id="commits"></a> `commits` | `string`[] | 该作者相关的提交哈希列表     | -                                                                           | [types.ts:32](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L32) |
| <a id="login"></a> `login`     | `string`   | 作者在 GitHub 上的登录用户名 | -                                                                           | [types.ts:34](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L34) |

---

<a id="gitcommit"></a>

### GitCommit

Defined in: [types.ts:38](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L38)

解析后的 Git 提交信息（包含更多结构化内容）

#### Extends

- [`RawGitCommit`](#/types.md#rawgitcommit)

#### Properties

| Property                                       | Type                                              | Description                                      | Inherited from                                                                | Defined in                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="message-1"></a> `message`               | `string`                                          | 提交标题（subject）                              | [`RawGitCommit`](#/types.md#rawgitcommit).[`message`](#/types.md#message)     | [types.ts:12](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L12) |
| <a id="body-1"></a> `body`                     | `string`                                          | 提交正文（body）                                 | [`RawGitCommit`](#/types.md#rawgitcommit).[`body`](#/types.md#body)           | [types.ts:14](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L14) |
| <a id="shorthash-1"></a> `shortHash`           | `string`                                          | 提交的短哈希值                                   | [`RawGitCommit`](#/types.md#rawgitcommit).[`shortHash`](#/types.md#shorthash) | [types.ts:16](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L16) |
| <a id="author-1"></a> `author`                 | [`GitCommitAuthor`](#/types.md#gitcommitauthor)   | 提交作者                                         | [`RawGitCommit`](#/types.md#rawgitcommit).[`author`](#/types.md#author)       | [types.ts:18](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L18) |
| <a id="description"></a> `description`         | `string`                                          | 提交的描述（通常来源于 message）                 | -                                                                             | [types.ts:40](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L40) |
| <a id="type-1"></a> `type`                     | `string`                                          | 提交的类型（如 feat、fix、docs 等）              | -                                                                             | [types.ts:42](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L42) |
| <a id="scope"></a> `scope`                     | `string`                                          | 提交的作用域（scope，可选，指明影响的模块/范围） | -                                                                             | [types.ts:44](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L44) |
| <a id="references"></a> `references`           | [`Reference`](#/types.md#reference)[]             | 提交中解析出的引用信息                           | -                                                                             | [types.ts:46](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L46) |
| <a id="authors"></a> `authors`                 | [`GitCommitAuthor`](#/types.md#gitcommitauthor)[] | 提交中包含的作者信息（从 trailers 中解析）       | -                                                                             | [types.ts:48](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L48) |
| <a id="resolvedauthors"></a> `resolvedAuthors` | [`ResolvedAuthor`](#/types.md#resolvedauthor)[]   | 解析并匹配到 GitHub 用户的作者信息               | -                                                                             | [types.ts:50](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L50) |
| <a id="isbreaking"></a> `isBreaking`           | `boolean`                                         | 是否为破坏性变更（breaking change）              | -                                                                             | [types.ts:52](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L52) |

---

<a id="githubconfig"></a>

### GithubConfig

Defined in: [types.ts:56](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L56)

GitHub 仓库配置

#### Properties

| Property                   | Type     | Description                  | Defined in                                                                                                                                       |
| -------------------------- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="repo"></a> `repo`   | `string` | 仓库名称（格式：owner/repo） | [types.ts:58](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L58) |
| <a id="token"></a> `token` | `string` | GitHub API 访问的 Token      | [types.ts:60](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L60) |

---

<a id="changelogoption"></a>

### ChangelogOption

Defined in: [types.ts:64](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L64)

生成 Changelog 的配置项

#### Properties

| Property                              | Type                                      | Description                                                                                                      | Defined in                                                                                                                                         |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cwd"></a> `cwd`                | `string`                                  | 项目的工作目录 **Default** `process.cwd()`                                                                       | [types.ts:70](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L70)   |
| <a id="types"></a> `types`            | `Record`\<`string`, `string`\>            | 提交类型与对应标题的映射                                                                                         | [types.ts:73](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L73)   |
| <a id="github"></a> `github`          | [`GithubConfig`](#/types.md#githubconfig) | GitHub 相关配置                                                                                                  | [types.ts:76](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L76)   |
| <a id="from"></a> `from`              | `string`                                  | Changelog 的起始提交哈希或标签                                                                                   | [types.ts:79](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L79)   |
| <a id="to"></a> `to`                  | `string`                                  | Changelog 的结束提交哈希或标签                                                                                   | [types.ts:82](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L82)   |
| <a id="tags"></a> `tags`              | `string`[]                                | 仓库中所有的标签列表                                                                                             | [types.ts:85](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L85)   |
| <a id="tagdatemap"></a> `tagDateMap`  | `Map`\<`string`, `string`\>               | 标签与发布日期的映射                                                                                             | [types.ts:88](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L88)   |
| <a id="capitalize"></a> `capitalize`  | `boolean`                                 | 是否将提交类型的首字母大写                                                                                       | [types.ts:91](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L91)   |
| <a id="emoji"></a> `emoji`            | `boolean`                                 | 是否在标题中使用 Emoji **Default** `true`                                                                        | [types.ts:98](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L98)   |
| <a id="titles"></a> `titles`          | `object`                                  | 标题配置                                                                                                         | [types.ts:101](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L101) |
| `titles.breakingChanges`              | `string`                                  | 破坏性变更（breaking change）部分的标题                                                                          | [types.ts:103](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L103) |
| <a id="output"></a> `output`          | `string`                                  | 生成的 Changelog 输出文件路径                                                                                    | [types.ts:107](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L107) |
| <a id="regenerate"></a> `regenerate`  | `boolean`                                 | 是否重新生成已有版本的 changelog **Example** `当 v0.0.1 已存在 changelog 时，开启此选项会强制重新生成该版本内容` | [types.ts:115](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L115) |
| <a id="prerelease"></a> `prerelease?` | `boolean`                                 | 是否将该版本标记为预发布（prerelease）                                                                           | [types.ts:118](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/types.ts#L118) |
