import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const a = 123;

    return () => <div>403 页面（TSX）{a}</div>;
  }
});
