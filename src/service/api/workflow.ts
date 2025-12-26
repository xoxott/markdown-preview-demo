import { request } from '@/service/request';

/**
 * 获取工作流列表
 */
export function fetchWorkflowList(params: Api.Workflow.WorkflowListParams) {
  return request<Api.ListData<Api.Workflow.Workflow>>({
    url: '/workflow/list',
    method: 'get',
    params
  });
}

/**
 * 获取工作流详情
 */
export function fetchWorkflowDetail(id: string) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${id}`,
    method: 'get'
  });
}

/**
 * 创建工作流
 */
export function fetchCreateWorkflow(data: Api.Workflow.CreateWorkflowRequest) {
  return request<Api.Workflow.Workflow>({
    url: '/workflow',
    method: 'post',
    data
  });
}

/**
 * 更新工作流
 */
export function fetchUpdateWorkflow(id: string, data: Api.Workflow.UpdateWorkflowRequest) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除工作流
 */
export function fetchDeleteWorkflow(id: string) {
  return request<void>({
    url: `/workflow/${id}`,
    method: 'delete'
  });
}

/**
 * 批量删除工作流
 */
export function fetchBatchDeleteWorkflows(data: { ids: string[] }) {
  return request<void>({
    url: '/workflow/batch-delete',
    method: 'post',
    data
  });
}

/**
 * 复制工作流
 */
export function fetchCopyWorkflow(id: string, name?: string) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${id}/copy`,
    method: 'post',
    data: { name }
  });
}

/**
 * 发布工作流
 */
export function fetchPublishWorkflow(id: string) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${id}/publish`,
    method: 'post'
  });
}

/**
 * 归档工作流
 */
export function fetchArchiveWorkflow(id: string) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${id}/archive`,
    method: 'post'
  });
}

/**
 * 执行工作流
 */
export function fetchExecuteWorkflow(id: string, params?: Api.Workflow.ExecutionParams) {
  return request<Api.Workflow.Execution>({
    url: `/workflow/${id}/execute`,
    method: 'post',
    data: params
  });
}

/**
 * 获取执行历史
 */
export function fetchExecutionHistory(params: Api.Workflow.ExecutionHistoryParams) {
  return request<Api.ListData<Api.Workflow.Execution>>({
    url: '/workflow/executions',
    method: 'get',
    params
  });
}

/**
 * 获取执行详情
 */
export function fetchExecutionDetail(executionId: string) {
  return request<Api.Workflow.ExecutionDetail>({
    url: `/workflow/execution/${executionId}`,
    method: 'get'
  });
}

/**
 * 取消执行
 */
export function fetchCancelExecution(executionId: string) {
  return request<void>({
    url: `/workflow/execution/${executionId}/cancel`,
    method: 'post'
  });
}

/**
 * 获取工作流版本历史
 */
export function fetchWorkflowVersions(workflowId: string) {
  return request<Api.Workflow.WorkflowVersion[]>({
    url: `/workflow/${workflowId}/versions`,
    method: 'get'
  });
}

/**
 * 恢复到指定版本
 */
export function fetchRestoreWorkflowVersion(workflowId: string, version: number) {
  return request<Api.Workflow.Workflow>({
    url: `/workflow/${workflowId}/restore/${version}`,
    method: 'post'
  });
}

/**
 * 导出工作流
 */
export function fetchExportWorkflow(id: string) {
  return request<Blob>({
    url: `/workflow/${id}/export`,
    method: 'get',
    responseType: 'blob' as any
  });
}

/**
 * 导入工作流
 */
export function fetchImportWorkflow(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Api.Workflow.Workflow>({
    url: '/workflow/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

