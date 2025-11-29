import { defineComponent, type PropType } from 'vue';
import { NForm, NFormItem, NInputNumber, NSelect, NText } from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload-v2';
import type { ChunkSizeOption } from '../../types';

interface Props {
  settings: Partial<UploadConfig>;
  chunkSizeOptions: ChunkSizeOption[];
  formatFileSize: (bytes: number) => string;
  onUpdate: (key: keyof UploadConfig, value: unknown) => void;
}

export default defineComponent({
  name: 'BasicSettings',
  props: {
    settings: {
      type: Object as PropType<Partial<UploadConfig>>,
      required: true
    },
    chunkSizeOptions: {
      type: Array as PropType<ChunkSizeOption[]>,
      required: true
    },
    formatFileSize: {
      type: Function as PropType<Props['formatFileSize']>,
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
        <NFormItem label="并发文件数">
          <NInputNumber
            value={props.settings.maxConcurrentFiles}
            min={1}
            max={20}
            onUpdateValue={(value) => props.onUpdate('maxConcurrentFiles', value)}
          />
        </NFormItem>
        <NFormItem label="并发分片数">
          <NInputNumber
            value={props.settings.maxConcurrentChunks}
            min={1}
            max={20}
            onUpdateValue={(value) => props.onUpdate('maxConcurrentChunks', value)}
          />
        </NFormItem>
        <NFormItem label="分片大小">
          <NSelect
            value={props.settings.chunkSize}
            options={props.chunkSizeOptions as SelectOption[]}
            onUpdateValue={(value) => props.onUpdate('chunkSize', value)}
          />
        </NFormItem>
        <NFormItem label="最大重试次数">
          <NInputNumber
            value={props.settings.maxRetries}
            min={0}
            max={10}
            onUpdateValue={(value) => props.onUpdate('maxRetries', value)}
          />
        </NFormItem>
        <NFormItem label="超时时间(ms)">
          <NInputNumber
            value={props.settings.timeout}
            min={1000}
            max={300000}
            step={1000}
            onUpdateValue={(value) => props.onUpdate('timeout', value)}
          />
        </NFormItem>
        <NFormItem label="最大文件大小">
          <NInputNumber
            value={props.settings.maxFileSize}
            min={1024}
            step={1024 * 1024}
            onUpdateValue={(value) => props.onUpdate('maxFileSize', value)}
          >
            {{
              feedback: () => (
                <NText depth="3" style="font-size: 12px">
                  当前:{' '}
                  {props.settings.maxFileSize
                    ? props.formatFileSize(props.settings.maxFileSize)
                    : '无限制'}
                </NText>
              )
            }}
          </NInputNumber>
        </NFormItem>
        <NFormItem label="最大文件数量">
          <NInputNumber
            value={props.settings.maxFiles}
            min={1}
            max={1000}
            onUpdateValue={(value) => props.onUpdate('maxFiles', value)}
          />
        </NFormItem>
      </NForm>
    );
  }
});

