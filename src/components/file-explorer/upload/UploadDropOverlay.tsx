/** 外部文件拖拽覆盖层 — 检测外部文件拖入到 ViewContainer 并触发上传 */

import { type PropType, Transition, computed, defineComponent, onUnmounted, ref } from 'vue';
import { NIcon } from 'naive-ui';
import { CloudUploadOutline } from '@vicons/ionicons5';
import DragDropProcessor from '@/components/custom-upload/DragDropProcessor';

/** 判断是否为外部文件拖拽（非内部 FileItem 拖拽） */
function isExternalFileDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types || [];
  // 内部拖拽设置了 'application/file-explorer' MIME 类型
  // 外部文件拖入有 'Files' 但没有此自定义类型
  return types.includes('Files') && !types.includes('application/file-explorer');
}

/**
 * UploadDropOverlay — 外部文件拖拽覆盖层
 *
 * 在 ViewContainer 上层渲染，默认不可见（pointer-events: none）， 检测到外部文件拖入时激活覆盖层，松手后提取文件触发上传。 不干扰内部 FileItem
 * 拖拽（移动/复制）和圈选交互。
 */
export default defineComponent({
  name: 'UploadDropOverlay',
  props: {
    /** 外部文件拖入回调 */
    onFilesDrop: { type: Function as PropType<(files: File[]) => void>, required: true },
    /** 禁用拖拽上传（如非 server 模式） */
    disabled: { type: Boolean, default: false },
    /** 当前目录路径（提示文本用） */
    currentPath: { type: String, default: '/' }
  },
  setup(props) {
    const isExternalDragOver = ref(false);
    const dropCounter = ref(0); // 修正多层 dragenter/dragleave 嵌套

    // DragDropProcessor 用于文件提取
    const processor = new DragDropProcessor(true, true);
    const handler = processor.createHandler(files => {
      if (files.length > 0) {
        props.onFilesDrop(files);
      }
    });

    const canAccept = computed(() => !props.disabled);

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (props.disabled || !isExternalFileDrag(e)) return;

      dropCounter.value += 1;
      if (dropCounter.value === 1) {
        isExternalDragOver.value = true;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (props.disabled || !isExternalFileDrag(e)) return;

      const dataTransfer = e.dataTransfer;
      if (dataTransfer) {
        dataTransfer.dropEffect = canAccept.value ? 'copy' : 'none';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dropCounter.value -= 1;
      if (dropCounter.value <= 0) {
        dropCounter.value = 0;
        isExternalDragOver.value = false;
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (props.disabled) return;

      // 仅处理外部文件拖入
      if (!isExternalFileDrag(e)) return;

      dropCounter.value = 0;
      isExternalDragOver.value = false;

      // 使用 DragDropProcessor 提取文件
      await handler.onDrop(e);
    };

    // 全局 dragend 清理状态
    const handleGlobalDragEnd = () => {
      dropCounter.value = 0;
      isExternalDragOver.value = false;
    };

    onUnmounted(() => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    });

    // 每次渲染时注册/清理全局监听
    // （放在 setup 中确保只注册一次）
    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => (
      <div
        class={[
          'absolute inset-0 z-50 rounded-lg transition-all duration-200',
          isExternalDragOver.value && canAccept.value
            ? 'pointer-events-auto border-2 border-dashed border-blue-400 bg-blue-50/60 dark:bg-blue-900/20'
            : 'pointer-events-none'
        ]}
        onDragenter={handleDragEnter}
        onDragover={handleDragOver}
        onDragleave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Transition
          enterActiveClass="transition-opacity duration-200"
          leaveActiveClass="transition-opacity duration-200"
          enterFromClass="opacity-0"
          leaveToClass="opacity-0"
        >
          {isExternalDragOver.value && canAccept.value && (
            <div class="h-full flex flex-col items-center justify-center gap-3">
              <NIcon component={CloudUploadOutline} size={48} class="text-blue-500" />
              <p class="text-sm text-blue-600 font-medium dark:text-blue-400">
                松开以上传文件到当前目录
              </p>
            </div>
          )}
        </Transition>
      </div>
    );
  }
});
