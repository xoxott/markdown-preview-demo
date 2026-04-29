import { defineComponent, ref } from 'vue';
import { NButton, NCard, NIcon, NSelect, NSpace, NTag, NText } from 'naive-ui';
import { DocumentTextOutline } from '@vicons/ionicons5';
import FilePreview from '@/components/file-explorer/preview/FilePreview';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';

/** 构造 mock FileItem */
function createFileItem(
  name: string,
  ext: string,
  opts?: { type?: 'file' | 'folder'; size?: number; mimeType?: string }
): FileItem {
  return {
    id: `mock-${name}`,
    name,
    type: opts?.type ?? 'file',
    path: `/mock/${name}`,
    extension: ext,
    size: opts?.size,
    modifiedAt: new Date('2026-04-29'),
    createdAt: new Date('2026-01-15'),
    mimeType: opts?.mimeType
  };
}

// ==================== 动态生成 Blob 的工厂函数 ====================

/** 用 Canvas 生成 PNG Blob */
function generatePngBlob(width = 400, height = 300): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1890ff');
  gradient.addColorStop(1, '#722ed1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  // 文字
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('图片预览测试', width / 2, height / 2 - 20);
  ctx.font = '18px sans-serif';
  ctx.fillText(`${width} x ${height} PNG`, width / 2, height / 2 + 20);
  // 装饰圆
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 15 + Math.random() * 30, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.2})`;
    ctx.fill();
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

/** 生成 SVG 字符串内容 */
function generateSvgString(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#52c41a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1890ff;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="280" height="180" rx="16" fill="url(#grad1)"/>
  <text x="150" y="90" text-anchor="middle" fill="#fff" font-size="28" font-weight="bold">SVG 预览</text>
  <text x="150" y="120" text-anchor="middle" fill="#fff" font-size="16">支持缩放/拖拽/下载</text>
  <circle cx="50" cy="50" r="20" fill="rgba(255,255,255,0.3)"/>
  <circle cx="250" cy="150" r="25" fill="rgba(255,255,255,0.2)"/>
</svg>`;
}

