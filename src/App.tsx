import { defineComponent, computed } from 'vue';
import { NConfigProvider, NWatermark, darkTheme } from 'naive-ui';
import type { WatermarkProps } from 'naive-ui';
import { RouterView } from 'vue-router';
import { useAppStore } from './store/modules/app';
import { useThemeStore } from './store/modules/theme';
import { naiveDateLocales, naiveLocales } from './locales/naive';
import AppProvider from './components/common/app-provider.vue';

export default defineComponent({
  name: 'App',
  setup() {
    const appStore = useAppStore();
    const themeStore = useThemeStore();

    const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

    const naiveLocale = computed(() => {
      return naiveLocales[appStore.locale];
    });

    const naiveDateLocale = computed(() => {
      return naiveDateLocales[appStore.locale];
    });

    const watermarkProps = computed<WatermarkProps>(() => {
      return {
        content: themeStore.watermark.text,
        cross: true,
        fullscreen: true,
        fontSize: 16,
        lineHeight: 16,
        width: 384,
        height: 384,
        xOffset: 12,
        yOffset: 60,
        rotate: -15,
        zIndex: 9999
      };
    });

    return () => (
      <NConfigProvider
        theme={naiveDarkTheme.value}
        themeOverrides={themeStore.naiveTheme}
        locale={naiveLocale.value}
        dateLocale={naiveDateLocale.value}
        class="h-full"
      >
        <AppProvider>
          <RouterView class="bg-layout" />
          {themeStore.watermark.visible && <NWatermark {...watermarkProps.value} />}
        </AppProvider>
      </NConfigProvider>
    );
  }
});

