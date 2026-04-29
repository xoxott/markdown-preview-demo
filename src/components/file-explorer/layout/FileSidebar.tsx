import type { Component, PropType } from 'vue';
import { computed, defineComponent, h, ref } from 'vue';
import {
  type MenuOption,
  NBadge,
  NDivider,
  NIcon,
  NMenu,
  NTree,
  type TreeOption,
  useThemeVars
} from 'naive-ui';
import {
  Archive,
  Clock,
  File,
  FileText,
  Music,
  Photo,
  Rocket,
  Star,
  Trash,
  Video
} from '@vicons/tabler';

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: Component;
  path: string;
  count?: number;
}

export interface TreeNode {
  key: string;
  label: string;
  children?: TreeNode[];
  prefix?: () => Component;
  [key: string]: unknown;
}

export default defineComponent({
  name: 'FileSidebar',
  props: {
    quickAccessItems: {
      type: Array as PropType<QuickAccessItem[]>,
      default: () => [
        { id: 'recent', label: '最近使用', icon: Clock, path: '/recent' },
        { id: 'starred', label: '已加星标', icon: Star, path: '/starred' },
        { id: 'trash', label: '回收站', icon: Trash, path: '/trash' }
      ]
    },
    fileTypeItems: {
      type: Array as PropType<QuickAccessItem[]>,
      default: () => [
        { id: 'documents', label: '文档', icon: FileText, path: '/type/documents' },
        { id: 'images', label: '图片', icon: Photo, path: '/type/images' },
        { id: 'music', label: '音乐', icon: Music, path: '/type/music' },
        { id: 'videos', label: '视频', icon: Video, path: '/type/videos' },
        { id: 'archives', label: '压缩包', icon: Archive, path: '/type/archives' }
      ]
    },
    treeData: {
      type: Array as PropType<TreeOption[]>,
      default: () => []
    },
    currentPath: {
      type: String,
      required: true
    },
    onNavigate: {
      type: Function as PropType<(path: string) => void>,
      required: true
    },
    showTree: {
      type: Boolean,
      default: true
    },
    collapsed: {
      type: Boolean,
      default: false
    }
  },

  setup(props) {
    const themeVars = useThemeVars();
    const treeExpandedKeys = ref<string[]>([]);

    // 渲染菜单项的图标
    const renderMenuIcon = (icon: Component) => {
      return () => h(NIcon, null, { default: () => h(icon) });
    };

    // 构建菜单选项
    const menuOptions = computed<MenuOption[]>(() => {
      const options: MenuOption[] = [];

      // 快速访问
      if (props.quickAccessItems.length > 0) {
        options.push({
          label: '快速访问',
          key: 'quick-access',
          icon: () => h(NIcon, null, { default: () => h(Rocket) }),
          children: props.quickAccessItems.map(item => ({
            key: item.path,
            label: item.label, // 关键：保持为字符串
            icon: renderMenuIcon(item.icon),
            extra: item.count
              ? () => h(NBadge, { value: item.count, type: 'info', max: 99 })
              : undefined
          }))
        });
      }

      // 文件类型
      if (props.fileTypeItems.length > 0) {
        options.push({
          label: '文件类型',
          key: 'file-types',
          icon: () => h(NIcon, null, { default: () => h(File) }),
          children: props.fileTypeItems.map(item => ({
            key: item.path,
            label: item.label,
            icon: renderMenuIcon(item.icon),
            extra: item.count
              ? () => h(NBadge, { value: item.count, type: 'info', max: 99 })
              : undefined
          }))
        });
      }

      return options;
    });

    // 菜单选中的值
    const selectedKey = computed(() => props.currentPath);

    // 处理菜单选择
    const handleMenuSelect = (key: string) => {
      props.onNavigate(key);
    };

    // 处理树节点选择
    const handleTreeSelect = (keys: string[]) => {
      if (keys.length > 0) {
        props.onNavigate(keys[0]);
      }
    };

    return () => (
      <div
        class="mac-vibrancy-sidebar h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: themeVars.value.cardColor
        }}
      >
        {/* 菜单部分 */}
        <div class="flex-shrink-0">
          <NMenu
            value={selectedKey.value}
            options={menuOptions.value}
            collapsed={props.collapsed}
            collapsedWidth={64}
            collapsedIconSize={20}
            indent={12}
            // accordion
            onUpdateValue={handleMenuSelect}
          />
        </div>

        {/* 文件夹树部分 */}
        {props.showTree && props.treeData.length > 0 && !props.collapsed && (
          <>
            <NDivider class="my-2 opacity-30" />
            <div class="flex-1 overflow-y-auto px-2 pb-2">
              <div
                class="px-4 py-1 text-[11px] font-medium tracking-wide uppercase"
                style={{ color: themeVars.value.textColor3 }}
              >
                文件夹
              </div>
              <div class="px-2">
                <NTree
                  data={props.treeData}
                  blockLine
                  expandOnClick
                  selectable
                  // renderPrefix={renderTreePrefix}
                  keyField="key"
                  labelField="label"
                  childrenField="children"
                  expandedKeys={treeExpandedKeys.value}
                  selectedKeys={[selectedKey.value]}
                  onUpdateExpandedKeys={(keys: string[]) => {
                    treeExpandedKeys.value = keys;
                  }}
                  onUpdateSelectedKeys={handleTreeSelect}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
});
