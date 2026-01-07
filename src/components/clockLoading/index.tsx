import { defineComponent, PropType } from 'vue';
import './index.scss';

interface ClockLoadingProps {
  size?: number;      // 整体尺寸，默认 50
  text?: string;      // 上方文字，默认 'Waiting'
  color?: string;     // 主色调，默认 '#4da6ff'
}

const ClockLoading = defineComponent({
  name: 'ClockLoading',
  props: {
    size: { type: Number, default: 50 },
    text: { type: String, default: 'Waiting' },
    color: { type: String, default: '#4da6ff' },
  },
  setup(props: ClockLoadingProps) {
    // 使用默认值确保类型安全
    const text = props.text ?? 'Waiting';
    const size = props.size ?? 50;
    const color = props.color ?? '#4da6ff';

    const letters = text.split('');
    const r = size / 2;
    const pulseScale = 1.05;

    return () => (
      <div class="flex flex-col items-center justify-center">
        {/* 文字波浪 */}
        <div class="flex font-bold mb-1" style={{ fontSize: `${size * 0.24}px`, color: color }}>
          {letters.map((l, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                animation: `wave 1.2s infinite, colorShift 2s infinite alternate`,
                animationDelay: `${i * 0.1}s, 0s`,
              }}
            >
              {l}
            </span>
          ))}
        </div>

        {/* 时钟 */}
        <div style={{ width: size + 'px', height: size + 'px' }}>
          <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            {/* 表盘 */}
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="#fff"
              stroke="#bbb"
              stroke-width="2"
              class="pulse"
              style={{ transformOrigin: '25px 25px' }}
            />
            {/* 刻度 */}
            <g stroke="#888" stroke-width="1.5">
              <line class="tick-line" x1="25" y1="7" x2="25" y2="10"/>
              <line class="tick-line" x1="43" y1="25" x2="40" y2="25"/>
              <line class="tick-line" x1="25" y1="43" x2="25" y2="40"/>
              <line class="tick-line" x1="7" y1="25" x2="10" y2="25"/>
            </g>
            {/* 秒针 */}
            <line
              class="second-hand"
              x1="25"
              y1="26"
              x2="25"
              y2="10"
              stroke={color}
              stroke-width="1.5"
              stroke-linecap="round"
              style={{
                transformOrigin: '25px 25px',
                filter: `drop-shadow(0 0 2px ${color}66)`
              }}
            />
            {/* 中心点 */}
            <circle
              class="center-dot"
              cx="25"
              cy="25"
              r="2"
              fill={color}
              style={{ transformOrigin: '25px 25px' }}
            />
          </svg>
        </div>
      </div>
    );
  },
});

export default ClockLoading;

