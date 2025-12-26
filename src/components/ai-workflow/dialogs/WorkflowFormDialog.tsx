import { defineComponent, reactive, ref, type PropType } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSelect, NSpace, NDynamicTags } from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';
import type { WorkflowFormData } from './dialog';

export default defineComponent({
  name: 'WorkflowFormDialog',
  props: {
    formData: {
      type: Object as PropType<WorkflowFormData>,
      required: true
    },
    isEdit: {
      type: Boolean,
      default: false
    },
    onConfirm: {
      type: Function as PropType<(data: WorkflowFormData) => Promise<void>>,
      required: true
    },
    onCancel: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    const { formRef, validate } = useNaiveForm();
    const loading = ref(false);

    const model = reactive<WorkflowFormData>({
      name: props.formData.name || '',
      description: props.formData.description || '',
      tags: props.formData.tags || [],
      status: props.formData.status || 'draft'
    });

    const rules = {
      name: [
        {
          required: true,
          message: '请输入工作流名称',
          trigger: 'blur'
        },
        {
          min: 2,
          max: 50,
          message: '名称长度应在 2-50 个字符之间',
          trigger: 'blur'
        }
      ]
    };

    const statusOptions = [
      { label: '草稿', value: 'draft' },
      { label: '已发布', value: 'published' },
      { label: '已归档', value: 'archived' }
    ];

    async function handleConfirm() {
      const isValid = await validate();
      if (!isValid) return;

      loading.value = true;
      try {
        await props.onConfirm(model);
      } finally {
        loading.value = false;
      }
    }

    return () => (
      <div class="p-4">
        <NForm ref={formRef} model={model} rules={rules} labelPlacement="left" labelWidth={80}>
          <NFormItem label="名称" path="name">
            <NInput
              v-model:value={model.name}
              placeholder="请输入工作流名称"
              maxlength={50}
              showCount
            />
          </NFormItem>

          <NFormItem label="描述" path="description">
            <NInput
              v-model:value={model.description}
              type="textarea"
              placeholder="请输入工作流描述"
              rows={3}
              maxlength={200}
              showCount
            />
          </NFormItem>

          <NFormItem label="标签" path="tags">
            <NDynamicTags v-model:value={model.tags} />
          </NFormItem>

          {props.isEdit && (
            <NFormItem label="状态" path="status">
              <NSelect v-model:value={model.status} options={statusOptions} />
            </NFormItem>
          )}
        </NForm>

        <div class="flex justify-end mt-4">
          <NSpace>
            <NButton onClick={props.onCancel}>取消</NButton>
            <NButton type="primary" loading={loading.value} onClick={handleConfirm}>
              确定
            </NButton>
          </NSpace>
        </div>
      </div>
    );
  }
});

