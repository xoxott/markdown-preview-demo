/** spark-md5 类型声明文件 由于官方没有提供 @types/spark-md5，这里手动定义类型 */

declare module 'spark-md5' {
  /** SparkMD5 哈希类 */
  class SparkMD5 {
    constructor();

    /**
     * 追加字符串数据
     *
     * @param str - 要追加的字符串
     */
    append(str: string): void;

    /**
     * 追加二进制数据
     *
     * @param arr - 要追加的 ArrayBuffer
     */
    appendBinary(arr: globalThis.ArrayBuffer | string): void;

    /**
     * 完成哈希计算并返回十六进制字符串
     *
     * @param raw - 如果为 true，返回原始二进制字符串
     */
    end(raw?: boolean): string;

    /** 重置哈希状态 */
    reset(): void;

    /** 获取当前状态 */
    getState(): SparkMD5.State;

    /**
     * 设置状态
     *
     * @param state - 要设置的状态
     */
    setState(state: SparkMD5.State): void;

    /** 销毁实例 */
    destroy(): void;
  }

  namespace SparkMD5 {
    /** 状态接口 */
    interface State {
      buff: Uint8Array;
      length: number;
      hash: number[];
    }

    /** ArrayBuffer 哈希类 */
    class ArrayBuffer {
      constructor();

      /**
       * 追加 ArrayBuffer 数据
       *
       * @param arr - 要追加的 ArrayBuffer
       */
      append(arr: globalThis.ArrayBuffer): void;

      /**
       * 完成哈希计算并返回十六进制字符串
       *
       * @param raw - 如果为 true，返回原始二进制字符串
       */
      end(raw?: boolean): string;

      /** 重置哈希状态 */
      reset(): void;

      /** 获取当前状态 */
      getState(): State;

      /**
       * 设置状态
       *
       * @param state - 要设置的状态
       */
      setState(state: State): void;

      /** 销毁实例 */
      destroy(): void;
    }

    /**
     * 直接计算字符串的 MD5 哈希
     *
     * @param str - 要计算哈希的字符串
     * @param raw - 如果为 true，返回原始二进制字符串
     */
    function hash(str: string, raw?: boolean): string;

    /**
     * 直接计算 ArrayBuffer 的 MD5 哈希
     *
     * @param arr - 要计算哈希的 ArrayBuffer
     * @param raw - 如果为 true，返回原始二进制字符串
     */
    function hashBinary(arr: globalThis.ArrayBuffer | string, raw?: boolean): string;
  }

  export = SparkMD5;
}
