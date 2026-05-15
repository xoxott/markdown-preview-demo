import { type PropType, defineComponent } from 'vue';
import { NButton, NDrawer, NDrawerContent } from 'naive-ui';
import { FilePreview } from '@/components/file-explorer/preview';
import { FileEditor } from '@/components/file-explorer/editor';
import UploadDrawer from '@/components/file-explorer/upload/UploadDrawer';
import type { FileExplorerLogic } from '@/components/file-explorer/composables/useFileExplorerLogic';
import type { FilePreviewState } from '@/components/file-explorer/composables/useFilePreview';
import type { FileExplorerUploadState } from '@/components/file-explorer/composables/useFileExplorerUpload';

export default defineComponent({
  name: 'FileManagerDrawers',
  props: {
    logic: {
      type: Object as PropType<FileExplorerLogic>,
      required: true
    },
    preview: {
      type: Object as PropType<FilePreviewState>,
      required: true
    },
    uploadIntegration: {
      type: Object as PropType<FileExplorerUploadState>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <>
        <NDrawer
          v-model:show={props.preview.showFileDrawer.value}
          placement="right"
          width="80%"
          resizable
          contentClass="h-full"
        >
          <NDrawerContent
            closable
            nativeScrollbar={false}
            bodyContentStyle={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {{
              header: () => (
                <div class="flex items-center justify-between">
                  <span class="font-medium">{props.preview.openedFile.value?.name || '文件'}</span>
                  {props.preview.editorMode.value === 'preview' &&
                    props.preview.openedFile.value && (
                      <NButton size="small" onClick={props.preview.editFile}>
                        编辑
                      </NButton>
                    )}
                </div>
              ),
              default: () => {
                if (!props.preview.openedFile.value) return null;

                if (
                  props.preview.editorMode.value === 'edit' &&
                  typeof props.preview.fileContent.value === 'string'
                ) {
                  return (
                    <FileEditor
                      file={props.preview.openedFile.value}
                      dataSource={props.logic.dataSource.value!}
                      content={props.preview.fileContent.value}
                      onClose={props.preview.closeFile}
                      onSave={props.preview.saveFile}
                    />
                  );
                }

                return (
                  <FilePreview
                    file={props.preview.openedFile.value}
                    content={props.preview.fileContent.value}
                    loading={props.preview.fileLoading.value}
                  />
                );
              }
            }}
          </NDrawerContent>
        </NDrawer>

        <NDrawer
          v-model:show={props.uploadIntegration.showUploadDrawer.value}
          placement="right"
          width="60%"
          resizable
          contentClass="h-full"
        >
          <NDrawerContent closable nativeScrollbar={false}>
            {{
              header: () => <span class="font-medium">文件上传</span>,
              default: () => (
                <UploadDrawer
                  upload={props.uploadIntegration.upload}
                  settings={props.uploadIntegration.settings}
                  onClose={props.uploadIntegration.closeUploadDrawer}
                />
              )
            }}
          </NDrawerContent>
        </NDrawer>
      </>
    );
  }
});
