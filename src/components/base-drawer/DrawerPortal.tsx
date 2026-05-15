import { type PropType, defineComponent, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { NConfigProvider, darkTheme } from 'naive-ui';
import { useThemeStore } from '@/store/modules/theme';
import type { DrawerOptions } from './drawer';
import BaseDrawer from './index';

export interface DrawerExposeApi {
  handleClose: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleButtonClick: (button: unknown) => Promise<void>;
}

/** 程序化挂载抽屉的入口组件 — ref 必须在组件 render 内绑定 */
export default defineComponent({
  name: 'DrawerPortal',
  props: {
    options: {
      type: Object as PropType<DrawerOptions>,
      required: true
    },
    visible: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    onExpose: {
      type: Function as PropType<(api: DrawerExposeApi) => void>,
      default: undefined
    }
  },
  emits: ['update:visible', 'update:loading', 'update:disabled'],
  setup(props, { emit }) {
    const themeStore = useThemeStore();
    const { naiveTheme, darkMode } = storeToRefs(themeStore);
    const drawerRef = ref<InstanceType<typeof BaseDrawer> | null>(null);

    watch(
      drawerRef,
      val => {
        if (val) {
          props.onExpose?.(val as unknown as DrawerExposeApi);
        }
      },
      { immediate: true }
    );

    return () => (
      <NConfigProvider theme={darkMode.value ? darkTheme : null} themeOverrides={naiveTheme.value}>
        <BaseDrawer
          ref={drawerRef}
          options={props.options}
          visible={props.visible}
          loading={props.loading}
          disabled={props.disabled}
          onUpdate:visible={(val: boolean) => emit('update:visible', val)}
          onUpdate:loading={(val: boolean) => emit('update:loading', val)}
          onUpdate:disabled={(val: boolean) => emit('update:disabled', val)}
        />
      </NConfigProvider>
    );
  }
});
