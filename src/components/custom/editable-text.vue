<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 23:41:34
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-01 23:52:57
 * @FilePath: \markdown-preview-demo\src\components\custom\editable-text.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { Edit } from '@vicons/tabler';

const props = withDefaults(
  defineProps<{
    value: string;
    textPrefix?: string;
    placeholder?: string;
    isHovering?: boolean;
  }>(),
  {
    textPrefix: '',
    placeholder: '请输入',
    isHovering: true
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'success', value: string): void;
}>();

const isEditing = ref(false);
const editableValue = ref(props.value);
const inputRef = ref<HTMLInputElement>();

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
</script>

<template>
  <div class="flex items-center">
    <!-- 非编辑状态 -->
    <div v-if="!isEditing" class="group flex items-center py-0.5">
      <NText>
        {{ textPrefix + value }}
      </NText>

      <NButton
        v-if="isHovering"
        quaternary
        size="tiny"
        text
        circle
        class="h-5 w-5 flex items-center justify-center"
        @click="startEdit"
      >
        <NIcon>
          <Edit />
        </NIcon>
      </NButton>
    </div>

    <!-- 编辑状态 -->
    <NInput
      v-else
      ref="inputRef"
      v-model:value="editableValue"
      size="small"
      :placeholder="placeholder"
      autofocus
      class="h-8 w-full"
      style="--n-height: 32px"
      @blur="finishEdit"
      @keyup.enter="finishEdit"
    />
  </div>
</template>
