import { loginModuleRecord } from '@/constants/app';
import { useLoginFlow } from '@/hooks/business/login-flow';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { calculateStringMD5 } from '@/hooks/upload-v2/utils/hash';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import { NAlert, NButton, NCheckbox, NForm, NFormItem, NInput, NSpace, NTag } from 'naive-ui';
import { computed, defineComponent, reactive } from 'vue';

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

    const model = reactive<FormModel>({
      username: '',
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

        // Login completed without verification
        return;
      }

      // Step 2: Submit verification code
      if (!model.verificationCode) {
        window.$message?.error('请输入验证码');
        return;
      }

      await loginFlow.executeStep2(model.verificationCode);
    };

    const handleBackToStep1 = () => {
      loginFlow.reset();
      model.verificationCode = '';
    };

    const handleSwitchToRegister = () => {
      loginFlow.reset();
      toggleLoginModule('register');
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
            <NFormItem path="username">
              <NInput
                value={model.username}
                onUpdateValue={(value) => (model.username = value)}
                placeholder={$t('page.login.common.userNamePlaceholder')}
              />
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
          </>
        )}

        {/* Step 2: Verification Code */}
        {loginFlow.isStep2.value && (
          <>
            <NAlert type="info" class="mb-4">
              <div class="space-y-2">
                <div class="font-semibold text-14px">需要验证码验证</div>
                <div class="text-12px text-gray-600 dark:text-gray-400">
                  系统检测到异常登录行为，已向您的邮箱发送验证码，请查收并输入验证码完成登录。
                </div>
                {loginFlow.riskInfo.value && (
                  <div class="mt-2 space-y-1">
                    <div class="text-12px">
                      风险评分: <span class="font-semibold text-primary">{loginFlow.riskInfo.value.riskScore}</span>
                    </div>
                    {loginFlow.riskInfo.value.riskFactors.length > 0 && (
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-12px">风险因素:</span>
                        {loginFlow.riskInfo.value.riskFactors.map((factor) => (
                          <NTag key={factor} size="small" type="warning">
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
            <NFormItem path="verificationCode">
              <NInput
                value={model.verificationCode}
                onUpdateValue={(value) => (model.verificationCode = value)}
                placeholder="请输入验证码"
                maxlength={6}
              />
            </NFormItem>
            <NButton quaternary size="small" onClick={handleBackToStep1} class="mb-2">
              返回重新登录
            </NButton>
          </>
        )}

        <NSpace vertical size={24}>
          {loginFlow.isStep1.value && (
            <div class="flex-y-center justify-between">
              <NCheckbox>{$t('page.login.pwdLogin.rememberMe')}</NCheckbox>
              <NButton quaternary onClick={() => toggleLoginModule('reset-pwd')}>
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
          >
            {$t('common.confirm')}
          </NButton>

          {loginFlow.isStep1.value && (
            <>
              <div class="flex-y-center justify-between gap-12px">
                <NButton class="flex-1" round block onClick={handleSwitchToRegister}>
                  {$t(loginModuleRecord.register)}
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

