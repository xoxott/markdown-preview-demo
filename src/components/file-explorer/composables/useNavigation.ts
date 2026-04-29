import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type {
  DataSourceType,
  IFileDataSource,
  ServerFileDataSourceConfig
} from '../datasources/types';
import { LocalFileDataSource, ServerFileDataSource } from '../datasources';
import type { BreadcrumbItem } from '../layout/FileBreadcrumb';

export interface UseNavigationOptions {
  initialDataSourceType?: DataSourceType;
  serverDataSourceConfig?: ServerFileDataSourceConfig;
}

export interface UseNavigationReturn {
  dataSourceType: Ref<DataSourceType>;
  dataSource: Ref<IFileDataSource | null>;
  currentPath: Ref<string>;
  breadcrumbItems: Ref<BreadcrumbItem[]>;
}

/** 导航 composable — 管理数据源状态和面包屑生成（不含刷新逻辑） */
export function useNavigation(options: UseNavigationOptions): UseNavigationReturn {
  const { initialDataSourceType = 'local', serverDataSourceConfig } = options;

  const dataSourceType = ref<DataSourceType>(initialDataSourceType);
  const dataSource = ref<IFileDataSource | null>(null);
  const currentPath = ref<string>('/');

  // 面包屑路径生成
  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const path = currentPath.value;
    const parts = path.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    const rootName =
      dataSource.value?.type === 'local'
        ? (dataSource.value as LocalFileDataSource).rootPath || '根目录'
        : '根目录';

    items.push({ id: 'root', name: rootName, path: '/' });

    let currentPathStr = '';
    parts.forEach((part, index) => {
      currentPathStr += `/${part}`;
      items.push({ id: `path-${index}`, name: part, path: currentPathStr });
    });

    return items;
  });

  // 初始化数据源
  if (initialDataSourceType === 'server' && serverDataSourceConfig) {
    dataSource.value = new ServerFileDataSource(serverDataSourceConfig);
  } else {
    dataSource.value = new LocalFileDataSource();
  }

  return {
    dataSourceType,
    dataSource,
    currentPath,
    breadcrumbItems
  };
}
