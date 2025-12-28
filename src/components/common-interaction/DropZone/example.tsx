/**
 * DropZone 使用示例
 */

import { defineComponent, ref } from 'vue';
import { DropZone } from '../index';
import type { DragItem, DropCallbackParams } from '../types';

export default defineComponent({
  name: 'DropZoneExample',
  setup() {
    const logs = ref<string[]>([]);

    function addLog(message: string) {
      logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
      if (logs.value.length > 10) {
        logs.value = logs.value.slice(0, 10);
      }
    }

    function handleDragEnter(params: DropCallbackParams) {
      addLog(`拖拽进入 ${params.dropZoneId}: ${params.items.length} 项`);
    }

    function handleDragLeave(params: DropCallbackParams) {
      addLog(`拖拽离开 ${params.dropZoneId}`);
    }

    function handleDrop(params: DropCallbackParams) {
      addLog(`✅ 放置到 ${params.dropZoneId}: ${params.items.map((i: DragItem<any>) => i.name).join(', ')}`);
    }

    // 模拟拖拽数据
    function handleDragStart(e: DragEvent, item: DragItem<any>) {
      if (!e.dataTransfer) return;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify([item]));
      addLog(`开始拖拽: ${item.name}`);
    }

    const items: DragItem[] = [
      { id: '1', name: 'Document.pdf', type: 'file' },
      { id: '2', name: 'Image.png', type: 'image' },
      { id: '3', name: 'Video.mp4', type: 'video' },
      { id: '4', name: 'Folder', type: 'folder' }
    ];

    return () => (
      <div class="example-container">
        <h2>DropZone 示例</h2>

        <div class="info">
          <p>拖拽下面的项目到不同的拖放区域</p>
          <p>不同的区域接受不同类型的文件</p>
        </div>

        <div class="layout">
          {/* 可拖拽项目 */}
          <div class="draggable-section">
            <h3>可拖拽项目</h3>
            <div class="items-list">
              {items.map(item => (
                <div
                  key={item.id}
                  class="draggable-item"
                  draggable={true}
                  onDragstart={(e: DragEvent) => handleDragStart(e, item)}
                >
                  <span class="item-type">{item.type}</span>
                  <span class="item-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 拖放区域 */}
          <div class="dropzones-section">
            <h3>拖放区域</h3>

            {/* 接受所有类型 */}
            <DropZone
              id="zone-all"
              hintText="放置任何文件"
              onDrag-enter={handleDragEnter}
              onDrag-leave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div class="zone-content">
                <div class="zone-title">📦 接受所有类型</div>
                <div class="zone-desc">任何文件都可以放到这里</div>
              </div>
            </DropZone>

            {/* 只接受图片和视频 */}
            <DropZone
              id="zone-media"
              acceptTypes={['image', 'video']}
              hintText="放置媒体文件"
              invalidHintText="只接受图片和视频"
              onDrag-enter={handleDragEnter}
              onDrag-leave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div class="zone-content">
                <div class="zone-title">🎬 媒体文件区</div>
                <div class="zone-desc">只接受图片和视频</div>
              </div>
            </DropZone>

            {/* 只接受文件夹 */}
            <DropZone
              id="zone-folder"
              acceptTypes={['folder']}
              hintText="放置文件夹"
              invalidHintText="只接受文件夹"
              highlightStyle={{
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.05)'
              }}
              invalidStyle={{
                borderColor: '#ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.05)'
              }}
              onDrag-enter={handleDragEnter}
              onDrag-leave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div class="zone-content">
                <div class="zone-title">📁 文件夹区</div>
                <div class="zone-desc">只接受文件夹</div>
              </div>
            </DropZone>

            {/* 禁用的区域 */}
            <DropZone
              id="zone-disabled"
              disabled={true}
            >
              <div class="zone-content">
                <div class="zone-title">🚫 禁用区域</div>
                <div class="zone-desc">无法放置文件</div>
              </div>
            </DropZone>
          </div>
        </div>

        {/* 日志 */}
        <div class="logs-section">
          <h3>操作日志</h3>
          <div class="logs">
            {logs.value.length === 0 ? (
              <div class="log-empty">暂无操作记录</div>
            ) : (
              logs.value.map((log, index) => (
                <div key={index} class="log-item">{log}</div>
              ))
            )}
          </div>
        </div>

        <style>{`
          .example-container {
            padding: 20px;
            max-width: 1200px;
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

          .layout {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }

          .draggable-section h3,
          .dropzones-section h3 {
            margin: 0 0 15px;
            color: #333;
          }

          .items-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .draggable-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: #fff;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            cursor: grab;
            transition: all 0.2s;
          }

          .draggable-item:hover {
            border-color: #2196f3;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
            transform: translateX(4px);
          }

          .draggable-item:active {
            cursor: grabbing;
          }

          .item-type {
            padding: 4px 8px;
            background: #e3f2fd;
            color: #2196f3;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .item-name {
            flex: 1;
            font-size: 14px;
            color: #333;
          }

          .dropzones-section {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .zone-content {
            padding: 30px;
            text-align: center;
          }

          .zone-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
          }

          .zone-desc {
            font-size: 14px;
            color: #666;
          }

          .logs-section {
            margin-top: 30px;
          }

          .logs-section h3 {
            margin: 0 0 15px;
            color: #333;
          }

          .logs {
            padding: 15px;
            background: #f5f5f5;
            border-radius: 6px;
            max-height: 200px;
            overflow-y: auto;
          }

          .log-empty {
            text-align: center;
            color: #999;
            padding: 20px;
          }

          .log-item {
            padding: 8px;
            background: #fff;
            border-radius: 4px;
            margin-bottom: 6px;
            font-size: 13px;
            font-family: monospace;
            color: #333;
          }

          .log-item:last-child {
            margin-bottom: 0;
          }
        `}</style>
      </div>
    );
  }
});

