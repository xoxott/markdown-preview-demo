import type { PropType } from 'vue';
import { defineComponent, watch, reactive } from 'vue';
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NSwitch,
  NButton,
  NSpace
} from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { AlertFormDialogConfig } from './dialog';

export default defineComponent({
  name: 'AlertFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<AlertFormDialogConfig>,
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

    // 告警级别选项
    const levelOptions = [
      { label: $t('page.alertManagement.levelCritical' as any), value: 'critical' },
      { label: $t('page.alertManagement.levelWarning' as any), value: 'warning' },
      { label: $t('page.alertManagement.levelInfo' as any), value: 'info' }
    ];

    // 指标选项
    const metricOptions = [
      { label: $t('page.alertManagement.metricCpu' as any), value: 'cpu' },
      { label: $t('page.alertManagement.metricMemory' as any), value: 'memory' },
      { label: $t('page.alertManagement.metricDisk' as any), value: 'disk' },
      { label: $t('page.alertManagement.metricNetwork' as any), value: 'network' },
      { label: $t('page.alertManagement.metricResponseTime' as any), value: 'responseTime' }
    ];

    // 表单验证规则
    const formRules = {
      name: [
        { required: true, message: $t('page.alertManagement.nameRequired' as any), trigger: 'blur' }
      ],
      level: [
        { required: true, message: $t('page.alertManagement.levelRequired' as any), trigger: 'change' }
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
              <NFormItem label={$t('page.alertManagement.name' as any)} path="name">
                <NInput v-model:value={formModel.name} placeholder={$t('page.alertManagement.namePlaceholder' as any)} />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.description' as any)} path="description">
                <NInput
                  v-model:value={formModel.description}
                  type="textarea"
                  placeholder={$t('page.alertManagement.descriptionPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.level' as any)} path="level">
                <NSelect
                  v-model:value={formModel.level}
                  placeholder={$t('page.alertManagement.levelPlaceholder' as any)}
                  options={levelOptions}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.metric' as any)} path="metric">
                <NSelect
                  v-model:value={formModel.metric}
                  placeholder={$t('page.alertManagement.metricPlaceholder' as any)}
                  clearable
                  filterable
                  options={metricOptions}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.condition' as any)} path="condition">
                <NInput
                  v-model:value={formModel.condition}
                  placeholder={$t('page.alertManagement.conditionPlaceholder' as any)}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.threshold' as any)} path="threshold">
                <NInputNumber
                  v-model:value={formModel.threshold}
                  placeholder={$t('page.alertManagement.thresholdPlaceholder' as any)}
                  min={0}
                  clearable
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.targetUsers' as any)} path="targetUserIds">
                <NSelect
                  v-model:value={formModel.targetUserIds}
                  placeholder={$t('page.alertManagement.targetUsersPlaceholder' as any)}
                  multiple
                  clearable
                  filterable
                  options={props.config.userOptions || []}
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.targetRoles' as any)} path="targetRoleCodes">
                <NSelect
                  v-model:value={formModel.targetRoleCodes}
                  placeholder={$t('page.alertManagement.targetRolesPlaceholder' as any)}
                  multiple
                  clearable
                  filterable
                  options={props.config.roleOptions || []}
                  style={{ width: '100%' }}
                />
              </NFormItem>
              <NFormItem label={$t('page.alertManagement.status' as any)} path="isEnabled">
                <NSwitch v-model:value={formModel.isEnabled} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isEnabled ? $t('page.alertManagement.enabled' as any) : $t('page.alertManagement.disabled' as any)}
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

