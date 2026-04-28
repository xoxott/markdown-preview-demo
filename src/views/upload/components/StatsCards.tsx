import { type PropType, defineComponent } from 'vue';
import { NIcon, NStatistic } from 'naive-ui';
import {
  ArrowUpOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  DocumentsOutline
} from '@vicons/ionicons5';
import type { UploadStats } from '@/hooks/upload';

interface _Props {
  uploadStats: UploadStats;
  themeVars: {
    primaryColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
  };
}

interface StatItem {
  label: string;
  value: number;
  icon: any;
  bgColor: string;
  iconColor: string;
}

export default defineComponent({
  name: 'StatsCards',
  props: {
    uploadStats: {
      type: Object as PropType<UploadStats>,
      required: true
    },
    themeVars: {
      type: Object as PropType<_Props['themeVars']>,
      required: true
    }
  },
  setup(props) {
    return () => {
      const stats: StatItem[] = [
        {
          label: '总文件数',
          value: props.uploadStats.total,
          icon: DocumentsOutline,
          bgColor: `${props.themeVars.primaryColor}08`,
          iconColor: props.themeVars.primaryColor
        },
        {
          label: '上传中',
          value: props.uploadStats.active,
          icon: ArrowUpOutline,
          bgColor: `${props.themeVars.successColor}08`,
          iconColor: props.themeVars.successColor
        },
        {
          label: '已完成',
          value: props.uploadStats.completed,
          icon: CheckmarkCircleOutline,
          bgColor: `${props.themeVars.primaryColor}08`,
          iconColor: props.themeVars.primaryColor
        },
        {
          label: '失败',
          value: props.uploadStats.failed,
          icon: CloseCircleOutline,
          bgColor: `${props.themeVars.errorColor}08`,
          iconColor: props.themeVars.errorColor
        }
      ];

      return (
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(stat => (
            <div
              key={stat.label}
              class="border border-gray-200 rounded-lg p-3 shadow-sm transition-shadow duration-200 dark:border-gray-700 hover:shadow-md"
              style={{ backgroundColor: stat.bgColor }}
            >
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center justify-center rounded-md p-1.5"
                  style={{ backgroundColor: `${stat.iconColor}15` }}
                >
                  <NIcon component={stat.icon} size={18} color={stat.iconColor} />
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <NStatistic value={stat.value} class="mt-1">
                {{
                  default: () => <span class="text-2xl font-bold">{stat.value}</span>
                }}
              </NStatistic>
            </div>
          ))}
        </div>
      );
    };
  }
});
