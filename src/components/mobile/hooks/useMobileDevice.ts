import { onMounted, onUnmounted, ref } from 'vue';

export function useMobileDevice() {
  const deviceInfo = ref({
    time: '',
    battery: 100,
    signal: 'full',
    wifi: true
  });

  const updateTime = () => {
    deviceInfo.value.time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  let timer: NodeJS.Timeout;

  onMounted(() => {
    updateTime();
    timer = setInterval(updateTime, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    deviceInfo
  };
}
