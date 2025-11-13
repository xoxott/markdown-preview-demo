/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-05 22:44:10
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-05 23:28:33
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\interaction\FileDropZoneWrapper.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { PropType } from 'vue';
import { defineComponent, inject, onUnmounted } from 'vue';
import type { FileItem } from '../types/file-explorer';
import type { FileDragDropHook } from '../hooks/useFileDragDropEnhanced';
import DropZone from './DropZone';

interface Props {
  item: FileItem;
  zoneId: string;
  targetPath: string;
  disabled?: boolean;
  asFolderZone?: boolean;
  hint?: string;
}

export const FileDropZoneWrapper = defineComponent({
  name: 'FileDropZoneWrapper',
  props: {
    item: { type: Object as PropType<FileItem>, required: true },
    zoneId: { type: String, required: true },
    targetPath: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    asFolderZone: { type: Boolean, default: true },
    hint: { type: String, default: '' }
  },
  setup(props, { slots }) {
    const dragDrop = inject<FileDragDropHook>('FILE_DRAG_DROP')!;

    // 注册 DropZone
    dragDrop.registerDropZone(props.zoneId, props.targetPath);

    const handleDragEnter = (e: DragEvent) => {
      dragDrop.enterDropZone(props.zoneId, props.targetPath, props.item);
    };

    const handleDragLeave = (e: DragEvent) => {
      dragDrop.leaveDropZone(props.zoneId);
    };

    const handleDrop = async (e: DragEvent) => {
      await dragDrop.executeDrop(props.zoneId);
    };

    // 卸载时注销
    onUnmounted(() => {
      dragDrop.unregisterDropZone(props.zoneId);
    });

    return () => (
      <DropZone
        zoneId={props.zoneId}
        targetPath={props.targetPath}
        disabled={props.disabled}
        asFolderZone={props.asFolderZone}
        hint={props.hint}
        isOver={dragDrop.getDropZoneState(props.zoneId)?.isOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        canDrop={dragDrop.getDropZoneState(props.zoneId)?.canDrop}
        key={props.zoneId}
      >
        {{
          default: (dragState: any) => slots.default?.(dragState)
        }}
      </DropZone>
    );
  }
});
