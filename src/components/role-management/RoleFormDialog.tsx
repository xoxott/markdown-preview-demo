import type { PropType } from 'vue';
import { defineComponent, watch, ref, reactive } from 'vue';
import {
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NButton,
  NSpace
} from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { RoleFormDialogConfig } from './dialog';

export default defineComponent({
  name: 'RoleFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<RoleFormDialogConfig>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const { formRef, validate } = useNaiveForm();

    // 表单数据（使用 reactive 使其可响应）
    const formModel = reactive({ ...props.config.formData });

    // 监听 config.formData 变化，同步到 formModel
    watch(
      () => props.config.formData,
      (newData) => {
        Object.assign(formModel, newData);
      },
      { deep: true, immediate: true }
    );

    // 表单验证规则
    const formRules = {
      name: [
        { required: true, message: $t('page.roleManagement.nameRequired' as any), trigger: 'blur' }
      ],
      code: [
        { required: true, message: $t('page.roleManagement.codeRequired' as any), trigger: 'blur' },
        {
          pattern: /^[A-Z_][A-Z0-9_]*$/,
          message: $t('page.roleManagement.codeInvalid' as any),
          trigger: 'blur'
        }
      ]
    };

    // 确认提交
    const handleConfirm = async () => {
      const isValid = await validate();
      if (!isValid) return;

      try {
        await props.config.onConfirm({ ...formModel });
        handleClose();
      } catch (error: any) {
        // 错误由外部处理
        throw error;
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

    // 监听显示状态，重置表单验证
    watch(
      () => props.show,
      (show) => {
        if (show) {
          formRef.value?.restoreValidation();
        }
      }
    );

    return () => (
      <BaseDialog
        show={props.show}
        title={props.config.isEdit ? $t('common.edit') : $t('common.add')}
        width={600}
        height="auto"
        draggable={true}
        resizable={false}
        onClose={handleClose}
      >
        {{
          default: () => (
            <NForm
              ref={formRef}
              model={formModel}
              rules={formRules}
              labelPlacement="left"
              labelWidth="100px"
            >
              <NFormItem label={$t('page.roleManagement.name' as any)} path="name">
                <NInput v-model:value={formModel.name} placeholder={$t('page.roleManagement.namePlaceholder' as any)} />
              </NFormItem>
              <NFormItem label={$t('page.roleManagement.code' as any)} path="code">
                <NInput
                  v-model:value={formModel.code}
                  placeholder={$t('page.roleManagement.codePlaceholder' as any)}
                  disabled={props.config.isEdit}
                />
              </NFormItem>
              <NFormItem label={$t('page.roleManagement.description' as any)} path="description">
                <NInput
                  v-model:value={formModel.description}
                  type="textarea"
                  placeholder={$t('page.roleManagement.descriptionPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.roleManagement.status' as any)} path="isActive">
                <NSwitch v-model:value={formModel.isActive} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isActive ? $t('page.roleManagement.active' as any) : $t('page.roleManagement.inactive' as any)}
                </span>
              </NFormItem>
            </NForm>
          ),
          footer: () => (
            <NSpace justify="end">
              <NButton onClick={handleCancel}>
                {$t('common.cancel')}
              </NButton>
              <NButton type="primary" onClick={handleConfirm}>
                {$t('common.confirm')}
              </NButton>
            </NSpace>
          )
        }}
      </BaseDialog>
    );
  }
});

