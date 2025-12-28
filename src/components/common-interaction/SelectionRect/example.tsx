/**
 * SelectionRect 使用示例
 */

import { defineComponent, ref } from 'vue';
import { SelectionRect } from '../index';
import type { SelectionCallbackParams } from '../types';

export default defineComponent({
  name: 'SelectionRectExample',
  setup() {
    const selectedIds = ref<string[]>([]);

    function handleSelectionStart() {
      console.log('Selection started');
    }

    function handleSelectionChange(params: SelectionCallbackParams) {
      selectedIds.value = params.selectedIds;
      console.log('Selected items:', params.selectedItems);
    }

    function handleSelectionEnd(params: SelectionCallbackParams) {
      console.log('Selection ended:', params.selectedIds);
    }

    // 模拟数据
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Item ${i + 1}`
    }));

    return () => (
      <div class="example-container">
        <h2>SelectionRect 示例</h2>

        <div class="info">
          <p>已选中: {selectedIds.value.length} 项</p>
          <p>按住鼠标左键拖拽以选择多个项目</p>
          <p>按住 Shift 键可以在点击元素时也触发圈选</p>
        </div>

        <SelectionRect
          containerSelector=".items-container"
          selectableSelector="[data-selectable-id]"
          threshold={5}
          autoScroll={true}
          scrollSpeed={10}
          scrollEdge={50}
          onSelection-start={handleSelectionStart}
          onSelection-change={handleSelectionChange}
          onSelection-end={handleSelectionEnd}
        >
          <div class="items-container">
            {items.map(item => (
              <div
                key={item.id}
                data-selectable-id={item.id}
                class={[
                  'item',
                  selectedIds.value.includes(item.id) && 'selected'
                ]}
              >
                {item.name}
              </div>
            ))}
          </div>
        </SelectionRect>

        <style>{`
          .example-container {
            padding: 20px;
          }

          .info {
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
          }

          .info p {
            margin: 5px 0;
          }

          .items-container {
            position: relative;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            max-height: 500px;
            overflow: auto;
            background: #fff;
          }

          .item {
            padding: 20px;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            text-align: center;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s;
          }

          .item:hover {
            border-color: #2196f3;
            background: #f0f8ff;
          }

          .item.selected {
            border-color: #2196f3;
            background: #e3f2fd;
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  }
});

