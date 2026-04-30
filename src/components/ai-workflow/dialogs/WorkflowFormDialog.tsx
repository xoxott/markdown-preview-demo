import { type PropType, computed, defineComponent, reactive, ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import BaseDialog from '@/components/base-dialog';
import type { WorkflowDialogOptions } from './dialog';

export default defineComponent({
  name: 'WorkflowFormDialog',
  props: {
    show: { type: Boolean, required: true },
    config: {
      type: Object as PropType<WorkflowDialogOptions>,
      required: true
    }
  },
  emits: ['update:show'],
  setup(props, { emit }) {
    const { formRef, validate, restoreValidation } = useNaiveForm();
    const formModel = reactive({
      name: props.config.formData?.name ?? '',
      description: props.config.formData?.description ?? '',
      status: props.config.formData?.status ?? 'draft'
    });

    const handleClose = () => {
      props.config.onClose?.();
      emit('update:show', false);
    };

    const dialogConfig = computed(() => ({
      ...props.config,
      onClose: handleClose,
      title: props.config.title ?? (props.config.isEdit ? $t('common.edit') : $t('common.add')),
      width: props.config.width ?? 600,
      height: props.config.height ?? 'auto',
      draggable: props.config.draggable ?? true,
      resizable: props.config.resizable ?? false,
      maskClosable: props.config.maskClosable ?? false
    }));

    const handleConfirm = async () => {
      if (!(await validate())) return;
      await props.config.onConfirm(formModel);
      handleClose();
    };

    const handleCancel = () => {
      props.config.onCancel?.();
      handleClose();
    };

    watch(
      () => props.show,
      show => {
        if (show) {
          restoreValidation();
        }
      }
    );

    return () => (
      <BaseDialog show={props.show} config={dialogConfig.value}>
        {{
          default: () => (
            <NForm ref={formRef} model={formModel}>
              <NFormItem label={$t('page.logManagement.name')} path="name">
                <NInput
                  v-model:value={formModel.name}
                  placeholder={$t('page.logManagement.name')}
                />
              </NFormItem>
              <NFormItem label={$t('page.logManagement.description')} path="description">
                <NInput
                  v-model:value={formModel.description}
                  placeholder={$t('page.logManagement.description')}
                />
              </NFormItem>
              <NFormItem label={$t('page.logManagement.status')} path="status">
                <NSelect
                  v-model:value={formModel.status}
                  options={[
                    { label: $t('page.logManagement.draft'), value: 'draft' },
                    { label: $t('page.logManagement.active'), value: 'active' },
                    { label: $t('page.logManagement.archived'), value: 'archived' }
                  ]}
                  placeholder={$t('page.logManagement.status')}
                />
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
