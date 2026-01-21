/**
 * StreamingPenEffect 组件示例
 * 演示流式文字输出时的笔写效果
 */
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { NCard, NH3, NText, NButton, NSpace } from 'naive-ui';
import StreamingPenEffect from '@/components/streaming-pen-effect/index';

export default defineComponent({
  name: 'StreamingPenExample',
  setup() {
    const displayText = ref('');
    const isTyping = ref(false);
    let typingTimer: number | null = null;

    // 文字容器的 refs
    const textRef1 = ref<HTMLElement | null>(null);
    const textRef2 = ref<HTMLElement | null>(null);
    const textRef3 = ref<HTMLElement | null>(null);
    const textRef4 = ref<HTMLElement | null>(null);

    const sampleTexts = [
      '这是一段模拟 AI 流式响应的文字效果。',
      '你好！我是 AI 助手，很高兴为你服务。这个组件可以在文字输出时显示一支笔在书写的效果。',
      '人工智能正在改变世界，让我们一起探索 AI 的无限可能！通过流式输出，用户可以实时看到响应内容。',
      '这个笔写效果增强了用户体验，让 AI 的回复更加生动有趣。你可以自定义笔的颜色、大小和动画速度。'
    ];

    let currentTextIndex = 0;

    /**
     * 模拟流式打字效果
     */
    const startTyping = (text: string) => {
      if (isTyping.value) return;

      displayText.value = '';
      isTyping.value = true;
      let charIndex = 0;

      const type = () => {
        if (charIndex < text.length) {
          displayText.value += text.charAt(charIndex);
          charIndex++;
          typingTimer = window.setTimeout(type, 50 + Math.random() * 50); // 随机速度，更自然
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

    /**
     * 开始演示
     */
    const handleStart = () => {
      const text = sampleTexts[currentTextIndex];
      currentTextIndex = (currentTextIndex + 1) % sampleTexts.length;
      startTyping(text);
    };

    /**
     * 停止演示
     */
    const handleStop = () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      isTyping.value = false;
    };

    /**
     * 重置
     */
    const handleReset = () => {
      handleStop();
      displayText.value = '';
    };

    // 组件挂载时自动开始第一个示例
    onMounted(() => {
      setTimeout(() => {
        handleStart();
      }, 500);
    });

    // 组件卸载前清理定时器
    onBeforeUnmount(() => {
      handleStop();
    });

    return () => (
      <NCard bordered class="shadow-sm">
        <NH3 class="border-b pb-2 text-lg font-semibold mb-4">
          ✍️ 流式文字笔写效果 (Streaming Pen Effect)
        </NH3>

        <NText class="text-gray-500 mb-4 block">
          这是一个模拟 AI 对话流式响应时的笔写动画效果组件。笔图标会在文字输出时出现，并带有书写动画，让交互更加生动。
        </NText>

        {/* 控制按钮 */}
        <NSpace class="mb-6">
          <NButton type="primary" onClick={handleStart} disabled={isTyping.value}>
            开始演示
          </NButton>
          <NButton onClick={handleStop} disabled={!isTyping.value}>
            停止
          </NButton>
          <NButton onClick={handleReset}>
            重置
          </NButton>
        </NSpace>

        {/* 演示区域 */}
        <div class="demo-container">
          {/* 示例 1: 默认样式 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">默认样式 - 笔跟随文字</h4>
            <div class="text-box default" style="position: relative;">
              <span class="text-content" ref={textRef1}>{displayText.value}</span>
              <StreamingPenEffect
                isWriting={isTyping.value}
                penColor="#92400e"
                size={20}
                targetRef={textRef1.value}
              />
            </div>
          </div>

          {/* 示例 2: 不同颜色 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">蓝色笔</h4>
            <div class="text-box blue" style="position: relative;">
              <span class="text-content" ref={textRef2}>{displayText.value}</span>
              <StreamingPenEffect
                isWriting={isTyping.value}
                penColor="#1e40af"
                size={20}
                targetRef={textRef2.value}
              />
            </div>
          </div>

          {/* 示例 3: 更大的笔 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">大号笔 (28px)</h4>
            <div class="text-box green" style="position: relative;">
              <span class="text-content" ref={textRef3}>{displayText.value}</span>
              <StreamingPenEffect
                isWriting={isTyping.value}
                penColor="#15803d"
                size={28}
                targetRef={textRef3.value}
              />
            </div>
          </div>

          {/* 示例 4: 紫色笔 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">紫色笔</h4>
            <div class="text-box purple" style="position: relative;">
              <span class="text-content" ref={textRef4}>{displayText.value}</span>
              <StreamingPenEffect
                isWriting={isTyping.value}
                penColor="#7c3aed"
                size={22}
                targetRef={textRef4.value}
              />
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-2 text-gray-700">组件 Props:</h4>
          <ul class="text-sm text-gray-600 space-y-1">
            <li><code class="px-1 py-0.5 bg-gray-200 rounded">isWriting</code>: 是否正在书写（控制显示/隐藏）</li>
            <li><code class="px-1 py-0.5 bg-gray-200 rounded">penColor</code>: 笔的颜色，默认 #92400e</li>
            <li><code class="px-1 py-0.5 bg-gray-200 rounded">size</code>: 笔的大小（px），默认 24</li>
            <li><code class="px-1 py-0.5 bg-gray-200 rounded">targetRef</code>: 文字容器的 ref（必需，用于追踪位置）</li>
          </ul>
          <div class="mt-3 text-sm text-gray-600">
            <strong>✨ 新特性：</strong> 现在笔会智能跟随文字末尾移动，使用 Range API 实现精确定位！
          </div>
        </div>

        <style>{`
          .demo-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .demo-section {
            width: 100%;
          }

          .text-box {
            position: relative;
            padding: 16px;
            border-radius: 8px;
            min-height: 80px;
            line-height: 1.8;
            font-size: 15px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
          }

          .text-box.default {
            background-color: #fef9c3;
            color: #92400e;
          }

          .text-box.blue {
            background-color: #dbeafe;
            color: #1e3a8a;
          }

          .text-box.green {
            background-color: #dcfce7;
            color: #14532d;
          }

          .text-box.purple {
            background-color: #f3e8ff;
            color: #581c87;
          }

          .text-content {
            word-break: break-word;
            flex: 1;
            min-width: 0;
          }

          code {
            font-family: 'Courier New', monospace;
            font-size: 13px;
          }
        `}</style>
      </NCard>
    );
  }
});
