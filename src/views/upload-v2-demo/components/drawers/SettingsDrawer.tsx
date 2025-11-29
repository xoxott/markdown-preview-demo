import { defineComponent, type PropType } from 'vue';
import { NTabPane, NTabs } from 'naive-ui';
import type { UploadConfig } from '@/hooks/upload-v2';
import type { ChunkSizeOption } from '../../types';
import BasicSettings from '../settings/BasicSettings';
import FeatureSettings from '../settings/FeatureSettings';
import AdvancedSettings from '../settings/AdvancedSettings';
import ApiSettings from '../settings/ApiSettings';

interface Props {
  settings: Partial<UploadConfig>;
  chunkSizeOptions: ChunkSizeOption[];
  formatFileSize: (bytes: number) => string;
  onUpdate: (key: keyof UploadConfig, value: unknown) => void;
}

export default defineComponent({
  name: 'SettingsDrawer',
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
      <NTabs type="line" animated>
        <NTabPane name="basic" tab="基础设置">
          <BasicSettings
            settings={props.settings}
            chunkSizeOptions={props.chunkSizeOptions}
            formatFileSize={props.formatFileSize}
            onUpdate={props.onUpdate}
          />
        </NTabPane>
        <NTabPane name="features" tab="功能开关">
          <FeatureSettings settings={props.settings} onUpdate={props.onUpdate} />
        </NTabPane>
        <NTabPane name="advanced" tab="高级设置">
          <AdvancedSettings settings={props.settings} onUpdate={props.onUpdate} />
        </NTabPane>
        <NTabPane name="api" tab="API 配置">
          <ApiSettings settings={props.settings} onUpdate={props.onUpdate} />
        </NTabPane>
      </NTabs>
    );
  }
});
