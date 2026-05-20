import { NButton, NSpace, NTag } from 'naive-ui';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';

type Log = Api.LogManagement.Log;

const METHOD_TAG_TYPE: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'error',
  PATCH: 'warning'
};

export function getLogStatusTagType(status: number | null): 'success' | 'warning' | 'error' | 'info' {
  if (status === null) return 'info';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  return 'error';
}

/** 将 SearchBar 中的时间戳等字段转为接口入参 */
export function serializeLogListFilters(
  params: Record<string, unknown>
): Partial<Api.LogManagement.LogListParams> {
  const startDate = params.startDate;
  const endDate = params.endDate;

  return {
    search: (params.search as string) || undefined,
    userId: params.userId as number | undefined,
    ip: (params.ip as string) || undefined,
    statusCode: params.statusCode as number | undefined,
    method: (params.method as string) || undefined,
    startDate: typeof startDate === 'number' ? new Date(startDate).toISOString() : undefined,
    endDate: typeof endDate === 'number' ? new Date(endDate).toISOString() : undefined,
    sortBy: params.sortBy as string | undefined,
    sortOrder: params.sortOrder as 'asc' | 'desc' | undefined
  };
}

export function createLogSearchFields(
  userOptions: Array<{ label: string; value: number }>
): SearchFieldConfig[] {
  return [
    {
      type: 'input',
      field: 'search',
      label: $t('common.searchFieldLabel'),
      placeholder: $t('page.logManagement.searchPlaceholder'),
      icon: 'i-carbon-search',
      width: '220px'
    },
    {
      type: 'select',
      field: 'userId',
      label: $t('page.logManagement.userId'),
      placeholder: $t('page.logManagement.userPlaceholder'),
      width: '200px',
      clearable: true,
      options: userOptions,
      componentProps: { filterable: true }
    },
    {
      type: 'input',
      field: 'ip',
      label: $t('page.logManagement.ip'),
      placeholder: $t('page.logManagement.ipPlaceholder'),
      width: '150px'
    },
    {
      type: 'select',
      field: 'method',
      label: $t('page.logManagement.requestMethod'),
      placeholder: $t('page.logManagement.methodPlaceholder'),
      width: '120px',
      clearable: true,
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' }
      ]
    },
    {
      type: 'input-number',
      field: 'statusCode',
      label: $t('page.logManagement.responseStatus'),
      placeholder: $t('page.logManagement.statusCodePlaceholder'),
      width: '120px',
      clearable: true,
      componentProps: { min: 100, max: 599 }
    },
    {
      type: 'datetime',
      field: 'startDate',
      label: $t('page.logManagement.startDatePlaceholder'),
      placeholder: $t('page.logManagement.startDatePlaceholder'),
      width: '200px',
      clearable: true
    },
    {
      type: 'datetime',
      field: 'endDate',
      label: $t('page.logManagement.endDatePlaceholder'),
      placeholder: $t('page.logManagement.endDatePlaceholder'),
      width: '200px',
      clearable: true
    }
  ];
}

export interface LogTableColumnHandlers {
  onView: (row: Log) => void;
  onDelete: (row: Log) => void;
}

export function createLogTableColumns(h: LogTableColumnHandlers): TableColumnConfig<Log>[] {
  return [
    {
      title: $t('page.logManagement.userId'),
      key: 'userId',
      width: 100,
      render: (row: Log) => row.userId ?? '-'
    },
    {
      title: $t('page.logManagement.ip'),
      key: 'ip',
      width: 150,
      render: (row: Log) => row.ip ?? '-'
    },
    {
      title: $t('page.logManagement.requestMethod'),
      key: 'method',
      width: 100,
      render: (row: Log) => {
        if (!row.method) return '-';
        return (
          <NTag type={METHOD_TAG_TYPE[row.method] || 'info'} size="small">
            {row.method}
          </NTag>
        );
      }
    },
    {
      title: $t('page.logManagement.requestUrl'),
      key: 'path',
      width: 300,
      ellipsis: { tooltip: true },
      render: (row: Log) => row.path ?? '-'
    },
    {
      title: $t('page.logManagement.responseStatus'),
      key: 'statusCode',
      width: 120,
      render: (row: Log) => {
        if (row.statusCode === null) return '-';
        return (
          <NTag type={getLogStatusTagType(row.statusCode)} size="small">
            {row.statusCode}
          </NTag>
        );
      }
    },
    {
      title: $t('page.logManagement.duration'),
      key: 'responseTime',
      width: 100,
      render: (row: Log) => (row.responseTime === null ? '-' : `${row.responseTime}ms`)
    },
    {
      title: $t('page.logManagement.createdAt'),
      key: 'createdAt',
      width: 180,
      render: (row: Log) =>
        row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-'
    },
    {
      title: $t('common.operate'),
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (row: Log) => (
        <NSpace size="small">
          <NButton size="small" type="primary" secondary onClick={() => h.onView(row)}>
            <div class="flex items-center gap-4px">
              <div class="i-carbon-view text-14px" />
              <span>{$t('common.view')}</span>
            </div>
          </NButton>
          <NButton size="small" type="error" secondary onClick={() => h.onDelete(row)}>
            <div class="flex items-center gap-4px">
              <div class="i-carbon-trash-can text-14px" />
              <span>{$t('common.delete')}</span>
            </div>
          </NButton>
        </NSpace>
      )
    }
  ];
}

export const LOG_LIST_SCROLL_X = 1400;
