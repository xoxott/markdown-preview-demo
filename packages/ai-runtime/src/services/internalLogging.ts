/**
 * Internal Logging — 仅供 Anthropic 内部使用的 Kubernetes / 容器元数据收集
 *
 * 对齐 CC services/internalLogging.ts。在 ant 内部（USER_TYPE=ant）的 devbox 上 收集 namespace / containerId
 * 用于诊断 permission context 行为差异，外部用户 始终返回 null。
 */

import { readFile } from 'node:fs/promises';
import process from 'node:process';

// ============================================================
// 内部用户判定
// ============================================================

/** 是否为 ant 内部用户 — 影响是否启用诊断收集 */
export function isAntUser(): boolean {
  return process.env.USER_TYPE === 'ant';
}

// ============================================================
// 缓存包装器
// ============================================================

function memoizeAsync<T>(fn: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | undefined;
  return () => {
    if (!cached) cached = fn();
    return cached;
  };
}

// ============================================================
// Kubernetes namespace
// ============================================================

const NAMESPACE_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/namespace';
const NAMESPACE_NOT_FOUND = 'namespace not found';

/** 读取当前 K8s namespace（仅 ant + devbox 环境有效，其他场景返回 null） */
export const getKubernetesNamespace = memoizeAsync<string | null>(async () => {
  if (!isAntUser()) return null;
  try {
    const content = await readFile(NAMESPACE_PATH, 'utf8');
    return content.trim();
  } catch {
    return NAMESPACE_NOT_FOUND;
  }
});

// ============================================================
// 容器 ID
// ============================================================

const MOUNTINFO_PATH = '/proc/self/mountinfo';
const CONTAINER_ID_NOT_FOUND = 'container ID not found';
const CONTAINER_ID_NOT_FOUND_IN_MOUNTINFO = 'container ID not found in mountinfo';

/** Docker / containerd 容器 ID 模式 */
const CONTAINER_ID_PATTERN = /(?:\/docker\/containers\/|\/sandboxes\/)([0-9a-f]{64})/;

/** 从 /proc/self/mountinfo 提取 OCI 容器 ID */
export const getContainerId = memoizeAsync<string | null>(async () => {
  if (!isAntUser()) return null;
  try {
    const mountinfo = (await readFile(MOUNTINFO_PATH, 'utf8')).trim();
    for (const line of mountinfo.split('\n')) {
      const match = line.match(CONTAINER_ID_PATTERN);
      if (match?.[1]) return match[1];
    }
    return CONTAINER_ID_NOT_FOUND_IN_MOUNTINFO;
  } catch {
    return CONTAINER_ID_NOT_FOUND;
  }
});

// ============================================================
// Permission Context 上报
// ============================================================

/** 上报时机 */
export type PermissionContextLogMoment = 'summary' | 'initialization';

/** 注入式日志器（避免 ai-runtime 直接依赖 telemetry 包） */
export type InternalLogEvent = (event: string, metadata: Record<string, string | null>) => void;

/** 上报当前 permission context 的诊断信息（仅 ant 用户） */
export async function logPermissionContextForAnts(
  toolPermissionContext: unknown,
  moment: PermissionContextLogMoment,
  logEvent: InternalLogEvent
): Promise<void> {
  if (!isAntUser()) return;
  const namespace = await getKubernetesNamespace();
  const containerId = await getContainerId();
  let serializedCtx: string;
  try {
    serializedCtx = JSON.stringify(toolPermissionContext);
  } catch {
    serializedCtx = '<unserializable>';
  }
  logEvent('tengu_internal_record_permission_context', {
    moment,
    namespace,
    containerId,
    toolPermissionContext: serializedCtx
  });
}
