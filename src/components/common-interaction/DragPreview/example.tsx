/**
 * DragPreview 使用示例
 */

import { defineComponent, ref } from 'vue';
import { DragPreview } from '../index';
import type { DragItem, Point } from '../types';

export default defineComponent({
  name: 'DragPreviewExample',
  setup() {
    const isDragging = ref(false);
    const dragStartPos = ref<Point | null>(null);
    const dragCurrentPos = ref<Point | null>(null);
    const draggedItems = ref<DragItem[]>([]);
    const operation = ref<'move' | 'copy'>('move');

    // 模拟数据
    const items: DragItem[] = [
      { id: '1', name: 'Document.pdf', type: 'file' },
      { id: '2', name: 'Image.png', type: 'image' },
      { id: '3', name: 'Video.mp4', type: 'video' },
      { id: '4', name: 'Music.mp3', type: 'audio' },
      { id: '5', name: 'Code.ts', type: 'code' }
    ];

    function handleMouseDown(e: MouseEvent, item: DragItem) {
      isDragging.value = true;
      dragStartPos.value = { x: e.clientX, y: e.clientY };
      dragCurrentPos.value = { x: e.clientX, y: e.clientY };
      draggedItems.value = [item];
      operation.value = e.ctrlKey ? 'copy' : 'move';

      // 监听鼠标移动和释放
      const handleMouseMove = (e: MouseEvent) => {
        dragCurrentPos.value = { x: e.clientX, y: e.clientY };
        operation.value = e.ctrlKey ? 'copy' : 'move';
      };

      const handleMouseUp = () => {
        isDragging.value = false;
        dragStartPos.value = null;
        dragCurrentPos.value = null;
        draggedItems.value = [];

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    function handleMultiDrag(e: MouseEvent) {
      isDragging.value = true;
      dragStartPos.value = { x: e.clientX, y: e.clientY };
      dragCurrentPos.value = { x: e.clientX, y: e.clientY };
      draggedItems.value = items;
      operation.value = e.ctrlKey ? 'copy' : 'move';

      const handleMouseMove = (e: MouseEvent) => {
        dragCurrentPos.value = { x: e.clientX, y: e.clientY };
        operation.value = e.ctrlKey ? 'copy' : 'move';
      };

      const handleMouseUp = () => {
        isDragging.value = false;
        dragStartPos.value = null;
        dragCurrentPos.value = null;
        draggedItems.value = [];

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => (
      <div class="example-container">
        <h2>DragPreview 示例</h2>

        <div class="info">
          <p>拖拽下面的项目查看预览效果</p>
          <p>按住 Ctrl 键可以切换到复制模式</p>
        </div>

        <div class="items-grid">
          <h3>单个项目拖拽</h3>
          <div class="grid">
            {items.map(item => (
              <div
                key={item.id}
                class="draggable-item"
                onMousedown={(e: MouseEvent) => handleMouseDown(e, item)}
              >
                <div class="item-icon">{item.type}</div>
                <div class="item-name">{item.name}</div>
              </div>
            ))}
          </div>

          <h3>多个项目拖拽</h3>
          <button
            class="multi-drag-btn"
            onMousedown={handleMultiDrag}
          >
            拖拽所有项目 ({items.length})
          </button>
        </div>

        <DragPreview
          items={draggedItems.value}
          isDragging={isDragging.value}
          dragStartPos={dragStartPos.value}
          dragCurrentPos={dragCurrentPos.value}
          operation={operation.value}
          maxItems={3}
          showOperationIcon={true}
          showCountBadge={true}
        />

        <style>{`
          .example-container {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }

          .info {
            margin-bottom: 20px;
            padding: 15px;
            background: #f0f8ff;
            border-left: 4px solid #2196f3;
            border-radius: 4px;
          }

          .info p {
            margin: 5px 0;
            color: #666;
          }

          .items-grid {
            margin-top: 20px;
          }

          .items-grid h3 {
            margin: 20px 0 10px;
            color: #333;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }

          .draggable-item {
            padding: 20px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            text-align: center;
            cursor: grab;
            user-select: none;
            transition: all 0.2s;
            background: #fff;
          }

          .draggable-item:hover {
            border-color: #2196f3;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
            transform: translateY(-2px);
          }

          .draggable-item:active {
            cursor: grabbing;
          }

          .item-icon {
            font-size: 32px;
            margin-bottom: 10px;
            opacity: 0.7;
          }

          .item-name {
            font-size: 14px;
            color: #333;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .multi-drag-btn {
            padding: 15px 30px;
            background: #2196f3;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: grab;
            transition: all 0.2s;
          }

          .multi-drag-btn:hover {
            background: #1976d2;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
            transform: translateY(-2px);
          }

          .multi-drag-btn:active {
            cursor: grabbing;
            transform: translateY(0);
          }
        `}</style>
      </div>
    );
  }
});

