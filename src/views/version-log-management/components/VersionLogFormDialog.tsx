import type { PropType } from 'vue';
import { computed, defineComponent, reactive, ref, watch } from 'vue';
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, NSpace, NSwitch } from 'naive-ui';
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
      newData => {
        Object.assign(formModel, newData);
        releaseDateTimestamp.value = newData.releaseDate
          ? new Date(newData.releaseDate).getTime()
          : null;
        publishedAtTimestamp.value = newData.publishedAt
          ? new Date(newData.publishedAt).getTime()
          : null;
      },
      { deep: true, immediate: true }
    );

    // 版本类型选项
    const typeOptions = [
      { label: $t('page.versionLogManagement.typeMajor'), value: 'major' },
      { label: $t('page.versionLogManagement.typeMinor'), value: 'minor' },
      { label: $t('page.versionLogManagement.typePatch'), value: 'patch' }
    ];

    // 表单验证规则
    const formRules = {
      version: [
        {
          required: true,
          message: $t('page.versionLogManagement.versionRequired'),
          trigger: 'blur'
        },
        {
          pattern: /^\d+\.\d+\.\d+$/,
          message: $t('page.versionLogManagement.versionInvalid'),
          trigger: 'blur'
        }
      ],
      type: [
        {
          required: true,
          message: $t('page.versionLogManagement.typeRequired'),
          trigger: 'change'
        }
      ],
      releaseDate: [
        {
          required: true,
          message: $t('page.versionLogManagement.releaseDateRequired'),
          trigger: 'change'
        }
      ],
      content: [
        {
          required: true,
          message: $t('page.versionLogManagement.contentRequired'),
          trigger: 'blur'
        }
      ]
    };

    // 关闭弹窗
    const handleClose = () => {
      props.config.onClose?.();
      emit('update:show', false);
    };

    const dialogConfig = computed(() => ({
      ...props.config,
      onClose: handleClose,
      title: props.config.title ?? (props.config.isEdit ? $t('common.edit') : $t('common.add')),
      width: props.config.width ?? 800,
      height: props.config.height ?? 'auto',
      draggable: props.config.draggable ?? true,
      resizable: props.config.resizable ?? false
    }));

    // 确认提交
    const handleConfirm = async () => {
      const isValid = await validate();
      if (!isValid) return;

      // 将时间戳转换为 ISO 字符串
      const submitData = {
        ...formModel,
        releaseDate: releaseDateTimestamp.value
          ? new Date(releaseDateTimestamp.value).toISOString()
          : '',
        publishedAt: publishedAtTimestamp.value
          ? new Date(publishedAtTimestamp.value).toISOString()
          : ''
      };
      await props.config.onConfirm(submitData);
      handleClose();
    };

    // 取消
    const handleCancel = () => {
      props.config.onCancel?.();
      handleClose();
    };

    // 监听显示状态，重置表单验证
    watch(
      () => props.show,
      show => {
        if (show) {
          formRef.value?.restoreValidation();
        }
      }
    );

    return () => (
      <BaseDialog show={props.show} config={dialogConfig.value}>
        {{
          default: () => (
            <NForm
              ref={formRef}
              model={formModel}
              rules={formRules}
              labelPlacement="left"
              labelWidth="100px"
            >
              <NFormItem label={$t('page.versionLogManagement.version')} path="version">
                <NInput
                  v-model:value={formModel.version}
                  placeholder={$t('page.versionLogManagement.versionPlaceholder')}
                  disabled={props.config.isEdit}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.type')} path="type">
                <NSelect
                  v-model:value={formModel.type}
                  placeholder={$t('page.versionLogManagement.typePlaceholder')}
                  options={typeOptions}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.releaseDate')} path="releaseDate">
                <NDatePicker
                  v-model:value={releaseDateTimestamp.value}
                  type="date"
                  placeholder={$t('page.versionLogManagement.releaseDatePlaceholder')}
                  style={{ width: '100%' }}
                  onUpdateValue={value => {
                    releaseDateTimestamp.value = value;
                  }}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.content')} path="content">
                <NInput
                  v-model:value={formModel.content}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.contentPlaceholder')}
                  rows={4}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.features')} path="features">
                <NInput
                  v-model:value={formModel.features}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.featuresPlaceholder')}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.fixes')} path="fixes">
                <NInput
                  v-model:value={formModel.fixes}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.fixesPlaceholder')}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.improvements')} path="improvements">
                <NInput
                  v-model:value={formModel.improvements}
                  type="textarea"
                  placeholder={$t('page.versionLogManagement.improvementsPlaceholder')}
                  rows={3}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.publishedAt')} path="publishedAt">
                <NDatePicker
                  v-model:value={publishedAtTimestamp.value}
                  type="datetime"
                  placeholder={$t('page.versionLogManagement.publishedAtPlaceholder')}
                  clearable
                  style={{ width: '100%' }}
                  onUpdateValue={value => {
                    publishedAtTimestamp.value = value;
                  }}
                />
              </NFormItem>
              <NFormItem label={$t('page.versionLogManagement.status')} path="isPublished">
                <NSwitch v-model:value={formModel.isPublished} />
                <span style={{ marginLeft: '8px' }}>
                  {formModel.isPublished
                    ? $t('page.versionLogManagement.published')
                    : $t('page.versionLogManagement.unpublished')}
                </span>
              </NFormItem>
            </NForm>
          ),
          footer: () => (
            <NSpace justify="end">
              <NButton onClick={handleCancel}>{$t('common.cancel')}</NButton>
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
