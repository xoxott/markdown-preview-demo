# Markdown 组件使用示例

本文档展示如何使用 Markdown 组件库中的各个组件。

## 📋 目录

- [集成使用（通过 Markdown）](#集成使用)
- [独立使用各个组件](#独立使用)
- [高级用法](#高级用法)
- [组合使用](#组合使用)

---

## 集成使用

### 完整的 Markdown 渲染

```tsx
import { MarkdownPreview } from '@/components/markdown';

export default function DocumentViewer() {
  const markdown = `
# 项目文档

## 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[跳过]
    C --> E[结束]
    D --> E
\`\`\`

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello World');
}
\`\`\`

## 数据图表

\`\`\`echarts
{
  "title": { "text": "销售数据" },
  "xAxis": { "data": ["1月", "2月", "3月"] },
  "yAxis": {},
  "series": [{
    "type": "bar",
    "data": [100, 200, 150]
  }]
}
\`\`\`
  `;

  return (
    <div class="container">
      <MarkdownPreview content={markdown} />
    </div>
  );
}
```

---

## 独立使用

### 1. Mermaid 流程图

#### 基础用法

```tsx
import { MermaidRenderer } from '@/components/markdown';

export default function FlowchartDemo() {
  const flowchart = `
graph LR
    A[用户登录] --> B{验证}
    B -->|成功| C[进入系统]
    B -->|失败| D[返回登录]
  `;

  return <MermaidRenderer code={flowchart} />;
}
```

#### 自定义配置

```tsx
import { MermaidRenderer } from '@/components/markdown';

export default function CustomMermaid() {
  const diagram = `
sequenceDiagram
    participant A as 客户端
    participant B as 服务器
    A->>B: 发送请求
    B->>A: 返回响应
  `;

  return (
    <MermaidRenderer 
      code={diagram}
      langName="mermaid"
      showToolbar={true}
      bordered={true}
    />
  );
}
```

#### 隐藏工具栏

```tsx
<MermaidRenderer 
  code={flowchart}
  showToolbar={false}
  bordered={false}
/>
```

### 2. 思维导图（Markmap）

#### 基础用法

```tsx
import { MindmapRenderer } from '@/components/markdown';

export default function MindmapDemo() {
  const mindmap = `
# 项目规划
## 需求分析
### 功能需求
### 性能需求
## 设计阶段
### UI 设计
### 架构设计
## 开发阶段
### 前端开发
### 后端开发
## 测试上线
  `;

  return <MindmapRenderer code={mindmap} />;
}
```

#### 响应式思维导图

```tsx
import { MindmapRenderer } from '@/components/markdown';
import { ref, watch } from 'vue';

export default function ResponsiveMindmap() {
  const content = ref(`
# 学习路径
## 前端基础
### HTML
### CSS
### JavaScript
## 框架学习
### Vue
### React
  `);

  // 动态更新内容
  const updateContent = () => {
    content.value += '\n### Angular';
  };

  return (
    <div>
      <button onClick={updateContent}>添加内容</button>
      <MindmapRenderer code={content.value} />
    </div>
  );
}
```

### 3. ECharts 图表

#### 柱状图

```tsx
import { EchartsRenderer } from '@/components/markdown';

export default function BarChartDemo() {
  const option = {
    title: { text: '月度销售' },
    tooltip: {},
    xAxis: {
      data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
    },
    yAxis: {},
    series: [{
      name: '销量',
      type: 'bar',
      data: [5, 20, 36, 10, 10, 20]
    }]
  };

  return <EchartsRenderer option={option} height={400} />;
}
```

#### 折线图

```tsx
import { EchartsRenderer } from '@/components/markdown';

export default function LineChartDemo() {
  const option = {
    title: { text: '访问量趋势' },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [{
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      type: 'line',
      smooth: true
    }]
  };

  return <EchartsRenderer option={option} />;
}
```

#### 饼图

```tsx
import { EchartsRenderer } from '@/components/markdown';

export default function PieChartDemo() {
  const option = {
    title: { text: '用户分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: '北京' },
        { value: 735, name: '上海' },
        { value: 580, name: '广州' },
        { value: 484, name: '深圳' },
        { value: 300, name: '其他' }
      ]
    }]
  };

  return <EchartsRenderer option={option} height={500} />;
}
```

#### JSON 字符串配置

```tsx
import { EchartsRenderer } from '@/components/markdown';

export default function JsonConfigChart() {
  const jsonConfig = `{
    "title": { "text": "示例图表" },
    "xAxis": { "data": ["A", "B", "C"] },
    "yAxis": {},
    "series": [{
      "type": "line",
      "data": [10, 20, 15]
    }]
  }`;

  return <EchartsRenderer option={jsonConfig} />;
}
```

### 4. 代码块

#### JavaScript 代码

```tsx
import { CodeBlock } from '@/components/markdown';

export default function CodeDemo() {
  const meta = {
    langName: 'javascript',
    content: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55`,
    attrs: {},
    info: 'javascript',
    token: {}
  };

  return <CodeBlock meta={meta} />;
}
```

#### TypeScript 代码

```tsx
import { CodeBlock } from '@/components/markdown';

export default function TypeScriptDemo() {
  const meta = {
    langName: 'typescript',
    content: `interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): User {
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com'
  };
}`,
    attrs: {},
    info: 'typescript',
    token: {}
  };

  return <CodeBlock meta={meta} />;
}
```

### 5. SVG 渲染

#### 基础 SVG

```tsx
import { SvgRenderer } from '@/components/markdown';

export default function SvgDemo() {
  const svg = `
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="steelblue" />
  <text x="100" y="100" text-anchor="middle" fill="white" font-size="20">
    SVG
  </text>
</svg>
  `;

  return <SvgRenderer content={svg} />;
}
```

#### 复杂 SVG 图形

```tsx
import { SvgRenderer } from '@/components/markdown';

export default function ComplexSvg() {
  const svg = `
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <ellipse cx="150" cy="150" rx="100" ry="60" fill="url(#grad1)" />
  <path d="M 50 150 Q 150 50 250 150" stroke="blue" stroke-width="3" fill="none" />
</svg>
  `;

  return <SvgRenderer content={svg} />;
}
```

---

## 高级用法

### 1. 响应式内容更新

```tsx
import { ref, watch } from 'vue';
import { MermaidRenderer } from '@/components/markdown';

export default function DynamicDiagram() {
  const nodes = ref(['A', 'B', 'C']);
  
  const diagramCode = computed(() => {
    const connections = nodes.value.map((node, i) => 
      i < nodes.value.length - 1 ? `${node}-->${nodes.value[i + 1]}` : ''
    ).filter(Boolean).join('\n    ');
    
    return `graph LR\n    ${connections}`;
  });

  const addNode = () => {
    const newNode = String.fromCharCode(65 + nodes.value.length);
    nodes.value.push(newNode);
  };

  return (
    <div>
      <button onClick={addNode}>添加节点</button>
      <MermaidRenderer code={diagramCode.value} />
    </div>
  );
}
```

### 2. 主题切换

```tsx
import { useMarkdownTheme } from '@/components/markdown';
import { EchartsRenderer } from '@/components/markdown';

export default function ThemedChart() {
  const { darkMode } = useMarkdownTheme();

  const option = {
    title: { 
      text: '主题切换示例',
      textStyle: {
        color: darkMode.value ? '#fff' : '#000'
      }
    },
    xAxis: { data: ['A', 'B', 'C'] },
    yAxis: {},
    series: [{ type: 'bar', data: [10, 20, 30] }]
  };

  return <EchartsRenderer option={option} />;
}
```

### 3. 错误处理

```tsx
import { ref } from 'vue';
import { MermaidRenderer } from '@/components/markdown';

export default function ErrorHandling() {
  const code = ref(`
graph TD
  A[开始
  B[结束]
  `); // 故意写错的代码

  const fixCode = () => {
    code.value = `
graph TD
  A[开始] --> B[结束]
    `;
  };

  return (
    <div>
      <button onClick={fixCode}>修复代码</button>
      <MermaidRenderer code={code.value} />
    </div>
  );
}
```

---

## 组合使用

### 仪表板示例

```tsx
import { 
  MermaidRenderer, 
  EchartsRenderer, 
  CodeBlock 
} from '@/components/markdown';

export default function Dashboard() {
  const flowchart = `
graph LR
  A[数据采集] --> B[数据处理]
  B --> C[数据展示]
  `;

  const chartOption = {
    title: { text: '实时数据' },
    xAxis: { data: ['00:00', '06:00', '12:00', '18:00'] },
    yAxis: {},
    series: [{ type: 'line', data: [12, 25, 18, 30] }]
  };

  const codeMeta = {
    langName: 'python',
    content: `def process_data(data):
    return [x * 2 for x in data]`,
    attrs: {},
    info: 'python',
    token: {}
  };

  return (
    <div class="grid grid-cols-2 gap-4">
      <MermaidRenderer code={flowchart} />
      <EchartsRenderer option={chartOption} />
      <div class="col-span-2">
        <CodeBlock meta={codeMeta} />
      </div>
    </div>
  );
}
```

### 文档生成器

```tsx
import { defineComponent, ref } from 'vue';
import { 
  MarkdownPreview,
  MermaidRenderer,
  CodeBlock 
} from '@/components/markdown';

export default defineComponent({
  setup() {
    const activeTab = ref<'preview' | 'flowchart' | 'code'>('preview');
    
    const markdownContent = ref('# 文档标题\n\n这是内容...');
    const flowchartCode = ref('graph TD\n  A-->B');
    const codeMeta = ref({
      langName: 'javascript',
      content: 'console.log("Hello");',
      attrs: {},
      info: 'javascript',
      token: {}
    });

    return () => (
      <div>
        <div class="tabs">
          <button onClick={() => activeTab.value = 'preview'}>
            预览
          </button>
          <button onClick={() => activeTab.value = 'flowchart'}>
            流程图
          </button>
          <button onClick={() => activeTab.value = 'code'}>
            代码
          </button>
        </div>

        <div class="content">
          {activeTab.value === 'preview' && (
            <MarkdownPreview content={markdownContent.value} />
          )}
          {activeTab.value === 'flowchart' && (
            <MermaidRenderer code={flowchartCode.value} />
          )}
          {activeTab.value === 'code' && (
            <CodeBlock meta={codeMeta.value} />
          )}
        </div>
      </div>
    );
  }
});
```

---

## 🎯 最佳实践

### 1. 性能优化

```tsx
import { computed, ref } from 'vue';
import { EchartsRenderer } from '@/components/markdown';

export default function OptimizedChart() {
  const rawData = ref([/* 大量数据 */]);
  
  // 使用 computed 缓存计算结果
  const chartOption = computed(() => ({
    xAxis: { data: rawData.value.map(d => d.label) },
    yAxis: {},
    series: [{ type: 'line', data: rawData.value.map(d => d.value) }]
  }));

  return <EchartsRenderer option={chartOption.value} />;
}
```

### 2. 类型安全

```tsx
import type { EChartsOption } from 'echarts';
import type { CodeBlockMeta } from '@/components/markdown';
import { EchartsRenderer, CodeBlock } from '@/components/markdown';

export default function TypeSafeComponent() {
  const option: EChartsOption = {
    // 类型检查会确保配置正确
    xAxis: { type: 'category', data: ['A', 'B'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [10, 20] }]
  };

  const meta: CodeBlockMeta = {
    langName: 'typescript',
    content: 'const x: number = 10;',
    attrs: {},
    info: 'typescript',
    token: {}
  };

  return (
    <div>
      <EchartsRenderer option={option} />
      <CodeBlock meta={meta} />
    </div>
  );
}
```

### 3. 错误边界

```tsx
import { defineComponent, ref, onErrorCaptured } from 'vue';
import { MermaidRenderer } from '@/components/markdown';

export default defineComponent({
  setup() {
    const error = ref<Error | null>(null);

    onErrorCaptured((err) => {
      error.value = err;
      return false; // 阻止错误传播
    });

    return () => (
      <div>
        {error.value ? (
          <div class="error">
            渲染失败: {error.value.message}
          </div>
        ) : (
          <MermaidRenderer code="graph TD\n  A-->B" />
        )}
      </div>
    );
  }
});
```

---

## 📚 更多资源

- [完整 API 文档](./README.md)
- [组件源码](./components/)
- [类型定义](./plugins/types.ts)

