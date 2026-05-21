import { computed, defineComponent, reactive } from 'vue';
import { NForm, NFormItem, NSpace } from 'naive-ui';
import { useAuthStore } from '@/store/modules/auth';
import { useVerificationCode } from '@/hooks/business/verification-code';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';
import {
  LoginBackButton,
  LoginFormShell,
  LoginSubmitButton,
  PrefixedInput,
  VerificationCodeRow
} from '../components/login-ui';
import { encryptLoginPassword } from '../shared/utils';

const emptyRegisterModel = () => ({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  verificationCode: ''
});

export default defineComponent({
  name: 'Register',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const { isCounting, loading, label, sendCode, reset } = useVerificationCode({
      purpose: 'register'
    });

    const model = reactive(emptyRegisterModel());

    const rules = computed(() => {
      const { formRules, createConfirmPwdRule } = useFormRules();
      return {
        username: formRules.userName,
        email: formRules.email,
        password: formRules.pwd,
        confirmPassword: createConfirmPwdRule(model.password),
        verificationCode: formRules.code
      };
    });

    const handleSubmit = async () => {
      if (!(await validate())) return;

      const success = await authStore.register(
        model.username,
        model.email,
        encryptLoginPassword(model.password),
        model.verificationCode
      );

      if (success) {
        Object.assign(model, emptyRegisterModel());
        reset();
        toggleLoginModule('pwd-login');
      }
    };

    return () => (
      <LoginFormShell onEnter={handleSubmit}>
        <NForm ref={formRef} model={model} rules={rules.value} size="large" showLabel={false}>
          <NFormItem path="username" class="mb-10px">
            <PrefixedInput
              value={model.username}
              icon="i-carbon-user"
              placeholder={$t('page.login.common.userNamePlaceholder')}
              onUpdate:value={v => (model.username = v)}
            />
          </NFormItem>
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
          <NFormItem path="password" class="mb-10px">
            <PrefixedInput
              value={model.password}
              type="password"
              showPasswordOn="click"
              icon="i-carbon-locked"
              placeholder={$t('page.login.common.passwordPlaceholder')}
              onUpdate:value={v => (model.password = v)}
            />
          </NFormItem>
          <NFormItem path="confirmPassword" class="mb-10px">
            <PrefixedInput
              value={model.confirmPassword}
              type="password"
              showPasswordOn="click"
              icon="i-carbon-locked"
              placeholder={$t('page.login.common.confirmPasswordPlaceholder')}
              onUpdate:value={v => (model.confirmPassword = v)}
            />
          </NFormItem>
          <NSpace vertical size={8} class="w-full">
            <LoginSubmitButton onClick={handleSubmit} />
            <LoginBackButton onClick={() => toggleLoginModule('pwd-login')} />
          </NSpace>
        </NForm>
      </LoginFormShell>
    );
  }
});
