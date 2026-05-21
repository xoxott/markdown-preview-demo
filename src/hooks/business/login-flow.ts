import { computed, ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

/** 两步登录流程状态 */
interface LoginFlowState {
  step: 'step1' | 'step2';
  temporaryToken: string | null;
  riskScore: number | null;
  riskFactors: string[] | null;
  expiresIn: number | null;
}

/** 两步登录：第一步账号密码，第二步邮箱验证码（风控触发） */
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
   * 执行登录第一步
   *
   * @param username 用户名
   * @param password 明文密码（调用方负责加密）
   */
  async function executeStep1(username: string, password: string) {
    const result = await authStore.loginStep1(username, password);

    if (!result.success) {
      return { success: false, requiresVerification: false };
    }

    if (result.requiresVerification && result.data) {
      // 进入第二步：邮箱验证码
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

    // 无需二次验证，登录已完成
    return { success: true, requiresVerification: false };
  }

  /**
   * 执行登录第二步（临时 token + 验证码）
   *
   * @param code 邮箱验证码
   * @param redirect 成功后是否跳转
   */
  async function executeStep2(code: string, redirect = true) {
    if (!state.value.temporaryToken) {
      window.$message?.error($t('page.login.common.tempTokenExpired'));
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

  /** 重置为第一步，清空临时 token 与风控信息 */
  function reset() {
    state.value = {
      step: 'step1',
      temporaryToken: null,
      riskScore: null,
      riskFactors: null,
      expiresIn: null
    };
  }

  /** 当前风控评分与风险因素（第二步展示用） */
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
