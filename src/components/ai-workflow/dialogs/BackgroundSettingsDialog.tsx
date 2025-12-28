import { defineComponent, ref, watch, type PropType } from 'vue';
import { NModal, NCard, NForm, NFormItem, NSelect, NColorPicker, NSlider, NSwitch, NButton, NSpace } from 'naive-ui';
import type { CanvasBackground, GridType } from '../types/canvas-settings';

export default defineComponent({
  name: 'BackgroundSettingsDialog',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    settings: {
      type: Object as PropType<CanvasBackground>,
      required: true
    },
    onUpdate: {
      type: Function as PropType<(settings: CanvasBackground) => void>,
      required: true
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    const localSettings = ref<CanvasBackground>({ ...props.settings });

    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...newSettings };
    }, { deep: true });

    const gridTypeOptions = [
      { label: '点状网格', value: 'dots' as GridType },
      { label: '线状网格', value: 'lines' as GridType },
      { label: '十字网格', value: 'cross' as GridType }
    ];

    const handleSave = () => {
      props.onUpdate(localSettings.value);
      props.onClose();
    };

    return () => (
      <NModal
        show={props.show}
        onUpdateShow={(show: boolean) => !show && props.onClose()}
        preset="card"
        title="背景设置"
        style={{ width: '500px' }}
        segmented={{
          content: 'soft',
          footer: 'soft'
        }}
      >
        {{
          default: () => (
            <NForm labelPlacement="left" labelWidth="100">
              <NFormItem label="显示网格">
                <NSwitch v-model:value={localSettings.value.showGrid} />
              </NFormItem>

              {localSettings.value.showGrid && (
                <>
                  <NFormItem label="网格类型">
                    <NSelect
                      v-model:value={localSettings.value.gridType}
                      options={gridTypeOptions}
                    />
                  </NFormItem>

                  <NFormItem label="网格大小">
                    <NSlider
                      v-model:value={localSettings.value.gridSize}
                      min={10}
                      max={50}
                      step={5}
                      marks={{
                        10: '10px',
                        20: '20px',
                        30: '30px',
                        40: '40px',
                        50: '50px'
                      }}
                    />
                  </NFormItem>

                  <NFormItem label="网格颜色">
                    <NColorPicker
                      v-model:value={localSettings.value.gridColor}
                      showAlpha={false}
                      modes={['hex']}
                    />
                  </NFormItem>
                </>
              )}

              <NFormItem label="背景颜色">
                <NColorPicker
                  v-model:value={localSettings.value.backgroundColor}
                  showAlpha={false}
                  modes={['hex']}
                />
              </NFormItem>
            </NForm>
          ),
          footer: () => (
            <NSpace justify="end">
              <NButton onClick={props.onClose}>取消</NButton>
              <NButton type="primary" onClick={handleSave}>保存</NButton>
            </NSpace>
          )
        }}
      </NModal>
    );
  }
});

