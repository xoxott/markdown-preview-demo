import { defineComponent, computed, Transition, type PropType } from 'vue';
import { NCard } from 'naive-ui';
import { getPaletteColorByNumber, mixColor } from '@sa/color';
import { loginModuleRecord } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import SystemLogo from '@/components/common/system-logo.vue';
import ThemeSchemaSwitch from '@/components/common/theme-schema-switch.vue';
import LangSwitch from '@/components/common/lang-switch.vue';
import WaveBg from '@/components/custom/wave-bg.vue';
// @ts-ignore - TSX module resolution
import PwdLogin from './modules/pwd-login';
// @ts-ignore - TSX module resolution
import CodeLogin from './modules/code-login';
// @ts-ignore - TSX module resolution
import Register from './modules/register';
import ResetPwd from './modules/reset-pwd';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

type LoginComponent = typeof PwdLogin | typeof CodeLogin | typeof Register | typeof ResetPwd;

interface LoginModuleConfig {
  label: App.I18n.I18nKey;
  component: LoginComponent;
}

/** Login module component map */
const loginModuleMap: Record<UnionKey.LoginModule, LoginModuleConfig> = {
  'pwd-login': {
    label: loginModuleRecord['pwd-login'],
    component: PwdLogin
  },
  'code-login': {
    label: loginModuleRecord['code-login'],
    component: CodeLogin
  },
  register: {
    label: loginModuleRecord.register,
    component: Register
  },
  'reset-pwd': {
    label: loginModuleRecord['reset-pwd'],
    component: ResetPwd
  },
  'bind-wechat': {
    label: loginModuleRecord['bind-wechat'],
    component: PwdLogin // TODO: 添加微信绑定组件
  }
};

export default defineComponent({
  name: 'Login',
  props: {
    module: {
      type: String as PropType<UnionKey.LoginModule>,
      default: 'pwd-login'
    }
  },
  setup(props) {
    const appStore = useAppStore();
    const themeStore = useThemeStore();

    const activeModule = computed(() => {
      const module = props.module || 'pwd-login';
      return loginModuleMap[module] || loginModuleMap['pwd-login'];
    });

    const bgThemeColor = computed(() =>
      themeStore.darkMode ? getPaletteColorByNumber(themeStore.themeColor, 600) : themeStore.themeColor
    );

    const bgColor = computed(() => {
      const COLOR_WHITE = '#ffffff';
      const COLOR_DARK = '#0f172a';
      const ratio = themeStore.darkMode ? 0.8 : 0.15;
      const baseColor = themeStore.darkMode ? COLOR_DARK : COLOR_WHITE;
      return mixColor(baseColor, themeStore.themeColor, ratio);
    });

    // 毛玻璃卡片样式
    const cardStyle = computed(() => ({
      background: themeStore.darkMode
        ? 'rgba(30, 41, 59, 0.75)'
        : 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: themeStore.darkMode
        ? '1px solid rgba(148, 163, 184, 0.1)'
        : '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: themeStore.darkMode
        ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
    }));

    return () => (
      <div
        class="relative size-full flex-center overflow-hidden"
        style={{ backgroundColor: bgColor.value }}
      >
        <WaveBg themeColor={bgThemeColor.value} />

        {/* 毛玻璃登录卡片 */}
        <div
          class="relative z-4 w-auto rd-12px p-24px lt-sm:p-16px shadow-2xl"
          style={cardStyle.value}
        >
          {/* 主题和语言切换 - 右上角 */}
          <div class="absolute top-16px right-16px flex items-center gap-8px lt-sm:(top-12px right-12px gap-6px)">
            <ThemeSchemaSwitch
              themeSchema={themeStore.themeScheme}
              showTooltip={false}
              class="text-18px lt-sm:text-16px cursor-pointer hover:text-primary transition-colors opacity-70 hover:opacity-100"
              onSwitch={themeStore.toggleThemeScheme}
            />
            {themeStore.header.multilingual.visible && (
              <LangSwitch
                lang={appStore.locale}
                langOptions={appStore.localeOptions}
                showTooltip={false}
                class="cursor-pointer opacity-70 hover:opacity-100"
                onChangeLang={appStore.changeLocale}
              />
            )}
          </div>

          <div class="w-360px lt-sm:w-280px">
            {/* 头部 - Logo和标题 */}
            <header class="flex-col items-center mb-16px">
              <div class="flex items-center justify-center mb-6px">
                <SystemLogo class="text-48px text-primary lt-sm:text-40px" />
              </div>
              <h3 class="text-20px text-primary font-600 text-center mb-3px lt-sm:text-18px">
                {$t('system.title')}
              </h3>
              {/* <p class="text-12px text-gray-500 dark:text-gray-400 text-center">
                {$t(activeModule.value.label)}
              </p> */}
            </header>

            {/* 表单内容 */}
            <main>
              <Transition name={themeStore.page.animateMode} mode="out-in" appear>
                {{
                  default: () => {
                    const Component = activeModule.value.component;
                    return <Component />;
                  }
                }}
              </Transition>
            </main>
          </div>
        </div>
      </div>
    );
  }
});


