import { defineComponent, type PropType } from 'vue';
import { NDivider, NForm, NFormItem, NSelect } from 'naive-ui';
import { UploadStatus } from '@/hooks/upload-v2';

interface Props {
  language: 'zh-CN' | 'en-US';
  getStatusText: (status: UploadStatus) => string;
  onLanguageChange: (lang: 'zh-CN' | 'en-US') => void;
}

export default defineComponent({
  name: 'I18nDrawer',
  props: {
    language: {
      type: String as PropType<'zh-CN' | 'en-US'>,
      required: true
    },
    getStatusText: {
      type: Function as PropType<Props['getStatusText']>,
      required: true
    },
    onLanguageChange: {
      type: Function as PropType<Props['onLanguageChange']>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <div class="mt-4 space-y-4">
        <NForm label-placement="left" label-width={100}>
          <NFormItem label="语言">
            <NSelect
              value={props.language}
              options={[
                { label: '中文 (简体)', value: 'zh-CN' },
                { label: 'English', value: 'en-US' }
              ]}
              onUpdateValue={props.onLanguageChange}
            />
          </NFormItem>
        </NForm>
        <NDivider />
        <div class="space-y-2">
          <h4 class="font-semibold">状态文本示例</h4>
          <div class="space-y-1 text-sm">
            <div>pending: {props.getStatusText(UploadStatus.PENDING)}</div>
            <div>uploading: {props.getStatusText(UploadStatus.UPLOADING)}</div>
            <div>success: {props.getStatusText(UploadStatus.SUCCESS)}</div>
            <div>error: {props.getStatusText(UploadStatus.ERROR)}</div>
            <div>paused: {props.getStatusText(UploadStatus.PAUSED)}</div>
            <div>cancelled: {props.getStatusText(UploadStatus.CANCELLED)}</div>
          </div>
        </div>
      </div>
    );
  }
});
