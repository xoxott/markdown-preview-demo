import { defineComponent, PropType, Ref, ref } from 'vue'
import GridView from '../views/GridView'
import TileView from '../views/TileView'
import DetailView from '../views/DetailView'
import ListView from '../views/ListView'
import ContentView from '../views/ContentView'
import { FileItem, GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer'

export default defineComponent({
  name: 'FileViewRenderer',
  props: {
    items: { type: Array as PropType<FileItem[]>, required: true },
    selectedIds: { type: Object as PropType<Ref<Set<string>>>, required: true },
    onSelect: { type: Function as PropType<(ids: string[], event?: MouseEvent) => void>, required: true },
    onOpen: { type: Function as PropType<(item: FileItem) => void>, required: true },
    viewMode: { type: String as PropType<ViewMode>, required: true },
    gridSize: { type: String as PropType<GridSize>, default: 'medium' },
    sortField: { type: String as PropType<SortField>, required: false },
    sortOrder: { type: String as PropType<SortOrder>, required: false },
    onSort: { type: Function as PropType<(field: SortField) => void>, required: false }
  },
  setup(props) {
    const viewRef = ref<any>(null)

    return () => {
      const viewProps = {
        items: props.items,
        selectedIds: props.selectedIds,
        onSelect: props.onSelect,
        onOpen: props.onOpen
      }

      switch (props.viewMode) {
        case 'grid':
          return <GridView {...viewProps} gridSize={props.gridSize} />
        case 'list':
          return <ListView {...viewProps} />
        case 'tile':
          return <TileView {...viewProps} />
        case 'detail':
          if (props.sortField && props.sortOrder && props.onSort) {
            return (
              <DetailView
                {...viewProps}
                ref={viewRef}
                sortField={props.sortField}
                sortOrder={props.sortOrder}
                onSort={props.onSort}
              />
            )
          }
          return null
        case 'content':
          return <ContentView {...viewProps} />
        default:
          return null
      }
    }
  }
})
