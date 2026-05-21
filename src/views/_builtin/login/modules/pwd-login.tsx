import { computed, defineComponent, reactive, ref } from 'vue';
import { NAlert, NButton, NCheckbox, NForm, NFormItem, NSpace, NTag } from 'naive-ui';
import { useAuthStore } from '@/store/modules/auth';
import { clearRememberedUsername, getRememberedUsername } from '@/store/modules/auth/shared';
import { useLoginFlow } from '@/hooks/business/login-flow';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';
import {
  LoginAltMethods,
  LoginFormShell,
  LoginSubmitButton,
  PrefixedInput
} from '../components/login-ui';
import { RISK_FACTOR_I18N } from '../shared/constants';
import { encryptLoginPassword, persistRememberedUsername } from '../shared/utils';

export default defineComponent({
  name: 'PwdLogin',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const loginFlow = useLoginFlow();

    const savedUsername = getRememberedUsername();
    const rememberMe = ref(Boolean(savedUsername));

    const model = reactive({
      username: savedUsername || '',
      password: '',
      verificationCode: ''
    });

    const rules = computed(() => {
      const { formRules } = useFormRules();
      return {
        username: formRules.userName,
        password: formRules.pwd,
        verificationCode: formRules.code
      };
    });

    const switchModule = (module: UnionKey.LoginModule) => {
      loginFlow.reset();
      toggleLoginModule(module);
    };

    const handleSubmit = async () => {
      if (!(await validate())) return;

      if (loginFlow.isStep1.value) {
        const result = await loginFlow.executeStep1(
          model.username,
          encryptLoginPassword(model.password)
        );
        if (!result.success || result.requiresVerification) return;
        persistRememberedUsername(rememberMe.value, model.username);
        return;
      }

      if (!model.verificationCode) {
        window.$message?.error($t('page.login.common.codeRequired'));
        return;
      }

      const success = await loginFlow.executeStep2(model.verificationCode);
      if (success) {
        persistRememberedUsername(rememberMe.value, model.username);
      }
    };

    const riskFactorLabel = (factor: string) =>
      RISK_FACTOR_I18N[factor] ? $t(RISK_FACTOR_I18N[factor]) : factor;

    return () => (
      <LoginFormShell onEnter={handleSubmit}>
        <NForm ref={formRef} model={model} rules={rules.value} size="large" showLabel={false}>
          {loginFlow.isStep1.value && (
            <>
              <NFormItem path="username" class="mb-10px">
                <PrefixedInput
                  value={model.username}
                  icon="i-carbon-user"
                  placeholder={$t('page.login.common.userNamePlaceholder')}
                  onUpdate:value={v => (model.username = v)}
                />
              </NFormItem>
              <NFormItem path="password" class="mb-10px">
                <PrefixedInput
                  value={model.password}
                  type="password"
                  showPasswordOn="click"
                  icon="i-carbon-password"
                  placeholder={$t('page.login.common.passwordPlaceholder')}
                  onUpdate:value={v => (model.password = v)}
                />
              </NFormItem>
            </>
          )}

          {loginFlow.isStep2.value && (
            <>
              <NAlert type="info" class="mb-12px rd-8px">
                <div class="space-y-1.5">
                  <div class="flex items-center gap-4px text-13px font-semibold">
                    <div class="i-carbon-security text-15px" />
                    {$t('page.login.pwdLogin.verificationRequired')}
                  </div>
                  <div class="text-11px text-gray-600 leading-relaxed dark:text-gray-400">
                    {$t('page.login.pwdLogin.verificationHint')}
                  </div>
                  {loginFlow.riskInfo.value && (
                    <div class="mt-8px border-t border-gray-200 pt-8px space-y-4px dark:border-gray-700">
                      <div class="flex items-center gap-4px text-11px">
                        <span class="text-gray-500">{$t('page.login.pwdLogin.riskScore')}:</span>
                        <span class="text-primary font-semibold">
                          {loginFlow.riskInfo.value.riskScore}
                        </span>
                      </div>
                      {loginFlow.riskInfo.value.riskFactors.length > 0 && (
                        <div class="flex flex-wrap items-center gap-4px">
                          <span class="text-11px text-gray-500">
                            {$t('page.login.pwdLogin.riskFactors')}:
                          </span>
                          {loginFlow.riskInfo.value.riskFactors.map(factor => (
                            <NTag key={factor} size="small" type="warning" round>
                              {riskFactorLabel(factor)}
                            </NTag>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </NAlert>
              <NFormItem path="verificationCode" class="mb-10px">
                <PrefixedInput
                  value={model.verificationCode}
                  icon="i-carbon-email"
                  maxlength={6}
                  placeholder={$t('page.login.common.codePlaceholder')}
                  onUpdate:value={v => (model.verificationCode = v)}
                />
              </NFormItem>
              <NButton
                text
                size="small"
                class="hover:text-primary-hover mb-8px text-primary"
                onClick={() => {
                  loginFlow.reset();
                  model.verificationCode = '';
                }}
              >
                <div class="flex items-center gap-3px text-12px">
                  <div class="i-carbon-arrow-left text-13px" />
                  {$t('page.login.pwdLogin.backToLogin')}
                </div>
              </NButton>
            </>
          )}

          <NSpace vertical size={10}>
            {loginFlow.isStep1.value && (
              <div class="flex-y-center justify-between">
                <NCheckbox
                  checked={rememberMe.value}
                  class="text-12px"
                  onUpdateChecked={val => {
                    rememberMe.value = val;
                    if (!val) clearRememberedUsername();
                  }}
                >
                  {$t('page.login.pwdLogin.rememberMe')}
                </NCheckbox>
                <NButton
                  text
                  size="small"
                  class="hover:text-primary-hover text-12px text-primary"
                  onClick={() => switchModule('reset-pwd')}
                >
                  {$t('page.login.pwdLogin.forgetPassword')}
                </NButton>
              </div>
            )}

            <LoginSubmitButton loading={authStore.loginLoading} onClick={handleSubmit} />

            {loginFlow.isStep1.value && (
              <LoginAltMethods
                options={[
                  { module: 'code-login', icon: 'i-carbon-email' },
                  { module: 'register', icon: 'i-carbon-user-follow' }
                ]}
                onSwitch={switchModule}
              />
            )}
          </NSpace>
        </NForm>
      </LoginFormShell>
    );
  }
});
