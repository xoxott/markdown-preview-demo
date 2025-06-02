import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { MermaidConfig } from 'mermaid';
import mermaid from 'mermaid';
import { v4 as uuid } from 'uuid';
interface SVGInfo {
  viewBox: string;
  content: string;
}

export const useMermaid = (content: Ref<string>, darkMode: boolean) => {
  const errorMessage = ref<string | null>(null);
  const svgValue = ref<SVGInfo>({
    content: '',
    viewBox: '0 0 100 100'
  });
  const svgAspectRatio = ref(1);
  /** Mermaid 配置项 */
  const mermaidConfig: MermaidConfig = {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: darkMode ? 'dark' : 'default',
    fontFamily: 'Arial, sans-serif',
    arrowMarkerAbsolute: true,
    themeVariables: {
      primaryColor: '#42b883',
      secondaryColor: '#35495e',
      tertiaryColor: '#fff',
      quaternaryColor: '#ccc'
    },
    logLevel: 5,
    flowchart: {
      curve: 'basis',
      htmlLabels: true
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10
    }
  };

  /* Mermaid 初始化 */
  const initMermaid = () => {
    try {
      mermaid.initialize(mermaidConfig);
    } catch (err) {
      errorMessage.value = `Mermaid 初始化失败: ${err instanceof Error ? err.message : '未知错误'}`;
    }
  };
  /** 解析 */
  const parseSVG = (svgString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.documentElement;
    const viewBox = svg.getAttribute('viewBox')?.split(/\s+/) || [];
    const [, , vw, vh] = viewBox.map(Number);
    if (vw && vh) svgAspectRatio.value = vh / vw;

    return {
      viewBox: svg.getAttribute('viewBox') || '0 0 100 100',
      content: new XMLSerializer().serializeToString(svg)
    };
  };
  /** 清理错误 */
  const cleanErrorSVG = (svg: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const texts = doc.querySelectorAll('text');
    texts.forEach(el => {
      if (el.textContent?.includes('Syntax error') || el.textContent?.includes('mermaid version')) {
        el.remove();
      }
    });
    return new XMLSerializer().serializeToString(doc);
  };

  /** 渲染mermaid */
  const renderDiagram = async () => {
    try {
      errorMessage.value = null;
      await mermaid.parse(content.value);
      const { svg } = await mermaid.render(`mermaid-${uuid()}`, content.value);
      svgValue.value = parseSVG(cleanErrorSVG(svg));
    } catch (err) {
      errorMessage.value = `图表渲染失败: ${err instanceof Error ? err.message : '未知错误'}`;
    }
  };
  const containerStyle = computed(() => ({
    // 基于宽高比的动态高度
    paddingBottom: `${svgAspectRatio.value * 100}%`,
    // 限制最大高度
    maxHeight: `${(1 / svgAspectRatio.value) * 300}px`
  }));
  return {
    initMermaid,
    renderDiagram,
    containerStyle,
    svgValue,
    svgAspectRatio,
    errorMessage
  };
};
