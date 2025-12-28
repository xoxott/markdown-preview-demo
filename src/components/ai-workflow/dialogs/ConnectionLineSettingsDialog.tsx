import { defineComponent, ref, watch, type PropType } from 'vue';
import { NModal, NCard, NForm, NFormItem, NSelect, NColorPicker, NSlider, NSwitch, NButton, NSpace, NDivider } from 'naive-ui';
import type { ConnectionLineStyle, ConnectionLineType } from '../types/canvas-settings';

export default defineComponent({
  name: 'ConnectionLineSettingsDialog',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    settings: {
      type: Object as PropType<ConnectionLineStyle>,
      required: true
    },
    onUpdate: {
      type: Function as PropType<(settings: ConnectionLineStyle) => void>,
      required: true
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props) {
    const localSettings = ref<ConnectionLineStyle>({ ...props.settings });

    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...newSettings };
    }, { deep: true });

    const lineTypeOptions = [
      { label: '贝塞尔曲线', value: 'bezier' as ConnectionLineType },
      { label: '直线', value: 'straight' as ConnectionLineType },
      { label: '阶梯线', value: 'step' as ConnectionLineType },
      { label: '平滑阶梯线', value: 'smoothstep' as ConnectionLineType }
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
        title="连接线设置"
        style={{ width: '500px' }}
        segmented={{
          content: 'soft',
          footer: 'soft'
        }}
      >
        {{
          default: () => (
            <NForm labelPlacement="left" labelWidth="100">
              <NFormItem label="线条类型">
                <NSelect
                  v-model:value={localSettings.value.type}
                  options={lineTypeOptions}
                />
              </NFormItem>

              <NFormItem label="线条颜色">
                <NColorPicker
                  v-model:value={localSettings.value.color}
                  showAlpha={false}
                  modes={['hex']}
                />
              </NFormItem>

              <NFormItem label="线条宽度">
                <NSlider
                  v-model:value={localSettings.value.width}
                  min={1}
                  max={10}
                  step={1}
                  marks={{
                    1: '1px',
                    5: '5px',
                    10: '10px'
                  }}
                />
              </NFormItem>

              <NFormItem label="动画效果">
                <NSwitch v-model:value={localSettings.value.animated} />
              </NFormItem>

              <NFormItem label="显示箭头">
                <NSwitch v-model:value={localSettings.value.showArrow} />
              </NFormItem>

              <NDivider style={{ marginTop: '16px', marginBottom: '16px' }}>
                拖拽预览线条
              </NDivider>

              <NFormItem label="预览线条颜色" labelStyle={{ alignItems: 'flex-start' }}>
                <div style={{ width: '100%' }}>
                  <NColorPicker
                    v-model:value={localSettings.value.draftColor}
                    showAlpha={false}
                    modes={['hex']}
                  />
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    留空则使用默认渐变色
                  </div>
                </div>
              </NFormItem>

              <NFormItem label="预览线条宽度">
                <NSlider
                  v-model:value={localSettings.value.draftWidth}
                  min={1}
                  max={10}
                  step={1}
                  marks={{
                    1: '1px',
                    5: '5px',
                    10: '10px'
                  }}
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

