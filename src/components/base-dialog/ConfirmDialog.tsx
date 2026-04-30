/** ConfirmDialog - 确认对话框 用于确认操作(删除、覆盖等) */

import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { NButton, NIcon, NSpace, useThemeVars } from 'naive-ui';
import { CheckmarkCircle, CloseCircle, InformationCircle, WarningOutline } from '@vicons/ionicons5';
import type { ConfirmDialogConfig } from './dialog';
import BaseDialog from './index';

export default defineComponent({
  name: 'ConfirmDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<ConfirmDialogConfig>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const themeVars = useThemeVars();
    const loading = ref(false);

    // 获取图标组件
    const getIcon = () => {
      const type = props.config.type || 'info';
      const iconMap = {
        info: InformationCircle,
        success: CheckmarkCircle,
        warning: WarningOutline,
        error: CloseCircle
      };
      return iconMap[type];
    };

    // 获取图标颜色
    const getIconColor = () => {
      const type = props.config.type || 'info';
      const colorMap = {
        info: themeVars.value.infoColor,
        success: themeVars.value.successColor,
        warning: themeVars.value.warningColor,
        error: themeVars.value.errorColor
      };
      return colorMap[type];
    };

    // 关闭弹窗
    const handleClose = () => {
      props.config.onCancel?.();
      emit('update:show', false);
    };

    const dialogConfig = computed(() => ({
      ...props.config,
      onClose: handleClose,
      title: props.config.title ?? '确认',
      width: props.config.width ?? 450,
      height: props.config.height ?? 'auto',
      draggable: props.config.draggable ?? true,
      resizable: props.config.resizable ?? false,
      position: 'center' as const
    }));

    // 确认
    const handleConfirm = async () => {
      loading.value = true;
      try {
        await props.config.onConfirm();
        handleClose();
      } catch (error) {
        console.error('Confirm action failed:', error);
      } finally {
        loading.value = false;
      }
    };

    // 取消
    const handleCancel = () => {
      props.config.onCancel?.();
      handleClose();
    };

    return () => {
      const IconComponent = getIcon();
      const showCancel = props.config.showCancel !== false;

      return (
        <BaseDialog show={props.show} config={dialogConfig.value}>
          {{
            default: () => (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <NIcon size={24} color={getIconColor()} style={{ flexShrink: 0, marginTop: '2px' }}>
                  <IconComponent />
                </NIcon>
                <div style={{ flex: 1, color: themeVars.value.textColor2, lineHeight: '1.6' }}>
                  {typeof props.config.content === 'string' ? (
                    <div>{props.config.content}</div>
                  ) : (
                    props.config.content
                  )}
                </div>
              </div>
            ),
            footer: () => (
              <NSpace justify="end">
                {showCancel && (
                  <NButton onClick={handleCancel} disabled={loading.value}>
                    {props.config.cancelText || '取消'}
                  </NButton>
                )}
                <NButton
                  type={props.config.type === 'error' ? 'error' : 'primary'}
                  loading={loading.value}
                  onClick={handleConfirm}
                >
                  {props.config.confirmText || '确定'}
                </NButton>
              </NSpace>
            )
          }}
        </BaseDialog>
      );
    };
  }
});
