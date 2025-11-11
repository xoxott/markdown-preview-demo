import { type PropType, computed, defineComponent, ref, watch, watchEffect } from 'vue';
import { Sandbox, useStore, useVueImportMap } from '@vue/repl';
import { NAlert, NButton, NCard, NDrawer, NDrawerContent, NIcon, NRadio, NRadioGroup, NSpace } from 'naive-ui';
import { Bug, PlayerPlay } from '@vicons/tabler';
import Monaco from '@/components/monaco/index.vue';
import { useMarkdownTheme } from '../hooks/useMarkdownTheme';
import { useRunJSCode } from '../hooks/useRunJSCode';
import '@vue/repl/style.css';

export type CodeMode = 'javascript' | 'vue';

export interface SandBoxProps {
  /** 代码内容 */
  code: string;
  /** 运行模式 */
  mode: CodeMode;
  /** 是否显示（v-model） */
  show?: boolean;
}

/** 代码沙箱组件 支持 JavaScript 和 Vue 代码的运行和调试 */
export const SandBox = defineComponent({
  name: 'SandBox',
  props: {
    code: {
      type: String,
      required: true
    },
    mode: {
      type: String as PropType<CodeMode>,
      default: 'javascript'
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    'update:show': (_value: boolean) => true,
    close: () => true
  },
  setup(props, { emit }) {
    const { darkMode } = useMarkdownTheme();

    // 状态管理
    const showDrawer = computed({
      get: () => props.show,
      set: val => emit('update:show', val)
    });

    const showVueRepl = ref(false);
    const currentMode = ref<CodeMode>(props.mode);
    const currentCode = ref(props.code);
    const result = ref('');
    const error = ref('');
    const duration = ref<number | null>(null);
    const logs = ref<string[]>([]);
    const loading = ref(false);

    // Vue REPL 配置
    const { importMap: builtinImportMap } = useVueImportMap({
      runtimeDev: '/markdown-preview-demo/local/vue.runtime.esm-browser.js',
      runtimeProd: '/markdown-preview-demo/local/vue.runtime.esm-browser.prod.js'
    });

    // 创建 store
    const store = useStore(
      {
        resourceLinks: ref({
          esModuleShims: 'local/es-module-shims.wasm.js'
        }),
        builtinImportMap,
        showOutput: ref(true),
        outputMode: ref('preview')
      },
      location.hash
    );

    // 监听 props 变化
    watch(
      () => props.code,
      val => {
        currentCode.value = val;
      }
    );

    watch(
      () => props.mode,
      val => {
        currentMode.value = val;
      }
    );

    // 同步 store 到 URL
    watchEffect(() => {
      if (typeof history !== 'undefined') {
        history.replaceState({}, '', store.serialize());
      }
    });

    // 设置 Vue 代码
    const setCode = (code: string) => {
      store.setFiles(
        {
          'App.vue': code
        },
        'App.vue'
      );
    };

    // 运行代码
    const runCode = async () => {
      loading.value = true;
      error.value = '';
      result.value = '';
      duration.value = null;
      logs.value = [];
      showVueRepl.value = false;

      if (currentMode.value === 'vue') {
        setCode(currentCode.value);
        showVueRepl.value = true;
        loading.value = false;
        return;
      }

      // JavaScript 模式
      const { run, result: res, error: err, duration: time, logs: logOutput } = useRunJSCode(currentCode.value);

      await run();

      error.value = err.value || '';
      duration.value = time.value;
      result.value = res.value?.join(' ') || '';
      logs.value = logOutput.value;
      loading.value = false;
    };

    // 处理关闭
    const handleClose = () => {
      emit('close');
    };

    watch(showDrawer, val => {
      if (!val) {
        handleClose();
      }
    });

    return () => (
      <NDrawer v-model:show={showDrawer.value} placement="right" width="45%" onAfterLeave={handleClose}>
        <NDrawerContent closable>
          {{
            header: () => (
              <div class="flex items-center gap-2 font-semibold">
                <NIcon>
                  <Bug />
                </NIcon>
                <span>代码调试</span>
              </div>
            ),
            default: () => (
              <div class="flex flex-col gap-4">
                {/* 运行模式选择 */}
                <NCard size="small" bordered title="运行模式">
                  <NRadioGroup v-model:value={currentMode.value} name="mode" size="medium">
                    <NSpace size={12}>
                      <NRadio value="javascript">
                        {{
                          default: () => (
                            <span class="flex items-center gap-2">
                              <code class="text-blue-500">JavaScript</code>
                            </span>
                          )
                        }}
                      </NRadio>
                      <NRadio value="vue">
                        {{
                          default: () => (
                            <span class="flex items-center gap-2">
                              <code class="text-blue-500">Vue</code>
                            </span>
                          )
                        }}
                      </NRadio>
                    </NSpace>
                  </NRadioGroup>
                </NCard>

                {/* 代码编辑器 */}
                <NCard title="代码预览" size="small" bordered>
                  <Monaco
                    v-model={currentCode.value}
                    filename="App.vue"
                    mode={currentMode.value}
                    theme={darkMode.value ? 'dark' : 'light'}
                  />
                </NCard>

                {/* 运行按钮 */}
                <NSpace>
                  <NButton type="primary" loading={loading.value} onClick={runCode}>
                    {{
                      icon: () => <PlayerPlay />,
                      default: () => '运行'
                    }}
                  </NButton>
                </NSpace>

                {/* JavaScript 模式的输出 */}
                {currentMode.value === 'javascript' && (
                  <>
                    {duration.value !== null && (
                      <NAlert type="info" title="耗时">
                        {duration.value.toFixed(2)} ms
                      </NAlert>
                    )}

                    {logs.value.length > 0 && (
                      <NAlert type="warning" title="控制台输出" showIcon>
                        <div class="whitespace-pre-wrap text-sm">{logs.value.join('\n')}</div>
                      </NAlert>
                    )}

                    {result.value && !error.value && (
                      <NAlert type="success" title="输出结果" class="whitespace-pre-wrap text-sm" showIcon>
                        {result.value}
                      </NAlert>
                    )}

                    {error.value && (
                      <NAlert type="error" title="错误" showIcon>
                        {error.value}
                      </NAlert>
                    )}
                  </>
                )}

                {/* Vue REPL */}
                {showVueRepl.value && (
                  <div class="vue-repl-container overflow-hidden border rounded-lg shadow-sm">
                    <Sandbox
                      show={showVueRepl.value}
                      store={store}
                      class="border rounded-lg shadow"
                      theme={darkMode.value ? 'dark' : 'light'}
                    />
                  </div>
                )}
              </div>
            )
          }}
        </NDrawerContent>
      </NDrawer>
    );
  }
});

// 添加样式
const style = document.createElement('style');
style.textContent = `
.vue-repl-wrapper {
  max-height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.vue-repl-container {
  min-height: 500px;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('sandbox-styles')) {
  style.id = 'sandbox-styles';
  document.head.appendChild(style);
}
