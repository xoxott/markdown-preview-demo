import { defineComponent, h } from 'vue';
import type { Component, PropType } from 'vue';
import { NIcon } from 'naive-ui';
import { getFileColor, getFileIcon } from '../utils/fileHelpers';
import type { FileItem } from '../types/file-explorer';

export default defineComponent({
  name: 'FileIcon',
  props: {
    item: { type: Object as PropType<FileItem>, required: true },
    size: { type: Number as PropType<number>, default: 24 },
    showThumbnail: { type: Boolean as PropType<boolean>, default: true }
  },
  setup(props) {
    return () => {
      const { item, size, showThumbnail } = props;
      const IconComp = getFileIcon(item) as Component | null;
      const color = getFileColor(item) || '';

      // 优先显示缩略图（严格判断字符串非空）
      if (showThumbnail && typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.trim()) {
        return (
          <div class={`rounded-lg overflow-hidden bg-gray-100`} style={{ width: `${size}px`, height: `${size}px` }}>
            <img
              src={item.thumbnailUrl!}
              alt={item.name}
              class="h-full w-full object-cover"
              onError={(e: Event) => {
                const img = e.target as HTMLImageElement;
                // 失败时隐藏 img（保留背景样式）
                img.style.display = 'none';
              }}
              draggable={false}
            />
          </div>
        );
      }

      // 默认图标渲染（保持原样式与行为）
      return (
        <div class="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          {IconComp ? (
            <NIcon>
              {{
                default: () => h(IconComp as any, { style: { color, fontSize: size }, strokeWidth: 1.5 })
              }}
            </NIcon>
          ) : (
            // 万一没有图标组件，留个占位，样式不变
            <div style={{ width: `${size}px`, height: `${size}px` }} class="rounded bg-gray-500" />
          )}

          {item.type === 'folder' && <div style={{ background: color }} />}
        </div>
      );
    };
  }
});
