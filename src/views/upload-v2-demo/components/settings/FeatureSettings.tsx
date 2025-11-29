import { defineComponent, type PropType } from 'vue';
import { NForm, NFormItem, NSwitch } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload-v2';

interface Props {
  settings: Partial<UploadConfig>;
  onUpdate: (key: keyof UploadConfig, value: unknown) => void;
}

export default defineComponent({
  name: 'FeatureSettings',
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
      <NForm label-placement="left" label-width="140" class="mt-4">
        <NFormItem label="断点续传">
          <NSwitch
            value={props.settings.enableResume}
            onUpdateValue={(value) => props.onUpdate('enableResume', value)}
          />
        </NFormItem>
        <NFormItem label="文件去重">
          <NSwitch
            value={props.settings.enableDeduplication}
            onUpdateValue={(value) => props.onUpdate('enableDeduplication', value)}
          />
        </NFormItem>
        <NFormItem label="预览功能">
          <NSwitch
            value={props.settings.enablePreview}
            onUpdateValue={(value) => props.onUpdate('enablePreview', value)}
          />
        </NFormItem>
        <NFormItem label="自动压缩">
          <NSwitch
            value={props.settings.enableCompression}
            onUpdateValue={(value) => props.onUpdate('enableCompression', value)}
          />
        </NFormItem>
        <NFormItem label="使用 Worker">
          <NSwitch
            value={props.settings.useWorker}
            onUpdateValue={(value) => props.onUpdate('useWorker', value)}
          />
        </NFormItem>
        <NFormItem label="启用缓存">
          <NSwitch
            value={props.settings.enableCache}
            onUpdateValue={(value) => props.onUpdate('enableCache', value)}
          />
        </NFormItem>
        <NFormItem label="网络自适应">
          <NSwitch
            value={props.settings.enableNetworkAdaptation}
            onUpdateValue={(value) => props.onUpdate('enableNetworkAdaptation', value)}
          />
        </NFormItem>
        <NFormItem label="智能重试">
          <NSwitch
            value={props.settings.enableSmartRetry}
            onUpdateValue={(value) => props.onUpdate('enableSmartRetry', value)}
          />
        </NFormItem>
      </NForm>
    );
  }
});

