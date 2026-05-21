import { computed, defineComponent, reactive } from 'vue';
import { NForm, NFormItem, NSpace } from 'naive-ui';
import { useAuthStore } from '@/store/modules/auth';
import { useVerificationCode } from '@/hooks/business/verification-code';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';
import {
  LoginAltMethods,
  LoginFormShell,
  LoginSubmitButton,
  PrefixedInput,
  VerificationCodeRow
} from '../components/login-ui';

export default defineComponent({
  name: 'CodeLogin',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const { isCounting, loading, label, sendCode } = useVerificationCode({ purpose: 'login' });

    const model = reactive({ email: '', verificationCode: '' });

    const rules = computed(() => {
      const { formRules } = useFormRules();
      return {
        email: formRules.email,
        verificationCode: formRules.code
      };
    });

    const handleSubmit = async () => {
      if (!(await validate())) return;
      await authStore.codeLogin(model.email, model.verificationCode);
    };

    return () => (
      <LoginFormShell onEnter={handleSubmit}>
        <NForm ref={formRef} model={model} rules={rules.value} size="large" showLabel={false}>
          <NFormItem path="email" class="mb-10px">
            <PrefixedInput
              value={model.email}
              icon="i-carbon-email"
              placeholder={$t('page.login.codeLogin.emailPlaceholder')}
              onUpdate:value={v => (model.email = v)}
            />
          </NFormItem>

          <NFormItem path="verificationCode" class="mb-10px">
            <VerificationCodeRow
              code={model.verificationCode}
              label={label.value}
              disabled={isCounting.value}
              loading={loading.value}
              onUpdate:code={v => (model.verificationCode = v)}
              onSend={() => sendCode(model.email)}
            />
          </NFormItem>

          <NSpace vertical size={10}>
            <LoginSubmitButton loading={authStore.loginLoading} onClick={handleSubmit} />
            <LoginAltMethods
              options={[
                { module: 'pwd-login', icon: 'i-carbon-password' },
                { module: 'register', icon: 'i-carbon-user-follow' }
              ]}
              onSwitch={toggleLoginModule}
            />
          </NSpace>
        </NForm>
      </LoginFormShell>
    );
  }
});
