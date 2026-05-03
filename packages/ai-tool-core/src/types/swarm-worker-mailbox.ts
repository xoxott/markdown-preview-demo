/**
 * swarm-worker-mailbox.ts — Swarm Worker Mailbox 解耦接口
 *
 * ai-tool-core 不依赖 ai-coordinator（避免循环依赖），
 * 所以定义独立的 SwarmWorkerMailboxOps 接口。
 * 宿主（ai-tools/ai-runtime）负责将 ai-coordinator 的 PermissionBubbleHandler
 * 适配为 SwarmWorkerMailboxOps 接口。
 */

/** Swarm 权限请求 — Worker 发送到 Leader */
export interface SwarmPermissionRequest {
  /** 工具名称 */
  readonly toolName: string;
  /** 工具输入 */
  readonly toolInput: unknown;
  /** Worker ID */
  readonly workerId: string;
  /** Worker 名称 */
  readonly workerName: string;
  /** 权限请求原因 */
  readonly reason: string;
  /** Classifier 建议（可选，如果 classifier 尝试过） */
  readonly classifierSuggestion?: {
    readonly decision: string;
    readonly reason: string;
    readonly confidence?: string;
  };
}

/** Swarm 权限响应 — Leader 返回给 Worker */
export interface SwarmPermissionResponse {
  /** 是否批准 */
  readonly approved: boolean;
  /** 决策原因 */
  readonly reason?: string;
  /** 用户反馈 */
  readonly feedback?: string;
  /** 权限更新规则（Leader 批准时附带） */
  readonly permissionUpdates?: readonly SwarmPermissionRule[];
}

/** Swarm 权限规则 — Leader 返回的权限更新 */
export interface SwarmPermissionRule {
  readonly behavior: 'allow' | 'deny' | 'ask';
  readonly ruleValue: string;
}

/**
 * SwarmWorkerMailboxOps — Worker 端 Mailbox 操作接口
 *
 * 两个方法:
 * - sendRequest: 发送权限请求到 Leader → 返回 requestId
 * - pollResponse: 轮询 Leader 响应 → 返回 SwarmPermissionResponse 或 null（超时）
 *
 * 宿主适配示例（在 ai-tools 中）:
 *
 * ```ts
 * class SwarmWorkerMailboxAdapter implements SwarmWorkerMailboxOps {
 *   constructor(private mailbox: Mailbox, private leaderName: string) {}
 *
 *   async sendRequest(request) {
 *     return sendPermissionBubble(this.mailbox, mapToBubbleRequest(request), this.leaderName);
 *   }
 *
 *   async pollResponse(requestId, timeoutMs) {
 *     const response = await pollPermissionBubbleResponse(this.mailbox, ...);
 *     return response ? mapToSwarmResponse(response) : null;
 *   }
 * }
 * ```
 */
export interface SwarmWorkerMailboxOps {
  /**
   * 发送权限请求到 Leader — Worker 端
   *
   * @param request Swarm 权限请求
   * @returns requestId（用于后续 pollResponse）
   */
  sendRequest(request: SwarmPermissionRequest): Promise<string>;

  /**
   * 轮询权限响应 — Worker 端
   *
   * @param requestId sendRequest 返回的 ID
   * @param timeoutMs 超时时间（默认 30000ms）
   * @returns Leader 响应，超时返回 null
   */
  pollResponse(requestId: string, timeoutMs?: number): Promise<SwarmPermissionResponse | null>;
}