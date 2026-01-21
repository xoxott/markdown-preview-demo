/**
 * StreamingText 组件示例
 * 演示封装好的文本流显示组件
 */
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { NCard, NH3, NText, NButton, NSpace } from 'naive-ui';
import StreamingText from '@/components/streaming-pen-effect/StreamingText';

export default defineComponent({
  name: 'StreamingTextExample',
  setup() {
    const displayText = ref('');
    const isTyping = ref(false);
    let typingTimer: number | null = null;

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
          typingTimer = window.setTimeout(type, 50 + Math.random() * 50);
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
          ✍️ 流式文本组件 (StreamingText)
        </NH3>

        <NText class="text-gray-500 mb-4 block">
          这是一个封装好的组件，将文本显示和笔的位置追踪整合在一起，确保位置计算准确，不会逐渐偏移。
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
            <h4 class="text-md font-semibold mb-3 text-gray-700">默认样式</h4>
            <StreamingText
              text={displayText.value}
              isWriting={isTyping.value}
              penColor="#92400e"
              size={20}
              class="text-box default"
              style={{
                padding: '20px',
                borderRadius: '8px',
                minHeight: '120px',
                lineHeight: '1.8',
                fontSize: '16px',
                color: '#92400e',
                backgroundColor: '#fef9c3'
              }}
            />
          </div>

          {/* 示例 2: 不同颜色 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">蓝色笔</h4>
            <StreamingText
              text={displayText.value}
              isWriting={isTyping.value}
              penColor="#1e40af"
              size={20}
              class="text-box blue"
              style={{
                padding: '20px',
                borderRadius: '8px',
                minHeight: '120px',
                lineHeight: '1.8',
                fontSize: '16px',
                color: '#1e40af',
                backgroundColor: '#dbeafe'
              }}
            />
          </div>

          {/* 示例 3: 更大的笔 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">大号笔 (28px)</h4>
            <StreamingText
              text={displayText.value}
              isWriting={isTyping.value}
              penColor="#15803d"
              size={28}
              class="text-box green"
              style={{
                padding: '20px',
                borderRadius: '8px',
                minHeight: '120px',
                lineHeight: '1.8',
                fontSize: '16px',
                color: '#15803d',
                backgroundColor: '#dcfce7'
              }}
            />
          </div>

          {/* 示例 4: 紫色笔 */}
          <div class="demo-section">
            <h4 class="text-md font-semibold mb-3 text-gray-700">紫色笔</h4>
            <StreamingText
              text={displayText.value}
              isWriting={isTyping.value}
              penColor="#581c87"
              size={20}
              class="text-box purple"
              style={{
                padding: '20px',
                borderRadius: '8px',
                minHeight: '120px',
                lineHeight: '1.8',
                fontSize: '16px',
                color: '#581c87',
                backgroundColor: '#f3e8ff'
              }}
            />
          </div>
        </div>

        {/* 使用说明 */}
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-2 text-blue-700">💡 使用说明</h4>
          <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>StreamingText 组件封装了文本显示和笔的位置追踪</li>
            <li>只需要传入 text 和 isWriting 属性即可使用</li>
            <li>位置计算更准确，换行时不会逐渐偏移</li>
            <li>支持自定义笔的颜色、大小和偏移量</li>
          </ul>
        </div>
      </NCard>
    );
  }
});
