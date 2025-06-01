<script lang="ts" setup>
import { onMounted, onBeforeUnmount, shallowRef, watch, computed, ref } from "vue";
import * as monaco from "monaco-editor-core";
import { getOrCreateModel } from "./utils";
import { registerHighlighter } from "./highlight.ts";

const modelValue = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{
    filename?: string;
    readonly?: boolean;
    theme?: "light" | "dark";
    mode?: "javascript" | "vue" | "css" | string;
  }>(),
  {
    readonly: false,
    theme: "dark",
    mode: "javascript",
  }
);

const emit = defineEmits<{
  (e: "change", value: string): void;
}>();

const containerRef = ref<HTMLElement>();
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
let model = shallowRef<monaco.editor.ITextModel>();

const lang = computed(() => {
  if (props.mode) return props.mode;
  if (props?.filename?.endsWith(".vue")) return "vue";
  if (props?.filename?.endsWith(".css")) return "css";
  return "javascript";
});

function emitChangeEvent() {
  if (editor.value) {
     modelValue.value = editor.value!.getValue()
    emit("change", editor.value.getValue());
  }
}

onMounted(() => {
  if (!containerRef.value) return;
  registerHighlighter();
  const uri = monaco.Uri.parse(`file:///${props.filename || "untitled"}`);
  model.value = getOrCreateModel(uri, lang.value, modelValue.value || "");

  editor.value = monaco.editor.create(containerRef.value, {
    model: model.value,
    language: lang.value,
    fontSize: 14,
    tabSize: 2,
    readOnly: props.readonly,
    theme: props.theme === "light" ? "vs" : "vs-dark",
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
  });

  editor.value.onDidChangeModelContent(() => emitChangeEvent());
});

watch(
  () =>  modelValue.value,
  (newVal) => {
    if (editor.value && editor.value.getValue() !== newVal) {
      editor.value.setValue(newVal || "");
    }
  }
);

watch(
  () => props.theme,
  (theme) => {
    monaco.editor.setTheme(theme === "light" ? "vs" : "vs-dark");
  }
);

watch(
  () => props.mode,
  (newLang) => {
    if (model.value) {
      monaco.editor.setModelLanguage(model.value, newLang);
    }
  }
);

onBeforeUnmount(() => {
  editor.value?.dispose();
  model.value?.dispose();
});
</script>

<template>
  <div ref="containerRef" class="editor" />
</template>

<style>
.editor {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: relative;
}
</style>
