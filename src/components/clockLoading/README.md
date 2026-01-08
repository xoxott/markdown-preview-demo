# ClockLoading 时钟加载组件

一个精美的时钟样式加载动画组件,支持高度自定义配置。

## ✨ 特性

- 🎨 **高度可定制** - 支持颜色、尺寸、速度等多种配置
- ⚡ **流畅动画** - 秒针与刻度完美同步的闪烁效果
- 🎯 **易于使用** - 开箱即用,配置简单
- 💫 **视觉精美** - 专业的UI设计,多层次视觉效果
- 🔧 **灵活扩展** - 支持自定义样式和类名

## 📦 基础使用

```vue
<template>
  <ClockLoading />
</template>

<script setup lang="ts">
import ClockLoading from '@/components/clockLoading';
</script>
```

## 🎨 配置选项

### Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number` | `50` | 时钟尺寸(px) |
| `text` | `string` | `'请稍等'` | 显示的文字 |
| `color` | `string` | `'#4da6ff'` | 主题颜色 |
| `showText` | `boolean` | `true` | 是否显示文字 |
| `speed` | `number` | `2` | 旋转速度(秒/圈)，范围1-10 |
| `background` | `string` | `'transparent'` | 背景颜色 |
| `showBackground` | `boolean` | `false` | 是否显示背景 |
| `containerStyle` | `CSSProperties` | `{}` | 自定义容器样式 |
| `className` | `string` | `''` | 自定义类名 |
| `clockBg` | `string` | `'#ffffff'` | 表盘背景色 |
| `clockBorder` | `string` | `'#d0d0d0'` | 表盘边框色 |

## 📖 使用示例

### 基础示例

```vue
<ClockLoading />
```

### 自定义颜色和尺寸

```vue
<ClockLoading
  :size="80"
  color="#ff6b6b"
  text="加载中"
/>
```

### 快速旋转

```vue
<ClockLoading
  :speed="1"
  text="快速加载"
/>
```

### 慢速旋转

```vue
<ClockLoading
  :speed="4"
  text="慢速加载"
/>
```

### 只显示时钟(无文字)

```vue
<ClockLoading
  :show-text="false"
  :size="60"
/>
```

### 带背景的加载

```vue
<ClockLoading
  :show-background="true"
  background="rgba(0, 0, 0, 0.05)"
  :size="70"
  text="处理中"
/>
```

### 深色主题

```vue
<ClockLoading
  color="#64ffda"
  clock-bg="#1e1e1e"
  clock-border="#333333"
  :size="80"
  text="Loading"
/>
```

### 自定义样式

```vue
<ClockLoading
  :container-style="{
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }"
  class-name="my-custom-loading"
  :size="100"
/>
```

### 全屏居中加载

```vue
<template>
  <div class="loading-overlay">
    <ClockLoading
      :size="120"
      color="#4da6ff"
      text="加载中..."
      :show-background="true"
      background="white"
      :container-style="{
        padding: '30px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }"
    />
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9999;
}
</style>
```

## 🎯 实际应用场景

### 1. 页面加载

```vue
<template>
  <div v-if="loading" class="page-loading">
    <ClockLoading text="加载页面中" :size="80" />
  </div>
  <div v-else>
    <!-- 页面内容 -->
  </div>
</template>
```

### 2. 数据请求

```vue
<template>
  <div class="data-container">
    <ClockLoading
      v-if="fetching"
      text="获取数据中"
      :size="60"
      :show-text="false"
    />
    <div v-else>
      <!-- 数据内容 -->
    </div>
  </div>
</template>
```

### 3. 按钮加载状态

```vue
<template>
  <button @click="handleSubmit" :disabled="submitting">
    <ClockLoading
      v-if="submitting"
      :size="20"
      :show-text="false"
      color="white"
    />
    <span v-else>提交</span>
  </button>
</template>
```

## 🎨 主题预设

### 蓝色主题(默认)
```vue
<ClockLoading color="#4da6ff" />
```

### 绿色主题
```vue
<ClockLoading color="#52c41a" text="成功" />
```

### 红色主题
```vue
<ClockLoading color="#ff4d4f" text="处理中" />
```

### 紫色主题
```vue
<ClockLoading color="#722ed1" text="等待中" />
```

### 橙色主题
```vue
<ClockLoading color="#fa8c16" text="加载中" />
```

## ⚡ 性能优化

- 使用CSS动画,性能优异
- 支持硬件加速
- 无额外依赖
- 轻量级实现

## 🔧 技术细节

### 动画同步机制

组件通过精确计算 `animation-delay` 确保秒针与刻度完美同步:

```typescript
// 刻度延迟计算公式
delay = (speed × position) / 4

// 示例: speed=2秒, 3点位置(position=1)
// delay = (2 × 1) / 4 = 0.5秒
```

### CSS变量支持

组件使用CSS变量实现动态配置:

- `--tick-color`: 刻度高亮颜色
- `--animation-speed`: 旋转速度
- `--pulse-speed`: 脉冲速度

## 📝 注意事项

1. `speed` 参数范围为 1-10 秒,超出范围会被验证器拦截
2. 建议 `size` 在 30-150 之间以获得最佳视觉效果
3. 深色背景建议使用浅色 `color` 和 `clockBg`
4. 文字长度建议不超过6个字符以保持美观

## 🎉 更新日志

### v2.0.0
- ✨ 新增多个配置选项
- 🎨 优化视觉效果
- ⚡ 支持动态速度控制
- 🔧 改进动画同步机制
- 📦 更好的TypeScript支持

## 📄 License

MIT

