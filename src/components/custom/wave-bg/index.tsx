import { type CSSProperties, computed, defineComponent, useId } from 'vue';
import { getPaletteColorByNumber } from '@suga/color';
import './index.scss';

const PATH_TOP =
  'M1337,668.5 C1337,1037.455193874239 1037.455193874239,1337 668.5,1337 C523.6725684305388,1337 337,1236 370.50000000000006,1094 C434.03835568300906,824.6732385973953 6.906089672974592e-14,892.6277623047779 0,668.5000000000001 C0,299.5448061257611 299.5448061257609,1.1368683772161603e-13 668.4999999999999,0 C1037.455193874239,0 1337,299.544806125761 1337,668.5Z';

const PATH_BOTTOM =
  'M896,448 C1142.6325445712241,465.5747656464056 695.2579309733121,896 448,896 C200.74206902668806,896 5.684341886080802e-14,695.2579309733121 0,448.0000000000001 C0,200.74206902668806 200.74206902668791,5.684341886080802e-14 447.99999999999994,0 C695.2579309733121,0 475,418 896,448Z';

const PARTICLE_COUNT = 28;

function buildParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const seed = (i + 1) * 7919;
    return {
      left: `${(seed * 13) % 100}%`,
      top: `${(seed * 7) % 100}%`,
      size: 2 + (i % 4),
      delay: `${((seed % 120) / 10).toFixed(1)}s`,
      duration: `${12 + (i % 10)}s`
    };
  });
}

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** 登录页动态背景：极光、网格、粒子、旋转光环 + 主题色 SVG 色块 */
export default defineComponent({
  name: 'WaveBg',
  props: {
    themeColor: {
      type: String,
      required: true
    },
    darkMode: Boolean
  },
  setup(props) {
    const uid = useId().replace(/:/g, '');
    const gradTop = `wave-top-${uid}`;
    const gradBottom = `wave-bottom-${uid}`;
    const particles = buildParticles();

    const palette = computed(() => {
      const tc = props.themeColor;
      if (props.darkMode) {
        return {
          soft: getPaletteColorByNumber(tc, 200),
          light: getPaletteColorByNumber(tc, 200),
          vivid: getPaletteColorByNumber(tc, 300),
          mid: getPaletteColorByNumber(tc, 400),
          dark: getPaletteColorByNumber(tc, 500),
          deep: getPaletteColorByNumber(tc, 600)
        };
      }
      return {
        soft: getPaletteColorByNumber(tc, 100),
        light: getPaletteColorByNumber(tc, 300),
        vivid: getPaletteColorByNumber(tc, 400),
        mid: getPaletteColorByNumber(tc, 500),
        dark: getPaletteColorByNumber(tc, 600),
        deep: getPaletteColorByNumber(tc, 700)
      };
    });

    const themeVars = computed((): CSSProperties => {
      const { mid, dark, vivid, light } = palette.value;
      if (props.darkMode) {
        return {
          '--wave-grid-fade': 'rgba(255, 255, 255, 0.06)',
          '--wave-particle': 'rgba(255, 255, 255, 0.7)',
          '--wave-particle-glow': 'rgba(255, 255, 255, 0.45)',
          '--wave-shimmer-gradient':
            'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.03) 58%, transparent 100%)',
          '--wave-mesh-gradient': 'transparent'
        };
      }
      return {
        '--wave-grid-fade': withAlpha(mid, 0.22),
        '--wave-particle': withAlpha(dark, 0.85),
        '--wave-particle-glow': withAlpha(vivid, 0.55),
        '--wave-shimmer-gradient': `linear-gradient(105deg, transparent 0%, ${withAlpha(light, 0.15)} 40%, ${withAlpha(vivid, 0.45)} 50%, ${withAlpha(light, 0.15)} 60%, transparent 100%)`,
        '--wave-mesh-gradient': `radial-gradient(ellipse 90% 70% at 18% 22%, ${withAlpha(vivid, 0.35)} 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 82% 78%, ${withAlpha(mid, 0.32)} 0%, transparent 52%),
          radial-gradient(ellipse 70% 55% at 50% 50%, ${withAlpha(light, 0.28)} 0%, transparent 60%)`
      };
    });

    const centerGlow = computed(() => {
      const { mid, dark, vivid, light } = palette.value;
      return props.darkMode
        ? `radial-gradient(circle at 50% 42%, ${withAlpha(mid, 0.44)} 0%, ${withAlpha(dark, 0.25)} 38%, transparent 72%)`
        : `radial-gradient(circle at 50% 42%, ${withAlpha(vivid, 0.55)} 0%, ${withAlpha(mid, 0.42)} 32%, ${withAlpha(light, 0.2)} 55%, transparent 75%)`;
    });

    const baseWash = computed(() => {
      const { soft, vivid, mid, dark, deep } = palette.value;
      return props.darkMode
        ? `radial-gradient(ellipse 130% 90% at 50% 110%, ${withAlpha(deep, 0.21)} 0%, transparent 58%),
           radial-gradient(ellipse 90% 60% at 80% 0%, ${withAlpha(dark, 0.16)} 0%, transparent 50%)`
        : `radial-gradient(ellipse 120% 80% at 50% -5%, ${withAlpha(soft, 0.9)} 0%, transparent 55%),
           radial-gradient(ellipse 90% 65% at 92% 18%, ${withAlpha(vivid, 0.45)} 0%, transparent 50%),
           radial-gradient(ellipse 85% 60% at 8% 88%, ${withAlpha(mid, 0.4)} 0%, transparent 48%),
           radial-gradient(ellipse 70% 50% at 50% 100%, ${withAlpha(dark, 0.18)} 0%, transparent 52%)`;
    });

    const ringGradient = computed(() => {
      const { light, vivid, mid, dark } = palette.value;
      const a = props.darkMode ? 0.34 : 0.72;
      return `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${withAlpha(light, a)} 55deg, transparent 115deg, ${withAlpha(vivid, a + 0.08)} 195deg, transparent 255deg, ${withAlpha(mid, a)} 305deg, ${withAlpha(dark, a - 0.05)} 340deg, transparent 360deg)`;
    });

    const auroraStyle = (color: string, opacity: number) => ({
      background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
      opacity: String(opacity)
    });

    const auroraOpacity = props.darkMode
      ? { a1: 0.55, a2: 0.5, a3: 0.42 }
      : { a1: 0.78, a2: 0.72, a3: 0.65 };

    const blobOpacity = props.darkMode ? 0.95 : 1;
    const blurOrbOpacity = props.darkMode ? 0.5 : 0.72;

    return () => {
      const p = palette.value;
      return (
        <div
          class={[
            'wave-bg',
            'pointer-events-none',
            'absolute-lt',
            'z-1',
            'size-full',
            'overflow-hidden',
            props.darkMode ? 'wave-bg--dark' : 'wave-bg--light'
          ]}
          style={themeVars.value}
        >
          <div class="absolute inset-0" style={{ background: baseWash.value }} />

          {!props.darkMode && <div class="wave-bg__mesh" />}

          <div
            class="wave-bg__aurora wave-bg__aurora--1 h-520px w-520px -right-120px -top-320px lt-sm:(h-380px w-380px -right-60px)"
            style={auroraStyle(p.mid, auroraOpacity.a1)}
          />
          <div
            class="wave-bg__aurora wave-bg__aurora--2 h-480px w-480px -bottom-200px -left-160px lt-sm:(h-340px w-340px -left-80px)"
            style={auroraStyle(p.dark, auroraOpacity.a2)}
          />
          <div
            class="wave-bg__aurora wave-bg__aurora--3 left-1/2 top-[38%] h-400px w-400px lt-sm:(h-300px w-300px) -translate-x-1/2 -translate-y-1/2"
            style={auroraStyle(p.vivid, auroraOpacity.a3)}
          />

          <div class="wave-bg__grid" />

          <div class="wave-bg__ring" style={{ background: ringGradient.value }} />

          <div
            class="wave-bg__center h-min(580px,78vh) w-min(580px,92vw) absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
            style={{ background: centerGlow.value }}
          />

          <div class="wave-bg__shimmer" />

          <div
            class="wave-bg__blob-top absolute -right-180px -top-520px lt-sm:(-right-80px -top-640px)"
            style={{ opacity: blobOpacity }}
          >
            <svg height="1337" width="1337" aria-hidden="true">
              <defs>
                <path id={`path-top-${uid}`} fill-rule="evenodd" d={PATH_TOP} />
                <linearGradient id={gradTop} x1="0.79" y1="0.62" x2="0.21" y2="0.86">
                  <stop offset="0" stop-color={p.light} stop-opacity="1" />
                  <stop offset="0.45" stop-color={p.vivid} stop-opacity="1" />
                  <stop offset="1" stop-color={p.dark} stop-opacity="1" />
                </linearGradient>
              </defs>
              <g opacity={props.darkMode ? 0.95 : 0.88}>
                <use href={`#path-top-${uid}`} fill={`url(#${gradTop})`} />
              </g>
            </svg>
          </div>

          <div
            class="wave-bg__blob-bottom absolute -bottom-280px -left-80px lt-sm:(-bottom-520px -left-40px)"
            style={{ opacity: blobOpacity }}
          >
            <svg height="896" width="968" aria-hidden="true">
              <defs>
                <path id={`path-bottom-${uid}`} fill-rule="evenodd" d={PATH_BOTTOM} />
                <linearGradient id={gradBottom} x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0" stop-color={p.deep} stop-opacity="1" />
                  <stop offset="0.4" stop-color={p.dark} stop-opacity="1" />
                  <stop offset="1" stop-color={p.vivid} stop-opacity="1" />
                </linearGradient>
              </defs>
              <g opacity={props.darkMode ? 0.92 : 0.85}>
                <use href={`#path-bottom-${uid}`} fill={`url(#${gradBottom})`} />
              </g>
            </svg>
          </div>

          <div
            class="absolute left-12% top-55% h-240px w-240px rounded-full blur-90px lt-sm:(left-5% h-160px w-160px)"
            style={{ backgroundColor: p.mid, opacity: blurOrbOpacity }}
          />
          <div
            class="absolute right-6% top-26% h-200px w-200px rounded-full blur-80px lt-sm:(right-3% h-140px w-140px)"
            style={{ backgroundColor: p.vivid, opacity: blurOrbOpacity }}
          />
          {!props.darkMode && (
            <div
              class="absolute left-1/2 top-[58%] h-180px w-280px rounded-full opacity-55 blur-100px -translate-x-1/2"
              style={{ backgroundColor: p.dark }}
            />
          )}

          {particles.map((pt, i) => (
            <span
              key={i}
              class="wave-bg__particle"
              style={{
                left: pt.left,
                top: pt.top,
                width: `${pt.size}px`,
                height: `${pt.size}px`,
                animationDelay: pt.delay,
                animationDuration: pt.duration
              }}
            />
          ))}
        </div>
      );
    };
  }
});
