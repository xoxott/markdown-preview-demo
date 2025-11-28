/**
 * API 包装工具
 * 简化方法调用，减少重复代码
 */

/**
 * 创建方法包装器
 */
export function createMethodWrapper<T extends object>(
  target: T,
  methodName: keyof T
): (...args: any[]) => any {
  const method = target[methodName];
  if (typeof method !== 'function') {
    throw new Error(`Method ${String(methodName)} is not a function`);
  }
  return (...args: any[]) => (method as Function).apply(target, args);
}

/**
 * 批量创建方法包装器
 */
export function createMethodWrappers<T extends object>(
  target: T,
  methodNames: ReadonlyArray<keyof T>
): Record<string, (...args: any[]) => any> {
  const wrappers: Record<string, (...args: any[]) => any> = {};
  
  for (const methodName of methodNames) {
    wrappers[String(methodName)] = createMethodWrapper(target, methodName);
  }
  
  return wrappers;
}

/**
 * 创建属性访问器
 */
export function createPropertyAccessor<T extends object>(
  target: T,
  propertyName: keyof T
): T[typeof propertyName] {
  return target[propertyName];
}

/**
 * 批量创建属性访问器
 */
export function createPropertyAccessors<T extends object>(
  target: T,
  propertyNames: ReadonlyArray<keyof T>
): Record<string, any> {
  const accessors: Record<string, any> = {};
  
  for (const propertyName of propertyNames) {
    accessors[String(propertyName)] = createPropertyAccessor(target, propertyName);
  }
  
  return accessors;
}

