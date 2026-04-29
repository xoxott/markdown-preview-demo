import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import GridView from '../views/GridView';
import TileView from '../views/TileView';
import DetailView from '../views/DetailView';
import ListView from '../views/ListView';
import ContentView from '../views/ContentView';
import type { ViewMode } from '../types/file-explorer';
import { useFileViewContext } from '../composables/useFileViewContext';

export default defineComponent({
  name: 'FileViewRenderer',
  props: {
    viewMode: { type: String as PropType<ViewMode>, required: true }
  },
  setup(props) {
    const ctx = useFileViewContext();

    return () => {
      switch (props.viewMode) {
        case 'grid':
          return <GridView gridSize={ctx.gridSize?.value} />;
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
