import { computed } from 'vue';
import { darkTheme } from 'naive-ui';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { naiveDateLocales, naiveLocales } from '@/locales/naive';

export function useModalProvider() {
  const appStore = useAppStore();
  const themeStore = useThemeStore();

  const theme = computed(() => (themeStore.darkMode ? darkTheme : undefined));
  const themeOverrides = computed(() => themeStore.naiveTheme);
  const locale = computed(() => naiveLocales[appStore.locale]);
  const dateLocale = computed(() => naiveDateLocales[appStore.locale]);

  return {
    theme,
    themeOverrides,
    locale,
    dateLocale
  };
}
