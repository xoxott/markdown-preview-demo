import { type PropType, defineComponent, shallowRef } from 'vue';
import { NDrawer, NDrawerContent, useMessage } from 'naive-ui';
import { FilePreview } from '@/components/file-explorer/preview';
import { FileEditor } from '@/components/file-explorer/editor';
import type { FileEditorSession } from '@/components/file-explorer/editor/fileEditorSession';
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
    const message = useMessage();
    const editorSession = shallowRef<FileEditorSession | null>(null);

    const tryCloseFileDrawer = () => {
      if (props.preview.useTextEditor() && editorSession.value?.isDirty.value) {
        message.warning('文件已修改，请先保存');
        return;
      }
      editorSession.value = null;
      props.preview.closeFile();
    };

    const handleDrawerShowUpdate = (show: boolean) => {
      if (show) {
        props.preview.showFileDrawer.value = true;
        return;
      }
      tryCloseFileDrawer();
    };

    return () => (
      <>
        <NDrawer
          show={props.preview.showFileDrawer.value}
          onUpdate:show={handleDrawerShowUpdate}
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
                <span class="min-w-0 truncate font-medium">
                  {props.preview.openedFile.value?.name || '文件'}
                </span>
              ),
              default: () => {
                if (!props.preview.openedFile.value) return null;

                if (props.preview.useTextEditor()) {
                  return (
                    <FileEditor
                      file={props.preview.openedFile.value}
                      dataSource={props.logic.dataSource.value!}
                      content={props.preview.fileContent.value as string}
                      onSave={props.preview.saveFile}
                      onSessionChange={session => {
                        editorSession.value = session;
                      }}
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
