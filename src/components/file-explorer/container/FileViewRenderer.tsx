import { defineComponent } from 'vue';
import GridView from '../views/GridView';
import TileView from '../views/TileView';
import DetailView from '../views/DetailView';
import ListView from '../views/ListView';
import ContentView from '../views/ContentView';
import { useFileViewContext } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'FileViewRenderer',
  setup() {
    const ctx = useFileViewContext();

    return () => {
      const viewMode = ctx.viewMode?.value ?? 'grid';
      switch (viewMode) {
        case 'grid':
          return <GridView />;
        case 'list':
          return <ListView />;
        case 'tile':
          return <TileView />;
        case 'detail':
          return <DetailView />;
        case 'content':
          return <ContentView />;
        default:
          return null;
      }
    };
  }
});
