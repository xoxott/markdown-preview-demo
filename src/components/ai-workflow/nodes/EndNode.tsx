import { defineComponent } from 'vue';
import BaseNode from './BaseNode';

export default defineComponent({
  name: 'EndNode',
  props: BaseNode.props,
  setup(props: any) {
    return () => <BaseNode {...props} />;
  }
});

