import { MonacoEditor, MonacoLanguage } from '@/components/monaco';
import { Close, Save } from '@vicons/ionicons5';
import { NButton, NIcon, useMessage, useThemeVars } from 'naive-ui';
import type { PropType } from 'vue';
import { computed, defineComponent, ref, watch } from 'vue';
import type { IFileDataSource } from '../datasources/types';
import type { FileItem } from '../types/file-explorer';

export default defineComponent({
  name: 'FileEditor',
  props: {
    file: {
      type: Object as PropType<FileItem>,
      required: true
    },
    dataSource: {
      type: Object as PropType<IFileDataSource>,
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onSave: {
      type: Function as PropType<(file: FileItem, content: string) => Promise<void>>,
      default: undefined
    }
  },
  setup(props) {
    const themeVars = useThemeVars();
    const message = useMessage();
    const editorContent = ref(props.content);
    const isDirty = ref(false);
    const saving = ref(false);

    // 推断语言
    const language = computed(() => {
      const ext = props.file.extension?.toLowerCase() || '';
      const langMap: Record<string, MonacoLanguage> = {
        js: 'javascript',
        ts: 'typescript',
        vue: 'vue',
        jsx: 'jsx',
        tsx: 'tsx',
        css: 'css',
        html: 'html',
        json: 'json',
        md: 'markdown',
        // xml: 'xml',
        // yaml: 'yaml',
        // yml: 'yaml',
        // sh: 'shell',
        // py: 'python',
        // java: 'java',
        // cpp: 'cpp',
        // c: 'c',
        // h: 'c'
      };
      return langMap[ext] || 'plaintext';
    });

    // 监听内容变化
    watch(
      () => props.content,
      (newContent) => {
        if (editorContent.value !== newContent) {
          editorContent.value = newContent;
          isDirty.value = false;
        }
      }
    );

    // 处理内容变更
    const handleContentChange = (value: string) => {
      editorContent.value = value;
      isDirty.value = value !== props.content;
    };

    // 保存文件
    const handleSave = async () => {
      if (!isDirty.value) {
        message.info('文件未修改');
        return;
      }

      try {
        saving.value = true;

        if (props.onSave) {
          await props.onSave(props.file, editorContent.value);
        } else {
          // 使用数据源保存
          await props.dataSource.writeFile(props.file.path, editorContent.value);
        }

        isDirty.value = false;
        message.success('保存成功');
      } catch (error: any) {
        message.error(`保存失败: ${error.message}`);
        console.error('保存文件失败:', error);
      } finally {
        saving.value = false;
      }
    };

    // 处理关闭
    const handleClose = () => {
      if (isDirty.value) {
        // TODO: 显示确认对话框
        message.warning('文件已修改，请先保存');
        return;
      }
      props.onClose?.();
    };

    return () => (
      <div class="flex h-full flex-col" style={{ backgroundColor: themeVars.value.bodyColor }}>
        {/* 工具栏 */}
        <div
          class="flex items-center justify-between border-b px-4 py-2"
          style={{
            borderColor: themeVars.value.dividerColor,
            backgroundColor: themeVars.value.cardColor
          }}
        >
          <div class="flex items-center gap-2">
            <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
              {props.file.name}
            </span>
            {isDirty.value && (
              <span class="text-xs" style={{ color: themeVars.value.warningColor }}>
                (已修改)
              </span>
            )}
          </div>
          <div class="flex items-center gap-2">
            <NButton
              type="primary"
              size="small"
              loading={saving.value}
              disabled={!isDirty.value}
              onClick={handleSave}
            >
              <NIcon size={16}>
                <Save />
              </NIcon>
              <span class="ml-1">保存</span>
            </NButton>
            {props.onClose && (
              <NButton size="small" onClick={handleClose}>
                <NIcon size={16}>
                  <Close />
                </NIcon>
              </NButton>
            )}
          </div>
        </div>

        {/* 编辑器 */}
        <div class="flex-1 overflow-hidden">
          <MonacoEditor
            modelValue={editorContent.value}
            filename={props.file.name}
            language={language.value}
            readonly={false}
            showToolbar={true}
            height="100%"
            onUpdate:modelValue={handleContentChange}
          />
        </div>
      </div>
    );
  }
});

