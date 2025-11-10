const n=`[**changelog**](README.md)

***

[changelog](#/README.md) / index

## Functions

<a id="getchangelogmarkdown"></a>

### getChangelogMarkdown()

\`\`\`ts
function getChangelogMarkdown(options?, showTitle?): Promise<{
  markdown: string;
  commits: GitCommit[];
  options: ChangelogOption;
}>;
\`\`\`

Defined in: [index.ts:17](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/index.ts#L17)

根据两个 Git 标签（或提交区间）生成对应的 changelog Markdown 文本

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| \`options?\` | \`Partial\`\\<[\`ChangelogOption\`](#/types.md#changelogoption)\\> | \`undefined\` | changelog 配置项（部分字段可覆盖默认配置） |
| \`showTitle?\` | \`boolean\` | \`true\` | 是否在生成的 markdown 中包含标题 |

#### Returns

\`Promise\`\\<\\{
  \`markdown\`: \`string\`;
  \`commits\`: [\`GitCommit\`](#/types.md#gitcommit)[];
  \`options\`: [\`ChangelogOption\`](#/types.md#changelogoption);
\\}\\>

包含以下内容的对象：
- \`markdown\`: 生成的 changelog 文本
- \`commits\`: 提交记录列表
- \`options\`: 最终合并的配置项

***

<a id="gettotalchangelogmarkdown"></a>

### getTotalChangelogMarkdown()

\`\`\`ts
function getTotalChangelogMarkdown(options?, showProgress?): Promise<string>;
\`\`\`

Defined in: [index.ts:44](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/index.ts#L44)

根据所有 Git 标签区间，生成完整的 changelog Markdown 文本

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| \`options?\` | \`Partial\`\\<[\`ChangelogOption\`](#/types.md#changelogoption)\\> | \`undefined\` | changelog 配置项（部分字段可覆盖默认配置） |
| \`showProgress?\` | \`boolean\` | \`true\` | 是否显示进度条（默认显示） |

#### Returns

\`Promise\`\\<\`string\`\\>

拼接好的完整 changelog 文本

***

<a id="generatechangelog"></a>

### generateChangelog()

\`\`\`ts
function generateChangelog(options?): Promise<void>;
\`\`\`

Defined in: [index.ts:93](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/index.ts#L93)

根据两个 Git 标签区间，生成 changelog 文件（如 \`CHANGELOG.md\`）

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`options?\` | \`Partial\`\\<[\`ChangelogOption\`](#/types.md#changelogoption)\\> | changelog 配置项（部分字段可覆盖默认配置） - 如果目标 changelog 文件中已存在该版本的内容，且未开启 \`regenerate\`，则不会重复生成。 - 否则会写入或覆盖 changelog。 |

#### Returns

\`Promise\`\\<\`void\`\\>

***

<a id="generatetotalchangelog"></a>

### generateTotalChangelog()

\`\`\`ts
function generateTotalChangelog(options?, showProgress?): Promise<void>;
\`\`\`

Defined in: [index.ts:116](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/index.ts#L116)

根据所有 Git 标签区间，生成完整的 changelog 文件（覆盖写入）

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| \`options?\` | \`Partial\`\\<[\`ChangelogOption\`](#/types.md#changelogoption)\\> | \`undefined\` | changelog 配置项（部分字段可覆盖默认配置） |
| \`showProgress?\` | \`boolean\` | \`true\` | 是否显示进度条（默认显示） - 会生成包含所有版本记录的完整 changelog - 结果会写入指定的输出文件（默认是 \`CHANGELOG.md\`） - 与 \`generateChangelog\` 不同的是，该函数会强制覆盖写入所有版本内容 |

#### Returns

\`Promise\`\\<\`void\`\\>

## References

<a id="changelogoption"></a>

### ChangelogOption

Re-exports [ChangelogOption](#/types.md#changelogoption)
`;export{n as default};
