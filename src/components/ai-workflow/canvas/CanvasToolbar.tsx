import { defineComponent, type PropType } from 'vue';
import { NButton, NButtonGroup, NIcon, NTooltip, NDivider, NSpace } from 'naive-ui';
import { Icon } from '@iconify/vue';

export default defineComponent({
  name: 'CanvasToolbar',
  props: {
    zoom: {
      type: Number as PropType<number>,
      default: 1
    },
    canUndo: {
      type: Boolean,
      default: false
    },
    canRedo: {
      type: Boolean,
      default: false
    },
    selectedCount: {
      type: Number,
      default: 0
    },
    showGrid: {
      type: Boolean,
      default: true
    },
    showMinimap: {
      type: Boolean,
      default: true
    },
    onZoomIn: {
      type: Function as PropType<() => void>,
      required: true
    },
    onZoomOut: {
      type: Function as PropType<() => void>,
      required: true
    },
    onResetZoom: {
      type: Function as PropType<() => void>,
      required: true
    },
    onFitView: {
      type: Function as PropType<() => void>,
      required: true
    },
    onUndo: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onRedo: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onAlignLeft: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onAlignRight: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onAlignTop: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onAlignBottom: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onDistributeHorizontal: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onDistributeVertical: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onValidate: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onToggleGrid: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onToggleMinimap: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onLockSelected: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onUnlockSelected: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onSave: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onClear: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onConnectionLineSettings: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onBackgroundSettings: {
      type: Function as PropType<() => void>,
      default: undefined
    }
  },
  setup(props) {
    const zoomPercentage = () => `${Math.round(props.zoom * 100)}%`;

    return () => (
      <div class="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
        {/* 左侧：缩放控制 */}
        <NSpace size="small">
          <NButtonGroup>
            <NTooltip>
              {{
                default: () => '缩小 (Ctrl + -)',
                trigger: () => (
                  <NButton size="small" onClick={props.onZoomOut} secondary>
                    <NIcon>
                      <Icon icon="mdi:minus" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>

            <NButton size="small" onClick={props.onResetZoom} secondary class="min-w-16 font-medium">
              {zoomPercentage()}
            </NButton>

            <NTooltip>
              {{
                default: () => '放大 (Ctrl + +)',
                trigger: () => (
                  <NButton size="small" onClick={props.onZoomIn} secondary>
                    <NIcon>
                      <Icon icon="mdi:plus" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>
          </NButtonGroup>

          <NTooltip>
            {{
              default: () => '适应视图 - 自动调整画布以显示所有节点',
              trigger: () => (
                <NButton size="small" onClick={props.onFitView} secondary>
                  <NIcon>
                    <Icon icon="mdi:fit-to-screen" />
                  </NIcon>
                </NButton>
              )
            }}
          </NTooltip>

          <NDivider vertical />

          {/* 撤销/重做 */}
          <NButtonGroup>
            <NTooltip>
              {{
                default: () => '撤销 (Ctrl + Z)',
                trigger: () => (
                  <NButton
                    size="small"
                    onClick={props.onUndo}
                    disabled={!props.canUndo}
                    secondary
                  >
                    <NIcon>
                      <Icon icon="mdi:undo" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>

            <NTooltip>
              {{
                default: () => '重做 (Ctrl + Y)',
                trigger: () => (
                  <NButton
                    size="small"
                    onClick={props.onRedo}
                    disabled={!props.canRedo}
                    secondary
                  >
                    <NIcon>
                      <Icon icon="mdi:redo" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>
          </NButtonGroup>

          {/* 对齐工具 */}
          {props.selectedCount >= 2 && (
            <>
              <NDivider vertical />
              <NButtonGroup>
                <NTooltip>
                  {{
                    default: () => '左对齐',
                    trigger: () => (
                      <NButton size="small" onClick={props.onAlignLeft} secondary>
                        <NIcon>
                          <Icon icon="mdi:format-align-left" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>

                <NTooltip>
                  {{
                    default: () => '右对齐',
                    trigger: () => (
                      <NButton size="small" onClick={props.onAlignRight} secondary>
                        <NIcon>
                          <Icon icon="mdi:format-align-right" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>

                <NTooltip>
                  {{
                    default: () => '顶部对齐',
                    trigger: () => (
                      <NButton size="small" onClick={props.onAlignTop} secondary>
                        <NIcon>
                          <Icon icon="mdi:format-align-top" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>

                <NTooltip>
                  {{
                    default: () => '底部对齐',
                    trigger: () => (
                      <NButton size="small" onClick={props.onAlignBottom} secondary>
                        <NIcon>
                          <Icon icon="mdi:format-align-bottom" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>
              </NButtonGroup>

              {props.selectedCount >= 3 && (
                <NButtonGroup>
                  <NTooltip>
                    {{
                      default: () => '水平分布',
                      trigger: () => (
                        <NButton size="small" onClick={props.onDistributeHorizontal} secondary>
                          <NIcon>
                            <Icon icon="mdi:distribute-horizontal-center" />
                          </NIcon>
                        </NButton>
                      )
                    }}
                  </NTooltip>

                  <NTooltip>
                    {{
                      default: () => '垂直分布',
                      trigger: () => (
                        <NButton size="small" onClick={props.onDistributeVertical} secondary>
                          <NIcon>
                            <Icon icon="mdi:distribute-vertical-center" />
                          </NIcon>
                        </NButton>
                      )
                    }}
                  </NTooltip>
                </NButtonGroup>
              )}
            </>
          )}
        </NSpace>

        {/* 右侧：操作按钮 */}
        <NSpace size="small">
          {/* 视图控制 */}
          <NButtonGroup>
            {props.onToggleGrid && (
              <NTooltip>
                {{
                  default: () => props.showGrid ? '隐藏网格' : '显示网格',
                  trigger: () => (
                    <NButton
                      size="small"
                      onClick={props.onToggleGrid}
                      type={props.showGrid ? 'primary' : 'default'}
                      secondary
                    >
                      <NIcon>
                        <Icon icon="mdi:grid" />
                      </NIcon>
                    </NButton>
                  )
                }}
              </NTooltip>
            )}

            {props.onToggleMinimap && (
              <NTooltip>
                {{
                  default: () => props.showMinimap ? '隐藏小地图' : '显示小地图',
                  trigger: () => (
                    <NButton
                      size="small"
                      onClick={props.onToggleMinimap}
                      type={props.showMinimap ? 'primary' : 'default'}
                      secondary
                    >
                      <NIcon>
                        <Icon icon="mdi:map" />
                      </NIcon>
                    </NButton>
                  )
                }}
              </NTooltip>
            )}
          </NButtonGroup>

          {/* 设置按钮 */}
          <NDivider vertical />
          <NButtonGroup>
            {props.onConnectionLineSettings && (
              <NTooltip>
                {{
                  default: () => '连接线设置 - 配置线条样式',
                  trigger: () => (
                    <NButton size="small" onClick={props.onConnectionLineSettings} secondary>
                      <NIcon>
                        <Icon icon="mdi:vector-line" />
                      </NIcon>
                    </NButton>
                  )
                }}
              </NTooltip>
            )}

            {props.onBackgroundSettings && (
              <NTooltip>
                {{
                  default: () => '背景设置 - 配置网格和背景',
                  trigger: () => (
                    <NButton size="small" onClick={props.onBackgroundSettings} secondary>
                      <NIcon>
                        <Icon icon="mdi:palette-outline" />
                      </NIcon>
                    </NButton>
                  )
                }}
              </NTooltip>
            )}
          </NButtonGroup>

          {/* 锁定控制 */}
          {props.selectedCount > 0 && (
            <NButtonGroup>
              {props.onLockSelected && (
                <NTooltip>
                  {{
                    default: () => '锁定选中节点',
                    trigger: () => (
                      <NButton size="small" onClick={props.onLockSelected} secondary>
                        <NIcon>
                          <Icon icon="mdi:lock" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>
              )}

              {props.onUnlockSelected && (
                <NTooltip>
                  {{
                    default: () => '解锁选中节点',
                    trigger: () => (
                      <NButton size="small" onClick={props.onUnlockSelected} secondary>
                        <NIcon>
                          <Icon icon="mdi:lock-open-variant" />
                        </NIcon>
                      </NButton>
                    )
                  }}
                </NTooltip>
              )}
            </NButtonGroup>
          )}

          {props.onValidate && (
            <NTooltip>
              {{
                default: () => '验证工作流配置',
                trigger: () => (
                  <NButton size="small" onClick={props.onValidate} secondary>
                    <NIcon>
                      <Icon icon="mdi:check-circle-outline" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>
          )}

          {props.onSave && (
            <NTooltip>
              {{
                default: () => '保存工作流 (Ctrl + S)',
                trigger: () => (
                  <NButton size="small" type="primary" onClick={props.onSave}>
                    <NIcon>
                      <Icon icon="mdi:content-save" />
                    </NIcon>
                  </NButton>
                )
              }}
            </NTooltip>
          )}

          {props.onClear && (
            <>
              <NDivider vertical />
              <NTooltip>
                {{
                  default: () => '清空画布 - 删除所有节点和连接',
                  trigger: () => (
                    <NButton size="small" onClick={props.onClear} secondary>
                      <NIcon>
                        <Icon icon="mdi:delete-sweep" />
                      </NIcon>
                    </NButton>
                  )
                }}
              </NTooltip>
            </>
          )}
        </NSpace>
      </div>
    );
  }
});

