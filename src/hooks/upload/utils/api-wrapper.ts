/** API 包装工具 简化方法调用，减少重复代码 */

/** 创建方法包装器（保留原始函数签名） */
export function createMethodWrapper<T extends object, K extends keyof T>(
  target: T,
  methodName: K
): T[K] extends (...args: any[]) => any ? (...args: Parameters<T[K]>) => ReturnType<T[K]> : never {
  const method = target[methodName];
  if (typeof method !== 'function') {
    throw new TypeError(`Method ${String(methodName)} is not a function`);
  }
  return ((...args: any[]) => (method as (...args: any[]) => any).apply(target, args)) as any;
}

/** 批量创建方法包装器（保留原始函数签名） */
export function createMethodWrappers<T extends object, K extends keyof T>(
  target: T,
  methodNames: readonly K[]
): {
  [P in K]: T[P] extends (...args: any[]) => any
    ? (...args: Parameters<T[P]>) => ReturnType<T[P]>
    : never;
} {
  const wrappers = {} as any;

  for (const methodName of methodNames) {
    wrappers[String(methodName)] = createMethodWrapper(target, methodName);
  }

  return wrappers;
}

/** 创建属性访问器（保留原始属性类型） */
export function createPropertyAccessor<T extends object, K extends keyof T>(
  target: T,
  propertyName: K
): T[K] {
  return target[propertyName];
}

/** 批量创建属性访问器（保留原始属性类型） */
export function createPropertyAccessors<T extends object, K extends keyof T>(
  target: T,
  propertyNames: readonly K[]
): Pick<T, K> {
  const accessors = {} as Pick<T, K>;

  for (const propertyName of propertyNames) {
    (accessors as Record<string, unknown>)[String(propertyName)] = target[propertyName];
  }

  return accessors;
}
