/**
 * StreamingPenEffect 位置对比工具
 * 对比单行、两行、四行时笔的位置，检查是否有偏移问题
 */
import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText } from 'naive-ui';
import StreamingPenEffect from '@/components/streaming-pen-effect/index';

export default defineComponent({
  name: 'StreamingPenPositionCompareExample',
  setup() {
    // 固定文本内容（确保能够换行）
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
    // 单行：短文本，不会换行
    const singleLineText = '这是一段单行测试文字';

    // 两行：中等长度文本，会换行成两行
    const twoLineText = '这是一段两行测试文字，用于对比笔的位置。这是一段两行测试文字，用于对比笔的位置。这是一段两行测试文字，用于对比笔的位置。这是一段两行测试文字，用于对比笔的位置。';
    // 四行：长文本，会换行成四行
    const fourLineText = '这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。这是一段四行测试文字，用于对比笔的位置。';

    startTyping(fourLineText);
    // 文本容器的 ref
    const singleLineRef = ref<HTMLElement | null>(null);
    const twoLineRef = ref<HTMLElement | null>(null);
    const fourLineRef = ref<HTMLElement | null>(null);

    return () => (
      <NCard bordered class="shadow-sm">
        <NH3 class="border-b pb-2 text-lg font-semibold mb-4">
          📊 笔位置对比工具
        </NH3>

        <NText class="text-gray-500 mb-6 block">
          对比单行、两行、四行时笔的位置，检查是否有偏移问题。所有文本使用相同的样式和容器。
        </NText>

        <div class="space-y-8">
          {/* 单行对比 */}
          <div class="comparison-item">
            <h4 class="text-md font-semibold mb-3 text-gray-700">单行文本</h4>
            <div
              class="text-container"
              style={{
                position: 'relative',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#f3e8ff',
                color: '#581c87',
                fontSize: '16px',
                lineHeight: '1.8',
                minHeight: '60px',
                width: '400px',
                maxWidth: '100%'
              }}
            >
              <span ref={singleLineRef}>{singleLineText}</span>
              {singleLineRef.value && (
                <StreamingPenEffect
                  isWriting={true}
                  targetRef={singleLineRef.value}
                  penColor="#581c87"
                  // size={24}
                  // offsetX={0.2}
                />
              )}
            </div>
          </div>

          {/* 两行对比 */}
          <div class="comparison-item">
            <h4 class="text-md font-semibold mb-3 text-gray-700">两行文本</h4>
            <div
              class="text-container"
              style={{
                position: 'relative',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontSize: '16px',
                lineHeight: '1.8',
                minHeight: '100px',
                width: '400px',
                maxWidth: '100%'
              }}
            >
              <span ref={twoLineRef}>{twoLineText}</span>
              {twoLineRef.value && (
                <StreamingPenEffect
                  isWriting={true}
                  targetRef={twoLineRef.value}
                  penColor="#1e40af"
                  size={24}
                  offsetX={0.2}
                />
              )}
            </div>
          </div>

          {/* 四行对比 */}
          <div class="comparison-item">
            <h4 class="text-md font-semibold mb-3 text-gray-700">四行文本</h4>
            <div
              class="text-container"
              style={{
                position: 'relative',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '16px',
                lineHeight: '2',
                minHeight: '180px',
                width: '400px',
                maxWidth: '100%'
              }}
            >
              <span ref={fourLineRef}>{displayText.value}</span>
              {fourLineRef.value && (
                <StreamingPenEffect
                  isWriting={true}
                  targetRef={fourLineRef.value}
                  penColor="#15803d"
                  size={30}
                  offsetX={0.75}
                />
              )}
            </div>
          </div>
        </div>

        {/* 说明 */}
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-2 text-blue-700">💡 对比说明</h4>
          <ul class="text-sm text-blue-600 space-y-1 list-disc list-inside">
            <li>所有文本使用相同的字体大小（16px）和行高（1.8）</li>
            <li>所有容器使用相同的 padding（20px）</li>
            <li>笔的位置应该对齐到每行文本的基线位置</li>
            <li>检查不同行数时，笔的垂直位置是否保持一致</li>
            <li>如果出现偏移，说明基线计算有问题</li>
          </ul>
        </div>
      </NCard>
    );
  }
});
