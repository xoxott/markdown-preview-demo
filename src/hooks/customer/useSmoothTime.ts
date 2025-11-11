import { onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * 平滑的时间显示 Hook
 *
 * @param sourceTime 来源时间（响应式）
 * @param threshold 更新阈值（秒），默认 5 秒
 */
export function useSmoothTime(sourceTime: Ref<number>, threshold = 5) {
  const displayTime = ref(0);
  let localTime = 0;
  let lastUpdateTime = 0;
  let timer: number | null = null;

  // 启动本地倒计时
  const startCountdown = () => {
    if (timer) clearInterval(timer);

    localTime = sourceTime.value;
    displayTime.value = localTime;
    lastUpdateTime = Date.now();

    // 每秒减 1
    timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000;

      localTime = Math.max(0, localTime - elapsed);
      displayTime.value = Math.round(localTime);
      lastUpdateTime = now;

      if (localTime <= 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, 1000);
  };

  // 停止倒计时
  const stopCountdown = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  // 监听来源时间变化
  watch(
    sourceTime,
    newTime => {
      // 🔥 只在变化超过阈值时才更新
      const diff = Math.abs(newTime - localTime);

      if (diff > threshold || timer === null) {
        console.log(`🕐 时间同步: ${localTime.toFixed(0)}s -> ${newTime}s`);
        startCountdown();
      }
    },
    { immediate: true }
  );

  // 清理
  onBeforeUnmount(() => {
    stopCountdown();
  });

  return {
    displayTime,
    startCountdown,
    stopCountdown
  };
}
