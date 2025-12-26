/**
 * Mock data for AI Workflow
 * 用于前端功能演示，后续替换为真实API
 */

import { v4 as uuidv4 } from 'uuid';

// Mock 工作流数据
const mockWorkflows: Api.Workflow.Workflow[] = [
  {
    id: '1',
    name: '客户服务自动化工作流',
    description: '自动处理客户咨询，使用AI分析问题并生成回复',
    status: 'published',
    version: 3,
    nodeCount: 6,
    executionCount: 128,
    lastExecutedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ['客服', 'AI', '自动化'],
    definition: {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: '开始', icon: 'mdi:play-circle', color: '#18a058' },
          config: {},
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'ai-1',
          type: 'ai',
          position: { x: 350, y: 200 },
          data: { label: 'AI分析问题', icon: 'mdi:robot', color: '#2080f0' },
          config: {
            model: 'gpt-4',
            prompt: '分析客户问题并分类',
            temperature: 0.7,
            maxTokens: 500
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 600, y: 200 },
          data: { label: '问题分类', icon: 'mdi:source-branch', color: '#f59e0b' },
          config: { expression: 'category === "technical"' },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [
            { id: 'true', type: 'output', label: '技术问题' },
            { id: 'false', type: 'output', label: '一般问题' }
          ]
        },
        {
          id: 'ai-2',
          type: 'ai',
          position: { x: 850, y: 100 },
          data: { label: '生成技术回复', icon: 'mdi:robot', color: '#2080f0' },
          config: {
            model: 'gpt-4',
            prompt: '生成专业的技术支持回复',
            temperature: 0.5
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'ai-3',
          type: 'ai',
          position: { x: 850, y: 300 },
          data: { label: '生成常规回复', icon: 'mdi:robot', color: '#2080f0' },
          config: {
            model: 'gpt-3.5-turbo',
            prompt: '生成友好的客服回复',
            temperature: 0.8
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 1100, y: 200 },
          data: { label: '结束', icon: 'mdi:stop-circle', color: '#d03050' },
          config: {},
          inputs: [{ id: 'input', type: 'input', label: '输入' }]
        }
      ],
      connections: [
        { id: 'c1', source: 'start-1', sourceHandle: 'output', target: 'ai-1', targetHandle: 'input' },
        { id: 'c2', source: 'ai-1', sourceHandle: 'output', target: 'condition-1', targetHandle: 'input' },
        { id: 'c3', source: 'condition-1', sourceHandle: 'true', target: 'ai-2', targetHandle: 'input' },
        { id: 'c4', source: 'condition-1', sourceHandle: 'false', target: 'ai-3', targetHandle: 'input' },
        { id: 'c5', source: 'ai-2', sourceHandle: 'output', target: 'end-1', targetHandle: 'input' },
        { id: 'c6', source: 'ai-3', sourceHandle: 'output', target: 'end-1', targetHandle: 'input' }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    }
  },
  {
    id: '2',
    name: '数据处理工作流',
    description: '从数据库读取数据，进行转换处理后保存',
    status: 'draft',
    version: 1,
    nodeCount: 4,
    executionCount: 0,
    lastExecutedAt: null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['数据处理'],
    definition: {
      nodes: [
        {
          id: 'start-2',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: '开始', icon: 'mdi:play-circle', color: '#18a058' },
          config: {},
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'db-1',
          type: 'database',
          position: { x: 350, y: 200 },
          data: { label: '读取数据', icon: 'mdi:database', color: '#7c3aed' },
          config: {
            connectionString: 'postgresql://localhost:5432/mydb',
            query: 'SELECT * FROM users WHERE active = true'
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'transform-1',
          type: 'transform',
          position: { x: 600, y: 200 },
          data: { label: '数据转换', icon: 'mdi:code-braces', color: '#10b981' },
          config: {
            code: 'return data.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }))',
            language: 'javascript'
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'end-2',
          type: 'end',
          position: { x: 850, y: 200 },
          data: { label: '结束', icon: 'mdi:stop-circle', color: '#d03050' },
          config: {},
          inputs: [{ id: 'input', type: 'input', label: '输入' }]
        }
      ],
      connections: [
        { id: 'c1', source: 'start-2', sourceHandle: 'output', target: 'db-1', targetHandle: 'input' },
        { id: 'c2', source: 'db-1', sourceHandle: 'output', target: 'transform-1', targetHandle: 'input' },
        { id: 'c3', source: 'transform-1', sourceHandle: 'output', target: 'end-2', targetHandle: 'input' }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    }
  },
  {
    id: '3',
    name: 'API集成工作流',
    description: '调用外部API获取数据并处理',
    status: 'published',
    version: 2,
    nodeCount: 5,
    executionCount: 45,
    lastExecutedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ['API', '集成'],
    definition: {
      nodes: [
        {
          id: 'start-3',
          type: 'start',
          position: { x: 100, y: 200 },
          data: { label: '开始', icon: 'mdi:play-circle', color: '#18a058' },
          config: {},
          outputs: [{ id: 'output', type: 'output', label: '输出' }]
        },
        {
          id: 'http-1',
          type: 'http',
          position: { x: 350, y: 200 },
          data: { label: '获取用户数据', icon: 'mdi:web', color: '#f0a020' },
          config: {
            url: 'https://api.example.com/users',
            method: 'GET',
            headers: '{"Authorization": "Bearer token"}',
            timeout: 30
          },
          inputs: [{ id: 'input', type: 'input', label: '输入' }],
          outputs: [
            { id: 'success', type: 'output', label: '成功' },
            { id: 'error', type: 'output', label: '失败' }
          ]
        },
        {
          id: 'end-3',
          type: 'end',
          position: { x: 600, y: 200 },
          data: { label: '结束', icon: 'mdi:stop-circle', color: '#d03050' },
          config: {},
          inputs: [{ id: 'input', type: 'input', label: '输入' }]
        }
      ],
      connections: [
        { id: 'c1', source: 'start-3', sourceHandle: 'output', target: 'http-1', targetHandle: 'input' },
        { id: 'c2', source: 'http-1', sourceHandle: 'success', target: 'end-3', targetHandle: 'input' }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    }
  }
];

// Mock 执行历史
const mockExecutions: Api.Workflow.Execution[] = [
  {
    id: 'exec-1',
    workflowId: '1',
    workflowName: '客户服务自动化工作流',
    status: 'success',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3590000).toISOString(),
    duration: 10000,
    triggeredBy: 'admin',
    input: { question: '如何重置密码？' },
    output: { reply: '您可以通过以下步骤重置密码：1. 点击登录页面的"忘记密码"...' }
  },
  {
    id: 'exec-2',
    workflowId: '1',
    workflowName: '客户服务自动化工作流',
    status: 'success',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 7195000).toISOString(),
    duration: 5000,
    triggeredBy: 'system'
  }
];

