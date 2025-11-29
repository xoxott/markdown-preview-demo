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
import PwdLogin from './modules/pwd-login';
import Register from './modules/register';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

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
      if (module === 'pwd-login') {
        return {
          label: loginModuleRecord['pwd-login'],
          component: PwdLogin
        };
      }
      if (module === 'register') {
        return {
          label: loginModuleRecord.register,
          component: Register
        };
      }
      // Default to password login
      return {
        label: loginModuleRecord['pwd-login'],
        component: PwdLogin
      };
    });

    const bgThemeColor = computed(() =>
      themeStore.darkMode ? getPaletteColorByNumber(themeStore.themeColor, 600) : themeStore.themeColor
    );

    const bgColor = computed(() => {
      const COLOR_WHITE = '#ffffff';
      const ratio = themeStore.darkMode ? 0.5 : 0.2;
      return mixColor(COLOR_WHITE, themeStore.themeColor, ratio);
    });

    return () => (
      <div
        class="relative size-full flex-center overflow-hidden"
        style={{ backgroundColor: bgColor.value }}
      >
        <WaveBg themeColor={bgThemeColor.value} />
        <NCard bordered={false} class="relative z-4 w-auto rd-12px">
          <div class="w-400px lt-sm:w-300px">
            <header class="flex-y-center justify-between">
              <SystemLogo class="text-64px text-primary lt-sm:text-48px" />
              <h3 class="text-28px text-primary font-500 lt-sm:text-22px">{$t('system.title')}</h3>
              <div class="i-flex-col">
                <ThemeSchemaSwitch
                  themeSchema={themeStore.themeScheme}
                  showTooltip={false}
                  class="text-20px lt-sm:text-18px"
                  onSwitch={themeStore.toggleThemeScheme}
                />
                {themeStore.header.multilingual.visible && (
                  <LangSwitch
                    lang={appStore.locale}
                    langOptions={appStore.localeOptions}
                    showTooltip={false}
                    onChangeLang={appStore.changeLocale}
                  />
                )}
              </div>
            </header>
            <main class="pt-24px">
              <h3 class="text-18px text-primary font-medium">{$t(activeModule.value.label)}</h3>
              <div class="pt-24px">
                <Transition name={themeStore.page.animateMode} mode="out-in" appear>
                  {{
                    default: () => {
                      const Component = activeModule.value.component;
                      return <Component />;
                    }
                  }}
                </Transition>
              </div>
            </main>
          </div>
        </NCard>
      </div>
    );
  }
});

