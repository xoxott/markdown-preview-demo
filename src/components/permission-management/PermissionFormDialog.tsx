import type { PropType } from 'vue';
import { defineComponent, watch, ref, reactive } from 'vue';
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSwitch,
  NButton,
  NSpace
} from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { PermissionFormDialogConfig } from './dialog';

// 常见的资源和操作选项
const RESOURCE_OPTIONS = [
  { label: '用户', value: 'user' },
  { label: '角色', value: 'role' },
  { label: '权限', value: 'permission' },
  { label: '系统', value: 'system' },
  { label: '其他', value: 'other' }
];

const ACTION_OPTIONS = [
  { label: '创建', value: 'create' },
  { label: '读取', value: 'read' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '管理', value: 'manage' }
];

export default defineComponent({
  name: 'PermissionFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<PermissionFormDialogConfig>,
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
        { required: true, message: $t('page.permissionManagement.nameRequired' as any), trigger: 'blur' }
      ],
      code: [
        { required: true, message: $t('page.permissionManagement.codeRequired' as any), trigger: 'blur' },
        {
          pattern: /^[A-Z_][A-Z0-9_]*$/,
          message: $t('page.permissionManagement.codeInvalid' as any),
          trigger: 'blur'
        }
      ],
      resource: [
        { required: true, message: $t('page.permissionManagement.resourceRequired' as any), trigger: 'change' }
      ],
      action: [
        { required: true, message: $t('page.permissionManagement.actionRequired' as any), trigger: 'change' }
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
        width={700}
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
              <NFormItem label={$t('page.permissionManagement.name' as any)} path="name">
                <NInput v-model:value={formModel.name} placeholder={$t('page.permissionManagement.namePlaceholder' as any)} />
              </NFormItem>
              <NFormItem label={$t('page.permissionManagement.code' as any)} path="code">
                <NInput
                  v-model:value={formModel.code}
                  placeholder={$t('page.permissionManagement.codePlaceholder' as any)}
                  disabled={props.config.isEdit}
                />
              </NFormItem>
              <NFormItem label={$t('page.permissionManagement.resource' as any)} path="resource">
                <NSelect
                  v-model:value={formModel.resource}
                  placeholder={$t('page.permissionManagement.resourcePlaceholder' as any)}
                  options={RESOURCE_OPTIONS}
                  filterable
                  tag
                />
              </NFormItem>
              <NFormItem label={$t('page.permissionManagement.action' as any)} path="action">
                <NSelect
                  v-model:value={formModel.action}
                  placeholder={$t('page.permissionManagement.actionPlaceholder' as any)}
                  options={ACTION_OPTIONS}
                  filterable
                  tag
                />
              </NFormItem>
              <NFormItem label={$t('page.permissionManagement.description' as any)} path="description">
                <NInput
                  v-model:value={formModel.description}
                  type="textarea"
                  placeholder={$t('page.permissionManagement.descriptionPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.permissionManagement.status' as any)} path="isActive">
                <NSwitch v-model:value={formModel.isActive} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isActive ? $t('page.permissionManagement.active' as any) : $t('page.permissionManagement.inactive' as any)}
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