// Mock 执行详情
const mockExecutionDetails: Record<string, Api.Workflow.ExecutionDetail> = {
  'exec-1': {
    id: 'exec-1',
    workflowId: '1',
    workflowName: '客户服务自动化工作流',
    status: 'success',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3590000).toISOString(),
    duration: 10000,
    triggeredBy: 'admin',
    input: { question: '如何重置密码？' },
    output: { reply: '您可以通过以下步骤重置密码：1. 点击登录页面的"忘记密码"...' },
    logs: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'info',
        message: '工作流开始执行',
        nodeId: 'start-1'
      },
      {
        timestamp: new Date(Date.now() - 3599000).toISOString(),
        level: 'info',
        message: 'AI分析问题完成',
        nodeId: 'ai-1'
      },
      {
        timestamp: new Date(Date.now() - 3598000).toISOString(),
        level: 'info',
        message: '条件判断：一般问题',
        nodeId: 'condition-1'
      },
      {
        timestamp: new Date(Date.now() - 3595000).toISOString(),
        level: 'info',
        message: '生成回复完成',
        nodeId: 'ai-3'
      },
      {
        timestamp: new Date(Date.now() - 3590000).toISOString(),
        level: 'info',
        message: '工作流执行完成',
        nodeId: 'end-1'
      }
    ],
    nodeResults: [
      {
        nodeId: 'start-1',
        status: 'success',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() - 3599500).toISOString(),
        duration: 500,
        output: { question: '如何重置密码？' }
      },
      {
        nodeId: 'ai-1',
        status: 'success',
        startTime: new Date(Date.now() - 3599500).toISOString(),
        endTime: new Date(Date.now() - 3598000).toISOString(),
        duration: 1500,
        output: { category: 'general', analysis: '用户询问密码重置流程' }
      },
      {
        nodeId: 'condition-1',
        status: 'success',
        startTime: new Date(Date.now() - 3598000).toISOString(),
        endTime: new Date(Date.now() - 3597800).toISOString(),
        duration: 200,
        output: { branch: 'false' }
      },
      {
        nodeId: 'ai-3',
        status: 'success',
        startTime: new Date(Date.now() - 3597800).toISOString(),
        endTime: new Date(Date.now() - 3590000).toISOString(),
        duration: 7800,
        output: { reply: '您可以通过以下步骤重置密码：1. 点击登录页面的"忘记密码"...' }
      }
    ]
  }
};

