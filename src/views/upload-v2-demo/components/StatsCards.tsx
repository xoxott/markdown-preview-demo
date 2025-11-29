import { defineComponent, type PropType } from 'vue';
import { NCard, NGrid, NGridItem, NIcon, NStatistic } from 'naive-ui';
import {
  DocumentsOutline,
  ArrowUpOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline
} from '@vicons/ionicons5';
import type { UploadStats } from '@/hooks/upload-v2';

interface Props {
  uploadStats: UploadStats;
}

export default defineComponent({
  name: 'StatsCards',
  props: {
    uploadStats: {
      type: Object as PropType<UploadStats>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <NGrid cols={4} xGap={12} yGap={12}>
        <NGridItem>
          <NCard>
            <NStatistic label="总文件数" value={props.uploadStats.total}>
              {{
                prefix: () => <NIcon component={DocumentsOutline} />
              }}
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="上传中" value={props.uploadStats.active}>
              {{
                prefix: () => <NIcon component={ArrowUpOutline} />
              }}
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="已完成" value={props.uploadStats.completed}>
              {{
                prefix: () => <NIcon component={CheckmarkCircleOutline} />
              }}
            </NStatistic>
          </NCard>
        </NGridItem>
        <NGridItem>
          <NCard>
            <NStatistic label="失败" value={props.uploadStats.failed}>
              {{
                prefix: () => <NIcon component={CloseCircleOutline} />
              }}
            </NStatistic>
          </NCard>
        </NGridItem>
      </NGrid>
    );
  }
});

