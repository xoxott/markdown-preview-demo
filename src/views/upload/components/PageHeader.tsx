import { type PropType, defineComponent } from 'vue';
import { NButton, NIcon, NTag } from 'naive-ui';
import {
  CloudUploadOutline,
  CodeOutline,
  FlashOutline,
  LanguageOutline,
  SettingsOutline,
  StatsChartOutline,
  TrashOutline
} from '@vicons/ionicons5';

interface Props {
  themeVars: {
    primaryColor: string;
  };
  uploadStatsTotal: number;
  isUploading: boolean;
  isPaused: boolean;
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
    uploadStatsTotal: {
      type: Number,
      required: true
    },
    isUploading: {
      type: Boolean,
      required: true
    },
    isPaused: {
      type: Boolean,
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
    const getStatusTag = (): { type: 'info' | 'warning' | 'success' | 'default'; text: string } => {
      if (props.isUploading && !props.isPaused) return { type: 'info', text: '上传中' };
      if (props.isPaused) return { type: 'warning', text: '已暂停' };
      if (props.uploadStatsTotal > 0) return { type: 'success', text: '已完成' };
      return { type: 'default', text: '待上传' };
    };

    const actionButtons = [
      { key: 'i18n', icon: LanguageOutline, drawerType: 'i18n' as const, showOnMobile: false },
      {
        key: 'performance',
        icon: FlashOutline,
        drawerType: 'performance' as const,
        showOnMobile: false
      },
      { key: 'stats', icon: StatsChartOutline, drawerType: 'stats' as const, showOnMobile: false },
      { key: 'events', icon: CodeOutline, drawerType: 'events' as const, showOnMobile: false },
      {
        key: 'settings',
        icon: SettingsOutline,
        drawerType: 'settings' as const,
        showOnMobile: true
      }
    ];

    return () => {
      const statusTag = getStatusTag();

      return (
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center rounded-lg p-2"
              style={{ backgroundColor: `${props.themeVars.primaryColor}15` }}
            >
              <NIcon
                component={CloudUploadOutline}
                size={24}
                color={props.themeVars.primaryColor}
              />
            </div>
            <div>
              <h1 class="m-0 text-lg font-bold sm:text-xl">文件上传</h1>
              <p class="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                支持大文件分片上传、断点续传、拖拽上传
              </p>
            </div>
            <NTag type={statusTag.type} size="small" bordered={false}>
              {statusTag.text}
            </NTag>
          </div>
          <div class="flex items-center gap-1.5">
            {actionButtons.map(btn => (
              <NButton
                key={btn.key}
                size="small"
                quaternary
                circle
                class={btn.showOnMobile ? '' : 'hidden sm:inline-flex'}
                onClick={() => props.onToggleDrawer(btn.drawerType)}
              >
                {{
                  icon: () => <NIcon component={btn.icon} />
                }}
              </NButton>
            ))}
            {props.uploadStatsTotal > 0 && (
              <NButton size="small" quaternary circle type="error" onClick={props.onClear}>
                {{
                  icon: () => <NIcon component={TrashOutline} />
                }}
              </NButton>
            )}
          </div>
        </div>
      );
    };
  }
});
