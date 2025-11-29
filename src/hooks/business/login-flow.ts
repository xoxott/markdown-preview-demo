import { ref, computed } from 'vue';
import { useAuthStore } from '@/store/modules/auth';

/**
 * Login flow state
 */
interface LoginFlowState {
  step: 'step1' | 'step2';
  temporaryToken: string | null;
  riskScore: number | null;
  riskFactors: string[] | null;
  expiresIn: number | null;
}

/**
 * Login flow hook
 * Manages two-step login process
 */
export function useLoginFlow() {
  const authStore = useAuthStore();

  const state = ref<LoginFlowState>({
    step: 'step1',
    temporaryToken: null,
    riskScore: null,
    riskFactors: null,
    expiresIn: null
  });

  const isStep1 = computed(() => state.value.step === 'step1');
  const isStep2 = computed(() => state.value.step === 'step2');
  const requiresVerification = computed(() => state.value.step === 'step2');

  /**
   * Execute login step 1
   *
   * @param username Username
   * @param password Password
   */
  async function executeStep1(username: string, password: string) {
    const result = await authStore.loginStep1(username, password);

    if (!result.success) {
      return { success: false, requiresVerification: false };
    }

    if (result.requiresVerification && result.data) {
      // Move to step 2
      state.value = {
        step: 'step2',
        temporaryToken: result.data.temporaryToken,
        riskScore: result.data.riskScore,
        riskFactors: result.data.riskFactors,
        expiresIn: result.data.expiresIn
      };

      return {
        success: true,
        requiresVerification: true,
        riskInfo: {
          riskScore: result.data.riskScore,
          riskFactors: result.data.riskFactors
        }
      };
    }

    // Login completed without verification
    return { success: true, requiresVerification: false };
  }

  /**
   * Execute login step 2
   *
   * @param code Verification code
   * @param redirect Whether to redirect after login
   */
  async function executeStep2(code: string, redirect = true) {
    if (!state.value.temporaryToken) {
      window.$message?.error('临时令牌已失效，请重新登录');
      reset();
      return false;
    }

    const success = await authStore.loginStep2(state.value.temporaryToken, code, redirect);

    if (success) {
      reset();
      return true;
    }

    return false;
  }

  /**
   * Reset login flow state
   */
  function reset() {
    state.value = {
      step: 'step1',
      temporaryToken: null,
      riskScore: null,
      riskFactors: null,
      expiresIn: null
    };
  }

  /**
   * Get risk information
   */
  const riskInfo = computed(() => {
    if (!state.value.riskScore && !state.value.riskFactors) {
      return null;
    }

    return {
      riskScore: state.value.riskScore ?? 0,
      riskFactors: state.value.riskFactors ?? []
    };
  });

  return {
    state: computed(() => state.value),
    isStep1,
    isStep2,
    requiresVerification,
    riskInfo,
    executeStep1,
    executeStep2,
    reset
  };
}

