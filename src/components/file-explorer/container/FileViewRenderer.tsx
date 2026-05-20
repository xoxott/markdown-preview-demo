import { defineComponent } from 'vue';
import GridView from '../views/GridView';
import TileView from '../views/TileView';
import DetailView from '../views/DetailView';
import ListView from '../views/ListView';
import ContentView from '../views/ContentView';
import { useFileViewContext } from '../composables/useFileViewContext';
import FileListNaiveScrollShell from './FileListNaiveScrollShell';

/**
 * 按 viewMode 渲染具体视图，并决定是否需要外包 {@link FileListNaiveScrollShell}。 与滚动/圈选相关的组合放在此处，避免 ViewContainer
 * 感知具体视图类型。
 */
export default defineComponent({
  name: 'FileViewRenderer',
  setup() {
    const ctx = useFileViewContext();

    return () => {
      const viewMode = ctx.viewMode?.value ?? 'grid';

      if (viewMode === 'detail') {
        return <DetailView />;
      }

      const inner = (() => {
        switch (viewMode) {
          case 'grid':
            return <GridView />;
          case 'list':
            return <ListView />;
          case 'tile':
            return <TileView />;
          case 'content':
            return <ContentView />;
          default:
            return null;
        }
      })();

      return <FileListNaiveScrollShell>{inner}</FileListNaiveScrollShell>;
    };
  }
});
