import type { Ref } from 'vue';
import { nextTick, ref } from 'vue';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import * as d3 from 'd3';

function decodeHTMLEntities(text: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function decodeTree(node: any) {
  node.content = decodeHTMLEntities(node.content);
  if (node.children?.length) {
    node.children.forEach(decodeTree);
  }
}
export const useMindmap = (content: Ref<string>, svgRef: Ref<SVGElement | null>) => {
  const errorMessage = ref<string | null>(null);
  const instance = ref<Markmap | null>(null);
  const transformer = new Transformer();

  const renderMindmap = async () => {
    try {
      errorMessage.value = null;
      const { root } = transformer.transform(content.value, { sanitize: false });
      await nextTick();
      const el = svgRef.value;
      if (!el) throw new Error('SVG 元素未挂载');
      el.innerHTML = '';
      instance.value = Markmap.create(
        el,
        {
          autoFit: true,
          paddingX: 20,
          paddingY: 20
        },
        root
      );
    } catch (err) {
      errorMessage.value = `思维导图渲染失败: ${err instanceof Error ? err.message : '未知错误'}`;
    }
  };

  const zoom = (direction: 'in' | 'out' | 'reset') => {
    const inst = instance.value;
    if (!inst) return;

    const svgNode = inst.svg?.node?.();
    const gNode = inst.g?.node?.();
    if (!svgNode || !gNode) return;

    if (direction === 'reset') {
      inst.fit();
      return;
    }

    const currentTransform = d3.zoomTransform(svgNode);
    const scaleFactor = 1.2;

    let k = currentTransform.k;
    const x = currentTransform.x;
    const y = currentTransform.y;

    if (direction === 'in') {
      k *= scaleFactor;
    } else if (direction === 'out') {
      k /= scaleFactor;
    }

    const newTransform = d3.zoomIdentity.translate(x, y).scale(k);

    d3.select(gNode).transition().duration(300).attr('transform', newTransform.toString());

    // 保证内部行为一致
    svgNode.__zoom = newTransform;
  };

  return {
    renderMindmap,
    errorMessage,
    instance,
    zoom
  };
};
