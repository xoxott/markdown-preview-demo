import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import { NButton, NForm, NFormItem, NInput, NSpace, NText } from 'naive-ui';
import { computed, defineComponent, reactive, ref } from 'vue';
import { loginModuleRecord } from '@/constants/app';

interface FormModel {
  email: string;
  verificationCode: string;
}

export default defineComponent({
  name: 'CodeLogin',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();

    const model = reactive<FormModel>({
      email: '',
      verificationCode: ''
    });

    const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
      const { formRules } = useFormRules();

      return {
        email: formRules.email,
        verificationCode: formRules.code
      };
    });

    // 验证码倒计时
    const isCounting = ref(false);
    const countdown = ref(60);
    let timer: NodeJS.Timeout | null = null;

    const startCountdown = () => {
      isCounting.value = true;
      countdown.value = 60;

      timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          stopCountdown();
        }
      }, 1000);
    };

    const stopCountdown = () => {
      isCounting.value = false;
      countdown.value = 60;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // 发送验证码
    const handleSendCode = async () => {
      if (!model.email) {
        window.$message?.error($t('page.login.codeLogin.emailRequired'));
        return;
      }

      // 验证邮箱格式
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(model.email)) {
        window.$message?.error($t('page.login.codeLogin.emailFormatError'));
        return;
      }

      const { error } = await authStore.sendLoginCode(model.email);
      if (!error) {
        window.$message?.success($t('page.login.codeLogin.sendCodeSuccess'));
        startCountdown();
      }
    };

    // 提交登录
    const handleSubmit = async () => {
      const valid = await validate();
      if (!valid) return;

      await authStore.codeLogin(model.email, model.verificationCode);
    };

    const handleSwitchToRegister = () => {
      toggleLoginModule('register');
    };

    const handleSwitchToPwdLogin = () => {
      toggleLoginModule('pwd-login');
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
          <NFormItem path="email" class="mb-10px">
            <NInput
              value={model.email}
              onUpdateValue={(value) => (model.email = value)}
              placeholder={$t('page.login.codeLogin.emailPlaceholder')}
              class="h-40px"
            >
              {{
                prefix: () => <div class="i-carbon-email text-16px text-gray-400" />
              }}
            </NInput>
          </NFormItem>

          <NFormItem path="verificationCode" class="mb-10px">
            <div class="flex-y-center w-full gap-8px">
              <NInput
                value={model.verificationCode}
                onUpdateValue={(value) => (model.verificationCode = value)}
                placeholder={$t('page.login.common.codePlaceholder')}
                maxlength={6}
                class="flex-1 h-40px"
              >
                {{
                  prefix: () => <div class="i-carbon-password text-16px text-gray-400" />
                }}
              </NInput>
              <NButton
                size="large"
                secondary
                disabled={isCounting.value}
                onClick={handleSendCode}
                class="w-110px h-40px whitespace-nowrap text-12px"
              >
                {isCounting.value
                  ? $t('page.login.codeLogin.reGetCode', { time: countdown.value })
                  : $t('page.login.codeLogin.getCode')}
              </NButton>
            </div>
          </NFormItem>

          <NSpace vertical size={10}>
            <NButton
              type="primary"
              size="large"
              round
              block
              loading={authStore.loginLoading}
              onClick={handleSubmit}
              class="h-40px text-14px font-500 shadow-lg hover:shadow-xl transition-all"
            >
              {$t('common.confirm')}
            </NButton>

            <div class="relative my-12px">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div class="relative flex justify-center text-11px">
                <NText class="px-8px">
                  其他登录方式
                </NText>
              </div>
            </div>

            <div class="flex gap-8px">
              <NButton
                class="flex-1 h-36px"
                round
                secondary
                onClick={handleSwitchToPwdLogin}
              >
                <div class="flex items-center justify-center gap-4px text-13px">
                  <div class="i-carbon-password text-15px" />
                  <span>{$t(loginModuleRecord['pwd-login'])}</span>
                </div>
              </NButton>
              <NButton
                class="flex-1 h-36px"
                round
                secondary
                onClick={handleSwitchToRegister}
              >
                <div class="flex items-center justify-center gap-4px text-13px">
                  <div class="i-carbon-user-follow text-15px" />
                  <span>{$t(loginModuleRecord.register)}</span>
                </div>
              </NButton>
            </div>
          </NSpace>
        </NForm>
      </div>
    );
  }
});

