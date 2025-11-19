import type { PropType } from 'vue';
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { NButton, NButtonGroup, NDropdown, NIcon, NInput, NSelect, NTooltip, useThemeVars } from 'naive-ui';
import {
  DocumentTextOutline,
  EllipsisHorizontal,
  GridOutline,
  GridSharp,
  ListOutline,
  ReorderFourOutline
} from '@vicons/ionicons5';
import { Folder, Plus, Search, SortAscending, SortDescending, Upload, Cloud, DeviceDesktop } from '@vicons/tabler';
import type { GridSize, SortField, SortOrder, ViewMode } from '../types/file-explorer';
import type { DataSourceType } from '../datasources/types';

export default defineComponent({
  name: 'FileToolbar',
  props: {
    viewMode: { type: String as PropType<ViewMode>, required: true },
    onViewModeChange: { type: Function as PropType<(mode: ViewMode) => void>, required: true },
    gridSize: { type: String as PropType<GridSize>, default: 'medium' },
    onGridSizeChange: Function as PropType<(size: GridSize) => void>,
    sortField: { type: String as PropType<SortField>, required: true },
    sortOrder: { type: String as PropType<SortOrder>, required: true },
    onSortChange: { type: Function as PropType<(field: SortField, order: SortOrder) => void>, required: true },
    searchQuery: { type: String, default: '' },
    onSearchChange: Function as PropType<(query: string) => void>,
    showUpload: { type: Boolean, default: true },
    showNewFolder: { type: Boolean, default: true },
    onUpload: Function as PropType<() => void>,
    onNewFolder: Function as PropType<() => void>,
    dataSourceType: { type: String as PropType<DataSourceType>, default: 'local' },
    onDataSourceTypeChange: Function as PropType<(type: DataSourceType) => void>,
    onOpenLocalFolder: Function as PropType<() => void>
  },

  setup(props) {
    const themeVars = useThemeVars();
    const showSearchInput = ref(false);
    const isMobile = ref(window.innerWidth < 768);
    const isTablet = ref(window.innerWidth >= 768 && window.innerWidth < 1024);
    const isDesktop = computed(() => !isMobile.value && !isTablet.value);

    const resizeHandler = () => {
      const width = window.innerWidth;
      isMobile.value = width < 768;
      isTablet.value = width >= 768 && width < 1024;
    };

    onMounted(() => window.addEventListener('resize', resizeHandler));
    onUnmounted(() => window.removeEventListener('resize', resizeHandler));

    const viewModeOptions = [
      { value: 'grid' as ViewMode, icon: GridOutline, label: '网格视图' },
      { value: 'list' as ViewMode, icon: ListOutline, label: '列表视图' },
      { value: 'tile' as ViewMode, icon: GridSharp, label: '平铺视图' },
      { value: 'detail' as ViewMode, icon: ReorderFourOutline, label: '详细视图' },
      { value: 'content' as ViewMode, icon: DocumentTextOutline, label: '内容视图' }
    ];

    const gridSizeOptions = [
      { label: '小', value: 'small' as GridSize },
      { label: '中', value: 'medium' as GridSize },
      { label: '大', value: 'large' as GridSize },
      { label: '特大', value: 'extra-large' as GridSize }
    ];

    const sortFieldOptions = [
      { label: '名称', value: 'name' as SortField },
      { label: '修改时间', value: 'modifiedAt' as SortField },
      { label: '创建时间', value: 'createdAt' as SortField },
      { label: '类型', value: 'type' as SortField },
      { label: '大小', value: 'size' as SortField }
    ];

    // 数据源模式选项
    const dataSourceOptions = computed(() => {
      const opts: any[] = [
        {
          label: '本地模式',
          key: 'local',
          icon: () => (
            <NIcon>
              <DeviceDesktop />
            </NIcon>
          )
        },
        {
          label: '服务器模式',
          key: 'server',
          icon: () => (
            <NIcon>
              <Cloud />
            </NIcon>
          )
        }
      ];

      // 本地模式下添加打开文件夹选项
      if (props.dataSourceType === 'local' && props.onOpenLocalFolder) {
        opts.push({
          type: 'divider',
          key: 'divider-1'
        });
        opts.push({
          label: '打开文件夹',
          key: 'open-folder',
          icon: () => (
            <NIcon>
              <Folder />
            </NIcon>
          )
        });
      }

      return opts;
    });

    // 更多操作选项（移动/平板端）
    const moreOptions = computed(() => {
      const opts: any[] = [];
      if (props.showNewFolder) {
        opts.push({
          label: '新建文件夹',
          key: 'new-folder',
          icon: () => (
            <NIcon>
              <Plus />
            </NIcon>
          )
        });
      }
      // 上传按钮仅在服务器模式显示
      if (props.showUpload && props.dataSourceType === 'server') {
        opts.push({
          label: '上传文件',
          key: 'upload',
          icon: () => (
            <NIcon>
              <Upload />
            </NIcon>
          )
        });
      }
      return opts;
    });

    // 处理数据源下拉菜单选择
    const handleDataSourceSelect = (key: string) => {
      if (key === 'local' || key === 'server') {
        props.onDataSourceTypeChange?.(key as DataSourceType);
      } else if (key === 'open-folder') {
        props.onOpenLocalFolder?.();
      }
    };

    const handleMoreSelect = (key: 'new-folder' | 'upload') => {
      const map = {
        'new-folder': props.onNewFolder,
        upload: props.onUpload
      };
      map[key]?.();
    };

    const toggleSortOrder = () => {
      const newOrder = props.sortOrder === 'asc' ? 'desc' : 'asc';
      props.onSortChange(props.sortField, newOrder);
    };

    return () => (
      <div
        class="flex flex-col border-b"
        style={{
          backgroundColor: themeVars.value.cardColor,
          borderColor: themeVars.value.dividerColor
        }}
      >
        {/* 主工具栏 */}
        <div class="flex items-center justify-between gap-2 px-4 py-3">
          {/* 左侧：模式切换和视图控制 */}
          <div class="flex flex-shrink-0 items-center gap-2">
            {/* 数据源模式切换 */}
            {isDesktop.value ? (
              // 桌面端：按钮组
              <NButtonGroup>
                <NTooltip>
                  {{
                    trigger: () => (
                      <NButton
                        type={props.dataSourceType === 'local' ? 'primary' : 'default'}
                        ghost={props.dataSourceType !== 'local'}
                        onClick={() => props.onDataSourceTypeChange?.('local')}
                      >
                        <NIcon size={16}>
                          <DeviceDesktop />
                        </NIcon>
                      </NButton>
                    ),
                    default: () => '本地模式'
                  }}
                </NTooltip>
                <NTooltip>
                  {{
                    trigger: () => (
                      <NButton
                        type={props.dataSourceType === 'server' ? 'primary' : 'default'}
                        ghost={props.dataSourceType !== 'server'}
                        onClick={() => props.onDataSourceTypeChange?.('server')}
                      >
                        <NIcon size={16}>
                          <Cloud />
                        </NIcon>
                      </NButton>
                    ),
                    default: () => '服务器模式'
                  }}
                </NTooltip>
              </NButtonGroup>
            ) : (
              // 移动/平板端：下拉菜单
              <NDropdown options={dataSourceOptions.value} onSelect={handleDataSourceSelect}>
                <NButton>
                  <NIcon size={16}>
                    {props.dataSourceType === 'local' ? <DeviceDesktop /> : <Cloud />}
                  </NIcon>
                </NButton>
              </NDropdown>
            )}

            {/* 打开本地文件夹按钮（仅本地模式，桌面端显示） */}
            {isDesktop.value && props.dataSourceType === 'local' && props.onOpenLocalFolder && (
              <NTooltip>
                {{
                  trigger: () => (
                    <NButton onClick={props.onOpenLocalFolder}>
                      <NIcon size={16}>
                        <Folder />
                      </NIcon>
                      <span class="ml-1 hidden lg:inline">打开文件夹</span>
                    </NButton>
                  ),
                  default: () => '打开本地文件夹'
                }}
              </NTooltip>
            )}

            {/* 分隔线 */}
            <div class="h-6 w-px" style={{ backgroundColor: themeVars.value.dividerColor }} />

            {/* 桌面端视图切换 */}
            {isDesktop.value && (
              <NButtonGroup>
                {viewModeOptions.map(opt => (
                  <NTooltip key={opt.value}>
                    {{
                      trigger: () => (
                        <NButton
                          type={props.viewMode === opt.value ? 'primary' : 'default'}
                          ghost={props.viewMode !== opt.value}
                          onClick={() => props.onViewModeChange(opt.value)}
                        >
                          <NIcon size={16}>
                            <opt.icon />
                          </NIcon>
                        </NButton>
                      ),
                      default: () => opt.label
                    }}
                  </NTooltip>
                ))}
              </NButtonGroup>
            )}

            {/* 平板端视图切换 */}
            {isTablet.value && (
              <NSelect
                value={props.viewMode}
                options={viewModeOptions.map(opt => ({ label: opt.label, value: opt.value }))}
                onUpdateValue={props.onViewModeChange}
                style={{ width: '110px' }}
              />
            )}

            {/* 移动端视图切换 */}
            {isMobile.value && (
              <NDropdown
                options={viewModeOptions.map(opt => ({
                  label: opt.label,
                  key: opt.value,
                  icon: () => (
                    <NIcon>
                      <opt.icon />
                    </NIcon>
                  )
                }))}
                onSelect={(key: string) => props.onViewModeChange(key as ViewMode)}
              >
                <NButton>
                  <NIcon size={16}>
                    {(() => {
                      const current = viewModeOptions.find(opt => opt.value === props.viewMode);
                      const IconComp = current ? current.icon : GridOutline;
                      return <IconComp />;
                    })()}
                  </NIcon>
                </NButton>
              </NDropdown>
            )}

            {/* 网格大小 */}
            {props.viewMode === 'grid' && props.onGridSizeChange && !isMobile.value && (
              <NSelect
                value={props.gridSize}
                options={gridSizeOptions}
                onUpdateValue={props.onGridSizeChange}
                style={{ width: '80px' }}
              />
            )}
          </div>

          {/* 中间：搜索框（桌面/平板） */}
          {!isMobile.value && (
            <div class="mx-4 max-w-md flex flex-1 min-w-0">
              <NInput
                value={props.searchQuery}
                placeholder="搜索文件..."
                clearable
                onUpdateValue={props.onSearchChange}
              >
                {{
                  prefix: () => (
                    <NIcon size={16} style={{ color: themeVars.value.textColor3 }}>
                      <Search />
                    </NIcon>
                  )
                }}
              </NInput>
            </div>
          )}

          {/* 右侧：排序和操作按钮 */}
          <div class="flex flex-shrink-0 items-center gap-2">
            {/* 排序 */}
            {isDesktop.value && (
              <div class="flex items-center gap-2">
                <NSelect
                  value={props.sortField}
                  options={sortFieldOptions}
                  onUpdateValue={(v: SortField) => props.onSortChange(v, props.sortOrder)}
                  style={{ width: '100px' }}
                />
                <NTooltip>
                  {{
                    trigger: () => (
                      <NButton onClick={toggleSortOrder}>
                        <NIcon size={16}>{props.sortOrder === 'asc' ? <SortAscending /> : <SortDescending />}</NIcon>
                      </NButton>
                    ),
                    default: () => (props.sortOrder === 'asc' ? '升序' : '降序')
                  }}
                </NTooltip>
              </div>
            )}

            {/* 平板端排序 */}
            {isTablet.value && (
              <NDropdown
                options={sortFieldOptions.map(opt => ({
                  label: `${opt.label} ${props.sortField === opt.value ? (props.sortOrder === 'asc' ? '↑' : '↓') : ''}`,
                  key: opt.value
                }))}
                onSelect={(key: string) => {
                  const newOrder =
                    props.sortField === key ? (props.sortOrder === 'asc' ? 'desc' : 'asc') : props.sortOrder;
                  props.onSortChange(key as SortField, newOrder);
                }}
              >
                <NButton>
                  <NIcon size={16}>{props.sortOrder === 'asc' ? <SortAscending /> : <SortDescending />}</NIcon>
                </NButton>
              </NDropdown>
            )}

            {/* 移动端搜索按钮 */}
            {isMobile.value && (
              <NButton onClick={() => (showSearchInput.value = !showSearchInput.value)}>
                <NIcon size={16}>
                  <Search />
                </NIcon>
              </NButton>
            )}

            {/* 分隔线 */}
            {(props.showNewFolder || (props.showUpload && props.dataSourceType === 'server')) && (
              <div class="h-6 w-px" style={{ backgroundColor: themeVars.value.dividerColor }} />
            )}

            {/* 操作按钮 */}
            {isDesktop.value && (
              <>
                {/* 新建文件夹 */}
                {props.showNewFolder && (
                  <NButton onClick={props.onNewFolder}>
                    <NIcon size={16}>
                      <Plus />
                    </NIcon>
                    <span class="ml-1 hidden lg:inline">新建文件夹</span>
                  </NButton>
                )}
                {/* 上传按钮（仅服务器模式） */}
                {props.showUpload && props.dataSourceType === 'server' && (
                  <NButton type="primary" onClick={props.onUpload}>
                    <NIcon size={16}>
                      <Upload />
                    </NIcon>
                    <span class="ml-1 hidden lg:inline">上传</span>
                  </NButton>
                )}
              </>
            )}

            {/* 更多操作（移动/平板） */}
            {!isDesktop.value && moreOptions.value.length > 0 && (
              <NDropdown options={moreOptions.value} onSelect={handleMoreSelect}>
                <NButton>
                  <NIcon size={16}>
                    <EllipsisHorizontal />
                  </NIcon>
                </NButton>
              </NDropdown>
            )}
          </div>
        </div>

        {/* 移动端搜索框 */}
        {isMobile.value && showSearchInput.value && (
          <div class="px-4 pb-3">
            <NInput
              value={props.searchQuery}
              placeholder="搜索文件..."
              clearable
              autofocus
              onUpdateValue={props.onSearchChange}
            >
              {{
                prefix: () => (
                  <NIcon size={16} style={{ color: themeVars.value.textColor3 }}>
                    <Search />
                  </NIcon>
                )
              }}
            </NInput>
          </div>
        )}
      </div>
    );
  }
});
