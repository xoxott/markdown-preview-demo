import type { PropType } from 'vue';
import { defineComponent, watch, reactive, ref } from 'vue';
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDatePicker,
  NSwitch,
  NButton,
  NSpace
} from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { VersionLogFormDialogConfig } from './dialog';

export default defineComponent({
  name: 'VersionLogFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<VersionLogFormDialogConfig>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const { formRef, validate } = useNaiveForm();

    // 表单数据（使用 reactive 使其可响应）
    const formModel = reactive({ ...props.config.formData });

    // 日期时间选择器的值（时间戳）
    const releaseDateTimestamp = ref<number | null>(
      formModel.releaseDate ? new Date(formModel.releaseDate).getTime() : null
    );
    const publishedAtTimestamp = ref<number | null>(
      formModel.publishedAt ? new Date(formModel.publishedAt).getTime() : null
    );

    // 监听 config.formData 变化，同步到 formModel
    watch(
      () => props.config.formData,
      (newData) => {
        Object.assign(formModel, newData);
        releaseDateTimestamp.value = newData.releaseDate ? new Date(newData.releaseDate).getTime() : null;
        publishedAtTimestamp.value = newData.publishedAt ? new Date(newData.publishedAt).getTime() : null;
      },
      { deep: true, immediate: true }
    );

    // 版本类型选项
    const typeOptions = [
      { label: $t('page.versionLogManagement.typeMajor' as any), value: 'major' },
      { label: $t('page.versionLogManagement.typeMinor' as any), value: 'minor' },
      { label: $t('page.versionLogManagement.typePatch' as any), value: 'patch' }
    ];

    // 表单验证规则
    const formRules = {
      version: [
        { required: true, message: $t('page.versionLogManagement.versionRequired' as any), trigger: 'blur' },
        {
          pattern: /^\d+\.\d+\.\d+$/,
          message: $t('page.versionLogManagement.versionInvalid' as any),
          trigger: 'blur'
        }
      ],
      type: [
        { required: true, message: $t('page.versionLogManagement.typeRequired' as any), trigger: 'change' }
      ],
      releaseDate: [
        { required: true, message: $t('page.versionLogManagement.releaseDateRequired' as any), trigger: 'change' }
      ],
      content: [
        { required: true, message: $t('page.versionLogManagement.contentRequired' as any), trigger: 'blur' }
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
          releaseDate: releaseDateTimestamp.value ? new Date(releaseDateTimestamp.value).toISOString() : '',
          publishedAt: publishedAtTimestamp.value ? new Date(publishedAtTimestamp.value).toISOString() : ''
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
              <NFormItem label={$t('page.versionLogManagement.version' as any)} path="version">
                <NInput
                  v-model:value={formModel.version}
                  placeholder={$t('page.versionLogManagement.versionPlaceholder' as any)}
                  disabled={props.config.isEdit}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.type' as any)} path="type">
                <NSelect
                  v-model:value={formModel.type}
                  placeholder={$t('page.versionLogManagement.typePlaceholder' as any)}
                  options={typeOptions}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.releaseDate' as any)} path="releaseDate">
                <NDatePicker
                  v-model:value={releaseDateTimestamp.value}
                  type="date"
                  placeholder={$t('page.versionLogManagement.releaseDatePlaceholder' as any)}
                  style={{ width: '100%' }}
                  onUpdateValue={(value) => {
                    releaseDateTimestamp.value = value;
                  }}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.content' as any)} path="content">
                <NInput
                  v-model:value={formModel.content}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.contentPlaceholder' as any)}
                  rows={4}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.features' as any)} path="features">
                <NInput
                  v-model:value={formModel.features}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.featuresPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.fixes' as any)} path="fixes">
                <NInput
                  v-model:value={formModel.fixes}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.fixesPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.improvements' as any)} path="improvements">
                <NInput
                  v-model:value={formModel.improvements}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.improvementsPlaceholder' as any)}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.publishedAt' as any)} path="publishedAt">
                <NDatePicker
                  v-model:value={publishedAtTimestamp.value}
                  type="datetime"
                  placeholder={$t('page.versionLogManagement.publishedAtPlaceholder' as any)}
                  clearable
                  style={{ width: '100%' }}
                  onUpdateValue={(value) => {
                    publishedAtTimestamp.value = value;
                  }}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.status' as any)} path="isPublished">
                <NSwitch v-model:value={formModel.isPublished} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isPublished ? $t('page.versionLogManagement.published' as any) : $t('page.versionLogManagement.unpublished' as any)}
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

