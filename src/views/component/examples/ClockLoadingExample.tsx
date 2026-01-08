/**
 * ClockLoading 组件示例
 * 展示时钟加载组件的各种使用场景和配置选项
 */
import { defineComponent } from 'vue';
import { NDivider } from 'naive-ui';
import ClockLoading from '@/components/clockLoading';

export const ClockLoadingExample = defineComponent({
  name: 'ClockLoadingExample',
  setup() {
    return () => (
      <div class="bg-white p-6 rounded-lg shadow-sm">
        <h2 class="text-2xl font-bold mb-6 text-gray-800">ClockLoading 时钟加载组件</h2>

        {/* 基础示例 */}
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-4 text-gray-700">基础示例</h3>
          <div class="flex flex-wrap gap-8 items-center">
            <div class="flex flex-col items-center">
              <ClockLoading />
              <p class="text-sm text-gray-500 mt-2">默认配置</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={80} text="加载中" color="#52c41a" />
              <p class="text-sm text-gray-500 mt-2">绿色主题</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={70} text="Loading" color="#722ed1" />
              <p class="text-sm text-gray-500 mt-2">紫色主题</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={60} text="等待中" color="#ff4d4f" />
              <p class="text-sm text-gray-500 mt-2">红色主题</p>
            </div>
          </div>
        </div>

        <NDivider />

        {/* 速度控制 */}
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-4 text-gray-700">速度控制</h3>
          <div class="flex flex-wrap gap-8 items-center">
            <div class="flex flex-col items-center">
              <ClockLoading speed={1} text="极速" size={60} />
              <p class="text-sm text-gray-500 mt-2">1秒/圈</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading speed={2} text="标准" size={60} />
              <p class="text-sm text-gray-500 mt-2">2秒/圈(默认)</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading speed={4} text="慢速" size={60} />
              <p class="text-sm text-gray-500 mt-2">4秒/圈</p>
            </div>
          </div>
        </div>

        <NDivider />

        {/* 样式变化 */}
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-4 text-gray-700">样式变化</h3>
          <div class="flex flex-wrap gap-8 items-center">
            <div class="flex flex-col items-center">
              <ClockLoading showText={false} size={70} />
              <p class="text-sm text-gray-500 mt-2">无文字</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading
                showBackground={true}
                background="rgba(77, 166, 255, 0.1)"
                size={70}
                text="带背景"
              />
              <p class="text-sm text-gray-500 mt-2">带背景色</p>
            </div>

            <div class="flex flex-col items-center bg-gray-800 p-4 rounded">
              <ClockLoading
                color="#64ffda"
                clockBg="#1e1e1e"
                clockBorder="#333333"
                text="深色"
                size={70}
              />
              <p class="text-sm text-white mt-2">深色主题</p>
            </div>
          </div>
        </div>

        <NDivider />

        {/* 尺寸变化 */}
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-4 text-gray-700">尺寸变化</h3>
          <div class="flex flex-wrap gap-8 items-end">
            <div class="flex flex-col items-center">
              <ClockLoading size={30} showText={false} />
              <p class="text-sm text-gray-500 mt-2">小 (30px)</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={50} text="中等" />
              <p class="text-sm text-gray-500 mt-2">中 (50px)</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={80} text="较大" />
              <p class="text-sm text-gray-500 mt-2">大 (80px)</p>
            </div>

            <div class="flex flex-col items-center">
              <ClockLoading size={120} text="超大" />
              <p class="text-sm text-gray-500 mt-2">超大 (120px)</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
});

