import { defineComponent, reactive, computed } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useVerificationCode } from '@/hooks/business/verification-code';
import { $t } from '@/locales';
import { calculateStringMD5 } from '@/hooks/upload-v2/utils/hash';

interface FormModel {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

export default defineComponent({
  name: 'Register',
  setup() {
    const authStore = useAuthStore();
    const { toggleLoginModule } = useRouterPush();
    const { formRef, validate } = useNaiveForm();
    const { isCounting, loading, label, sendCode, reset } = useVerificationCode();

    const model = reactive<FormModel>({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      verificationCode: ''
    });

    const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
      const { formRules, createConfirmPwdRule } = useFormRules();

      return {
        username: formRules.userName,
        email: formRules.email,
        password: formRules.pwd,
        confirmPassword: createConfirmPwdRule(model.password),
        verificationCode: formRules.code
      };
    });

    const handleSendCode = async () => {
      if (!model.email) return;

      await sendCode(model.email);
    };

    const handleSubmit = async () => {
      // 本地校验不通过则直接返回，不发起请求
      const valid = await validate();
      if (!valid) return;

      // 对密码做 MD5 加密后再提交
      const encryptedPassword = calculateStringMD5(model.password);

      const success = await authStore.register(
        model.username,
        model.email,
        encryptedPassword,
        model.verificationCode
      );

      if (success) {
        // Reset form and switch to login
        Object.assign(model, {
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          verificationCode: ''
        });
        reset();
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
        <NFormItem path="username">
          <NInput
            value={model.username}
            onUpdateValue={(value) => (model.username = value)}
            placeholder="请输入用户名"
          />
        </NFormItem>
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

