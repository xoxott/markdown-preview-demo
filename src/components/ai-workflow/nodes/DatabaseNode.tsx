import { defineComponent } from 'vue';
import BaseNode from './BaseNode';

export default defineComponent({
  name: 'DatabaseNode',
  props: BaseNode.props,
  setup(props: any) {
    return () => <BaseNode {...props} />;
  }
});

