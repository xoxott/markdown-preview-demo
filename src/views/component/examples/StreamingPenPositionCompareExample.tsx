/**
 * StreamingPenEffect Markdown 渲染示例
 * 演示在 Markdown 渲染时笔跟随文字末尾移动的效果
 */
import { defineComponent, onMounted, ref } from 'vue';
import { NCard, NH3, NText, NButton } from 'naive-ui';
import Markdown from '@/components/markdown';

export default defineComponent({
  name: 'StreamingPenPositionCompareExample',
  setup() {
    const isTyping = ref(false);
    const displayText = ref('');
    let typingTimer: number | null = null;

    const startTyping = (text: string) => {
      if (isTyping.value) return;

      displayText.value = '';
      isTyping.value = true;
      let charIndex = 0;

      const type = () => {
        if (charIndex < text.length) {
          displayText.value += text.charAt(charIndex);
          charIndex++;
          typingTimer = window.setTimeout(type, 50);
        } else {
          isTyping.value = false;
          if (typingTimer) {
            clearTimeout(typingTimer);
            typingTimer = null;
          }
        }
      };

      type();
    };

    const stopTyping = () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      isTyping.value = false;
    };

    const resetText = () => {
      stopTyping();
      displayText.value = '';
    };

    // 测试文本 - 复杂的 Markdown 内容
    const testText = `# 📝 复杂 Markdown 渲染测试

这是一段包含多种 Markdown 语法的复杂内容，用于测试笔跟随文字末尾移动的效果。

## ✨ 基础格式

支持 **加粗文字**、*斜体文字*、\`行内代码\` 和 [超链接](https://example.com)。

### 列表示例

无序列表：
- 第一项
- 第二项
  - 嵌套项 1
  - 嵌套项 2
- 第三项

有序列表：
1. 第一步
2. 第二步
3. 第三步

### 任务列表

- [x] 已完成的任务
- [ ] 未完成的任务
- [x] 另一个已完成的任务
  - [x] 子任务 1
  - [ ] 子任务 2

---

## 📊 表格示例

| 功能 | 状态 | 说明 |
| :--- | :--: | ---: |
| Markdown 基础 | ✅ | 支持标题、列表等 |
| 代码高亮 | ✅ | 支持多种语言 |
| 表格渲染 | ✅ | 自动样式美化 |
| 数学公式 | ✅ | LaTeX 语法支持 |

---

## 💻 代码块

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
\`\`\`

---

## 📝 引用块

> 这是一段引用文字。
> 可以包含多行内容。
>
> 也可以包含 **加粗** 和 *斜体*。

---

## 🔢 数学公式

行内公式：$E = mc^2$ 和 $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$

块级公式：

$$
x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}
$$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

---

## 🎨 其他元素

这是一段普通文字，包含一些 \`行内代码\` 和 **重要内容**。

### 分隔线测试

---

上面是分隔线，下面是更多内容。

### 嵌套结构

1. 第一级
   - 第二级
     - 第三级
       - 第四级
2. 另一个第一级

---

## 📌 总结

这是一个包含多种 Markdown 语法的复杂文档，用于测试流式渲染时笔的位置追踪功能。包含了标题、列表、表格、代码块、引用、数学公式等多种元素。

**测试要点**：
- 笔应该能正确跟随文字末尾
- 支持多行文本的换行处理
- 能够处理各种 Markdown 元素
- 流式渲染过程中位置实时更新

*最后一段文字用于测试笔的最终位置。*`;

    // 组件挂载后自动开始
    onMounted(() => {
      setTimeout(() => {
        startTyping(testText);
      }, 500);
    });


    return () => (
      <NCard bordered class="shadow-sm">
        <NH3 class="border-b pb-2 text-lg font-semibold mb-4">
          ✍️ Markdown 流式渲染笔写效果
        </NH3>

        <NText class="text-gray-500 mb-6 block">
          演示在 Markdown 渲染时，笔跟随文字末尾移动的效果。点击按钮可以重新开始流式渲染。
        </NText>

        {/* 控制按钮 */}
        <div class="mb-4 flex gap-2">
          <NButton
            type="primary"
            onClick={() => startTyping(testText)}
            disabled={isTyping.value}
          >
            开始流式渲染
          </NButton>
          <NButton onClick={stopTyping} disabled={!isTyping.value}>
            停止
          </NButton>
          <NButton onClick={resetText}>重置</NButton>
        </div>

        {/* Markdown 渲染区域 */}
        <div
          style={{
            position: 'relative',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontSize: '16px',
            lineHeight: '2',
            minHeight: '200px',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <Markdown
            content={displayText.value}
            showPenEffect={isTyping.value}
            penEffectConfig={{
              penColor: '#15803d',
              size: 30,
              offsetX: 0.75,
              offsetY: -0.5
            }}
          />
        </div>

        {/* 说明 */}
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-2 text-blue-700">💡 使用说明</h4>
          <ul class="text-sm text-blue-600 space-y-1 list-disc list-inside">
            <li>笔会自动跟随 Markdown 渲染的文字末尾移动</li>
            <li>支持多行文本，笔会智能定位到当前行的末尾</li>
            <li>流式渲染过程中，笔的位置会实时更新</li>
            <li>可以通过按钮控制流式渲染的开始、停止和重置</li>
          </ul>
        </div>
      </NCard>
    );
  }
});
