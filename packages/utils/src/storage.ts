import localforage from 'localforage';

/** The storage type */
export type StorageType = 'local' | 'session';

export function createStorage<T extends object>(type: StorageType, storagePrefix: string) {
  // 检查是否在浏览器环境中
  const isBrowser = typeof window !== 'undefined' && window.localStorage && window.sessionStorage;
  const stg = isBrowser
    ? (type === 'session' ? window.sessionStorage : window.localStorage)
    : null;

  const storage = {
    /**
     * Set session
     *
     * @param key Session key
     * @param value Session value
     */
    set<K extends keyof T>(key: K, value: T[K]) {
      if (!stg) return; // 非浏览器环境，直接返回

      const json = JSON.stringify(value);

      stg.setItem(`${storagePrefix}${key as string}`, json);
    },
    /**
     * Get session
     *
     * @param key Session key
     */
    get<K extends keyof T>(key: K): T[K] | null {
      if (!stg) return null; // 非浏览器环境，返回 null

      const json = stg.getItem(`${storagePrefix}${key as string}`);
      if (json) {
        let storageData: T[K] | null = null;

        try {
          storageData = JSON.parse(json);
        } catch {}

        if (storageData) {
          return storageData as T[K];
        }
      }

      // 如果解析失败，移除无效项（但仅在浏览器环境中）
      if (stg) {
        stg.removeItem(`${storagePrefix}${key as string}`);
      }

      return null;
    },
    remove(key: keyof T) {
      if (!stg) return; // 非浏览器环境，直接返回

      stg.removeItem(`${storagePrefix}${key as string}`);
    },
    clear() {
      if (!stg) return; // 非浏览器环境，直接返回

      stg.clear();
    }
  };
  return storage;
}

type LocalForage<T extends object> = Omit<
  typeof localforage,
  'getItem' | 'setItem' | 'removeItem'
> & {
  getItem<K extends keyof T>(
    key: K,
    callback?: (err: any, value: T[K] | null) => void
  ): Promise<T[K] | null>;

  setItem<K extends keyof T>(
    key: K,
    value: T[K],
    callback?: (err: any, value: T[K]) => void
  ): Promise<T[K]>;

  removeItem(key: keyof T, callback?: (err: any) => void): Promise<void>;
};

type LocalforageDriver = 'local' | 'indexedDB' | 'webSQL';

export function createLocalforage<T extends object>(driver: LocalforageDriver) {
  const driverMap: Record<LocalforageDriver, string> = {
    local: localforage.LOCALSTORAGE,
    indexedDB: localforage.INDEXEDDB,
    webSQL: localforage.WEBSQL
  };

  localforage.config({
    driver: driverMap[driver]
  });

  return localforage as LocalForage<T>;
}
