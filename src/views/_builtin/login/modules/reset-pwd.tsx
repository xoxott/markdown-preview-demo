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

const emptyResetModel = () => ({
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: ''
});

export default defineComponent({
  name: 'ResetPwd',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const { isCounting, loading, label, sendCode, reset } = useVerificationCode({
      purpose: 'reset'
    });

    const model = reactive(emptyResetModel());

    const rules = computed(() => {
      const { formRules, createConfirmPwdRule } = useFormRules();
      return {
        email: formRules.email,
        verificationCode: formRules.code,
        password: formRules.pwd,
        confirmPassword: createConfirmPwdRule(model.password)
      };
    });

    const handleSubmit = async () => {
      if (!(await validate())) return;

      const success = await authStore.resetPassword(
        model.email,
        model.verificationCode,
        encryptLoginPassword(model.password)
      );

      if (success) {
        Object.assign(model, emptyResetModel());
        reset();
        toggleLoginModule('pwd-login');
      }
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
