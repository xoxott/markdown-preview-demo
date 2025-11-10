const n=`[**changelog**](README.md)

***

[changelog](#/README.md) / shared

## Functions

### Array

<a id="partition"></a>

#### partition()

##### Call Signature

\`\`\`ts
function partition<T>(array, f1): [T[], T[]];
\`\`\`

Defined in: [shared.ts:64](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L64)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

##### Call Signature

\`\`\`ts
function partition<T>(
   array, 
   f1, 
   f2): [T[], T[], T[]];
\`\`\`

Defined in: [shared.ts:65](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L65)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f2\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

##### Call Signature

\`\`\`ts
function partition<T>(
   array, 
   f1, 
   f2, 
   f3): [T[], T[], T[], T[]];
\`\`\`

Defined in: [shared.ts:66](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L66)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f2\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f3\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[], \`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

##### Call Signature

\`\`\`ts
function partition<T>(
   array, 
   f1, 
   f2, 
   f3, 
   f4): [T[], T[], T[], T[], T[]];
\`\`\`

Defined in: [shared.ts:72](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L72)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f2\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f3\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f4\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

##### Call Signature

\`\`\`ts
function partition<T>(
   array, 
   f1, 
   f2, 
   f3, 
   f4, 
   f5): [T[], T[], T[], T[], T[], T[]];
\`\`\`

Defined in: [shared.ts:79](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L79)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f2\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f3\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f4\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f5\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

##### Call Signature

\`\`\`ts
function partition<T>(
   array, 
   f1, 
   f2, 
   f3, 
   f4, 
   f5, 
   f6): [T[], T[], T[], T[], T[], T[], T[]];
\`\`\`

Defined in: [shared.ts:87](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L87)

将数组根据过滤函数划分为多个分组

- 第一个匹配的过滤函数决定元素所属分组
- 如果没有过滤器匹配，则归入最后一个分组

###### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`array\` | readonly \`T\`[] | 原始数组 |
| \`f1\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f2\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f3\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f4\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f5\` | \`PartitionFilter\`\\<\`T\`\\> | - |
| \`f6\` | \`PartitionFilter\`\\<\`T\`\\> | - |

###### Returns

\\[\`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[], \`T\`[]\\]

分组后的数组集合，长度 = \`filters.length + 1\`

###### Example

\`\`\`ts
const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 odd = [1, 3], even = [2, 4]

const [small, medium, large] = partition(
  [1, 5, 10, 20],
  i => i < 5,
  i => i < 10
);
 //small = [1], medium = [5], large = [10, 20]
\`\`\`

### Other

<a id="execcommand"></a>

#### execCommand()

\`\`\`ts
function execCommand(
   cmd, 
   args, 
options?): Promise<string>;
\`\`\`

Defined in: [shared.ts:17](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L17)

执行一个命令行指令并返回标准输出

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`cmd\` | \`string\` | 要执行的命令，例如 \`git\` |
| \`args\` | \`string\`[] | 命令参数数组，例如 \`['status', '--short']\` |
| \`options?\` | \`Options\` | execa 的可选配置 |

##### Returns

\`Promise\`\\<\`string\`\\>

命令标准输出（去除首尾空格），未产生输出时返回空字符串

##### Example

\`\`\`ts
const branch = await execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
\`\`\`

***

<a id="notnullish"></a>

#### notNullish()

\`\`\`ts
function notNullish<T>(v?): v is NonNullable<T>;
\`\`\`

Defined in: [shared.ts:34](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L34)

判断值是否非 null 或 undefined

##### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`v?\` | \`null\` \\| \`T\` | 需要检查的值 |

##### Returns

\`v is NonNullable<T>\`

如果值不是 null/undefined 则返回 true

##### Example

\`\`\`ts
const arr = [1, null, 2, undefined].filter(notNullish); // [1, 2]
\`\`\`

***

<a id="groupby"></a>

#### groupBy()

\`\`\`ts
function groupBy<T>(
   items, 
   key, 
groups): Record<string, T[]>;
\`\`\`

Defined in: [shared.ts:130](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L130)

根据对象属性对数组分组

##### Type Parameters

| Type Parameter |
| ------ |
| \`T\` |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`items\` | \`T\`[] | 原始数组 |
| \`key\` | \`string\` | 作为分组依据的字段名 |
| \`groups\` | \`Record\`\\<\`string\`, \`T\`[]\\> | 可选的初始分组对象 |

##### Returns

\`Record\`\\<\`string\`, \`T\`[]\\>

分组后的对象，key 为属性值，value 为对应元素数组

##### Example

\`\`\`ts
const arr = [{type: 'a'}, {type: 'b'}, {type: 'a'}];
const grouped = groupBy(arr, 'type');
 // { a: [{type:'a'}, {type:'a'}], b: [{type:'b'}] }
\`\`\`

***

<a id="capitalize"></a>

#### capitalize()

\`\`\`ts
function capitalize(str): string;
\`\`\`

Defined in: [shared.ts:150](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L150)

将字符串首字母大写

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`str\` | \`string\` | 输入字符串 |

##### Returns

\`string\`

首字母大写后的新字符串

##### Example

\`\`\`ts
capitalize('hello') // 'Hello'
\`\`\`

***

<a id="join"></a>

#### join()

\`\`\`ts
function join(
   array?, 
   glue?, 
   finalGlue?): string;
\`\`\`

Defined in: [shared.ts:169](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L169)

将字符串数组拼接为自然语言形式

##### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| \`array?\` | \`string\`[] | \`undefined\` | 字符串数组 |
| \`glue?\` | \`string\` | \`', '\` | 连接符，默认 \`", "\` |
| \`finalGlue?\` | \`string\` | \`' and '\` | 最后一个元素的连接符，默认 \`" and "\` |

##### Returns

\`string\`

拼接后的字符串

##### Example

\`\`\`ts
join(['a']) // 'a'
join(['a', 'b']) // 'a and b'
join(['a', 'b', 'c']) // 'a, b and c'
\`\`\`

***

<a id="upperfirst"></a>

#### upperFirst()

\`\`\`ts
function upperFirst(string?): string;
\`\`\`

Defined in: [shared.ts:190](https://github.com/xoxott/markdown-preview-demo/blob/0f58489d99b5c546a4ac6af800263848a3a5dc3e/packages/changelog/src/shared.ts#L190)

将字符串的第一个字符大写

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| \`string?\` | \`string\` | 输入字符串 |

##### Returns

\`string\`

首字符大写后的字符串，如果为空则返回空字符串

##### Example

\`\`\`ts
upperFirst('test') // 'Test'
\`\`\`
`;export{n as default};
