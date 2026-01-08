import { defineComponent, PropType } from 'vue';
import type { ClockLoadingProps } from './types';
import './index.scss';

// 导出类型供外部使用
export type { ClockLoadingProps } from './types';
export { THEME_COLORS, SPEED_PRESETS, SIZE_PRESETS } from './types';

/**
 * ClockLoading 时钟加载组件
 *
 * @example
 * ```vue
 * <ClockLoading />
 * <ClockLoading :size="80" color="#52c41a" text="加载中" />
 * <ClockLoading :speed="1" :show-text="false" />
 * ```
 */
const ClockLoading = defineComponent({
  name: 'ClockLoading',
  props: {
    /**
     * 整体尺寸(px)
     * @description 控制时钟和文字的总体大小，建议范围 30-150
     * @default 50
     * @example
     * <ClockLoading :size="80" />
     */
    size: {
      type: Number,
      default: 50
    },

    /**
     * 上方显示的文字
     * @description 显示在时钟上方的文字，支持中英文，建议不超过6个字符
     * @default '请稍等'
     * @example
     * <ClockLoading text="加载中" />
     * <ClockLoading text="Loading..." />
     */
    text: {
      type: String,
      default: '请稍等'
    },

    /**
     * 主题颜色
     * @description 控制秒针、刻度高亮、中心点和文字的颜色，支持任何CSS颜色值(hex、rgb、rgba等)
     * @default '#4da6ff'
     * @example
     * <ClockLoading color="#52c41a" />
     * <ClockLoading color="rgb(77, 166, 255)" />
     * <ClockLoading :color="THEME_COLORS.green" />
     */
    color: {
      type: String,
      default: '#4da6ff'
    },

    /**
     * 是否显示文字
     * @description 控制是否显示时钟上方的文字，设置为false时只显示时钟
     * @default true
     * @example
     * <ClockLoading :show-text="false" />
     */
    showText: {
      type: Boolean,
      default: true
    },

    /**
     * 旋转速度(秒/圈)
     * @description 控制秒针旋转一圈所需的时间，数值越小旋转越快
     * 范围: 1-10秒，建议使用 1(极速)、2(标准)、4(慢速)
     * @default 2
     * @example
     * <ClockLoading :speed="1" />  <!-- 极速 -->
     * <ClockLoading :speed="4" />  <!-- 慢速 -->
     * <ClockLoading :speed="SPEED_PRESETS.fast" />
     */
    speed: {
      type: Number,
      default: 2,
      validator: (value: number) => value > 0 && value <= 10
    },

    /**
     * 背景颜色
     * @description 当showBackground为true时显示的背景颜色，支持任何CSS颜色值
     * @default 'transparent'
     * @example
     * <ClockLoading background="rgba(77, 166, 255, 0.1)" />
     * <ClockLoading background="#f0f0f0" />
     */
    background: {
      type: String,
      default: 'transparent'
    },

    /**
     * 是否显示背景
     * @description 控制是否显示背景色和圆角边框，适合需要突出显示的场景
     * @default false
     * @example
     * <ClockLoading :show-background="true" background="rgba(0,0,0,0.05)" />
     */
    showBackground: {
      type: Boolean,
      default: false
    },

    /**
     * 自定义容器样式
     * @description 通过CSS对象自定义最外层容器的样式，会与默认样式合并
     * @default {}
     * @example
     * <ClockLoading :container-style="{ padding: '20px', borderRadius: '12px' }" />
     */
    containerStyle: {
      type: Object as PropType<ClockLoadingProps['containerStyle']>,
      default: () => ({})
    },

    /**
     * 自定义类名
     * @description 为最外层容器添加自定义CSS类名，可用于进一步样式定制
     * @default ''
     * @example
     * <ClockLoading class-name="my-custom-loading" />
     */
    className: {
      type: String,
      default: ''
    },

    /**
     * 表盘背景色
     * @description 时钟表盘的背景颜色，默认白色，深色主题建议使用深色
     * @default '#ffffff'
     * @example
     * <ClockLoading clock-bg="#1e1e1e" />  <!-- 深色主题 -->
     * <ClockLoading clock-bg="#f5f5f5" />  <!-- 浅灰主题 -->
     */
    clockBg: {
      type: String,
      default: '#ffffff'
    },

    /**
     * 表盘边框色
     * @description 时钟表盘的边框颜色，默认浅灰色
     * @default '#d0d0d0'
     * @example
     * <ClockLoading clock-border="#333333" />  <!-- 深色边框 -->
     * <ClockLoading clock-border="#4da6ff" />  <!-- 主题色边框 -->
     */
    clockBorder: {
      type: String,
      default: '#d0d0d0'
    },
  },
  setup(props: ClockLoadingProps) {
    // 使用默认值确保类型安全
    const text = props.text ?? '请稍等';
    const size = props.size ?? 50;
    const color = props.color ?? '#4da6ff';
    const speed = props.speed ?? 2;
    const showText = props.showText ?? true;
    const background = props.background ?? 'transparent';
    const showBackground = props.showBackground ?? false;
    const clockBg = props.clockBg ?? '#ffffff';
    const clockBorder = props.clockBorder ?? '#d0d0d0';

    // 将文字拆分为字符数组，用于逐个字符的波浪动画
    const letters = text.split('');

    /**
     * 计算刻度动画延迟时间
     * @description 根据刻度位置计算动画延迟，确保刻度闪烁与秒针位置完美同步
     * @param position 刻度位置: 0=12点, 1=3点, 2=6点, 3=9点
     * @returns 动画延迟时间字符串，格式: "Xs"
     * @example
     * getTickDelay(0) // "0s" - 12点位置，立即开始
     * getTickDelay(1) // "0.5s" - 3点位置，延迟0.5秒(当speed=2时)
     * getTickDelay(2) // "1s" - 6点位置，延迟1秒
     * getTickDelay(3) // "1.5s" - 9点位置，延迟1.5秒
     */
    const getTickDelay = (position: number) => {
      // 公式: delay = (speed × position) / 4
      // 例如: speed=2秒, position=1(3点位置) => delay = (2 × 1) / 4 = 0.5秒
      return `${(speed * position) / 4}s`;
    };

    return () => (
      <div
        class={`clock-loading-container flex flex-col items-center justify-center ${props.className || ''}`}
        style={{
          padding: '10px',
          background: showBackground ? background : 'transparent',
          borderRadius: showBackground ? '8px' : '0',
          ...props.containerStyle
        }}
      >
        {/*
          文字波浪动画区域
          每个字符独立动画，形成波浪效果和颜色渐变
        */}
        {showText && (
          <div
            class="flex font-bold mb-2"
            style={{
              // 字体大小根据组件尺寸动态计算，保持比例协调
              fontSize: `${size * 0.28}px`,
              color: color,
              // 字间距优化，提升可读性
              letterSpacing: '0.05em',
              // 文字阴影，使用主题色增强视觉层次
              textShadow: `0 2px 4px ${color}20`
            }}
          >
            {letters.map((l, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  // 双重动画: wave(波浪弹跳) + colorShift(颜色渐变)
                  // wave动画速度: speed * 0.5，与时钟速度协调
                  // colorShift动画速度: speed，与整体节奏一致
                  animation: `wave ${speed * 0.5}s infinite ease-in-out, colorShift ${speed}s infinite alternate`,
                  // 每个字符的动画延迟递增，形成波浪效果
                  // 第一个延迟: i * 0.1s (波浪效果)
                  // 第二个延迟: i * 0.12s (颜色渐变)
                  animationDelay: `${i * 0.1}s, ${i * 0.12}s`,
                }}
              >
                {l}
              </span>
            ))}
          </div>
        )}

        {/*
          时钟容器 - SVG包装器
          通过CSS变量动态控制动画速度和颜色，实现响应式动画效果
        */}
        <div
          class="clock-svg-wrapper"
          style={{
            width: size + 'px',
            height: size + 'px',
            // CSS变量: 刻度高亮颜色，用于刻度闪烁动画
            '--tick-color': color,
            // CSS变量: 秒针旋转和刻度闪烁的动画速度
            '--animation-speed': `${speed}s`,
            // CSS变量: 表盘脉冲和中心点光晕的动画速度(比旋转稍快)
            '--pulse-speed': `${speed * 0.75}s`,
            position: 'relative',
            // 添加阴影效果，增强视觉层次
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
          } as any}
        >
          <svg
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'visible'
            }}
          >
            {/* 背景光晕圆 - 增加深度感 */}
            <circle
              cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke={color}
              stroke-width="0.5"
              opacity="0.1"
            />

            {/* 表盘 - 优化边框和填充 */}
            <circle
              cx="25"
              cy="25"
              r="20"
              fill={clockBg}
              stroke={clockBorder}
              stroke-width="1.5"
              class="pulse"
              style={{ transformOrigin: '25px 25px' }}
            />

            {/* 内圈装饰 - 增加层次感 */}
            <circle
              cx="25"
              cy="25"
              r="18"
              fill="none"
              stroke="#f0f0f0"
              stroke-width="0.5"
              opacity="0.5"
            />

            {/*
              刻度组 - 与秒针完美同步的动画效果
              每个刻度在秒针经过时会闪烁高亮，通过精确计算的animationDelay实现同步
              刻度位置对应关系:
              - 0: 12点位置(0度)   - 秒针起始位置
              - 1: 3点位置(90度)   - 秒针旋转25%后到达
              - 2: 6点位置(180度)  - 秒针旋转50%后到达
              - 3: 9点位置(270度)  - 秒针旋转75%后到达
            */}
            <g>
              {/* 12点位置（0度）- 秒针起始位置，延迟0s */}
              <line
                class="tick-line-0"
                x1="25"
                y1="7"
                x2="25"
                y2="11"
                stroke="#aaa"
                stroke-width="1.5"
                stroke-linecap="round"
                style={{ animationDelay: getTickDelay(0) }}
              />

              {/* 3点位置（90度）- 秒针旋转25%后到达 */}
              <line
                class="tick-line-90"
                x1="43"
                y1="25"
                x2="39"
                y2="25"
                stroke="#aaa"
                stroke-width="1.5"
                stroke-linecap="round"
                style={{ animationDelay: getTickDelay(1) }}
              />

              {/* 6点位置（180度）- 秒针旋转50%后到达 */}
              <line
                class="tick-line-180"
                x1="25"
                y1="43"
                x2="25"
                y2="39"
                stroke="#aaa"
                stroke-width="1.5"
                stroke-linecap="round"
                style={{ animationDelay: getTickDelay(2) }}
              />

              {/* 9点位置（270度）- 秒针旋转75%后到达 */}
              <line
                class="tick-line-270"
                x1="7"
                y1="25"
                x2="11"
                y2="25"
                stroke="#aaa"
                stroke-width="1.5"
                stroke-linecap="round"
                style={{ animationDelay: getTickDelay(3) }}
              />
            </g>

            {/* 秒针 - 优化长度和样式 */}
            <line
              class="second-hand"
              x1="25"
              y1="27"
              x2="25"
              y2="9"
              stroke={color}
              stroke-width="2"
              stroke-linecap="round"
              style={{
                transformOrigin: '25px 25px'
              }}
            />

            {/* 中心点 - 增加尺寸和光晕 */}
            <circle
              class="center-dot"
              cx="25"
              cy="25"
              r="2.5"
              fill={color}
              style={{ transformOrigin: '25px 25px' }}
            />

            {/* 中心点内圈 - 增加细节 */}
            <circle
              cx="25"
              cy="25"
              r="1.2"
              fill="#ffffff"
              opacity="0.8"
            />
          </svg>
        </div>
      </div>
    );
  },
});

export default ClockLoading;