/** 生成 PDF Blob（极简 PDF，手动构造字节） */
function generatePdfBlob(): Blob {
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 134 >>
stream
BT
/F1 24 Tf
100 700 Td
(PDF 预览测试) Tj
/F1 16 Tf
100 660 Td
(这是由组件示例页面动态生成的 PDF 文件) Tj
/F1 12 Tf
100 620 Td
(支持 vue-pdf-embed 渲染，可翻页查看) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000450 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
515
%%EOF`;
  return new Blob([pdfContent], { type: 'application/pdf' });
}

/** fetch 一个真实的小视频文件用于演示 */
async function generateVideoBlob(): Promise<Blob> {
  const response = await fetch('https://www.w3schools.com/html/mov_bbb.mp4');
  return response.blob();
}

/** 生成 WAV 音频 Blob（简单正弦波） */
function generateWavBlob(): Blob {
  const sampleRate = 22050;
  const duration = 2; // 2 秒
  const numSamples = sampleRate * duration;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;

  // WAV header (44 bytes) + data
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 正弦波数据 (440Hz = A4 音高)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = 0.5 * (1 - t / duration); // 渐弱
    const sample = Math.sin(2 * Math.PI * 440 * t) * amplitude;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** 生成 ZIP Blob（使用 JSZip 动态构建） */
async function generateZipBlob(): Promise<Blob> {
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default;
  const zip = new JSZip();
  zip.file('README.md', '# 项目说明\n\n这是一个示例项目。');
  zip.file(
    'src/index.ts',
    `import { createApp } from 'vue';\nimport App from './App.vue';\n\ncreateApp(App).mount('#app');`
  );
  zip.file(
    'src/App.vue',
    `<template>\n  <div>Hello</div>\n</template>\n\n<script setup>\n</script>`
  );
  zip.file('src/styles/main.css', `body { margin: 0; }\n.app { padding: 16px; }`);
  zip.folder('public')!.file('favicon.ico', '');
  return zip.generateAsync({ type: 'blob' });
}

/** 从 CDN fetch 一个真实的开源字体文件 */
async function generateFontBlob(): Promise<Blob> {
  const response = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.20/files/inter-latin-400-normal.woff2'
  );
  return response.blob();
}

// ==================== 示例文件数据 ====================

interface DemoEntry {
  label: string;
  icon: string;
  file: FileItem;
  getContent: () => string | Blob | Promise<string | Blob>;
}

const demoEntries: DemoEntry[] = [
  // ---- 文本类 ----
  {
    label: 'Markdown',
    icon: '📝',
    file: createFileItem('README.md', 'md', { size: 2048 }),
    getContent: () => `# 文件预览组件示例

## 功能特性

- **注册表架构**: 通过 \`previewRegistry\` 注册文件类型与预览器映射
- **策略模式**: 新增文件类型只需注册，无需修改核心逻辑
- **13个预览器**: 图片/视频/音频/PDF/Markdown/代码/SVG/Mermaid/ECharts/思维导图/Office/压缩包/字体

## 代码示例

\`\`\`typescript
import { registerPreviewer } from '@/components/file-explorer/preview';

registerPreviewer({
  category: 'epub',
  extensions: ['epub'],
  component: EpubPreviewer
});
\`\`\`

> 支持暗色主题切换，所有预览器自动适配。
`
  },
  {
    label: '图片 PNG',
    icon: '🖼️',
    file: createFileItem('banner.png', 'png', { size: 15360, mimeType: 'image/png' }),
    getContent: () => generatePngBlob()
  },
  {
    label: 'SVG 文件',
    icon: '🎨',
    file: createFileItem('diagram.svg', 'svg', { size: 1024, mimeType: 'image/svg+xml' }),
    getContent: () => generateSvgString()
  },
  {
    label: 'PDF',
    icon: '📄',
    file: createFileItem('document.pdf', 'pdf', { size: 20480, mimeType: 'application/pdf' }),
    getContent: () => generatePdfBlob()
  },
  {
    label: '视频 MP4',
    icon: '🎬',
    file: createFileItem('intro.mp4', 'mp4', { size: 512000, mimeType: 'video/mp4' }),
    getContent: () => generateVideoBlob()
  },
  {
    label: '音频 WAV',
    icon: '🎵',
    file: createFileItem('notification.wav', 'wav', { size: 88200, mimeType: 'audio/wav' }),
    getContent: () => generateWavBlob()
  },
  {
    label: '压缩包 ZIP',
    icon: '📦',
    file: createFileItem('project.zip', 'zip', { size: 4096, mimeType: 'application/zip' }),
    getContent: () => generateZipBlob()
  },
  {
    label: '字体 WOFF2',
    icon: '🔤',
    file: createFileItem('Inter-Regular.woff2', 'woff2', { size: 65536 }),
    getContent: () => generateFontBlob()
  },
  {
    label: 'Mermaid',
    icon: '📊',
    file: createFileItem('flowchart.mmd', 'mermaid', { size: 512 }),
    getContent: () => `graph TD
    A[用户请求] --> B{文件类型判断}
    B -->|图片| C[ImagePreviewer]
    B -->|视频| D[VideoPreviewer]
    B -->|代码| E[CodePreviewer]
    B -->|PDF| F[PDFPreviewer]
    B -->|Markdown| G[MarkdownPreviewer]
    B -->|不支持| H[UnsupportedPreview]
    C --> I[渲染预览]
    D --> I
    E --> I
    F --> I
    G --> I`
  },
  {
    label: 'ECharts',
    icon: '📈',
    file: createFileItem('chart.echarts', 'echarts', { size: 640 }),
    getContent: () => `{
  "title": { "text": "文件类型分布" },
  "tooltip": { "trigger": "item" },
  "series": [{
    "type": "pie",
    "radius": "60%",
    "data": [
      { "value": 1048, "name": "代码文件" },
      { "value": 735, "name": "图片文件" },
      { "value": 580, "name": "文档文件" },
      { "value": 484, "name": "视频文件" },
      { "value": 300, "name": "其他文件" }
    ]
  }]
}`
  },
  {
    label: '思维导图',
    icon: '🧠',
    file: createFileItem('mindmap.mm', 'markmap', { size: 256 }),
    getContent: () => `# 文件预览系统
## 核心架构
### 注册表模式
### 策略模式
## 预览器列表
### 图片
### 视频
### 音频
### PDF
### 代码
### Markdown
### SVG
### Mermaid
### ECharts`
  },
  {
    label: 'JavaScript',
    icon: '⚡',
    file: createFileItem('app.js', 'js', { size: 1536 }),
    getContent: () => `/**
 * 应用入口文件
 */
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');

export default app;
`
  },
  {
    label: 'TypeScript',
    icon: '🔷',
    file: createFileItem('types.ts', 'ts', { size: 3200 }),
    getContent: () => `/** 用户信息接口 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

export function createDefaultUser(): User {
  return {
    id: '1',
    name: 'Guest',
    email: 'guest@example.com',
    role: 'guest',
    createdAt: new Date()
  };
}
`
  },
  {
    label: 'JSON',
    icon: '📋',
    file: createFileItem('config.json', 'json', { size: 512 }),
    getContent: () => `{
  "name": "markdown-preview-demo",
  "version": "1.3.13",
  "dependencies": {
    "vue": "3.5.13",
    "naive-ui": "2.41.0",
    "echarts": "5.6.0"
  }
}`
  },
  {
    label: 'HTML',
    icon: '🌐',
    file: createFileItem('index.html', 'html', { size: 768 }),
    getContent: () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Markdown Preview Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`
  },
  {
    label: 'CSS',
    icon: '🎨',
    file: createFileItem('style.css', 'css', { size: 256 }),
    getContent: () => `/* 全局样式 */
:root {
  --primary-color: #1890ff;
  --border-radius: 8px;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}`
  },
  {
    label: 'Vue SFC',
    icon: '💚',
    file: createFileItem('Component.vue', 'vue', { size: 1024 }),
    getContent: () => `<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const title = ref('Vue 组件示例');
const description = ref('这是一个 Vue SFC 组件');
</script>

<style scoped>
.component { padding: 16px; border-radius: 8px; }
</style>`
  },
  {
    label: 'YAML',
    icon: '⚙️',
    file: createFileItem('docker-compose.yml', 'yml', { size: 384 }),
    getContent: () => `version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html
  api:
    image: node:18-alpine
    working_dir: /app
    command: npm start
    ports:
      - "3000:3000"`
  },
  {
    label: 'Shell',
    icon: '🖥️',
    file: createFileItem('deploy.sh', 'sh', { size: 128 }),
    getContent: () => `#!/bin/bash
echo "开始部署..."
pnpm build
scp -r dist/* server:/var/www/html/
echo "部署完成!"
`
  },
  {
    label: 'Python',
    icon: '🐍',
    file: createFileItem('main.py', 'py', { size: 384 }),
    getContent: () => `"""主程序入口"""
import os
import sys

def main():
    print("Hello, World!")
    env = os.getenv("ENV", "development")
    print(f"当前环境: {env}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
`
  },
  {
    label: '不支持类型',
    icon: '❓',
    file: createFileItem('data.bin', 'bin', { size: 4096 }),
    getContent: () => ''
  }
];

// ==================== 分类标签配置 ====================

const categoryColors: Record<string, string> = {
  文本类: '#1890ff',
  图片类: '#52c41a',
  媒体类: '#722ed1',
  数据可视化: '#fa8c16',
  代码类: '#eab308',
  其他: '#6b7280'
};

const categoryGroups = [
  { name: '文本类', indices: [0] },
  { name: '图片类', indices: [1, 2] },
  { name: '媒体类', indices: [3, 4, 5] },
  { name: '文档类', indices: [6, 7] },
  { name: '数据可视化', indices: [8, 9, 10] },
  { name: '代码类', indices: [11, 12, 13, 14, 15, 16, 17, 18, 19] },
  { name: '其他', indices: [20] }
];

/** 文件预览示例组件 — 在组件示例页面中测试各种文件预览 */
export const FilePreviewExample = defineComponent({
  name: 'FilePreviewExample',
  setup() {
    const selectedIndex = ref(0);
    const currentFile = ref(demoEntries[0].file);
    const currentContent = ref<string | Blob | undefined>(undefined);
    const contentLoading = ref(false);

    const selectOptions = demoEntries.map((item, index) => ({
      label: `${item.icon} ${item.label} (.${item.file.extension})`,
      value: index
    }));

    const handleSelect = async (value: number) => {
      selectedIndex.value = value;
      currentFile.value = demoEntries[value].file;
      contentLoading.value = true;

      try {
        const result = demoEntries[value].getContent();
        if (result instanceof Promise) {
          currentContent.value = await result;
        } else {
          currentContent.value = result;
        }
      } catch {
        currentContent.value = undefined;
      } finally {
        contentLoading.value = false;
      }
    };

    // 初始加载第一个
    handleSelect(0);

    return () => (
      <NCard bordered>
        <div class="mb-4 flex items-center gap-3 border-b pb-3">
          <NIcon size={24} style={{ color: '#1890ff' }}>
            <DocumentTextOutline />
          </NIcon>
          <NText strong class="text-lg">
            文件预览组件测试
          </NText>
          <NTag type="info" size="small" bordered={false}>
            13 种预览器
          </NTag>
          <NTag type="success" size="small" bordered={false}>
            真实 Blob 渲染
          </NTag>
        </div>

        <NSpace vertical size={12}>
          {/* 下拉选择器 */}
          <div class="flex items-center gap-2">
            <NText depth={3} class="text-sm">
              选择文件类型：
            </NText>
            <NSelect
              value={selectedIndex.value}
              options={selectOptions}
              onUpdateValue={handleSelect}
              style={{ width: '320px' }}
              size="small"
            />
          </div>

          {/* 分类快捷按钮 */}
          {categoryGroups.map(group => (
            <div key={group.name} class="flex items-center gap-2">
              <NTag
                size="small"
                bordered={false}
                style={{
                  backgroundColor: `${categoryColors[group.name]}15`,
                  color: categoryColors[group.name]
                }}
              >
                {group.name}
              </NTag>
              <NSpace size={4}>
                {group.indices.map(idx => (
                  <NButton
                    key={idx}
                    size="tiny"
                    type={selectedIndex.value === idx ? 'primary' : 'default'}
                    onClick={() => handleSelect(idx)}
                  >
                    {demoEntries[idx].icon} {demoEntries[idx].label}
                  </NButton>
                ))}
              </NSpace>
            </div>
          ))}

          {/* 预览区域 */}
          <div
            class="overflow-hidden border rounded-lg"
            style={{ height: '500px', minHeight: '400px' }}
          >
            <FilePreview
              file={currentFile.value}
              content={currentContent.value}
              loading={contentLoading.value}
            />
          </div>

          {/* 提示 */}
          <NText depth={3} class="text-xs">
            图片/音频使用 Canvas/WebAudio API 动态生成真实 Blob；PDF 为手动构造的极简 PDF 结构；ZIP
            使用 JSZip 实时打包。 视频因编码复杂度使用最小 ftyp box 演示结构。
          </NText>
        </NSpace>
      </NCard>
    );
  }
});
