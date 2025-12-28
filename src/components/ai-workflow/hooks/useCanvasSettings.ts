/**
 * 画布设置管理 Hook
 */
import { ref, computed } from 'vue';
import type { CanvasSettings, ConnectionLineStyle, CanvasBackground } from '../types/canvas-settings';
import { DEFAULT_CANVAS_SETTINGS } from '../types/canvas-settings';

export function useCanvasSettings(initialSettings?: Partial<CanvasSettings>) {
  const settings = ref<CanvasSettings>({
    ...DEFAULT_CANVAS_SETTINGS,
    ...initialSettings
  });

  const connectionLineStyle = computed(() => settings.value.connectionLine);
  const backgroundSettings = computed(() => settings.value.background);

  const updateConnectionLineStyle = (style: ConnectionLineStyle) => {
    settings.value.connectionLine = style;
  };

  const updateBackgroundSettings = (background: CanvasBackground) => {
    settings.value.background = background;
  };

  const resetSettings = () => {
    settings.value = { ...DEFAULT_CANVAS_SETTINGS };
  };

  return {
    settings,
    connectionLineStyle,
    backgroundSettings,
    updateConnectionLineStyle,
    updateBackgroundSettings,
    resetSettings
  };
}

