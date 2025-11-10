import { computed, defineComponent, ref } from 'vue';
import { NButton, NIcon, NP, NText, useThemeVars } from 'naive-ui';
import { CloudUploadOutline } from '@vicons/ionicons5';
import DragDropProcessor from './DragDropProcessor';
import FileProcessor from './FileProcessor';

export interface CustomUploadFileInfo {
  id: string;
  file: File;
  name: string;
  fullPath?: string | null;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'finished' | 'error' | 'removed';
  percentage?: number;
}

export default defineComponent({
  name: 'CustomUpload',
  props: {
    multiple: { type: Boolean, default: false },
    accept: { type: String, default: '' },
    directory: { type: Boolean, default: false },
    directoryDnd: { type: Boolean, default: false },
    abstract: { type: Boolean, default: false },
    max: { type: Number, default: Infinity },
    maxSize: { type: Number, default: Infinity },
    disabled: { type: Boolean, default: false },
    batchSize: { type: Number, default: 100 },
    processingTimeout: { type: Number, default: 20 },
    concurrentLimit: { type: Number, default: 5 }
  },

  emits: ['change', 'error', 'exceed'],

  setup(props, { slots, emit, expose }) {
    // 状态管理
    const fileInputRef = ref<HTMLInputElement>();
    const isDragOver = ref(false);
    const isHovering = ref(false);
    const isProcessing = ref(false);
    const processedFileCount = ref(0);
    const themeVars = useThemeVars();

    // 处理器初始化
    const fileProcessor = new FileProcessor({
      batchSize: props.batchSize,
      idleTimeout: props.processingTimeout,
      maxConcurrent: props.concurrentLimit
    });

    const dragDropProcessor = new DragDropProcessor(props.directory, props.directoryDnd);

    // 计算属性
    const acceptedExtensions = computed(() =>
      props.accept ? props.accept.split(',').map(ext => ext.trim().toLowerCase()) : []
    );

    const canAddMore = computed(() => props.max === Infinity || processedFileCount.value < props.max);

    const isDisabledOrFull = computed(() => props.disabled || !canAddMore.value);

    // 工具函数
    const formatSize = (size: number) => {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    const normalizeExtension = (ext: string) => (ext.startsWith('.') ? ext : `.${ext}`);

    // 文件验证
    const validateFile = (file: File): boolean => {
      const fileName = file.name.toLowerCase();
      const fileExt = `.${fileName.split('.').pop()}`;

      // 类型验证
      if (acceptedExtensions.value.length > 0) {
        const isAccepted = acceptedExtensions.value.some(ext => fileExt === normalizeExtension(ext).toLowerCase());
        if (!isAccepted) {
          emit('error', { file, message: `文件类型不支持: ${file.name}` });
          return false;
        }
      }

      // 大小验证
      if (props.maxSize !== Infinity && file.size > props.maxSize) {
        emit('error', {
          file,
          message: `文件大小超出限制: ${file.name} (${formatSize(file.size)} / ${formatSize(props.maxSize)})`
        });
        return false;
      }

      return true;
    };

    const fileValidator = {
      validate: validateFile,
      getErrorMessage: (file: File) => `文件验证失败: ${file.name}`
    };

    // 文件处理
    const handleFiles = async (files: File[]) => {
      if (props.disabled || files.length === 0) return;

      const remainingSlots = props.max === Infinity ? files.length : Math.max(0, props.max - processedFileCount.value);

      if (remainingSlots === 0) {
        emit('exceed', { files, max: props.max });
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      if (filesToProcess.length < files.length) {
        emit('exceed', { files: files.slice(remainingSlots), max: props.max });
      }

      isProcessing.value = true;
      const processedFiles: CustomUploadFileInfo[] = [];

      try {
        await fileProcessor.processFiles(filesToProcess, fileValidator, uploadInfo => {
          processedFiles.push({
            id: uploadInfo.id,
            name: uploadInfo.name,
            file: uploadInfo.file!,
            fullPath: uploadInfo.fullPath,
            size: uploadInfo.file!.size,
            type: uploadInfo.file!.type,
            status: 'pending',
            percentage: 0
          });
          processedFileCount.value++;
        });

        if (processedFiles.length > 0) {
          emit('change', processedFiles);
        }
      } finally {
        isProcessing.value = false;
      }
    };

    // 事件处理
    const triggerFileSelect = (event?: Event) => {
      if (isDisabledOrFull.value) return;
      event?.preventDefault();
      event?.stopPropagation();
      fileInputRef.value?.click();
    };

    const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files?.length) {
        handleFiles(Array.from(input.files));
        input.value = '';
      }
    };

    // 拖拽处理
    const dragHandler = dragDropProcessor.createHandler(handleFiles);

    const handleDragOver = (event: DragEvent) => {
      if (isDisabledOrFull.value) return;
      event.preventDefault();
      event.stopPropagation();
      dragHandler.onDragOver(event);
      isDragOver.value = true;
    };

    const handleDragLeave = (event: DragEvent) => {
      if (props.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragHandler.onDragLeave(event);
      isDragOver.value = false;
    };

    const handleDrop = async (event: DragEvent) => {
      if (isDisabledOrFull.value) return;
      event.preventDefault();
      event.stopPropagation();
      isDragOver.value = false;
      await dragHandler.onDrop(event);
    };

    const handleMouseEnter = () => {
      if (!isDisabledOrFull.value) {
        isHovering.value = true;
      }
    };

    const handleMouseLeave = () => {
      isHovering.value = false;
    };

    // 公开方法
    const reset = () => {
      processedFileCount.value = 0;
    };

    expose({ triggerFileSelect, reset });

    // 样式计算
    const getDragAreaStyle = () => ({
      borderColor: isDragOver.value
        ? themeVars.value.primaryColor
        : isHovering.value && !isDisabledOrFull.value
          ? themeVars.value.primaryColorHover
          : isDisabledOrFull.value
            ? themeVars.value.borderColor
            : themeVars.value.dividerColor,
      backgroundColor: isDragOver.value
        ? `${themeVars.value.primaryColor}12`
        : isHovering.value && !isDisabledOrFull.value
          ? `${themeVars.value.primaryColor}08`
          : isDisabledOrFull.value
            ? themeVars.value.actionColor
            : 'transparent',
      opacity: isDisabledOrFull.value ? 0.6 : 1,
      cursor: isDisabledOrFull.value ? 'not-allowed' : 'pointer'
    });

    const getIconStyle = () => ({
      transform: isDragOver.value ? 'scale(1.1)' : isHovering.value ? 'scale(1.05)' : 'scale(1)',
      color: isDragOver.value
        ? themeVars.value.primaryColor
        : isHovering.value
          ? themeVars.value.primaryColorHover
          : themeVars.value.textColor3
    });

    // 渲染函数
    return () => {
      const fileInput = (
        <input
          ref={fileInputRef}
          type="file"
          multiple={props.multiple}
          accept={props.accept}
          {...(props.directory ? ({ webkitdirectory: true } as any) : {})}
          class="hidden"
          onChange={handleFileChange}
          disabled={isDisabledOrFull.value}
        />
      );

      if (props.abstract) {
        return (
          <div class="inline-block w-full">
            {fileInput}
            <div
              class="relative overflow-hidden border-2 rounded-lg border-dashed transition-all duration-200 ease-in-out"
              style={getDragAreaStyle()}
              onClick={triggerFileSelect}
              onDrop={handleDrop}
              onDragover={handleDragOver}
              onDragleave={handleDragLeave}
              onDragenter={e => e.preventDefault()}
              onMouseenter={handleMouseEnter}
              onMouseleave={handleMouseLeave}
            >
              {slots.default?.({
                isDragOver: isDragOver.value,
                isProcessing: isProcessing.value,
                canAddMore: canAddMore.value,
                fileCount: processedFileCount.value,
                maxFiles: props.max
              }) || (
                <div class="px-6 py-4 text-center">
                  <div
                    class="mb-4 inline-flex items-center justify-center transition-all duration-300"
                    style={getIconStyle()}
                  >
                    <NIcon size={48}>
                      <CloudUploadOutline />
                    </NIcon>
                  </div>

                  <NText class="mb-2 block text-base font-medium" style={{ color: themeVars.value.textColor1 }}>
                    {isDragOver.value ? '释放以上传文件' : '点击或拖拽文件到此区域'}
                  </NText>

                  <NText depth={3} class="mb-3 block text-sm" style={{ color: themeVars.value.textColor3 }}>
                    {props.multiple ? '支持单个或批量上传' : '支持单个文件上传'}
                  </NText>

                  <div
                    class="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: themeVars.value.buttonColor2,
                      color: themeVars.value.textColor2
                    }}
                  >
                    <span>已上传: </span>
                    <span class="ml-1 font-semibold" style={{ color: themeVars.value.primaryColor }}>
                      {processedFileCount.value}
                    </span>
                    <span class="mx-1">/</span>
                    <span>{props.max === Infinity ? '∞' : props.max}</span>
                  </div>

                  {isProcessing.value && (
                    <div
                      class="mt-5 flex items-center justify-center gap-2 rounded-lg px-4 py-2"
                      style={{
                        backgroundColor: `${themeVars.value.primaryColor}10`,
                        borderLeft: `3px solid ${themeVars.value.primaryColor}`
                      }}
                    >
                      <div
                        class="h-4 w-4 animate-spin border-2 border-t-transparent rounded-full"
                        style={{ borderColor: themeVars.value.primaryColor }}
                      />
                      <NText style={{ color: themeVars.value.primaryColor }}>正在处理文件...</NText>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!canAddMore.value && props.max !== Infinity && (
              <div
                class="mt-3 rounded-md px-3 py-2 text-center text-xs"
                style={{
                  backgroundColor: `${themeVars.value.warningColor}15`,
                  color: themeVars.value.warningColor,
                  border: `1px solid ${themeVars.value.warningColor}40`
                }}
              >
                ⚠️ 已达到最大文件数量限制 ({props.max})
              </div>
            )}
          </div>
        );
      }

      return (
        <div class="inline-block">
          {fileInput}
          <NButton
            onClick={triggerFileSelect}
            disabled={isDisabledOrFull.value}
            loading={isProcessing.value}
            size="medium"
            secondary
            style={{ borderRadius: themeVars.value.borderRadius }}
          >
            {slots.default?.() || (
              <span class="flex items-center gap-2">
                <NIcon size={18}>
                  <CloudUploadOutline />
                </NIcon>
                <span>选择文件</span>
              </span>
            )}
          </NButton>

          {!canAddMore.value && props.max !== Infinity && (
            <div
              class="mt-2 inline-block rounded px-2 py-1 text-xs"
              style={{
                backgroundColor: `${themeVars.value.warningColor}15`,
                color: themeVars.value.warningColor
              }}
            >
              已达到限制 ({props.max})
            </div>
          )}
        </div>
      );
    };
  }
});
