import { defineComponent } from 'vue';
import BaseNode from './BaseNode';

export default defineComponent({
  name: 'FileNode',
  props: BaseNode.props,
  setup(props: any) {
    return () => <BaseNode {...props} />;
  }
});

