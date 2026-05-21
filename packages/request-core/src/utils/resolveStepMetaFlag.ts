/** 解析步骤 meta 开关：显式 false 关闭；有值则用该值；否则按构造时的 enabledByDefault 决定。 */
export function resolveStepMetaFlag<T extends boolean | object>(
  metaValue: T | false | undefined,
  enabledByDefault: boolean
): T | undefined {
  if (metaValue === false) {
    return undefined;
  }

  if (metaValue !== undefined) {
    return metaValue;
  }

  return enabledByDefault ? (true as T) : undefined;
}
