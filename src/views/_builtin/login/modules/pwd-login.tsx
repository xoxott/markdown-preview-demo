import { loginModuleRecord } from '@/constants/app';
import { useLoginFlow } from '@/hooks/business/login-flow';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { calculateStringMD5 } from '@/hooks/upload-v2/utils/hash';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import {
  clearRememberedUsername,
  getRememberedUsername,
  saveRememberedUsername
} from '@/store/modules/auth/shared';
import { NAlert, NButton, NCheckbox, NForm, NFormItem, NInput, NSpace, NTag } from 'naive-ui';
import { computed, defineComponent, reactive, ref } from 'vue';

interface FormModel {
  username: string;
  password: string;
  verificationCode: string;
}

export default defineComponent({
  name: 'PwdLogin',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const loginFlow = useLoginFlow();

    // Remember me state
    const rememberMe = ref(false);

    // Load saved username on component mount
    const savedUsername = getRememberedUsername();
    if (savedUsername) {
      rememberMe.value = true;
    }

    const model = reactive<FormModel>({
      username: savedUsername || '',
      password: '',
      verificationCode: ''
    });

    const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
      const { formRules } = useFormRules();

      return {
        username: formRules.userName,
        password: formRules.pwd,
        verificationCode: formRules.code
      };
    });

    const handleSubmit = async () => {
      const valid = await validate();
      if (!valid) return;

      if (loginFlow.isStep1.value) {
        // Step 1: Submit username and password
        // 对密码做 MD5 加密后再提交
        const encryptedPassword = calculateStringMD5(model.password);
        const result = await loginFlow.executeStep1(model.username, encryptedPassword);

        if (!result.success) {
          return;
        }

        if (result.requiresVerification) {
          // Move to step 2, verification code input will be shown
          return;
        }

        // Login completed without verification - handle remember me
        if (rememberMe.value && model.username) {
          saveRememberedUsername(model.username);
        } else {
          clearRememberedUsername();
        }
        return;
      }

      // Step 2: Submit verification code
      if (!model.verificationCode) {
        window.$message?.error('请输入验证码');
        return;
      }

      const success = await loginFlow.executeStep2(model.verificationCode);

      // Handle remember me after successful login
      if (success) {
        if (rememberMe.value && model.username) {
          saveRememberedUsername(model.username);
        } else {
          clearRememberedUsername();
        }
      }
    };

    const handleBackToStep1 = () => {
      loginFlow.reset();
      model.verificationCode = '';
    };

    const handleSwitchToRegister = () => {
      loginFlow.reset();
      toggleLoginModule('register');
    };

    const handleSwitchToCodeLogin = () => {
      loginFlow.reset();
      toggleLoginModule('code-login');
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
        {/* Step 1: Username and Password */}
        {loginFlow.isStep1.value && (
          <>
            <NFormItem path="username" class="mb-10px">
              <NInput
                value={model.username}
                onUpdateValue={(value) => (model.username = value)}
                placeholder={$t('page.login.common.userNamePlaceholder')}
                class="h-40px"
              >
                {{
                  prefix: () => <div class="i-carbon-user text-16px text-gray-400" />
                }}
              </NInput>
            </NFormItem>
            <NFormItem path="password" class="mb-10px">
              <NInput
                value={model.password}
                onUpdateValue={(value) => (model.password = value)}
                type="password"
                showPasswordOn="click"
                placeholder={$t('page.login.common.passwordPlaceholder')}
                class="h-40px"
              >
                {{
                  prefix: () => <div class="i-carbon-password text-16px text-gray-400" />
                }}
              </NInput>
            </NFormItem>
          </>
        )}

        {/* Step 2: Verification Code */}
        {loginFlow.isStep2.value && (
          <>
            <NAlert type="info" class="mb-12px rd-8px">
              <div class="space-y-1.5">
                <div class="font-semibold text-13px flex items-center gap-4px">
                  <div class="i-carbon-security text-15px" />
                  需要验证码验证
                </div>
                <div class="text-11px text-gray-600 dark:text-gray-400 leading-relaxed">
                  系统检测到异常登录行为，已向您的邮箱发送验证码，请查收并输入验证码完成登录。
                </div>
                {loginFlow.riskInfo.value && (
                  <div class="mt-8px space-y-4px pt-8px border-t border-gray-200 dark:border-gray-700">
                    <div class="text-11px flex items-center gap-4px">
                      <span class="text-gray-500">风险评分:</span>
                      <span class="font-semibold text-primary">{loginFlow.riskInfo.value.riskScore}</span>
                    </div>
                    {loginFlow.riskInfo.value.riskFactors.length > 0 && (
                      <div class="flex flex-wrap items-center gap-4px">
                        <span class="text-11px text-gray-500">风险因素:</span>
                        {loginFlow.riskInfo.value.riskFactors.map((factor) => (
                          <NTag key={factor} size="small" type="warning" round>
                            {factor === 'new_or_untrusted_device'
                              ? '新设备或未信任设备'
                              : factor === 'new_ip'
                                ? '新IP地址'
                                : factor}
                          </NTag>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </NAlert>
            <NFormItem path="verificationCode" class="mb-10px">
              <NInput
                value={model.verificationCode}
                onUpdateValue={(value) => (model.verificationCode = value)}
                placeholder="请输入验证码"
                maxlength={6}
                class="h-40px"
              >
                {{
                  prefix: () => <div class="i-carbon-email text-16px text-gray-400" />
                }}
              </NInput>
            </NFormItem>
            <NButton
              text
              size="small"
              onClick={handleBackToStep1}
              class="mb-8px text-primary hover:text-primary-hover"
            >
              <div class="flex items-center gap-3px text-12px">
                <div class="i-carbon-arrow-left text-13px" />
                返回重新登录
              </div>
            </NButton>
          </>
        )}

        <NSpace vertical size={10}>
          {loginFlow.isStep1.value && (
            <div class="flex-y-center justify-between">
              <NCheckbox
                checked={rememberMe.value}
                onUpdateChecked={(val) => {
                  rememberMe.value = val;
                  if (!val) {
                    clearRememberedUsername();
                  }
                }}
                class="text-12px"
              >
                {$t('page.login.pwdLogin.rememberMe')}
              </NCheckbox>
              <NButton
                text
                size="small"
                class="text-primary hover:text-primary-hover text-12px"
                onClick={() => toggleLoginModule('reset-pwd')}
              >
                {$t('page.login.pwdLogin.forgetPassword')}
              </NButton>
            </div>
          )}

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

          {loginFlow.isStep1.value && (
            <>
              <div class="relative my-12px">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div class="relative flex justify-center text-11px">
                  <span class="px-[8px] text-gray-500">
                    其他登录方式
                  </span>
                </div>
              </div>

              <div class="flex gap-8px">
                <NButton
                  class="flex-1 h-36px"
                  round
                  secondary
                  onClick={handleSwitchToCodeLogin}
                >
                  <div class="flex items-center justify-center gap-4px text-13px">
                    <div class="i-carbon-email text-15px" />
                    <span>{$t(loginModuleRecord['code-login'])}</span>
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
            </>
          )}
        </NSpace>
      </NForm>
      </div>
    );
  }
});

