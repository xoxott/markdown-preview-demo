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
import type { UserFormDialogConfig } from './dialog';

export default defineComponent({
  name: 'UserFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<UserFormDialogConfig>,
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
      username: [
        { required: true, message: $t('form.userName.required'), trigger: 'blur' }
      ],
      email: [
        { required: true, message: $t('form.email.required'), trigger: 'blur' },
        { type: 'email' as const, message: $t('form.email.invalid'), trigger: 'blur' }
      ],
      password: [
        {
          validator: (rule: any, value: string) => {
            if (!props.config.isEdit && !value) {
              return new Error($t('form.pwd.required'));
            }
            if (value && (value.length < 6 || value.length > 18)) {
              return new Error($t('form.pwd.invalid'));
            }
            return true;
          },
          trigger: 'blur'
        }
      ],
      roleIds: [
        { required: true, type: 'array' as const, min: 1, message: $t('page.userManagement.roleRequired' as any), trigger: 'change' }
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
              labelWidth="80px"
            >
              <NFormItem label={$t('page.userManagement.username')} path="username">
                <NInput v-model:value={formModel.username} placeholder={$t('form.userName.required')} />
              </NFormItem>
              <NFormItem label={$t('page.userManagement.email')} path="email">
                <NInput v-model:value={formModel.email} placeholder={$t('form.email.required')} />
              </NFormItem>
              <NFormItem label="密码" path="password">
                <NInput
                  v-model:value={formModel.password}
                  type="password"
                  placeholder={props.config.isEdit ? $t('page.userManagement.passwordPlaceholderEdit' as any) : $t('page.userManagement.passwordPlaceholder' as any)}
                  showPasswordOn="click"
                />
              </NFormItem>
              <NFormItem label={$t('page.userManagement.role')} path="roleIds">
                <NSelect
                  v-model:value={formModel.roleIds}
                  multiple
                  placeholder={$t('page.userManagement.rolePlaceholder' as any)}
                  options={props.config.roleOptions as any}
                />
              </NFormItem>
              <NFormItem label={$t('page.userManagement.status')} path="isActive">
                <NSwitch v-model:value={formModel.isActive} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isActive ? $t('page.userManagement.active') : $t('page.userManagement.inactive')}
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

