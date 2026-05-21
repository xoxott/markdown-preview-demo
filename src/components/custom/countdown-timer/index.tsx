import { computed, defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import './index.scss';

export default defineComponent({
  name: 'CountdownTimer',
  props: {
    /** 后端计算的剩余秒数 */
    seconds: {
      type: Number,
      required: true
    },
    /** 标签文字 */
    label: {
      type: String,
      default: '预计剩余:'
    },
    /** 是否显示趋势图标 */
    showTrend: {
      type: Boolean,
      default: false
    },
    /** 更新阈值（秒） */
    updateThreshold: {
      type: Number,
      default: 5
    }
  },
  setup(props) {
    const displayTime = ref('');
    const trend = ref<'up' | 'down' | 'stable'>('stable');
    let countdown = 0;
    let lastUpdateTime = 0;
    let lastBackendTime = 0;
    let animationTimer: number | null = null;

    function formatTime(seconds: number): string {
      if (seconds <= 0) return '即将完成';

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
      }
      if (minutes > 0) {
        return `${minutes}分${secs}秒`;
      }
      return `${secs}秒`;
    }

    function startCountdown() {
      if (animationTimer) {
        clearInterval(animationTimer);
      }

      countdown = props.seconds;
      lastUpdateTime = Date.now();
      displayTime.value = formatTime(countdown);

      animationTimer = window.setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastUpdateTime) / 1000;

        countdown = Math.max(0, countdown - elapsed);
        lastUpdateTime = now;
        displayTime.value = formatTime(countdown);

        if (countdown <= 0) {
          stopCountdown();
        }
      }, 1000);
    }

    function stopCountdown() {
      if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
      }
    }

    function updateTrend(newTime: number) {
      if (lastBackendTime === 0) {
        trend.value = 'stable';
      } else {
        const diff = newTime - lastBackendTime;
        if (diff > 3) {
          trend.value = 'up';
        } else if (diff < -3) {
          trend.value = 'down';
        } else {
          trend.value = 'stable';
        }
      }
      lastBackendTime = newTime;
    }

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

    watch(
      () => props.seconds,
      newTime => {
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

    onBeforeUnmount(() => {
      stopCountdown();
    });

    return () => (
      <div class="countdown-timer">
        <span class="label">{props.label}</span>
        <span class={['time', timeClass.value]}>{displayTime.value}</span>
        {props.showTrend && <span class={['trend', trendClass.value]}>{trendIcon.value}</span>}
      </div>
    );
  }
});
