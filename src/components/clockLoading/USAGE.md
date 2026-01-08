# ClockLoading 快速使用指南

## 🚀 快速开始

### 1. 最简单的使用

```vue
<template>
  <ClockLoading />
</template>

<script setup lang="ts">
import ClockLoading from '@/components/clockLoading';
</script>
```

## 🎨 常用场景

### 场景1: 页面全屏加载

```vue
<template>
  <div v-if="loading" class="loading-overlay">
    <ClockLoading :size="100" text="加载中..." />
  </div>
  <div v-else>
    <!-- 你的页面内容 -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClockLoading from '@/components/clockLoading';

const loading = ref(true);

// 模拟加载
setTimeout(() => {
  loading.value = false;
}, 2000);
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}
</style>
```

### 场景2: 局部内容加载

```vue
<template>
  <div class="content-box">
    <ClockLoading v-if="fetching" :size="60" />
    <div v-else>
      <!-- 加载完成后的内容 -->
      <p>{{ data }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ClockLoading from '@/components/clockLoading';

const fetching = ref(true);
const data = ref('');

onMounted(async () => {
  // 模拟API请求
  const response = await fetch('/api/data');
  data.value = await response.json();
  fetching.value = false;
});
</script>
```

### 场景3: 按钮加载状态

```vue
<template>
  <button
    @click="handleSubmit"
    :disabled="submitting"
    class="submit-btn"
  >
    <ClockLoading
      v-if="submitting"
      :size="20"
      :show-text="false"
      color="white"
    />
    <span v-else>提交</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClockLoading from '@/components/clockLoading';

const submitting = ref(false);

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await fetch('/api/submit', { method: 'POST' });
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.submit-btn {
  padding: 8px 24px;
  background: #4da6ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-width: 100px;
  min-height: 36px;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
```

### 场景4: 卡片加载骨架

```vue
<template>
  <div class="card">
    <div v-if="loading" class="card-loading">
      <ClockLoading
        :size="70"
        text="加载数据"
        :show-background="true"
        background="rgba(77, 166, 255, 0.05)"
      />
    </div>
    <div v-else class="card-content">
      <!-- 卡片内容 -->
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  min-height: 200px;
}

.card-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
```

## 🎯 使用预设常量

```vue
<script setup lang="ts">
import ClockLoading, {
  THEME_COLORS,
  SPEED_PRESETS,
  SIZE_PRESETS
} from '@/components/clockLoading';

// 使用预设颜色
const color = THEME_COLORS.green;

// 使用预设速度
const speed = SPEED_PRESETS.fast;

// 使用预设尺寸
const size = SIZE_PRESETS.large;
</script>

<template>
  <ClockLoading
    :color="color"
    :speed="speed"
    :size="size"
  />
</template>
```

## 💡 高级用法

### 1. 动态主题切换

```vue
<template>
  <div>
    <select v-model="selectedTheme">
      <option value="blue">蓝色</option>
      <option value="green">绿色</option>
      <option value="red">红色</option>
    </select>

    <ClockLoading
      :color="THEME_COLORS[selectedTheme]"
      :size="80"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClockLoading, { THEME_COLORS } from '@/components/clockLoading';

const selectedTheme = ref<keyof typeof THEME_COLORS>('blue');
</script>
```

### 2. 响应式尺寸

```vue
<template>
  <ClockLoading
    :size="isMobile ? 50 : 100"
    :text="isMobile ? '加载' : '正在加载中'"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ClockLoading from '@/components/clockLoading';

const isMobile = ref(window.innerWidth < 768);

const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>
```

### 3. 自定义样式组合

```vue
<template>
  <ClockLoading
    :size="100"
    color="#722ed1"
    text="处理中"
    :show-background="true"
    background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    clock-bg="#f0f0f0"
    clock-border="#722ed1"
    :container-style="{
      padding: '30px',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    }"
  />
</template>
```

## 📝 TypeScript 支持

```typescript
import { ref } from 'vue';
import ClockLoading, {
  type ClockLoadingProps,
  THEME_COLORS,
  SPEED_PRESETS
} from '@/components/clockLoading';

// 类型安全的配置
const config: ClockLoadingProps = {
  size: 80,
  text: '加载中',
  color: THEME_COLORS.blue,
  speed: SPEED_PRESETS.normal,
  showText: true,
};

// 在组件中使用
const loadingProps = ref<ClockLoadingProps>(config);
```

## ⚠️ 注意事项

1. **速度范围**: `speed` 参数必须在 1-10 之间
2. **最佳尺寸**: 建议 `size` 在 30-150 之间
3. **文字长度**: 建议不超过 6 个字符
4. **深色背景**: 使用浅色 `color` 和 `clockBg`
5. **性能**: 同一页面避免渲染过多实例(建议 < 10个)

## 🎨 主题示例

```vue
<!-- 成功主题 -->
<ClockLoading color="#52c41a" text="成功" />

<!-- 警告主题 -->
<ClockLoading color="#faad14" text="警告" />

<!-- 错误主题 -->
<ClockLoading color="#ff4d4f" text="错误" />

<!-- 信息主题 -->
<ClockLoading color="#1890ff" text="信息" />

<!-- 深色主题 -->
<ClockLoading
  color="#64ffda"
  clock-bg="#1e1e1e"
  clock-border="#333"
  text="深色"
/>
```

## 🔗 相关链接

- [完整文档](./README.md)
- [类型定义](./types.ts)
- [示例页面](../../views/component/index.tsx)

