import type { PropType } from 'vue';
import { defineComponent, watch, reactive, ref } from 'vue';
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NDatePicker,
  NSwitch,
  NButton,
  NSpace
} from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { NotificationFormDialogConfig } from './dialog';

export default defineComponent({
  name: 'NotificationFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<NotificationFormDialogConfig>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const { formRef, validate } = useNaiveForm();

    // 表单数据（使用 reactive 使其可响应）
    const formModel = reactive({ ...props.config.formData });

    // 日期时间选择器的值（时间戳）
    const sentAtTimestamp = ref<number | null>(
      formModel.sentAt ? new Date(formModel.sentAt).getTime() : null
    );
    const expiresAtTimestamp = ref<number | null>(
      formModel.expiresAt ? new Date(formModel.expiresAt).getTime() : null
    );

    // 监听 config.formData 变化，同步到 formModel
    watch(
      () => props.config.formData,
      (newData) => {
        Object.assign(formModel, newData);
        sentAtTimestamp.value = newData.sentAt ? new Date(newData.sentAt).getTime() : null;
        expiresAtTimestamp.value = newData.expiresAt ? new Date(newData.expiresAt).getTime() : null;
      },
      { deep: true, immediate: true }
    );

    // 通知类型选项
    const typeOptions = [
      { label: $t('page.notificationManagement.typeInfo' as any), value: 'info' },
      { label: $t('page.notificationManagement.typeWarning' as any), value: 'warning' },
      { label: $t('page.notificationManagement.typeError' as any), value: 'error' },
      { label: $t('page.notificationManagement.typeSuccess' as any), value: 'success' }
    ];

    // 表单验证规则
    const formRules = {
      title: [
        { required: true, message: $t('page.notificationManagement.titleRequired' as any), trigger: 'blur' }
      ],
      content: [
        { required: true, message: $t('page.notificationManagement.contentRequired' as any), trigger: 'blur' }
      ]
    };

    // 确认提交
    const handleConfirm = async () => {
      const isValid = await validate();
      if (!isValid) return;

      try {
        // 将时间戳转换为 ISO 字符串
        const submitData = {
          ...formModel,
          sentAt: sentAtTimestamp.value ? new Date(sentAtTimestamp.value).toISOString() : '',
          expiresAt: expiresAtTimestamp.value ? new Date(expiresAtTimestamp.value).toISOString() : ''
        };
        await props.config.onConfirm(submitData);
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
        width={800}
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
              <NFormItem label={$t('page.notificationManagement.title' as any)} path="title">
                <NInput v-model:value={formModel.title} placeholder={$t('page.notificationManagement.titlePlaceholder' as any)} />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.content' as any)} path="content">
                <NInput
                  v-model:value={formModel.content}
                  type="textarea"
                  placeholder={$t('page.notificationManagement.contentPlaceholder' as any)}
                  rows={6}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.type' as any)} path="type">
                <NSelect
                  v-model:value={formModel.type}
                  placeholder={$t('page.notificationManagement.typePlaceholder' as any)}
                  clearable
                  options={typeOptions}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.priority' as any)} path="priority">
                <NInputNumber
                  v-model:value={formModel.priority}
                  placeholder={$t('page.notificationManagement.priorityPlaceholder' as any)}
                  min={1}
                  max={10}
                  clearable
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.targetUsers' as any)} path="targetUserIds">
                <NSelect
                  v-model:value={formModel.targetUserIds}
                  placeholder={$t('page.notificationManagement.targetUsersPlaceholder' as any)}
                  multiple
                  clearable
                  filterable
                  options={props.config.userOptions || []}
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.targetRoles' as any)} path="targetRoleCodes">
                <NSelect
                  v-model:value={formModel.targetRoleCodes}
                  placeholder={$t('page.notificationManagement.targetRolesPlaceholder' as any)}
                  multiple
                  clearable
                  filterable
                  options={props.config.roleOptions || []}
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.sentAt' as any)} path="sentAt">
                <NDatePicker
                  v-model:value={sentAtTimestamp.value}
                  type="datetime"
                  placeholder={$t('page.notificationManagement.sentAtPlaceholder' as any)}
                  clearable
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.expiresAt' as any)} path="expiresAt">
                <NDatePicker
                  v-model:value={expiresAtTimestamp.value}
                  type="datetime"
                  placeholder={$t('page.notificationManagement.expiresAtPlaceholder' as any)}
                  clearable
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.notificationManagement.status' as any)} path="isSent">
                <NSwitch v-model:value={formModel.isSent} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isSent ? $t('page.notificationManagement.sent' as any) : $t('page.notificationManagement.unsent' as any)}
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

