import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

const COUNTDOWN_SECONDS = 60;

/**
 * Verification code hook
 * Manages verification code sending and countdown
 */
export function useVerificationCode() {
  const authStore = useAuthStore();
  const isCounting = ref(false);
  const countdown = ref(0);
  const loading = ref(false);
  let countdownTimer: number | null = null;

  const label = computed(() => {
    if (loading.value) {
      return '发送中...';
    }
    if (isCounting.value) {
      return `${countdown.value}秒后重试`;
    }
    return '发送验证码';
  });

  /**
   * Start countdown
   */
  function startCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    isCounting.value = true;
    countdown.value = COUNTDOWN_SECONDS;

    countdownTimer = window.setInterval(() => {
      countdown.value--;

      if (countdown.value <= 0) {
        isCounting.value = false;
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
      }
    }, 1000);
  }

  /**
   * Send verification code
   *
   * @param email Email address
   */
  async function sendCode(email: string): Promise<boolean> {
    if (isCounting.value || loading.value) {
      return false;
    }

    if (!email) {
      window.$message?.error('请输入邮箱地址');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      window.$message?.error('请输入有效的邮箱地址');
      return false;
    }

    loading.value = true;

    try {
      const success = await authStore.sendRegistrationCode(email);

      if (success) {
        startCountdown();
        return true;
      }

      return false;
    } catch (error) {
      window.$message?.error('发送验证码失败，请稍后重试');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Reset countdown
   */
  function reset() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    isCounting.value = false;
    countdown.value = 0;
    loading.value = false;
  }

  return {
    isCounting,
    countdown,
    loading,
    label,
    sendCode,
    reset
  };
}

