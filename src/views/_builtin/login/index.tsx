import { type PropType, Transition, computed, defineComponent } from 'vue';
import { getPaletteColorByNumber } from '@suga/color';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import SystemLogo from '@/components/common/system-logo.vue';
import ThemeSchemaSwitch from '@/components/common/theme-schema-switch.vue';
import LangSwitch from '@/components/common/lang-switch.vue';
import WaveBg from '@/components/custom/wave-bg';
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

    /** 中性底衬，避免与主题色块同色导致毛玻璃「糊成一片」 */
    const pageBaseColor = computed(() => (themeStore.darkMode ? '#0a0f1a' : '#d8e2f2'));

    const cardStyle = computed(() => ({
      background: themeStore.darkMode ? 'rgba(15, 23, 42, 0.38)' : 'rgba(255, 255, 255, 0.38)',
      backdropFilter: 'blur(32px) saturate(200%)',
      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
      border: themeStore.darkMode
        ? '1px solid rgba(148, 163, 184, 0.22)'
        : '1px solid rgba(255, 255, 255, 0.55)',
      boxShadow: themeStore.darkMode
        ? '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
        : '0 8px 32px rgba(31, 38, 135, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.65)'
    }));

    return () => (
      <div
        class="relative size-full flex-center overflow-hidden"
        style={{ backgroundColor: pageBaseColor.value }}
      >
        <WaveBg themeColor={bgThemeColor.value} darkMode={themeStore.darkMode} />

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
