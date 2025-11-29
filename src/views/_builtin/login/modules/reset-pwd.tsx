import { defineComponent, reactive, computed, ref } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { calculateStringMD5 } from '@/hooks/upload-v2/utils/hash';

interface FormModel {
  email: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
}

const COUNTDOWN_SECONDS = 60;

export default defineComponent({
  name: 'ResetPwd',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();

    const model = reactive<FormModel>({
      email: '',
      verificationCode: '',
      password: '',
      confirmPassword: ''
    });

    // 验证码相关状态
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

    const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
      const { formRules, createConfirmPwdRule } = useFormRules();

      return {
        email: formRules.email,
        verificationCode: formRules.code,
        password: formRules.pwd,
        confirmPassword: createConfirmPwdRule(model.password)
      };
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
     * Send verification code for reset password
     */
    const handleSendCode = async () => {
      if (isCounting.value || loading.value) {
        return;
      }

      if (!model.email) {
        window.$message?.error('请输入邮箱地址');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(model.email)) {
        window.$message?.error('请输入有效的邮箱地址');
        return;
      }

      loading.value = true;

      try {
        const success = await authStore.sendResetPasswordCode(model.email);

        if (success) {
          startCountdown();
        }
      } catch (error) {
        window.$message?.error('发送验证码失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };

    /**
     * Reset countdown
     */
    function resetCountdown() {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      isCounting.value = false;
      countdown.value = 0;
      loading.value = false;
    }

    const handleSubmit = async () => {
      // 本地校验不通过则直接返回，不发起请求
      const valid = await validate();
      if (!valid) return;

      // 对密码做 MD5 加密后再提交
      const encryptedPassword = calculateStringMD5(model.password);

      const success = await authStore.resetPassword(
        model.email,
        model.verificationCode,
        encryptedPassword
      );

      if (success) {
        // Reset form and switch to login
        Object.assign(model, {
          email: '',
          verificationCode: '',
          password: '',
          confirmPassword: ''
        });
        resetCountdown();
        toggleLoginModule('pwd-login');
      }
    };

    return () => (
      <div
        onKeyup={(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
      >
        <NForm
          ref={formRef}
          model={model}
          rules={rules.value}
          size="large"
          showLabel={false}
        >
          <NFormItem path="email">
            <NInput
              value={model.email}
              onUpdateValue={(value) => (model.email = value)}
              placeholder="请输入邮箱地址"
            />
          </NFormItem>
          <NFormItem path="verificationCode">
            <div class="w-full flex-y-center gap-12px">
              <NInput
                value={model.verificationCode}
                onUpdateValue={(value) => (model.verificationCode = value)}
                placeholder="请输入验证码"
                maxlength={6}
                class="flex-1"
              />
              <NButton
                size="large"
                disabled={isCounting.value}
                loading={loading.value}
                onClick={handleSendCode}
                class="whitespace-nowrap"
              >
                {label.value}
              </NButton>
            </div>
          </NFormItem>
          <NFormItem path="password">
            <NInput
              value={model.password}
              onUpdateValue={(value) => (model.password = value)}
              type="password"
              showPasswordOn="click"
              placeholder={$t('page.login.common.passwordPlaceholder')}
            />
          </NFormItem>
          <NFormItem path="confirmPassword">
            <NInput
              value={model.confirmPassword}
              onUpdateValue={(value) => (model.confirmPassword = value)}
              type="password"
              showPasswordOn="click"
              placeholder={$t('page.login.common.confirmPasswordPlaceholder')}
            />
          </NFormItem>
          <NSpace vertical size={18} class="w-full">
            <NButton type="primary" size="large" round block onClick={handleSubmit}>
              {$t('common.confirm')}
            </NButton>
            <NButton size="large" round block onClick={() => toggleLoginModule('pwd-login')}>
              {$t('page.login.common.back')}
            </NButton>
          </NSpace>
        </NForm>
      </div>
    );
  }
});

