/**
 * 基础组件示例
 */

import { defineComponent } from 'vue';
import { NCard, NH3, NForm, NFormItem, NText, NScrollbar } from 'naive-ui';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';
import NSelectionRect from '@/components/file-explorer/interaction/NSelectionRect';
import CustomUpload from '@/components/custom-upload';
import CountdownTimer from '@/components/custom/countdown-timer.vue';
import EditableText from '@/components/custom/editableText';

export default defineComponent({
  name: 'BasicComponentsExample',
  setup() {
    const handleChange = (files: File[]) => {
      console.log('上传的文件:', files);
    };

    const handleSelectionChange = (selected: FileItem[]) => {
      console.log('圈选的文件:', selected);
    };

    const handleSelectionStart = (selected: FileItem[]) => {
      console.log('开始圈选', selected);
    };

    const handleSelectionEnd = (selected: FileItem[]) => {
      console.log('结束圈选', selected);
    };

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">基础组件示例:</NH3>
        <NForm label-placement="left" show-label={true}>
          <NFormItem label="自定义上传组件" class="flex items-center">
            <CustomUpload
              multiple={true}
              max-count={5}
              accept=".png,.jpg,.jpeg,.gif"
              abstract
              onChange={handleChange}
            />
          </NFormItem>

          <NFormItem label="倒计时组件" class="flex items-center">
            <CountdownTimer seconds={35} label="预计剩余时间:" show-trend={true} />
          </NFormItem>

          <NFormItem label="可编辑文本组件" class="flex items-center">
            <EditableText value="可编辑内容" />
          </NFormItem>

          <NText class="text-red">
            支持圈选自动横向、纵向滚动 注：通过插槽插入 NScrollbar 使用
          </NText>

          <NFormItem label="圈选组件" class="flex items-center">
            <NSelectionRect>
              <NScrollbar class="h-50 w-100" x-scrollable>
                {Array.from({ length: 50 }, (_, index) => {
                  const i = index + 1;
                  return (
                    <div
                      key={i}
                      data-selectable-id={`${i}`}
                      class="whitespace-nowrap"
                      style={{
                        width: '1200px',
                        marginTop: i === 50 ? '50px' : '',
                        marginBottom: i === 1 ? '50px' : ''
                      }}
                    >
                      在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选
                      {i}
                    </div>
                  );
                })}
              </NScrollbar>
            </NSelectionRect>
          </NFormItem>
        </NForm>
      </NCard>
    );
  }
});

