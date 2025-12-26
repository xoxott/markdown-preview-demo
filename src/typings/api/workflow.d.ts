/**
 * AI Workflow API Type Definitions
 */

declare namespace Api {
  namespace Workflow {
    /** 节点类型 */
    type NodeType = 'start' | 'end' | 'ai' | 'http' | 'database' | 'condition' | 'transform' | 'file';

    /** 工作流状态 */
    type WorkflowStatus = 'draft' | 'published' | 'archived';

    /** 执行状态 */
    type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

    /** HTTP 方法 */
    type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    /** 连接线类型 */
    type ConnectionType = 'bezier' | 'straight' | 'step';

    /** 位置坐标 */
    interface Position {
      x: number;
      y: number;
    }

    /** 端口定义 */
    interface Port {
      id: string;
      type: 'input' | 'output';
      label?: string;
      dataType?: string;
    }

    /** 节点数据（基础） */
    interface NodeData {
      label: string;
      description?: string;
      icon?: string;
      color?: string;
    }

    /** AI 节点配置 */
    interface AINodeConfig {
      model: string;
      prompt: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }

    /** HTTP 节点配置 */
    interface HttpNodeConfig {
      url: string;
      method: HttpMethod;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    }

    /** 数据库节点配置 */
    interface DatabaseNodeConfig {
      connectionString: string;
      query: string;
      parameters?: Record<string, any>;
    }

    /** 条件节点配置 */
    interface ConditionNodeConfig {
      expression: string;
      trueBranch?: string;
      falseBranch?: string;
    }

    /** 转换节点配置 */
    interface TransformNodeConfig {
      code: string;
      language?: 'javascript' | 'python';
    }

    /** 文件节点配置 */
    interface FileNodeConfig {
      operation: 'read' | 'write' | 'delete';
      path: string;
      content?: string;
    }

    /** 节点配置联合类型 */
    type NodeConfig =
      | AINodeConfig
      | HttpNodeConfig
      | DatabaseNodeConfig
      | ConditionNodeConfig
      | TransformNodeConfig
      | FileNodeConfig
      | Record<string, any>;

    /** 工作流节点 */
    interface WorkflowNode {
      id: string;
      type: NodeType;
      position: Position;
      data: NodeData;
      config: NodeConfig;
      inputs?: Port[];
      outputs?: Port[];
    }

    /** 连接线 */
    interface Connection {
      id: string;
      source: string;
      sourceHandle: string;
      target: string;
      targetHandle: string;
      type?: ConnectionType;
      animated?: boolean;
    }

    /** 工作流定义 */
    interface WorkflowDefinition {
      nodes: WorkflowNode[];
      connections: Connection[];
      variables?: Record<string, any>;
      viewport?: {
        x: number;
        y: number;
        zoom: number;
      };
    }

    /** 工作流 */
    interface Workflow {
      id: string;
      name: string;
      description?: string;
      status: WorkflowStatus;
      version: number;
      nodeCount: number;
      executionCount: number;
      lastExecutedAt: string | null;
      createdAt: string;
      updatedAt: string;
      definition: WorkflowDefinition;
      tags?: string[];
    }

    /** 执行日志 */
    interface ExecutionLog {
      timestamp: string;
      level: 'info' | 'warn' | 'error';
      message: string;
      nodeId?: string;
    }

    /** 节点执行结果 */
    interface NodeExecutionResult {
      nodeId: string;
      status: ExecutionStatus;
      startTime: string;
      endTime?: string;
      duration?: number;
      input?: any;
      output?: any;
      error?: string;
    }

    /** 工作流执行 */
    interface Execution {
      id: string;
      workflowId: string;
      workflowName: string;
      status: ExecutionStatus;
      startTime: string;
      endTime?: string;
      duration?: number;
      triggeredBy?: string;
      input?: Record<string, any>;
      output?: any;
      error?: string;
    }

    /** 执行详情 */
    interface ExecutionDetail extends Execution {
      logs: ExecutionLog[];
      nodeResults: NodeExecutionResult[];
    }

    /** 工作流列表查询参数 */
    interface WorkflowListParams {
      page?: number;
      limit?: number;
      search?: string;
      status?: WorkflowStatus;
      tags?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }

    /** 创建工作流请求 */
    interface CreateWorkflowRequest {
      name: string;
      description?: string;
      definition?: WorkflowDefinition;
      tags?: string[];
    }

    /** 更新工作流请求 */
    interface UpdateWorkflowRequest {
      name?: string;
      description?: string;
      status?: WorkflowStatus;
      definition?: WorkflowDefinition;
      tags?: string[];
    }

    /** 执行工作流参数 */
    interface ExecutionParams {
      input?: Record<string, any>;
      variables?: Record<string, any>;
    }

    /** 执行历史查询参数 */
    interface ExecutionHistoryParams {
      workflowId: string;
      page?: number;
      limit?: number;
      status?: ExecutionStatus;
      startDate?: string;
      endDate?: string;
    }

    /** 工作流版本 */
    interface WorkflowVersion {
      version: number;
      createdAt: string;
      createdBy?: string;
      changes?: string;
      definition: WorkflowDefinition;
    }
  }
}

