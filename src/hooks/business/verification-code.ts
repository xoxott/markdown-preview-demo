import { computed, onBeforeUnmount, ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

const COUNTDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginEmail(email: string): boolean {
  if (!email) {
    window.$message?.error($t('page.login.codeLogin.emailRequired'));
    return false;
  }
  if (!EMAIL_PATTERN.test(email)) {
    window.$message?.error($t('page.login.codeLogin.emailFormatError'));
    return false;
  }
  return true;
}

/** 验证码业务场景 */
export type VerificationCodePurpose = 'register' | 'login' | 'reset';

interface UseVerificationCodeOptions {
  purpose?: VerificationCodePurpose;
}

/**
 * 发送邮箱验证码并管理 60s 倒计时
 *
 * @param options.purpose 注册 / 验证码登录 / 重置密码，决定接口与按钮文案
 */
export function useVerificationCode(options: UseVerificationCodeOptions = {}) {
  const { purpose = 'register' } = options;
  const authStore = useAuthStore();
  const isCounting = ref(false);
  const countdown = ref(0);
  const loading = ref(false);
  let countdownTimer: number | null = null;

  const label = computed(() => {
    if (loading.value) {
      return $t('page.login.common.sendingCode');
    }
    if (isCounting.value) {
      return purpose === 'login'
        ? $t('page.login.codeLogin.reGetCode', { time: countdown.value })
        : $t('page.login.common.retryInSeconds', { time: countdown.value });
    }
    return purpose === 'login'
      ? $t('page.login.codeLogin.getCode')
      : $t('page.login.common.sendVerificationCode');
  });

  function clearTimer() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown() {
    clearTimer();
    isCounting.value = true;
    countdown.value = COUNTDOWN_SECONDS;

    countdownTimer = window.setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) {
        isCounting.value = false;
        clearTimer();
      }
    }, 1000);
  }

  async function dispatchSend(email: string): Promise<boolean> {
    if (purpose === 'login') {
      const { error } = await authStore.sendLoginCode(email);
      if (!error) {
        window.$message?.success($t('page.login.codeLogin.sendCodeSuccess'));
      }
      return !error;
    }
    if (purpose === 'reset') {
      return authStore.sendResetPasswordCode(email);
    }
    return authStore.sendRegistrationCode(email);
  }

  async function sendCode(email: string): Promise<boolean> {
    if (isCounting.value || loading.value) {
      return false;
    }
    if (!validateLoginEmail(email)) {
      return false;
    }

    loading.value = true;
    try {
      const success = await dispatchSend(email);
      if (success) {
        startCountdown();
      }
      return success;
    } catch {
      window.$message?.error($t('page.login.common.sendCodeFailed'));
      return false;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    clearTimer();
    isCounting.value = false;
    countdown.value = 0;
    loading.value = false;
  }

  onBeforeUnmount(clearTimer);

  return {
    isCounting,
    countdown,
    loading,
    label,
    sendCode,
    reset
  };
}
