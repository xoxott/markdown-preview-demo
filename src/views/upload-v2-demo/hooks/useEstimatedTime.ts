import { ref, watch, onBeforeUnmount, type Ref } from 'vue';

/**
 * 预计剩余时间计算 Hook
 */
export function useEstimatedTime(
  estimatedTime: Ref<number>,
  isUploading: Ref<boolean> | { value: boolean },
  isPaused: Ref<boolean> | { value: boolean }
) {
  const displayEstimatedTime: Ref<number> = ref(0);
  let localTime = 0;
  let lastUpdateTime = 0;
  let timeCountdownTimer: number | null = null;

  /**
   * 启动倒计时
   */
  const startTimeCountdown = (initialTime: number): void => {
    if (timeCountdownTimer) {
      clearInterval(timeCountdownTimer);
    }

    localTime = initialTime;
    displayEstimatedTime.value = localTime;
    lastUpdateTime = Date.now();

    timeCountdownTimer = window.setInterval(() => {
      // 如果上传已暂停或未在上传，停止倒计时
      const uploading = 'value' in isUploading ? isUploading.value : isUploading;
      const paused = 'value' in isPaused ? isPaused.value : isPaused;
      if (!uploading || paused) {
        // 保持当前值不变，不继续递减
        return;
      }

      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000;

      localTime = Math.max(0, localTime - elapsed);
      displayEstimatedTime.value = Math.round(localTime);
      lastUpdateTime = now;

      if (localTime <= 0 && timeCountdownTimer) {
        clearInterval(timeCountdownTimer);
        timeCountdownTimer = null;
      }
    }, 1000);
  };

  // 监听 estimatedTime 变化
  watch(
    estimatedTime,
    (newTime) => {
      const diff = Math.abs(newTime - localTime);
      if (diff > 5 || timeCountdownTimer === null) {
        startTimeCountdown(newTime);
      }
    },
    { immediate: true }
  );

  // 清理定时器
  onBeforeUnmount(() => {
    if (timeCountdownTimer) {
      clearInterval(timeCountdownTimer);
    }
  });

  return {
    displayEstimatedTime
  };
}

