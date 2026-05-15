import { defineComponent } from 'vue';
import FileExplorer from '@/components/file-explorer/FileExplorer';
import FileManagerDrawers from './components/FileManagerDrawers';
import { useFileManagerPage } from './composables/useFileManagerPage';

export default defineComponent({
  name: 'FileManager',
  setup() {
    const page = useFileManagerPage();

    return () => (
      <div class="file-manager-page h-full">
        <FileExplorer
          logic={page.logic}
          containerRef={page.containerRef}
          onOpen={page.handleOpenFile}
          onUpload={page.handleOpenUploadDrawer}
          onFilesDrop={page.uploadIntegration.addFilesAndOpenDrawer}
          uploadProgress={page.uploadIntegration.uploadProgressInfo.value}
        />
        <FileManagerDrawers
          logic={page.logic}
          preview={page.preview}
          uploadIntegration={page.uploadIntegration}
        />
      </div>
    );
  }
});
