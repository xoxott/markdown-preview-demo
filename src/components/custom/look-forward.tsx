import { defineComponent } from 'vue';
import { $t } from '@/locales';
import SvgIcon from './svg-icon';

export default defineComponent({
  name: 'LookForward',
  setup(_, { slots }) {
    return () => (
      <div class="size-full min-h-520px flex-col-center gap-24px overflow-hidden">
        <div class="flex text-400px text-primary">
          <SvgIcon localIcon="expectation" />
        </div>
        {slots.default?.() ?? (
          <h3 class="text-28px text-primary font-500">{$t('common.lookForward')}</h3>
        )}
      </div>
    );
  }
});
