<script setup lang="ts">
import { ref, watch, onMounted, shallowRef, nextTick, watchEffect, computed } from "vue";
import {
  PlayerPlay,
  Code,
  FileText,
  Terminal,
  AlertTriangle,
  InfoCircle,
  Circle,
  Bug,
} from "@vicons/tabler";
import {
  NDrawer,
  NDrawerContent,
  NButton,
  NRadioGroup,
  NRadio,
  NCard,
  NAlert,
  NSpace,
  NIcon,
} from "naive-ui";
import { useRunJSCode } from "../hook/useRunJSCode";
import { useStore, Sandbox, useVueImportMap } from "@vue/repl";
import { storeToRefs } from "pinia";
import { useThemeStore } from "@/store/modules/theme";
import Monaco from "@/components/monaco/index.vue";
import "@vue/repl/style.css";
defineOptions({
  name: "SandBox",
});

interface Props {
  code: string;
  mode: string;
}
const props = defineProps<Props>();
const emit = defineEmits(["close"]);
const show = defineModel<boolean>();
const showVueRepl = ref(false);
const mode = ref<string>(props.mode);
const code = ref(props.code);
const result = ref("");
const error = ref("");
const duration = ref<number | null>(null);
const logs = ref<string[]>([]);
const loading = ref(false);
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);

const { importMap: builtinImportMap } = useVueImportMap({
  runtimeDev: "/local/vue.runtime.esm-browser.js",
  runtimeProd: "/local/vue.runtime.esm-browser.prod.js",
});

watch(()=>props.code,val=>{
  code.value = val;
})

/** 获取store */
const store = useStore(
  {
    resourceLinks: ref({
      esModuleShims: "local/es-module-shims.wasm.js",
    }),
    builtinImportMap,
    showOutput: ref(true),
    outputMode: ref("preview"),
  },
  location.hash
);
/** 设置vue代码 */
const setCode = (code: string) => {
  store.setFiles(
    {
      "App.vue": code,
    },
    "App.vue"
  );
};

watchEffect(() => history.replaceState({}, "", store.serialize()));
/** 运行 */
const runCode = async () => {
  loading.value = true;
  error.value = "";
  result.value = "";
  duration.value = null;
  logs.value = [];
  showVueRepl.value = false;
  if (mode.value === "vue") {
    setCode(code.value);
    showVueRepl.value = true;
    loading.value = false;
    return;
  }
  const { run, result: res, error: err, duration: time, logs: logOutput } = useRunJSCode(
    code.value
  );
  await run();
  error.value = err.value || "";
  duration.value = time.value;
  result.value = res.value?.join(" ");
  logs.value = logOutput.value;
  loading.value = false;
};
const resetStyle = `margin: 0; padding: 0; font-size: none;margin-bottom:0`;
watch(show, (val) => {
  if (!val) emit("close");
});
</script>

<template>
  <NDrawer v-model:show="show" placement="right" width="45%" @after-leave="emit('close')">
    <NDrawerContent closable>
      <template #header>
        <div class="flex items-center gap-2 font-semibold">
          <NIcon>
            <Bug />
          </NIcon>
          <span>代码调试</span>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <NCard size="small" :bordered="true" class="mode-card">
          <template #header>
            <div class="flex items-center gap-2 text-base">
              <Icon class="text-blue-500" />
              运行模式
            </div>
          </template>

          <NRadioGroup v-model:value="mode" name="mode" size="medium">
            <NSpace :size="12">
              <NRadio value="javascript">
                <template #default>
                  <span class="flex items-center gap-2">
                    <code class="text-blue-500">JavaScript</code>
                  </span>
                </template>
              </NRadio>
              <NRadio value="vue">
                <template #default>
                  <span class="flex items-center gap-2">
                    <code class="text-blue-500">Vue</code>
                  </span>
                </template>
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </NCard>

        <NCard title="代码预览" size="small" bordered>
          <Monaco filename="App.vue" :mode="mode" v-model="code" :theme="darkMode ? 'dark' : 'light'" />
        </NCard>

        <NSpace>
          <NButton type="primary" @click="runCode" :loading="loading">
            <template #icon>
              <PlayerPlay />
            </template>
            <span>运行</span>
          </NButton>
        </NSpace>

        <template v-if="mode === 'javascript'">
          <NAlert v-if="duration" type="info" title="耗时">
            {{ duration.toFixed(2) }} ms
          </NAlert>

          <NAlert v-if="logs.length" type="warning" title="控制台输出" show-icon>
            <div class="whitespace-pre-wrap text-sm">
              {{ logs.join("\n") }}
            </div>
          </NAlert>

          <NAlert
            v-if="result && !error"
            type="success"
            title="输出结果"
            class="whitespace-pre-wrap text-sm"
            show-icon
          >
            {{ result }}
          </NAlert>

          <NAlert v-if="error" type="error" title="错误" show-icon>
            {{ error }}
          </NAlert>
        </template>
        <div
          v-if="showVueRepl"
          class="vue-repl-container border rounded-lg overflow-hidden shadow-sm"
        >
          <Sandbox :show="showVueRepl" :store="store" class="rounded-lg shadow border" :theme="darkMode ? 'dark' : 'light'" />
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
<style scoped>
.vue-repl-wrapper {
  max-height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
</style>
