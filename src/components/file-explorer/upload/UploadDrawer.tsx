/** 上传管理抽屉 — 与 /upload 页面相同的上传面板（UploadMainPanel） */

import { type PropType, defineComponent } from 'vue';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { NScrollbar, useMessage, useThemeVars } from 'naive-ui';
import type { FileTask, UploadConfig } from '@/hooks/upload';
import type { EventLog, UploadHookReturn } from '@/views/upload/types';
import UploadMainPanel from '@/views/upload/components/UploadMainPanel';

export default defineComponent({
  name: 'UploadDrawer',
  props: {
    upload: { type: Object as PropType<UploadHookReturn>, required: true },
    settings: { type: Object as PropType<Partial<UploadConfig>>, required: true },
    onClose: { type: Function as PropType<() => void>, required: true }
  },
  setup(props) {
    const message = useMessage();
    const themeVars = useThemeVars();
    const breakpoints = useBreakpoints(breakpointsTailwind);
    const isMobile = breakpoints.smaller('lg');

    const addEventLog = (_type: EventLog['type'], _message: string, _data?: unknown) => {};

    const handleViewTask = (task: FileTask) => {
      message.info(
        `「${task.file.name}」 ${task.progress}% · ${props.upload.getStatusText(task.status)}`
      );
    };

    return () => (
      <NScrollbar class="h-full max-h-[calc(100vh-120px)]">
        <div class="p-1 pr-3">
          <UploadMainPanel
            settings={props.settings}
            upload={props.upload}
            themeVars={themeVars.value}
            isMobile={isMobile.value}
            addEventLog={addEventLog}
            onViewTask={handleViewTask}
          />
        </div>
      </NScrollbar>
    );
  }
});
