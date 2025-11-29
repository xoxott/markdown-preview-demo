import { defineComponent, type PropType } from 'vue';
import { NButton, NIcon, NSpace } from 'naive-ui';
import {
  CloudUploadOutline,
  LanguageOutline,
  FlashOutline,
  StatsChartOutline,
  CodeOutline,
  SettingsOutline,
  TrashOutline
} from '@vicons/ionicons5';

interface Props {
  themeVars: {
    primaryColor: string;
  };
  drawerState: Record<string, never>;
  uploadStatsTotal: number;
  onToggleDrawer: (type: 'settings' | 'stats' | 'performance' | 'events' | 'i18n') => void;
  onClear: () => void;
}

export default defineComponent({
  name: 'PageHeader',
  props: {
    themeVars: {
      type: Object as PropType<Props['themeVars']>,
      required: true
    },
    drawerState: {
      type: Object as PropType<Props['drawerState']>,
      required: true
    },
    uploadStatsTotal: {
      type: Number,
      required: true
    },
    onToggleDrawer: {
      type: Function as PropType<Props['onToggleDrawer']>,
      required: true
    },
    onClear: {
      type: Function as PropType<Props['onClear']>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NIcon component={CloudUploadOutline} size={28} color={props.themeVars.primaryColor} />
          <h1 class="m-0 text-2xl font-bold">Upload-V2 完整功能测试</h1>
        </div>
        <NSpace>
          <NButton size="small" quaternary circle onClick={() => props.onToggleDrawer('i18n')}>
            {{
              icon: () => <NIcon component={LanguageOutline} />
            }}
          </NButton>
          <NButton size="small" quaternary circle onClick={() => props.onToggleDrawer('performance')}>
            {{
              icon: () => <NIcon component={FlashOutline} />
            }}
          </NButton>
          <NButton size="small" quaternary circle onClick={() => props.onToggleDrawer('stats')}>
            {{
              icon: () => <NIcon component={StatsChartOutline} />
            }}
          </NButton>
          <NButton size="small" quaternary circle onClick={() => props.onToggleDrawer('events')}>
            {{
              icon: () => <NIcon component={CodeOutline} />
            }}
          </NButton>
          <NButton size="small" quaternary circle onClick={() => props.onToggleDrawer('settings')}>
            {{
              icon: () => <NIcon component={SettingsOutline} />
            }}
          </NButton>
          {props.uploadStatsTotal > 0 && (
            <NButton size="small" quaternary circle type="error" onClick={props.onClear}>
              {{
                icon: () => <NIcon component={TrashOutline} />
              }}
            </NButton>
          )}
        </NSpace>
      </div>
    );
  }
});

