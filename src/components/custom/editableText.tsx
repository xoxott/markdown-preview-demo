import { Edit } from '@vicons/tabler';
import { NButton, NIcon, NInput, NText } from 'naive-ui';
import { defineComponent, nextTick, ref, watch } from 'vue';

export default defineComponent({
  name: 'EditableText',
  props: {
    value: {
      type: String,
      required: true
    },
    textPrefix: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '请输入'
    },
    isHovering: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'success'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const editableValue = ref(props.value);
    const inputRef = ref<InstanceType<typeof NInput>>();

    watch(
      () => props.value,
      newVal => {
        if (!isEditing.value) editableValue.value = newVal;
      }
    );

    function startEdit() {
      isEditing.value = true;
      editableValue.value = props.value;
      nextTick(() => {
        inputRef.value?.focus();
      });
    }

    function finishEdit() {
      isEditing.value = false;
      emit('update:modelValue', editableValue.value);
      emit('success', editableValue.value);
    }

    function handleKeyup(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        finishEdit();
      }
    }

    return () => (
      <div class="flex items-center">
        {/* 非编辑状态 */}
        {!isEditing.value ? (
          <div class="group flex items-center py-0.5">
            <NText>{props.textPrefix + props.value}</NText>

            {props.isHovering && (
              <NButton
                quaternary
                size="tiny"
                circle
                class="h-5 w-5 flex items-center justify-center"
                onClick={startEdit}
              >
                <NIcon>
                  <Edit />
                </NIcon>
              </NButton>
            )}
          </div>
        ) : (
          /* 编辑状态 */
          <NInput
            ref={inputRef}
            value={editableValue.value}
            onUpdate:value={(val: string) => (editableValue.value = val)}
            size="small"
            placeholder={props.placeholder}
            autofocus
            class="h-8 w-full"
            style={{ '--n-height': '32px' }}
            onBlur={finishEdit}
            onKeyup={handleKeyup}
          />
        )}
      </div>
    );
  }
});

