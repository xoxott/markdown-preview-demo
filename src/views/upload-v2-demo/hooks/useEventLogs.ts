import { ref, type Ref } from 'vue';
import type { EventLog } from '../types';

const MAX_LOGS = 100;

/**
 * 事件日志管理 Hook
 */
export function useEventLogs() {
  const eventLogs: Ref<EventLog[]> = ref([]);

  /**
   * 添加事件日志
   */
  const addEventLog = (type: EventLog['type'], message: string, data?: unknown): void => {
    const time = new Date().toLocaleTimeString();
    eventLogs.value.unshift({ time, type, message, data });

    // 限制日志数量
    if (eventLogs.value.length > MAX_LOGS) {
      eventLogs.value = eventLogs.value.slice(0, MAX_LOGS);
    }
  };

  /**
   * 清空事件日志
   */
  const clearEventLogs = (): void => {
    eventLogs.value = [];
  };

  return {
    eventLogs,
    addEventLog,
    clearEventLogs
  };
}

