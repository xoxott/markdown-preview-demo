import { defineComponent, type PropType } from 'vue';
import { NForm, NFormItem, NInputNumber } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload-v2';

interface Props {
  settings: Partial<UploadConfig>;
  onUpdate: (key: keyof UploadConfig, value: unknown) => void;
}

export default defineComponent({
  name: 'AdvancedSettings',
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
        <NFormItem label="压缩质量">
          <NInputNumber
            value={props.settings.compressionQuality}
            min={0.1}
            max={1}
            step={0.1}
            precision={1}
            onUpdateValue={(value) => props.onUpdate('compressionQuality', value)}
          />
        </NFormItem>
        <NFormItem label="预览最大宽度">
          <NInputNumber
            value={props.settings.previewMaxWidth}
            min={50}
            max={1000}
            onUpdateValue={(value) => props.onUpdate('previewMaxWidth', value)}
          />
        </NFormItem>
        <NFormItem label="预览最大高度">
          <NInputNumber
            value={props.settings.previewMaxHeight}
            min={50}
            max={1000}
            onUpdateValue={(value) => props.onUpdate('previewMaxHeight', value)}
          />
        </NFormItem>
        <NFormItem label="重试延迟(ms)">
          <NInputNumber
            value={props.settings.retryDelay}
            min={100}
            max={10000}
            step={100}
            onUpdateValue={(value) => props.onUpdate('retryDelay', value)}
          />
        </NFormItem>
        <NFormItem label="重试退避倍数">
          <NInputNumber
            value={props.settings.retryBackoff}
            min={1}
            max={5}
            step={0.1}
            precision={1}
            onUpdateValue={(value) => props.onUpdate('retryBackoff', value)}
          />
        </NFormItem>
      </NForm>
    );
  }
});

