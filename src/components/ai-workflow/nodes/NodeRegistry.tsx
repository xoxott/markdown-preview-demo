import type { Component } from 'vue';
import StartNode from './StartNode';
import EndNode from './EndNode';
import AINode from './AINode';
import HttpNode from './HttpNode';
import DatabaseNode from './DatabaseNode';
import ConditionNode from './ConditionNode';
import TransformNode from './TransformNode';
import FileNode from './FileNode';

/** 节点配置 */
export interface NodeTypeConfig {
  component: Component;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: 'control' | 'ai' | 'data' | 'integration';
  defaultPorts?: {
    inputs?: Api.Workflow.Port[];
    outputs?: Api.Workflow.Port[];
  };
}

/** 节点类型注册表 */
export const NODE_TYPES: Record<Api.Workflow.NodeType, NodeTypeConfig> = {
  start: {
    component: StartNode,
    label: '开始',
    icon: 'mdi:play-circle',
    color: '#18a058',
    description: '工作流起始节点',
    category: 'control',
    defaultPorts: {
      outputs: [{ id: 'output', type: 'output', label: '输出' }]
    }
  },
  end: {
    component: EndNode,
    label: '结束',
    icon: 'mdi:stop-circle',
    color: '#d03050',
    description: '工作流结束节点',
    category: 'control',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }]
    }
  },
  ai: {
    component: AINode,
    label: 'AI对话',
    icon: 'mdi:robot',
    color: '#2080f0',
    description: '调用AI模型进行对话',
    category: 'ai',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [{ id: 'output', type: 'output', label: '输出' }]
    }
  },
  http: {
    component: HttpNode,
    label: 'HTTP请求',
    icon: 'mdi:web',
    color: '#f0a020',
    description: '发送HTTP请求',
    category: 'integration',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [
        { id: 'success', type: 'output', label: '成功' },
        { id: 'error', type: 'output', label: '失败' }
      ]
    }
  },
  database: {
    component: DatabaseNode,
    label: '数据库',
    icon: 'mdi:database',
    color: '#7c3aed',
    description: '执行数据库操作',
    category: 'data',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [{ id: 'output', type: 'output', label: '输出' }]
    }
  },
  condition: {
    component: ConditionNode,
    label: '条件判断',
    icon: 'mdi:source-branch',
    color: '#f59e0b',
    description: '根据条件分支执行',
    category: 'control',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [
        { id: 'true', type: 'output', label: '真' },
        { id: 'false', type: 'output', label: '假' }
      ]
    }
  },
  transform: {
    component: TransformNode,
    label: '数据转换',
    icon: 'mdi:code-braces',
    color: '#10b981',
    description: '使用代码转换数据',
    category: 'data',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [{ id: 'output', type: 'output', label: '输出' }]
    }
  },
  file: {
    component: FileNode,
    label: '文件操作',
    icon: 'mdi:file-document',
    color: '#6366f1',
    description: '读写文件',
    category: 'data',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: '输入' }],
      outputs: [{ id: 'output', type: 'output', label: '输出' }]
    }
  }
};

/** 按分类获取节点类型 */
export function getNodesByCategory() {
  const categories = {
    control: [] as Array<{ type: Api.Workflow.NodeType; config: NodeTypeConfig }>,
    ai: [] as Array<{ type: Api.Workflow.NodeType; config: NodeTypeConfig }>,
    data: [] as Array<{ type: Api.Workflow.NodeType; config: NodeTypeConfig }>,
    integration: [] as Array<{ type: Api.Workflow.NodeType; config: NodeTypeConfig }>
  };

  Object.entries(NODE_TYPES).forEach(([type, config]) => {
    categories[config.category].push({
      type: type as Api.Workflow.NodeType,
      config
    });
  });

  return categories;
}

/** 创建默认节点数据 */
export function createDefaultNodeData(type: Api.Workflow.NodeType): Partial<Api.Workflow.WorkflowNode> {
  const config = NODE_TYPES[type];
  return {
    type,
    name: config.label,
    description: config.description,
    inputs: config.defaultPorts?.inputs || [],
    outputs: config.defaultPorts?.outputs || [],
    config: {}
  };
}

