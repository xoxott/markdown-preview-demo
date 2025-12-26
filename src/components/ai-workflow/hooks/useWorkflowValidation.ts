import type { Ref } from 'vue';

export interface ValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  connectionId?: string;
  message: string;
}

export interface ValidationOptions {
  nodes: Ref<Api.Workflow.WorkflowNode[]>;
  connections: Ref<Api.Workflow.Connection[]>;
}

export function useWorkflowValidation({ nodes, connections }: ValidationOptions) {
  /** 验证工作流 */
  function validate(): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. 检查是否有开始节点
    const startNodes = nodes.value.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        type: 'error',
        message: '工作流必须包含至少一个开始节点'
      });
    } else if (startNodes.length > 1) {
      errors.push({
        type: 'warning',
        message: '工作流包含多个开始节点'
      });
    }

    // 2. 检查是否有结束节点
    const endNodes = nodes.value.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push({
        type: 'warning',
        message: '工作流建议包含至少一个结束节点'
      });
    }

    // 3. 检查孤立节点（没有连接的节点）
    const connectedNodeIds = new Set<string>();
    connections.value.forEach(conn => {
      connectedNodeIds.add(conn.source);
      connectedNodeIds.add(conn.target);
    });

    nodes.value.forEach(node => {
      if (!connectedNodeIds.has(node.id) && node.type !== 'start' && node.type !== 'end') {
        errors.push({
          type: 'warning',
          nodeId: node.id,
          message: `节点 "${node.data.label}" 未连接到任何其他节点`
        });
      }
    });

    // 4. 检查必需的输入端口是否已连接
    nodes.value.forEach(node => {
      if (node.type === 'start') return; // 开始节点不需要输入

      const inputConnections = connections.value.filter(conn => conn.target === node.id);
      if (inputConnections.length === 0) {
        errors.push({
          type: 'warning',
          nodeId: node.id,
          message: `节点 "${node.data.label}" 缺少输入连接`
        });
      }
    });

    // 5. 检查循环依赖
    const cycles = detectCycles();
    cycles.forEach(cycle => {
      errors.push({
        type: 'error',
        message: `检测到循环依赖: ${cycle.map(id => {
          const node = nodes.value.find(n => n.id === id);
          return node?.data.label || id;
        }).join(' → ')}`
      });
    });

    // 6. 检查条件节点的输出
    nodes.value.forEach(node => {
      if (node.type === 'condition') {
        const outputs = connections.value.filter(conn => conn.source === node.id);
        const trueOutput = outputs.find(conn => conn.sourceHandle === 'true');
        const falseOutput = outputs.find(conn => conn.sourceHandle === 'false');

        if (!trueOutput) {
          errors.push({
            type: 'warning',
            nodeId: node.id,
            message: `条件节点 "${node.data.label}" 缺少 "true" 分支连接`
          });
        }
        if (!falseOutput) {
          errors.push({
            type: 'warning',
            nodeId: node.id,
            message: `条件节点 "${node.data.label}" 缺少 "false" 分支连接`
          });
        }
      }
    });

    return errors;
  }

  /** 检测循环依赖 */
  function detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    // 构建邻接表
    const adjacencyList = new Map<string, string[]>();
    nodes.value.forEach(node => {
      adjacencyList.set(node.id, []);
    });
    connections.value.forEach(conn => {
      const targets = adjacencyList.get(conn.source) || [];
      targets.push(conn.target);
      adjacencyList.set(conn.source, targets);
    });

    function dfs(nodeId: string): boolean {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // 找到循环
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          cycles.push(cycle);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    }

    // 对所有未访问的节点执行 DFS
    nodes.value.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    });

    return cycles;
  }

  /** 检查节点是否可达（从开始节点） */
  function isNodeReachable(nodeId: string): boolean {
    const startNodes = nodes.value.filter(n => n.type === 'start');
    if (startNodes.length === 0) return false;

    const visited = new Set<string>();
    const queue: string[] = startNodes.map(n => n.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === nodeId) return true;
      if (visited.has(current)) continue;

      visited.add(current);
      const outgoing = connections.value.filter(conn => conn.source === current);
      outgoing.forEach(conn => queue.push(conn.target));
    }

    return false;
  }

  /** 获取节点的所有依赖 */
  function getNodeDependencies(nodeId: string): string[] {
    const dependencies = new Set<string>();
    const visited = new Set<string>();

    function traverse(id: string) {
      if (visited.has(id)) return;
      visited.add(id);

      const incoming = connections.value.filter(conn => conn.target === id);
      incoming.forEach(conn => {
        dependencies.add(conn.source);
        traverse(conn.source);
      });
    }

    traverse(nodeId);
    return Array.from(dependencies);
  }

  /** 获取节点的所有下游节点 */
  function getDownstreamNodes(nodeId: string): string[] {
    const downstream = new Set<string>();
    const visited = new Set<string>();

    function traverse(id: string) {
      if (visited.has(id)) return;
      visited.add(id);

      const outgoing = connections.value.filter(conn => conn.source === id);
      outgoing.forEach(conn => {
        downstream.add(conn.target);
        traverse(conn.target);
      });
    }

    traverse(nodeId);
    return Array.from(downstream);
  }

  return {
    validate,
    detectCycles,
    isNodeReachable,
    getNodeDependencies,
    getDownstreamNodes
  };
}

