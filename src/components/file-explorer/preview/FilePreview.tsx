import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { FileItem } from '../types/file-explorer';
import type { FileCategory, PreviewerMatch } from './types';
import { previewRegistry } from './previewRegistry';
import { PreviewHeader } from './PreviewHeader';
import { PreviewLoading } from './PreviewLoading';
import { UnsupportedPreview } from './UnsupportedPreview';
import { ImagePreviewer } from './previewers/ImagePreviewer';
import { VideoPreviewer } from './previewers/VideoPreviewer';
import { AudioPreviewer } from './previewers/AudioPreviewer';
import { PDFPreviewer } from './previewers/PDFPreviewer';
import { MarkdownPreviewer } from './previewers/MarkdownPreviewer';
import { CodePreviewer } from './previewers/CodePreviewer';
import { OfficePreviewer } from './previewers/OfficePreviewer';
import { ArchivePreviewer } from './previewers/ArchivePreviewer';
import { SvgPreviewer } from './previewers/SvgPreviewer';
import { MermaidPreviewer } from './previewers/MermaidPreviewer';
import { EchartsPreviewer } from './previewers/EchartsPreviewer';
import { MindmapPreviewer } from './previewers/MindmapPreviewer';
import { FontPreviewer } from './previewers/FontPreviewer';

/** 初始化内置预览器注册表（仅执行一次） */
let registryInitialized = false;

function ensureRegistryInit() {
  if (registryInitialized) return;
  registryInitialized = true;

  previewRegistry.registerAll([
    { category: 'svg', extensions: ['svg'], component: SvgPreviewer, priority: 10 },
    {
      category: 'image',
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico', 'avif', 'tiff', 'tif'],
      component: ImagePreviewer
    },
    {
      category: 'video',
      extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'ogg', '3gp', 'wmv', 'm4v'],
      component: VideoPreviewer
    },
    {
      category: 'audio',
      extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi'],
      component: AudioPreviewer
    },
    { category: 'pdf', extensions: ['pdf'], component: PDFPreviewer },
    { category: 'markdown', extensions: ['md', 'markdown'], component: MarkdownPreviewer },
    {
      category: 'code',
      extensions: [
        'js',
        'mjs',
        'cjs',
        'ts',
        'jsx',
        'tsx',
        'vue',
        'css',
        'scss',
        'less',
        'html',
        'json',
        'xml',
        'yaml',
        'yml',
        'sh',
        'bash',
        'py',
        'java',
        'cpp',
        'c',
        'h',
        'go',
        'rust',
        'rs',
        'sql',
        'r',
        'lua',
        'perl',
        'pl',
        'rb',
        'php',
        'cs',
        'swift',
        'kt',
        'dart',
        'scala',
        'clj',
        'coffee',
        'make',
        'dockerfile',
        'gitignore',
        'env',
        'log',
        'conf',
        'ini',
        'toml',
        'csv',
        'txt'
      ],
      component: CodePreviewer
    },
    { category: 'mermaid', extensions: ['mermaid', 'mmd'], component: MermaidPreviewer },
    { category: 'echarts', extensions: ['echarts', 'chart'], component: EchartsPreviewer },
    { category: 'mindmap', extensions: ['markmap', 'mm'], component: MindmapPreviewer },
    {
      category: 'office',
      extensions: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      component: OfficePreviewer
    },
    {
      category: 'archive',
      extensions: ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'],
      component: ArchivePreviewer
    },
    { category: 'font', extensions: ['ttf', 'otf', 'woff', 'woff2'], component: FontPreviewer }
  ]);
}

/** 文件预览统一入口组件 — 通过注册表路由到具体预览器，统一处理 loading/error/文件信息头 */
export default defineComponent({
  name: 'FilePreview',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    content: {
      type: [String, Blob] as PropType<string | Blob | undefined>,
      default: undefined
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    ensureRegistryInit();

    const previewerMatch = computed<PreviewerMatch | null>(() => {
      return previewRegistry.getPreviewer(props.file.extension, props.file.mimeType);
    });

    const category = computed<FileCategory>(() => {
      return previewerMatch.value?.category ?? 'unsupported';
    });

    return () => {
      if (props.loading) {
        return <PreviewLoading tip="正在加载文件..." />;
      }

      if (!props.content) {
        return (
          <div class="h-full flex flex-col">
            <PreviewHeader file={props.file} category={category.value} />
            <UnsupportedPreview file={props.file} />
          </div>
        );
      }

      if (!previewerMatch.value) {
        return (
          <div class="h-full flex flex-col">
            <PreviewHeader file={props.file} category="unsupported" />
            <UnsupportedPreview file={props.file} />
          </div>
        );
      }

      const PreviewerComponent = previewerMatch.value.component;
      return (
        <div class="h-full flex flex-col">
          <PreviewHeader file={props.file} category={category.value} />
          <div class="flex-1 overflow-hidden">
            <PreviewerComponent file={props.file} content={props.content} />
          </div>
        </div>
      );
    };
  }
});
