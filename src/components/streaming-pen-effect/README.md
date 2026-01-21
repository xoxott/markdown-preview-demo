# StreamingPenEffect 组件

一个用于 AI 对话流式响应时的笔写动画效果组件。采用 TSX 编写，使用 Range API 实现精确的光标位置追踪。

## ✨ 特性

- 🖊️ 精美的笔图标设计（SVG）
- 📝 流畅的书写动画效果
- 🎯 **智能位置追踪** - 笔跟随文字末尾实时移动
- 🎨 可自定义颜色和大小
- 💧 墨迹掉落动画
- ⚡ 性能优化 - RAF + MutationObserver
- 🧠 自动检测文字变化
- 📱 响应式，支持窗口缩放

## 📦 使用方法

### 基础用法（TSX）

```tsx
import { defineComponent, ref } from 'vue';
import StreamingPenEffect from '@/components/streaming-pen-effect';

export default defineComponent({
  setup() {
    const textRef = ref<HTMLElement | null>(null);
    const isTyping = ref(true);
    const text = ref('正在输入的文字...');

    return () => (
      <div style="position: relative;">
        <span ref={textRef}>{text.value}</span>
        <StreamingPenEffect
          isWriting={isTyping.value}
          targetRef={textRef.value}
        />
      </div>
    );
  }
});
```

### 自定义样式

```tsx
<StreamingPenEffect
  isWriting={isTyping.value}
  targetRef={textRef.value}
  penColor="#1e40af"
  size={28}
/>
```

## 🎛️ Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isWriting` | `boolean` | `true` | 是否正在书写（控制显示/隐藏） |
| `targetRef` | `HTMLElement \| null` | `null` | **必需** - 文字容器的 ref，用于追踪位置 |
| `penColor` | `string` | `'#92400e'` | 笔的颜色（CSS 颜色值） |
| `size` | `number` | `24` | 笔的大小（像素） |

## 🎨 动画效果

### 书写动画
- 笔尖上下轻微移动，模拟按压效果
- 左右轻微摆动，增加自然感
- 旋转角度变化（-12° 到 -18°）

### 墨迹效果
- 笔尖处有细微的墨迹点
- 墨迹会向下掉落并逐渐消失
- 增强书写的真实感

### 过渡效果
- 淡入：从小到大，带旋转
- 淡出：缩小并下落

## 📱 演示

访问项目的组件示例页面查看完整演示：

```
路由：/component
```

演示包含：
- 默认样式
- 不同颜色示例
- 不同大小示例
- 模拟流式输出效果

## 🔧 集成到聊天页面

在 AI 聊天页面中使用（需要获取文字容器的 ref）：

```tsx
import { defineComponent, ref } from 'vue';
import StreamingPenEffect from '@/components/streaming-pen-effect';
import Markdown from '@/components/markdown';

export default defineComponent({
  setup() {
    const messageRef = ref<HTMLElement | null>(null);
    const isTyping = ref(true);

    return () => (
      <div class="message ai" style="position: relative;">
        <div class="message-content" ref={messageRef}>
          <Markdown content={message.value} />
        </div>
        <StreamingPenEffect
          isWriting={isTyping.value}
          targetRef={messageRef.value}
          penColor="#92400e"
          size={20}
        />
      </div>
    );
  }
});
```

**重要提示：**
- 文字容器必须设置 `position: relative` 或其他定位上下文
- `targetRef` 必须指向实际的文字容器元素

## 🎯 设计原理

### 光标位置追踪（当前实现）

采用 **Range API** 实现精确的文字末尾定位：

1. **文本节点查找**
   - 使用 `TreeWalker` 遍历所有文本节点
   - 过滤空白节点，只处理有效文本

2. **位置计算**
   - 使用 `Range.getBoundingClientRect()` 获取精确位置
   - 相对于容器计算偏移量
   - 自动处理多行文本

3. **变化监听**
   - `MutationObserver` 监听 DOM 变化
   - 自动检测文字内容更新
   - 实时更新笔的位置

4. **性能优化**
   - `requestAnimationFrame` 节流更新
   - 避免重复计算
   - 自动清理监听器

## 🎨 颜色建议

根据消息背景选择合适的笔颜色：

```css
/* 黄色背景 */
background: #fef9c3;
pen-color: #92400e;

/* 蓝色背景 */
background: #dbeafe;
pen-color: #1e3a8a;

/* 绿色背景 */
background: #dcfce7;
pen-color: #14532d;

/* 紫色背景 */
background: #f3e8ff;
pen-color: #581c87;
```

## 📄 文件结构

```
streaming-pen-effect/
├── index.vue       # 组件主文件
└── README.md       # 本文档
```

## ⚡ 性能说明

- ✅ **位置计算**：使用 `requestAnimationFrame` 节流
- ✅ **CSS 动画**：书写动作使用纯 CSS，GPU 加速
- ✅ **智能监听**：仅在必要时更新位置
- ✅ **自动清理**：组件卸载时清理所有监听器
- ✅ **内存优化**：及时取消 RAF 和 MutationObserver

### 性能建议

1. **容器大小**：建议文字容器不要过大，减少计算量
2. **更新频率**：RAF 自动限制在 60fps
3. **批量更新**：MutationObserver 会自动合并多次变化

## 🔧 技术细节

### Range API 使用

```typescript
// 获取文字末尾位置
const range = document.createRange();
range.setStart(lastTextNode, text.length);
range.setEnd(lastTextNode, text.length);
const rect = range.getBoundingClientRect();
```

### MutationObserver 配置

```typescript
observer.observe(targetElement, {
  childList: true,      // 监听子节点变化
  subtree: true,        // 监听所有后代节点
  characterData: true   // 监听文本内容变化
});
```

## 🚀 后续优化方向

1. ✅ ~~位置追踪~~：已实现精确的 Range API 追踪
2. **更多笔样式**：铅笔、毛笔、马克笔等
3. **声音效果**：可选的书写声音
4. **墨迹增强**：更丰富的墨迹扩散效果
5. **多行优化**：更好的多行文本处理

## 📝 更新日志

### v2.0.0 (2026-01-21) - 🎯 智能追踪版本
- ✅ **重大更新**：从 Vue 模板改为 TSX 实现
- ✅ **智能追踪**：使用 Range API 实现精确位置追踪
- ✅ **自动更新**：MutationObserver 监听文字变化
- ✅ **性能优化**：RAF 节流 + 自动清理
- ✅ **响应式**：支持窗口缩放和容器变化
- ⚠️ **Breaking Change**：现在需要传入 `targetRef` prop

### v1.0.0 (2026-01-21)
- ✅ 初始版本（固定位置）
- ✅ 基础书写动画
- ✅ 墨迹掉落效果
- ✅ 淡入淡出过渡
- ✅ 完整的演示页面
