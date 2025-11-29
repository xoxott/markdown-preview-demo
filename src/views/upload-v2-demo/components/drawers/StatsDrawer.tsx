import { defineComponent, type PropType } from 'vue';
import { NCard, NDataTable, NGrid, NGridItem, NStatistic, NTag, NTabs, NTabPane } from 'naive-ui';
import type { TodayStatsData, HistoryStatsData, TrendAnalysisData } from '../../types';
import type { DataTableColumns } from 'naive-ui';

interface Props {
  todayStatsData: TodayStatsData;
  historyStatsData: HistoryStatsData[];
  trendData: TrendAnalysisData;
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
}

export default defineComponent({
  name: 'StatsDrawer',
  props: {
    todayStatsData: {
      type: Object as PropType<TodayStatsData>,
      required: true
    },
    historyStatsData: {
      type: Array as PropType<HistoryStatsData[]>,
      required: true
    },
    trendData: {
      type: Object as PropType<TrendAnalysisData>,
      required: true
    },
    formatFileSize: {
      type: Function as PropType<Props['formatFileSize']>,
      required: true
    },
    formatSpeed: {
      type: Function as PropType<Props['formatSpeed']>,
      required: true
    }
  },
  setup(props) {
    const historyColumns: DataTableColumns<HistoryStatsData> = [
      { title: '日期', key: 'date', width: 120 },
      { title: '总文件', key: 'totalFiles', width: 100 },
      { title: '成功', key: 'successFiles', width: 100 },
      { title: '失败', key: 'failedFiles', width: 100 },
      {
        title: '总大小',
        key: 'totalSize',
        width: 120,
        render: (row: HistoryStatsData) => props.formatFileSize(row.totalSize)
      },
      {
        title: '平均速度',
        key: 'averageSpeed',
        width: 120,
        render: (row: HistoryStatsData) => props.formatSpeed(row.averageSpeed)
      }
    ];

    return () => (
      <NTabs type="line" animated>
        <NTabPane name="today" tab="今日统计">
          <div class="mt-4 space-y-4">
            <NGrid cols={2} xGap={12} yGap={12}>
              <NGridItem>
                <NStatistic label="总文件数" value={props.todayStatsData.totalFiles} />
              </NGridItem>
              <NGridItem>
                <NStatistic
                  label="成功文件数"
                  value={props.todayStatsData.successFiles}
                />
              </NGridItem>
              <NGridItem>
                <NStatistic
                  label="失败文件数"
                  value={props.todayStatsData.failedFiles}
                />
              </NGridItem>
              <NGridItem>
                <NStatistic label="总大小" value={props.formatFileSize(props.todayStatsData.totalSize)} />
              </NGridItem>
              <NGridItem>
                <NStatistic
                  label="已上传大小"
                  value={props.formatFileSize(props.todayStatsData.uploadedSize)}
                />
              </NGridItem>
              <NGridItem>
                <NStatistic
                  label="平均速度"
                  value={props.formatSpeed(props.todayStatsData.averageSpeed)}
                />
              </NGridItem>
            </NGrid>
          </div>
        </NTabPane>
        <NTabPane name="trend" tab="趋势分析">
          <div class="mt-4 space-y-4">
            <NCard title="速度趋势">
              <NTag
                type={
                  props.trendData.speedTrend === 'increasing'
                    ? 'success'
                    : props.trendData.speedTrend === 'decreasing'
                      ? 'error'
                      : 'info'
                }
              >
                {props.trendData.speedTrend === 'increasing'
                  ? '上升'
                  : props.trendData.speedTrend === 'decreasing'
                    ? '下降'
                    : '稳定'}
              </NTag>
            </NCard>
            <NCard title="成功率">
              <NStatistic value={`${props.trendData.successRate.toFixed(2)}%`} />
            </NCard>
            <NCard title="平均速度">
              <NStatistic value={props.formatSpeed(props.trendData.averageSpeed)} />
            </NCard>
            <NCard title="峰值速度">
              <NStatistic value={props.formatSpeed(props.trendData.peakSpeed)} />
            </NCard>
          </div>
        </NTabPane>
        <NTabPane name="history" tab="历史记录">
          <div class="mt-4">
            <NDataTable
              columns={historyColumns}
              data={props.historyStatsData}
              pagination={false}
            />
          </div>
        </NTabPane>
      </NTabs>
    );
  }
});