// Mock 版本历史
const mockVersions: Record<string, Api.Workflow.WorkflowVersion[]> = {
  '1': [
    {
      version: 3,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: 'admin',
      changes: '优化AI提示词，提升回复质量',
      definition: mockWorkflows[0].definition
    },
    {
      version: 2,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      createdBy: 'admin',
      changes: '添加条件分支，区分技术问题和一般问题',
      definition: mockWorkflows[0].definition
    },
    {
      version: 1,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      createdBy: 'admin',
      changes: '初始版本',
      definition: mockWorkflows[0].definition
    }
  ]
};

// 延迟函数，模拟网络请求
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 创建 mock 响应
const createMockResponse = <T>(data: T) => ({
  data,
  error: null,
  response: {} as any
});

// Mock API 函数
export const mockWorkflowApi = {
  async fetchWorkflowList(params: Api.Workflow.WorkflowListParams) {
    await delay(300);
    
    let filtered = [...mockWorkflows];
    
    // 搜索过滤
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        w => w.name.toLowerCase().includes(search) || w.description?.toLowerCase().includes(search)
      );
    }
    
    // 状态过滤
    if (params.status) {
      filtered = filtered.filter(w => w.status === params.status);
    }
    
    // 分页
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = filtered.slice(start, end);
    
    return createMockResponse({
      lists: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasPrevPage: page > 1,
        hasNextPage: end < filtered.length
      }
    });
  },

  async fetchWorkflowDetail(id: string) {
    await delay(200);
    const workflow = mockWorkflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('工作流不存在');
    }
    return createMockResponse(workflow);
  },

  async fetchCreateWorkflow(data: Api.Workflow.CreateWorkflowRequest) {
    await delay(300);
    const newWorkflow: Api.Workflow.Workflow = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      status: 'draft',
      version: 1,
      nodeCount: 0,
      executionCount: 0,
      lastExecutedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: data.tags || [],
      definition: data.definition || {
        nodes: [],
        connections: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    };
    mockWorkflows.unshift(newWorkflow);
    return createMockResponse(newWorkflow);
  },

  async fetchUpdateWorkflow(id: string, data: Api.Workflow.UpdateWorkflowRequest) {
    await delay(300);
    const index = mockWorkflows.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('工作流不存在');
    }
    
    const workflow = mockWorkflows[index];
    if (data.name) workflow.name = data.name;
    if (data.description !== undefined) workflow.description = data.description;
    if (data.status) workflow.status = data.status;
    if (data.definition) {
      workflow.definition = data.definition;
      workflow.nodeCount = data.definition.nodes.length;
    }
    if (data.tags) workflow.tags = data.tags;
    workflow.updatedAt = new Date().toISOString();
    
    return createMockResponse(workflow);
  },

  async fetchDeleteWorkflow(id: string) {
    await delay(200);
    const index = mockWorkflows.findIndex(w => w.id === id);
    if (index !== -1) {
      mockWorkflows.splice(index, 1);
    }
    return createMockResponse(null);
  },

  async fetchBatchDeleteWorkflows(data: { ids: string[] }) {
    await delay(300);
    data.ids.forEach(id => {
      const index = mockWorkflows.findIndex(w => w.id === id);
      if (index !== -1) {
        mockWorkflows.splice(index, 1);
      }
    });
    return createMockResponse(null);
  },

  async fetchCopyWorkflow(id: string, name?: string) {
    await delay(300);
    const original = mockWorkflows.find(w => w.id === id);
    if (!original) {
      throw new Error('工作流不存在');
    }
    
    const copied: Api.Workflow.Workflow = {
      ...original,
      id: uuidv4(),
      name: name || `${original.name} (副本)`,
      status: 'draft',
      version: 1,
      executionCount: 0,
      lastExecutedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockWorkflows.unshift(copied);
    return createMockResponse(copied);
  },

  async fetchPublishWorkflow(id: string) {
    await delay(200);
    const workflow = mockWorkflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('工作流不存在');
    }
    workflow.status = 'published';
    workflow.updatedAt = new Date().toISOString();
    return createMockResponse(workflow);
  },

  async fetchArchiveWorkflow(id: string) {
    await delay(200);
    const workflow = mockWorkflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('工作流不存在');
    }
    workflow.status = 'archived';
    workflow.updatedAt = new Date().toISOString();
    return createMockResponse(workflow);
  },

  async fetchExecuteWorkflow(id: string, params?: Api.Workflow.ExecutionParams) {
    await delay(500);
    const workflow = mockWorkflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('工作流不存在');
    }
    
    const execution: Api.Workflow.Execution = {
      id: uuidv4(),
      workflowId: id,
      workflowName: workflow.name,
      status: 'running',
      startTime: new Date().toISOString(),
      triggeredBy: 'user',
      input: params?.input
    };
    
    mockExecutions.unshift(execution);
    workflow.executionCount++;
    workflow.lastExecutedAt = execution.startTime;
    
    // 模拟异步执行完成
    setTimeout(() => {
      execution.status = 'success';
      execution.endTime = new Date().toISOString();
      execution.duration = 5000;
    }, 2000);
    
    return createMockResponse(execution);
  },

  async fetchExecutionHistory(params: Api.Workflow.ExecutionHistoryParams) {
    await delay(300);
    let filtered = mockExecutions.filter(e => e.workflowId === params.workflowId);
    
    if (params.status) {
      filtered = filtered.filter(e => e.status === params.status);
    }
    
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = filtered.slice(start, end);
    
    return createMockResponse({
      lists: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasPrevPage: page > 1,
        hasNextPage: end < filtered.length
      }
    });
  },

  async fetchExecutionDetail(executionId: string) {
    await delay(300);
    const detail = mockExecutionDetails[executionId];
    if (!detail) {
      // 生成一个基本的执行详情
      const execution = mockExecutions.find(e => e.id === executionId);
      if (!execution) {
        throw new Error('执行记录不存在');
      }
      return createMockResponse({ ...execution, logs: [], nodeResults: [] } as Api.Workflow.ExecutionDetail);
    }
    return createMockResponse(detail);
  },

  async fetchWorkflowVersions(workflowId: string) {
    await delay(200);
    const versions = mockVersions[workflowId] || [];
    return createMockResponse(versions);
  },

  async fetchRestoreWorkflowVersion(workflowId: string, version: number) {
    await delay(300);
    const workflow = mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error('工作流不存在');
    }
    
    const versions = mockVersions[workflowId] || [];
    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) {
      throw new Error('版本不存在');
    }
    
    workflow.definition = targetVersion.definition;
    workflow.version++;
    workflow.updatedAt = new Date().toISOString();
    
    return createMockResponse(workflow);
  }
};

