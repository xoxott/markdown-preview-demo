/* eslint-disable max-params */
import type { Options } from 'execa';

/**
 * 执行一个命令行指令并返回标准输出
 *
 * @param cmd - 要执行的命令，例如 `git`
 * @param args - 命令参数数组，例如 `['status', '--short']`
 * @param options - execa 的可选配置
 * @returns 命令标准输出（去除首尾空格），未产生输出时返回空字符串
 *
 * @example
 * ```ts
 * const branch = await execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
 * ```
 */
export async function execCommand(cmd: string, args: string[], options?: Options) {
  const { execa } = await import('execa');
  const res = await execa(cmd, args, options);
  return (res?.stdout as string)?.trim() || '';
}

/**
 * 判断值是否非 null 或 undefined
 *
 * @param v - 需要检查的值
 * @returns 如果值不是 null/undefined 则返回 true
 *
 * @example
 * ```ts
 * const arr = [1, null, 2, undefined].filter(notNullish); // [1, 2]
 * ```
 */
export function notNullish<T>(v?: T | null): v is NonNullable<T> {
  return v !== null && v !== undefined;
}

type PartitionFilter<T> = (i: T, idx: number, arr: readonly T[]) => any;

/**
 * 将数组根据过滤函数划分为多个分组
 *
 * - 第一个匹配的过滤函数决定元素所属分组
 * - 如果没有过滤器匹配，则归入最后一个分组
 *
 * @category Array
 * @param array - 原始数组
 * @param filters - 一组用于判断元素所属分组的过滤函数
 * @returns 分组后的数组集合，长度 = `filters.length + 1`
 *
 * @example
 * ```ts
 * const [odd, even] = partition([1, 2, 3, 4], i => i % 2 !== 0);
 *  odd = [1, 3], even = [2, 4]
 *
 * const [small, medium, large] = partition(
 *   [1, 5, 10, 20],
 *   i => i < 5,
 *   i => i < 10
 * );
 *  //small = [1], medium = [5], large = [10, 20]
 * ```
 */
export function partition<T>(array: readonly T[], f1: PartitionFilter<T>): [T[], T[]];
export function partition<T>(array: readonly T[], f1: PartitionFilter<T>, f2: PartitionFilter<T>): [T[], T[], T[]];
export function partition<T>(
  array: readonly T[],
  f1: PartitionFilter<T>,
  f2: PartitionFilter<T>,
  f3: PartitionFilter<T>
): [T[], T[], T[], T[]];
export function partition<T>(
  array: readonly T[],
  f1: PartitionFilter<T>,
  f2: PartitionFilter<T>,
  f3: PartitionFilter<T>,
  f4: PartitionFilter<T>
): [T[], T[], T[], T[], T[]];
export function partition<T>(
  array: readonly T[],
  f1: PartitionFilter<T>,
  f2: PartitionFilter<T>,
  f3: PartitionFilter<T>,
  f4: PartitionFilter<T>,
  f5: PartitionFilter<T>
): [T[], T[], T[], T[], T[], T[]];
export function partition<T>(
  array: readonly T[],
  f1: PartitionFilter<T>,
  f2: PartitionFilter<T>,
  f3: PartitionFilter<T>,
  f4: PartitionFilter<T>,
  f5: PartitionFilter<T>,
  f6: PartitionFilter<T>
): [T[], T[], T[], T[], T[], T[], T[]];
export function partition<T>(array: readonly T[], ...filters: PartitionFilter<T>[]): any {
  const result: T[][] = Array.from({ length: filters.length + 1 })
    .fill(null)
    .map(() => []);

  array.forEach((e, idx, arr) => {
    let i = 0;
    for (const filter of filters) {
      if (filter(e, idx, arr)) {
        result[i].push(e);
        return;
      }
      i += 1;
    }
    result[i].push(e);
  });
  return result;
}

/**
 * 根据对象属性对数组分组
 *
 * @param items - 原始数组
 * @param key - 作为分组依据的字段名
 * @param groups - 可选的初始分组对象
 * @returns 分组后的对象，key 为属性值，value 为对应元素数组
 *
 * @example
 * ```ts
 * const arr = [{type: 'a'}, {type: 'b'}, {type: 'a'}];
 * const grouped = groupBy(arr, 'type');
 *  // { a: [{type:'a'}, {type:'a'}], b: [{type:'b'}] }
 * ```
 */
export function groupBy<T>(items: T[], key: string, groups: Record<string, T[]> = {}) {
  for (const item of items) {
    const v = (item as any)[key] as string;
    groups[v] ||= [];
    groups[v].push(item);
  }
  return groups;
}

/**
 * 将字符串首字母大写
 *
 * @param str - 输入字符串
 * @returns 首字母大写后的新字符串
 *
 * @example
 * ```ts
 * capitalize('hello') // 'Hello'
 * ```
 */
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串数组拼接为自然语言形式
 *
 * @param array - 字符串数组
 * @param glue - 连接符，默认 `", "`
 * @param finalGlue - 最后一个元素的连接符，默认 `" and "`
 * @returns 拼接后的字符串
 *
 * @example
 * ```ts
 * join(['a']) // 'a'
 * join(['a', 'b']) // 'a and b'
 * join(['a', 'b', 'c']) // 'a, b and c'
 * ```
 */
export function join(array?: string[], glue = ', ', finalGlue = ' and '): string {
  if (!array || array.length === 0) return '';

  if (array.length === 1) return array[0];

  if (array.length === 2) return array.join(finalGlue);

  return `${array.slice(0, -1).join(glue)}${finalGlue}${array.slice(-1)}`;
}

/**
 * 将字符串的第一个字符大写
 *
 * @param string - 输入字符串
 * @returns 首字符大写后的字符串，如果为空则返回空字符串
 *
 * @example
 * ```ts
 * upperFirst('test') // 'Test'
 * ```
 */
export function upperFirst(string?: string) {
  return !string ? '' : string[0].toUpperCase() + string.slice(1);
}
