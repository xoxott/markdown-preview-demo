import { type PropType, Transition, computed, defineComponent } from 'vue';
import { getPaletteColorByNumber, mixColor } from '@suga/color';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import SystemLogo from '@/components/common/system-logo.vue';
import ThemeSchemaSwitch from '@/components/common/theme-schema-switch.vue';
import LangSwitch from '@/components/common/lang-switch.vue';
import WaveBg from '@/components/custom/wave-bg.vue';
import PwdLogin from './modules/pwd-login';
import CodeLogin from './modules/code-login';
import Register from './modules/register';
import ResetPwd from './modules/reset-pwd';

type LoginComponent = typeof PwdLogin | typeof CodeLogin | typeof Register | typeof ResetPwd;

/** 路由 module → 对应表单组件 */
const loginModuleMap: Record<UnionKey.LoginModule, LoginComponent> = {
  'pwd-login': PwdLogin,
  'code-login': CodeLogin,
  'register': Register,
  'reset-pwd': ResetPwd,
  /** 微信绑定占位，暂复用密码登录表单 */
  'bind-wechat': PwdLogin
};

const DEFAULT_MODULE: UnionKey.LoginModule = 'pwd-login';

export default defineComponent({
  name: 'Login',
  props: {
    module: {
      type: String as PropType<UnionKey.LoginModule>,
      default: DEFAULT_MODULE
    }
  },
  setup(props) {
    const appStore = useAppStore();
    const themeStore = useThemeStore();

    const ActiveForm = computed(
      () => loginModuleMap[props.module || DEFAULT_MODULE] ?? loginModuleMap[DEFAULT_MODULE]
    );

    const bgThemeColor = computed(() =>
      themeStore.darkMode
        ? getPaletteColorByNumber(themeStore.themeColor, 600)
        : themeStore.themeColor
    );

    const bgColor = computed(() => {
      const base = themeStore.darkMode ? '#0f172a' : '#ffffff';
      const ratio = themeStore.darkMode ? 0.8 : 0.15;
      return mixColor(base, themeStore.themeColor, ratio);
    });

    const cardStyle = computed(() => ({
      background: themeStore.darkMode ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.75)',
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

        <div
          class="relative z-4 w-auto rd-12px p-24px shadow-2xl lt-sm:p-16px"
          style={cardStyle.value}
        >
          <div class="absolute right-16px top-16px flex items-center gap-8px lt-sm:(right-12px top-12px gap-6px)">
            <ThemeSchemaSwitch
              themeSchema={themeStore.themeScheme}
              showTooltip={false}
              class="cursor-pointer text-18px opacity-70 transition-colors lt-sm:text-16px hover:text-primary hover:opacity-100"
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
            <header class="mb-16px flex-col items-center">
              <SystemLogo class="mb-6px text-48px text-primary lt-sm:text-40px" />
              <h3 class="text-center text-20px text-primary font-600 lt-sm:text-18px">
                {$t('system.title')}
              </h3>
            </header>

            <main>
              <Transition name={themeStore.page.animateMode} mode="out-in" appear>
                {{
                  default: () => {
                    const Form = ActiveForm.value;
                    return <Form key={props.module || DEFAULT_MODULE} />;
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
