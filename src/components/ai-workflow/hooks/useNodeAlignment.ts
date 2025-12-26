import type { Ref } from 'vue';

export interface AlignmentOptions {
  nodes: Ref<Api.Workflow.WorkflowNode[]>;
  selectedNodeIds: Ref<string[]>;
}

export function useNodeAlignment({ nodes, selectedNodeIds }: AlignmentOptions) {
  /** 获取选中的节点 */
  function getSelectedNodes() {
    return nodes.value.filter(node => selectedNodeIds.value.includes(node.id));
  }

  /** 左对齐 */
  function alignLeft() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const minX = Math.min(...selected.map(n => n.position.x));
    selected.forEach(node => {
      node.position.x = minX;
    });
  }

  /** 右对齐 */
  function alignRight() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const NODE_WIDTH = 220;
    const maxX = Math.max(...selected.map(n => n.position.x));
    selected.forEach(node => {
      node.position.x = maxX;
    });
  }

  /** 水平居中对齐 */
  function alignCenterHorizontal() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const NODE_WIDTH = 220;
    const positions = selected.map(n => n.position.x + NODE_WIDTH / 2);
    const avgX = positions.reduce((a, b) => a + b, 0) / positions.length;

    selected.forEach(node => {
      node.position.x = avgX - NODE_WIDTH / 2;
    });
  }

  /** 顶部对齐 */
  function alignTop() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const minY = Math.min(...selected.map(n => n.position.y));
    selected.forEach(node => {
      node.position.y = minY;
    });
  }

  /** 底部对齐 */
  function alignBottom() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const NODE_HEIGHT = 72;
    const maxY = Math.max(...selected.map(n => n.position.y));
    selected.forEach(node => {
      node.position.y = maxY;
    });
  }

  /** 垂直居中对齐 */
  function alignCenterVertical() {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    const NODE_HEIGHT = 72;
    const positions = selected.map(n => n.position.y + NODE_HEIGHT / 2);
    const avgY = positions.reduce((a, b) => a + b, 0) / positions.length;

    selected.forEach(node => {
      node.position.y = avgY - NODE_HEIGHT / 2;
    });
  }

  /** 水平分布 */
  function distributeHorizontal() {
    const selected = getSelectedNodes();
    if (selected.length < 3) return;

    // 按 X 坐标排序
    const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const NODE_WIDTH = 220;

    const totalSpace = last.position.x - first.position.x;
    const gap = totalSpace / (sorted.length - 1);

    sorted.forEach((node, index) => {
      if (index > 0 && index < sorted.length - 1) {
        node.position.x = first.position.x + gap * index;
      }
    });
  }

  /** 垂直分布 */
  function distributeVertical() {
    const selected = getSelectedNodes();
    if (selected.length < 3) return;

    // 按 Y 坐标排序
    const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalSpace = last.position.y - first.position.y;
    const gap = totalSpace / (sorted.length - 1);

    sorted.forEach((node, index) => {
      if (index > 0 && index < sorted.length - 1) {
        node.position.y = first.position.y + gap * index;
      }
    });
  }

  return {
    alignLeft,
    alignRight,
    alignCenterHorizontal,
    alignTop,
    alignBottom,
    alignCenterVertical,
    distributeHorizontal,
    distributeVertical
  };
}

