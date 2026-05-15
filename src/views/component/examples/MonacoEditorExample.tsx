import { defineComponent, ref } from 'vue';
import { NCard, NCode, NDivider, NH3, NSpace, NSwitch, NText } from 'naive-ui';
import { EditorToolbar, MonacoEditor, useMonacoEditorToolbar } from '@/components/monaco';

const DEMO_TS = `export function greet(name: string) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Monaco'));
`;

const SNIPPET_CORE_FIXED = `<MonacoEditor
  v-model={code}
  filename="demo.ts"
  language="typescript"
  :height="320"
/>`;

const SNIPPET_COMPOSE = `const toolbar = useMonacoEditorToolbar({
  readonly: true,
  folding: true,
  baseHeight: '320px'
});

<div ref={toolbar.wrapperRef} class="flex flex-col" style={toolbar.shellStyle.value}>
  <EditorToolbar
    language="typescript"
    readonly
    folding
    actions={toolbar.actions.value}
    isFolded={toolbar.isFolded.value}
    isFullscreen={toolbar.isFullscreen.value}
    onCopy={toolbar.handleCopy}
    onToggleFold={toolbar.handleToggleFold}
    onToggleFullscreen={toolbar.handleToggleFullscreen}
  />
  <MonacoEditor
    v-model={code}
    filename="demo.ts"
    height="100%"
    readonly
    onReady={toolbar.bindEditor}
  />
</div>`;

const SNIPPET_FLEX_FILL = `<div class="flex h-80 min-h-0 flex-col overflow-hidden">
  <MonacoEditor v-model={code} filename="demo.ts" height="100%" />
</div>`;

export default defineComponent({
  name: 'MonacoEditorExample',
  setup() {
    const editableCode = ref(DEMO_TS);
    const readonlyCode = ref(DEMO_TS);
    const readonly = ref(true);

    const toolbar = useMonacoEditorToolbar({
      readonly: () => readonly.value,
      folding: true,
      baseHeight: '320px'
    });

    return () => (
      <div class="space-y-6">
        <NCard bordered>
          <NH3 class="mb-1 text-lg font-semibold">MonacoEditor — 固定高度</NH3>
          <NText depth={3} class="mb-4 block">
            仅编辑器本体，无工具栏。适合页面自有工具栏或 Drawer 内嵌（如文件编辑器）。
          </NText>
          <MonacoEditor
            modelValue={editableCode.value}
            filename="demo.ts"
            language="typescript"
            height={320}
            minimap
            onUpdate:modelValue={value => {
              editableCode.value = value;
            }}
          />
          <NDivider />
          <NCode language="typescript" code={SNIPPET_CORE_FIXED} wordWrap />
        </NCard>

        <NCard bordered>
          <NH3 class="mb-1 text-lg font-semibold">EditorToolbar + useMonacoEditorToolbar</NH3>
          <NText depth={3} class="mb-4 block">
            工具栏 UI 与逻辑分离：用 composable 处理复制/折叠/全屏，按需组合。
          </NText>
          <NSpace align="center" class="mb-3">
            <NText>只读</NText>
            <NSwitch v-model:value={readonly.value} />
          </NSpace>
          <div
            ref={toolbar.wrapperRef}
            class="flex flex-col overflow-hidden border border-gray-200 rounded dark:border-gray-700"
            style={toolbar.shellStyle.value}
          >
            <EditorToolbar
              language="typescript"
              readonly={readonly.value}
              folding
              actions={toolbar.actions.value}
              isFolded={toolbar.isFolded.value}
              isFullscreen={toolbar.isFullscreen.value}
              onCopy={toolbar.handleCopy}
              onFormat={toolbar.handleFormat}
              onToggleFold={toolbar.handleToggleFold}
              onToggleFullscreen={toolbar.handleToggleFullscreen}
            />
            <MonacoEditor
              modelValue={readonlyCode.value}
              filename="demo.ts"
              language="typescript"
              readonly={readonly.value}
              height="100%"
              onUpdate:modelValue={value => {
                readonlyCode.value = value;
              }}
              onReady={toolbar.bindEditor}
            />
          </div>
          <NDivider />
          <NCode language="typescript" code={SNIPPET_COMPOSE} wordWrap />
        </NCard>

        <NCard bordered>
          <NH3 class="mb-1 text-lg font-semibold">height=&quot;100%&quot; — 铺满 flex 父级</NH3>
          <NText depth={3} class="mb-4 block">
            Drawer / 分屏场景：父级使用 flex 列 + min-h-0，编辑器 height 传 100%（内部 flex:1）。
          </NText>
          <div class="h-80 flex flex-col overflow-hidden border border-gray-200 rounded dark:border-gray-700">
            <MonacoEditor
              modelValue={editableCode.value}
              filename="demo.ts"
              language="typescript"
              height="100%"
              onUpdate:modelValue={value => {
                editableCode.value = value;
              }}
            />
          </div>
          <NDivider />
          <NCode language="html" code={SNIPPET_FLEX_FILL} wordWrap />
        </NCard>
      </div>
    );
  }
});
