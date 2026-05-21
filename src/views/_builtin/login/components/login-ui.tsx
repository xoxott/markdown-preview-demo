/**
 * 登录页可复用 UI
 *
 * - LoginFormShell：表单容器，支持 Enter 提交
 * - PrefixedInput / VerificationCodeRow：带图标输入、验证码行
 * - LoginDivider / LoginAltMethods：「其他登录方式」分隔与切换
 * - LoginSubmitButton / LoginBackButton：主操作与返回
 */
import { type PropType, defineComponent } from 'vue';
import { NButton, NInput, NText } from 'naive-ui';
import { loginModuleRecord } from '@/constants/app';
import { $t } from '@/locales';
import {
  LOGIN_ALT_BTN_CLASS,
  LOGIN_CODE_BTN_CLASS,
  LOGIN_INPUT_CLASS,
  LOGIN_PRIMARY_BTN_CLASS
} from '../shared/constants';

/** 登录表单外壳：监听 Enter 触发提交 */
export const LoginFormShell = defineComponent({
  name: 'LoginFormShell',
  props: {
    onEnter: {
      type: Function as PropType<() => void | Promise<void>>
    }
  },
  setup(props, { slots }) {
    const onKeyup = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && props.onEnter) {
        props.onEnter();
      }
    };
    return () => <div onKeyup={onKeyup}>{slots.default?.()}</div>;
  }
});

/** 「其他登录方式」分隔线 */
export const LoginDivider = defineComponent({
  name: 'LoginDivider',
  setup() {
    return () => (
      <div class="relative my-12px">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div class="relative flex justify-center text-11px">
          <NText class="px-8px text-gray-500">{$t('page.login.pwdLogin.otherLoginMode')}</NText>
        </div>
      </div>
    );
  }
});

export interface LoginAltOption {
  /** 目标登录子模块 */
  module: UnionKey.LoginModule;
  /** UnoCSS 图标 class，如 i-carbon-email */
  icon: string;
}

/** 底部切换密码登录 / 验证码登录 / 注册等 */
export const LoginAltMethods = defineComponent({
  name: 'LoginAltMethods',
  props: {
    options: {
      type: Array as PropType<LoginAltOption[]>,
      required: true
    },
    onSwitch: {
      type: Function as PropType<(module: UnionKey.LoginModule) => void>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <>
        <LoginDivider />
        <div class="flex gap-8px">
          {props.options.map(opt => (
            <NButton
              key={opt.module}
              class={LOGIN_ALT_BTN_CLASS}
              round
              secondary
              onClick={() => props.onSwitch(opt.module)}
            >
              <div class="flex items-center justify-center gap-4px text-13px">
                <div class={`${opt.icon} text-15px`} />
                <span>{$t(loginModuleRecord[opt.module])}</span>
              </div>
            </NButton>
          ))}
        </div>
      </>
    );
  }
});

export const LoginBackButton = defineComponent({
  name: 'LoginBackButton',
  props: {
    onClick: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <NButton size="large" round block secondary class="h-36px" onClick={props.onClick}>
        <div class="flex items-center justify-center gap-4px text-13px">
          <div class="i-carbon-arrow-left text-15px" />
          <span>{$t('page.login.common.back')}</span>
        </div>
      </NButton>
    );
  }
});

export const LoginSubmitButton = defineComponent({
  name: 'LoginSubmitButton',
  props: {
    loading: Boolean,
    onClick: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <NButton
        type="primary"
        size="large"
        round
        block
        loading={props.loading}
        class={LOGIN_PRIMARY_BTN_CLASS}
        onClick={props.onClick}
      >
        {$t('common.confirm')}
      </NButton>
    );
  }
});

/** 带左侧 Carbon 图标的 NInput */
export const PrefixedInput = defineComponent({
  name: 'PrefixedInput',
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    icon: { type: String, required: true },
    type: { type: String as PropType<'text' | 'password'>, default: 'text' },
    maxlength: Number,
    showPasswordOn: { type: String as PropType<'click'>, default: undefined }
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () => (
      <NInput
        value={props.value}
        type={props.type}
        showPasswordOn={props.showPasswordOn}
        maxlength={props.maxlength}
        placeholder={props.placeholder}
        class={LOGIN_INPUT_CLASS}
        onUpdateValue={v => emit('update:value', v ?? '')}
      >
        {{
          prefix: () => <div class={`${props.icon} text-16px text-gray-400`} />
        }}
      </NInput>
    );
  }
});

/** 验证码输入 + 发送/倒计时按钮 */
export const VerificationCodeRow = defineComponent({
  name: 'VerificationCodeRow',
  props: {
    code: { type: String, default: '' },
    label: { type: String, required: true },
    disabled: Boolean,
    loading: Boolean
  },
  emits: ['update:code', 'send'],
  setup(props, { emit }) {
    return () => (
      <div class="w-full flex items-center gap-8px">
        <div class="min-w-0 flex-1">
          <PrefixedInput
            value={props.code}
            icon="i-carbon-password"
            maxlength={6}
            placeholder={$t('page.login.common.codePlaceholder')}
            onUpdate:value={v => emit('update:code', v)}
          />
        </div>
        <NButton
          size="large"
          secondary
          disabled={props.disabled}
          loading={props.loading}
          class={LOGIN_CODE_BTN_CLASS}
          onClick={() => emit('send')}
        >
          {props.label}
        </NButton>
      </div>
    );
  }
});
