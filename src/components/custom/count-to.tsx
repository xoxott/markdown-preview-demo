import { type PropType, computed, defineComponent, nextTick, ref, watch } from 'vue';
import { TransitionPresets, useTransition } from '@vueuse/core';

export default defineComponent({
  name: 'CountTo',
  props: {
    startValue: {
      type: Number,
      default: 0
    },
    endValue: {
      type: Number,
      default: 2021
    },
    duration: {
      type: Number,
      default: 1500
    },
    autoplay: {
      type: Boolean,
      default: true
    },
    decimals: {
      type: Number,
      default: 0
    },
    prefix: {
      type: String,
      default: ''
    },
    suffix: {
      type: String,
      default: ''
    },
    separator: {
      type: String,
      default: ','
    },
    decimal: {
      type: String,
      default: '.'
    },
    useEasing: {
      type: Boolean,
      default: true
    },
    transition: {
      type: String as PropType<keyof typeof TransitionPresets>,
      default: 'linear'
    }
  },
  setup(props) {
    const source = ref(props.startValue);

    const easingTransition = computed(() =>
      props.useEasing ? TransitionPresets[props.transition] : undefined
    );

    const outputValue = useTransition(source, {
      disabled: false,
      duration: props.duration,
      transition: easingTransition.value
    });

    function formatValue(num: number) {
      let number = num.toFixed(props.decimals);
      number = String(number);

      const x = number.split('.');
      let x1 = x[0];
      const x2 = x.length > 1 ? props.decimal + x[1] : '';
      const rgx = /(\d+)(\d{3})/;
      if (props.separator) {
        while (rgx.test(x1)) {
          x1 = x1.replace(rgx, `$1${props.separator}$2`);
        }
      }

      return props.prefix + x1 + x2 + props.suffix;
    }

    const value = computed(() => formatValue(outputValue.value));

    async function start() {
      await nextTick();
      source.value = props.endValue;
    }

    watch(
      [() => props.startValue, () => props.endValue],
      () => {
        if (props.autoplay) {
          start();
        }
      },
      { immediate: true }
    );

    return () => <span>{value.value}</span>;
  }
});
