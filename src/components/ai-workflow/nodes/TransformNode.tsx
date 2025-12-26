import { defineComponent } from 'vue';
import BaseNode from './BaseNode';

export default defineComponent({
  name: 'TransformNode',
  props: BaseNode.props,
  setup(props: any) {
    return () => <BaseNode {...props} />;
  }
});

