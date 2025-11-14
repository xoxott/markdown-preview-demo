/** RenameDialog - 重命名对话框 用于文件/文件夹重命名 */

import type { PropType } from 'vue';
import { defineComponent, nextTick, ref, watch } from 'vue';
import { NButton, NInput, NSpace, useThemeVars } from 'naive-ui';
import type { RenameDialogConfig } from '../../base-dialog/dialog';
import BaseDialog from '@/components/base-dialog'

export default defineComponent({
  name: 'RenameDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<RenameDialogConfig>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const themeVars = useThemeVars();
    const inputRef = ref<InstanceType<typeof NInput> | null>(null);
    const inputValue = ref('');
    const errorMessage = ref('');
    const loading = ref(false);

    // 初始化输入值
    watch(
      () => props.show,
      show => {
        if (show) {
          inputValue.value = props.config.defaultValue;
          errorMessage.value = '';

          // 聚焦并选中文件名(不含扩展名)
          nextTick(() => {
            inputRef.value?.focus();

            // 选中文件名部分(不含扩展名)
            const lastDotIndex = inputValue.value.lastIndexOf('.');
            if (lastDotIndex > 0) {
              inputRef.value?.select();
              const input = inputRef.value?.$el?.querySelector('input');
              if (input) {
                input.setSelectionRange(0, lastDotIndex);
              }
            } else {
              inputRef.value?.select();
            }
          });
        }
      }
    );

    // 验证输入
    const validateInput = (value: string): boolean => {
      if (!value.trim()) {
        errorMessage.value = '名称不能为空';
        return false;
      }

      // 检查非法字符
      const invalidChars = /[<>:"/\\|?*]/;
      if (invalidChars.test(value)) {
        errorMessage.value = '名称不能包含以下字符: < > : " / \\ | ? *';
        return false;
      }

      // 自定义验证器
      if (props.config.validator) {
        const result = props.config.validator(value);
        if (result !== true) {
          errorMessage.value = result;
          return false;
        }
      }

      errorMessage.value = '';
      return true;
    };

    // 处理输入变化
    const handleInput = (value: string) => {
      inputValue.value = value;
      if (errorMessage.value) {
        validateInput(value);
      }
    };

    // 确认重命名
    const handleConfirm = async () => {
      if (!validateInput(inputValue.value)) {
        return;
      }

      if (inputValue.value === props.config.defaultValue) {
        handleClose();
        return;
      }

      loading.value = true;
      try {
        await props.config.onConfirm(inputValue.value);
        handleClose();
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '重命名失败';
      } finally {
        loading.value = false;
      }
    };

    // 取消
    const handleCancel = () => {
      props.config.onCancel?.();
      handleClose();
    };

    // 关闭弹窗
    const handleClose = () => {
      emit('update:show', false);
    };

    // 键盘事件
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading.value) {
        e.preventDefault();
        handleConfirm();
      }
    };

    return () => (
      <BaseDialog
        show={props.show}
        title={props.config.title || '重命名'}
        width={450}
        height="auto"
        draggable={true}
        resizable={false}
        onClose={handleClose}
      >
        {{
          default: () => (
            <div>
              <NInput
                ref={inputRef}
                value={inputValue.value}
                placeholder={props.config.placeholder || '请输入新名称'}
                status={errorMessage.value ? 'error' : undefined}
                disabled={loading.value}
                onInput={handleInput}
                onKeydown={handleKeydown}
                style={{ marginBottom: errorMessage.value ? '8px' : '0' }}
              />
              {errorMessage.value && (
                <div
                  style={{
                    color: themeVars.value.errorColor,
                    fontSize: '12px',
                    marginTop: '4px'
                  }}
                >
                  {errorMessage.value}
                </div>
              )}
            </div>
          ),
          footer: () => (
            <NSpace justify="end">
              <NButton onClick={handleCancel} disabled={loading.value}>
                取消
              </NButton>
              <NButton type="primary" loading={loading.value} onClick={handleConfirm}>
                确定
              </NButton>
            </NSpace>
          )
        }}
      </BaseDialog>
    );
  }
});
