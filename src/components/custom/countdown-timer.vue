<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    seconds: number; // 后端计算的剩余秒数
    label?: string; // 标签文字
    showTrend?: boolean; // 是否显示趋势图标
    updateThreshold?: number; // 更新阈值（秒）
  }>(),
  {
    label: '预计剩余:',
    showTrend: false,
    updateThreshold: 5
  }
);

// 状态
const displayTime = ref('');
const trend = ref<'up' | 'down' | 'stable'>('stable');
let countdown = 0;
let lastUpdateTime = 0;
let lastBackendTime = 0;
let animationTimer: number | null = null;

/** 格式化时间显示 */
function formatTime(seconds: number): string {
  if (seconds <= 0) return '即将完成';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
}

/** 开始倒计时动画 */
function startCountdown() {
  // 清除旧的定时器
  if (animationTimer) {
    clearInterval(animationTimer);
  }

  // 初始化倒计时
  countdown = props.seconds;
  lastUpdateTime = Date.now();
  displayTime.value = formatTime(countdown);

  // 启动定时器（每秒更新）
  animationTimer = window.setInterval(() => {
    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000;

    // 减少时间
    countdown = Math.max(0, countdown - elapsed);
    lastUpdateTime = now;

    // 更新显示
    displayTime.value = formatTime(countdown);

    // 如果时间到了，停止定时器
    if (countdown <= 0) {
      stopCountdown();
    }
  }, 1000);
}

/** 停止倒计时 */
function stopCountdown() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
}

/** 更新趋势 */
function updateTrend(newTime: number) {
  if (lastBackendTime === 0) {
    trend.value = 'stable';
  } else {
    const diff = newTime - lastBackendTime;
    if (diff > 3) {
      trend.value = 'up'; // 时间增加（速度变慢）
    } else if (diff < -3) {
      trend.value = 'down'; // 时间减少（速度变快）
    } else {
      trend.value = 'stable';
    }
  }
  lastBackendTime = newTime;
}

// 计算属性
const timeClass = computed(() => {
  if (countdown <= 0) return 'completed';
  if (countdown < 30) return 'warning';
  return 'normal';
});

const trendClass = computed(() => `trend-${trend.value}`);

const trendIcon = computed(() => {
  switch (trend.value) {
    case 'up':
      return '⬆️';
    case 'down':
      return '⬇️';
    default:
      return '→';
  }
});

// 监听后端时间变化
watch(
  () => props.seconds,
  newTime => {
    // 🔥 只在变化超过阈值时才重新开始倒计时
    // 这样可以避免频繁更新导致的抖动
    const diff = Math.abs(newTime - countdown);

    if (diff > props.updateThreshold || animationTimer === null) {
      console.log(
        `🕐 时间更新: ${countdown.toFixed(0)}s -> ${newTime}s (差异: ${diff.toFixed(1)}s)`
      );
      updateTrend(newTime);
      startCountdown();
    }
  },
  { immediate: true }
);

// 组件卸载时清理
onBeforeUnmount(() => {
  stopCountdown();
});
</script>

<template>
  <div class="countdown-timer">
    <span class="label">{{ label }}</span>
    <span class="time" :class="timeClass">{{ displayTime }}</span>
    <span v-if="showTrend" class="trend" :class="trendClass">{{ trendIcon }}</span>
  </div>
</template>

<style scoped>
.countdown-timer {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.label {
  color: #666;
  font-weight: 400;
}

.time {
  font-weight: 600;
  transition: color 0.3s ease;
}

/* 不同状态的颜色 */
.time.normal {
  color: #409eff;
}

.time.warning {
  color: #e6a23c;
  animation: pulse 2s ease-in-out infinite;
}

.time.completed {
  color: #67c23a;
}

/* 趋势图标 */
.trend {
  font-size: 12px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.trend-up {
  color: #f56c6c;
  transform: translateY(-1px);
}

.trend-down {
  color: #67c23a;
  transform: translateY(1px);
}

.trend-stable {
  color: #909399;
}

/* 脉动动画 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
</style>
