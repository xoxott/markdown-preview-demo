import { defineComponent, type PropType } from 'vue';
import { NForm, NFormItem, NInput } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload-v2';

interface Props {
  settings: Partial<UploadConfig>;
  onUpdate: (key: keyof UploadConfig, value: unknown) => void;
}

export default defineComponent({
  name: 'ApiSettings',
  props: {
    settings: {
      type: Object as PropType<Partial<UploadConfig>>,
      required: true
    },
    onUpdate: {
      type: Function as PropType<Props['onUpdate']>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <NForm label-placement="top" class="mt-4">
        <NFormItem label="分片上传 URL">
          <NInput
            value={props.settings.uploadChunkUrl}
            onUpdateValue={(value) => props.onUpdate('uploadChunkUrl', value)}
          />
        </NFormItem>
        <NFormItem label="合并分片 URL">
          <NInput
            value={props.settings.mergeChunksUrl}
            onUpdateValue={(value) => props.onUpdate('mergeChunksUrl', value)}
          />
        </NFormItem>
        <NFormItem label="秒传检查 URL (可选)">
          <NInput
            value={props.settings.checkFileUrl}
            onUpdateValue={(value) => props.onUpdate('checkFileUrl', value || undefined)}
          />
        </NFormItem>
        <NFormItem label="取消上传 URL (可选)">
          <NInput
            value={props.settings.cancelUploadUrl}
            onUpdateValue={(value) => props.onUpdate('cancelUploadUrl', value || undefined)}
          />
        </NFormItem>
      </NForm>
    );
  }
});

