import { PropType, defineComponent } from 'vue';
import { useThemeVars } from 'naive-ui';
import styles from './FileLoading.module.scss';

/**
 * 文件管理器加载组件
 *
 * 特性：
 *
 * - 全屏遮罩层覆盖整个文件管理器
 * - 简洁的脉冲动画效果（无旋转）
 * - 自动适配明暗主题
 * - 支持自定义加载提示文本
 */
export default defineComponent({
  name: 'FileLoading',
  props: {
    /** 是否显示加载状态 */
    loading: {
      type: Boolean,
      default: false
    },
    /** 加载提示文本 */
    tip: {
      type: String,
      default: '加载中...'
    }
  },
  setup(props) {
    const themeVars = useThemeVars();

    return () => {
      // 不显示时返回 null
      if (!props.loading) return null;

      return (
        <div
          class={styles['file-loading-overlay']}
          style={{
            backgroundColor: themeVars.value.modalColor,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div class={styles['file-loading-content']}>
            {/* 脉冲点动画 */}
            <div class={styles['file-loading-dots']}>
              <span class={styles.dot} style={{ backgroundColor: themeVars.value.primaryColor }} />
              <span class={styles.dot} style={{ backgroundColor: themeVars.value.primaryColor }} />
              <span class={styles.dot} style={{ backgroundColor: themeVars.value.primaryColor }} />
            </div>

            {/* 加载提示文本 */}
            {props.tip && (
              <div class={styles['file-loading-tip']} style={{ color: themeVars.value.textColor2 }}>
                {props.tip}
              </div>
            )}
          </div>
        </div>
      );
    };
  }
});
