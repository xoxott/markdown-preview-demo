/**
 * StreamingPenEffect 调试工具
 * 用于实时调整笔的位置参数
 */
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { NCard, NH3, NButton, NSpace, NSlider, NInputNumber } from 'naive-ui';
import StreamingPenEffect from '@/components/streaming-pen-effect/index';

export default defineComponent({
  name: 'StreamingPenDebugExample',
  setup() {
    const displayText = ref('');
    const isTyping = ref(false);
    let typingTimer: number | null = null;
    const textRef = ref<HTMLElement | null>(null);

    // 可调节的参数
    const offsetX = ref(0.7);
    const offsetY = ref(0.25);
    const penSize = ref(24);

    const sampleText = `这是一段测试文字，用于调试笔的位置。你
    可以通过下面的滑块实时调整笔的位置参数。这
    是一段测试文字，用于调试笔的位置。你可以通过下面的
    滑块实时调整笔的位置参数。这是一段测试文字，用于调试笔的位
    置。你可以通过下面的滑块实时调整笔的位置参数。这是一段测试文
    字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置参
    数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整
    笔的位置参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整
    笔的位置参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置
    参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置参数。这是一段测试文字，用于调试笔的位置。你 可以通过下面的滑块实时调整笔的位置参数。这 是一段测试文字，用于调试笔的位置。你可以通过下面的 滑块实时调整笔的位置参数。这是一段测试文字，用于调试笔的位 置。你可以通过下面的滑块实时调整笔的位置参数。这是一段测试文 字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置参 数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整 笔的位置参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整 笔的位置参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置 参数。这是一段测试文字，用于调试笔的位置。你可以通过下面的滑块实时调整笔的位置参数。`;

    /**
     * 模拟流式打字效果
     */
    const startTyping = () => {
      if (isTyping.value) return;

      displayText.value = '';
      isTyping.value = true;
      let charIndex = 0;

      const type = () => {
        if (charIndex < sampleText.length) {
          displayText.value += sampleText.charAt(charIndex);
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

    const handleStop = () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      isTyping.value = false;
    };

    const handleReset = () => {
      handleStop();
      displayText.value = '';
      offsetX.value = 0.2;
      offsetY.value = -0.8;
      penSize.value = 24;
    };

    onMounted(() => {
      setTimeout(() => {
        startTyping();
      }, 10);
    });

    onBeforeUnmount(() => {
      handleStop();
    });

    return () => (
      <NCard bordered class="shadow-sm">
        <NH3 class="border-b pb-2 text-lg font-semibold mb-4">
          🔧 笔位置调试工具
        </NH3>

        {/* 控制面板 */}
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-3 text-gray-700">位置调整参数</h4>

          <div class="space-y-4">
            {/* X 轴偏移 */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm text-gray-600">X 轴偏移（offsetX）:</label>
                <NInputNumber
                  v-model:value={offsetX.value}
                  step={0.05}
                  size="small"
                  style={{ width: '100px' }}
                />
              </div>
              <NSlider
                v-model:value={offsetX.value}
                min={-1}
                max={1}
                step={0.05}
              />
              <div class="text-xs text-gray-500 mt-1">
                当前值: {offsetX.value.toFixed(2)} × 笔大小 = {(offsetX.value * penSize.value).toFixed(1)}px
                （正值向右，负值向左）
              </div>
            </div>

            {/* Y 轴偏移 */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm text-gray-600">Y 轴偏移（offsetY）:</label>
                <NInputNumber
                  v-model:value={offsetY.value}
                  step={0.05}
                  size="small"
                  style={{ width: '100px' }}
                />
              </div>
              <NSlider
                v-model:value={offsetY.value}
                min={-1.5}
                max={0.5}
                step={0.05}
              />
              <div class="text-xs text-gray-500 mt-1">
                当前值: {offsetY.value.toFixed(2)} × 笔大小 = {(offsetY.value * penSize.value).toFixed(1)}px
                （正值向下，负值向上）
              </div>
            </div>

            {/* 笔大小 */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm text-gray-600">笔大小（size）:</label>
                <NInputNumber
                  v-model:value={penSize.value}
                  min={12}
                  max={48}
                  step={2}
                  size="small"
                  style={{ width: '100px' }}
                />
              </div>
              <NSlider
                v-model:value={penSize.value}
                min={12}
                max={48}
                step={2}
              />
            </div>
          </div>

          {/* 控制按钮 */}
          <NSpace class="mt-4">
            <NButton type="primary" onClick={startTyping} disabled={isTyping.value} size="small">
              开始演示
            </NButton>
            <NButton onClick={handleStop} disabled={!isTyping.value} size="small">
              停止
            </NButton>
            <NButton onClick={handleReset} size="small">
              重置参数
            </NButton>
          </NSpace>
        </div>

        {/* 演示区域 */}
        <div class="demo-area">
          <h4 class="text-sm font-semibold mb-3 text-gray-700">预览效果</h4>
          <div
            class="text-box"
            style={{
              // position: 'relative',
              padding: '20px',
              borderRadius: '8px',
              // minHeight: '120px',
              lineHeight: '1.8',
              fontSize: '16px',
              color: '#581c87',
              backgroundColor: '#f3e8ff'
            }}
          >
            <span ref={textRef}>{displayText.value}</span>
            {textRef.value && (
              <StreamingPenEffect
                isWriting={isTyping.value}
                targetRef={textRef.value}
                penColor="#581c87"
                size={penSize.value}
                offsetX={offsetX.value}
                offsetY={offsetY.value}
              />
            )}

            {/* 辅助线 - 显示文字底部位置 */}
            {/* {displayText.value && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  border: '1px dashed red'
                }}
              >
              </div>
            )} */}
          </div>
        </div>

        {/* 使用说明 */}
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="text-sm font-semibold mb-2 text-blue-700">💡 调试提示</h4>
          <ul class="text-sm text-blue-600 space-y-1">
            <li>• <strong>offsetX</strong>: 控制笔的水平位置（建议 0.1 ~ 0.3）</li>
            <li>• <strong>offsetY</strong>: 控制笔的垂直位置（建议 -1.0 ~ -0.6）</li>
            <li>• 笔尖应该对准文字的底部或略微偏上</li>
            <li>• 找到最佳参数后，在实际使用时传入这些值</li>
          </ul>
        </div>

        {/* 代码示例 */}
        <div class="mt-4 p-4 bg-gray-800 rounded-lg text-white text-sm overflow-x-auto">
          <pre style={{ margin: 0 }}>{`<StreamingPenEffect
  isWriting={true}
  targetRef={textRef.value}
  size={${penSize.value}}
  offsetX={${offsetX.value.toFixed(2)}}
  offsetY={${offsetY.value.toFixed(2)}}
/>`}</pre>
        </div>
      </NCard>
    );
  }
});
