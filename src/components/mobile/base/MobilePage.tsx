import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { FooterConfig, HeaderConfig, MobilePageConfig, ScrollConfig, StatusBarConfig } from '../types/mobile';
import { MobileStatusBar } from './MobileStatusBar';
import { MobileHeader } from './MobileHeader';
import { MobileContent } from './MobileContent';
import { MobileFooter } from './MobileFooter';

export const MobilePage = defineComponent({
  name: 'MobilePage',
  props: {
    pageConfig: {
      type: Object as PropType<MobilePageConfig>,
      default: () => ({})
    },
    statusBarConfig: {
      type: Object as PropType<StatusBarConfig>,
      default: () => ({})
    },
    headerConfig: {
      type: Object as PropType<HeaderConfig>,
      default: () => ({})
    },
    footerConfig: {
      type: Object as PropType<FooterConfig>,
      default: () => ({})
    },
    scrollConfig: {
      type: Object as PropType<ScrollConfig>,
      default: () => ({})
    },
    contentPadding: {
      type: String,
      default: '0'
    },
    contentBackground: {
      type: String,
      default: '#ffffff'
    }
  },
  emits: ['back', 'header-action', 'scroll', 'scroll-to-bottom', 'scroll-to-top'],
  setup(props, { emit, slots }) {
    const defaultPageConfig = {
      width: '360px',
      height: '780px',
      borderRadius: '30px',
      showShadow: true,
      backgroundColor: '#ffffff',
      ...props.pageConfig
    };

    const containerStyle = computed(() => ({
      width: defaultPageConfig.width,
      height: defaultPageConfig.height,
      borderRadius: defaultPageConfig.borderRadius,
      backgroundColor: defaultPageConfig.backgroundColor,
      boxShadow: defaultPageConfig.showShadow ? '0 0 0 3px rgba(0, 0, 0, 0.05)' : 'none'
    }));

    const handleBack = () => {
      emit('back');
    };

    const handleHeaderAction = (data: any) => {
      emit('header-action', data);
    };

    const handleScroll = (data: any) => {
      emit('scroll', data);
    };

    const handleScrollToBottom = () => {
      emit('scroll-to-bottom');
    };

    const handleScrollToTop = () => {
      emit('scroll-to-top');
    };

    return () => (
      <div class="flex items-center justify-center">
        <div class="mobile-container flex flex-col overflow-hidden" style={containerStyle.value}>
          {/* 状态栏 */}
          <div class="px-4 pt-3">
            <MobileStatusBar config={props.statusBarConfig} />
          </div>

          {/* 头部 */}
          <div class="border-b border-gray-100 px-4 py-2">
            <MobileHeader
              config={props.headerConfig}
              onBack={handleBack}
              onAction={handleHeaderAction}
              v-slots={{
                title: slots.headerTitle,
                right: slots.headerRight
              }}
            />
          </div>

          {/* 内容区域 */}
          <MobileContent
            scrollConfig={props.scrollConfig}
            padding={props.contentPadding}
            backgroundColor={props.contentBackground}
            onScroll={handleScroll}
            onScroll-to-bottom={handleScrollToBottom}
            onScroll-to-top={handleScrollToTop}
            v-slots={{
              default: slots.default
            }}
          />

          {/* 底部 */}
          <MobileFooter
            config={props.footerConfig}
            v-slots={{
              default: slots.footer
            }}
          />
        </div>
      </div>
    );
  }
});
