import { defineComponent } from 'vue';
import SystemLogo from '@/components/common/system-logo.vue';

export default defineComponent({
  name: 'SoybeanAvatar',
  setup() {
    return () => (
      <div class="size-72px flex-center overflow-hidden rd-1/2 bg-primary:12">
        <SystemLogo class="text-40px text-primary" />
      </div>
    );
  }
});
