import { defineComponent, type PropType } from 'vue';
import { NButton, NCode, NScrollbar, NTimeline, NTimelineItem } from 'naive-ui';
import type { EventLog } from '../../types';

interface Props {
  eventLogs: EventLog[];
  onClear: () => void;
}

export default defineComponent({
  name: 'EventsDrawer',
  props: {
    eventLogs: {
      type: Array as PropType<EventLog[]>,
      required: true
    },
    onClear: {
      type: Function as PropType<Props['onClear']>,
      required: true
    }
  },
  setup(props) {
    const getTimelineType = (type: EventLog['type']): 'default' | 'success' | 'error' | 'info' => {
      if (type === 'error' || type === 'chunk-error' || type === 'all-error') return 'error';
      if (type === 'success' || type === 'chunk-success' || type === 'all-complete') return 'success';
      return 'info';
    };

    return () => (
      <div class="mt-4">
        <div class="mb-4 flex items-center justify-end">
          <NButton size="small" onClick={props.onClear}>
            清空日志
          </NButton>
        </div>
        <NScrollbar style="max-height: calc(100vh - 200px)">
          <NTimeline>
            {props.eventLogs.length === 0 ? (
              <div class="py-8 text-center text-gray-400">暂无事件日志</div>
            ) : (
              props.eventLogs.map((log, index) => (
                <NTimelineItem key={index} type={getTimelineType(log.type)}>
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold">{log.type}</span>
                      <span class="text-xs text-gray-500">{log.time}</span>
                    </div>
                    <div class="text-sm">{log.message}</div>
                    {log.data && (
                      <div class="mt-2">
                        <NCode
                          code={JSON.stringify(log.data, null, 2)}
                          language="json"
                          show-line-numbers={false}
                        />
                      </div>
                    )}
                  </div>
                </NTimelineItem>
              ))
            )}
          </NTimeline>
        </NScrollbar>
      </div>
    );
  }
});
