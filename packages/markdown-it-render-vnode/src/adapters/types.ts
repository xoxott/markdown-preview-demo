/**
 * 适配器类型定义
 *
 * @module adapters/types
 */

/** 框架无关的虚拟节点类型 */
export type FrameworkNode = unknown;

/** 框架无关的组件类型 */
export type FrameworkComponent = unknown;

/** 属性对象类型 */
export type NodeProps = Record<string, unknown>;

/** 子节点类型 */
export type NodeChildren = FrameworkNode | string | number | null | undefined | (FrameworkNode | string | number | null | undefined)[];

/**
 * 框架适配器接口
 *
 * 定义统一的接口，用于在不同框架（Vue、React）中创建虚拟节点
 * 
 * @example
 * ```typescript
 * // 自定义适配器示例
 * const myAdapter: FrameworkAdapter = {
 *   createElement: (tag, props, children) => {
 *     // 实现元素创建逻辑
 *   },
 *   createText: (text) => {
 *     // 实现文本节点创建逻辑
 *   },
 *   createFragment: (children) => {
 *     // 实现片段创建逻辑
 *   },
 *   createComment: () => {
 *     // 实现注释节点创建逻辑
 *   }
 * };
 * ```
 */
export interface FrameworkAdapter {
  /**
   * 创建元素节点
   *
   * @param tag - 标签名或组件
   * @param props - 属性对象
   * @param children - 子节点
   * @returns 框架虚拟节点
   */
  createElement(tag: string | FrameworkComponent, props: NodeProps | null, children: NodeChildren): FrameworkNode;

  /**
   * 创建文本节点
   *
   * @param text - 文本内容
   * @returns 框架虚拟节点或字符串
   */
  createText(text: string): FrameworkNode | string;

  /**
   * 创建片段节点
   *
   * @param children - 子节点数组
   * @returns 框架虚拟节点
   */
  createFragment(children: FrameworkNode[]): FrameworkNode;

  /**
   * 创建注释节点
   *
   * @returns 框架虚拟节点或 null
   */
  createComment(): FrameworkNode | null;

  /**
   * 判断是否为片段节点（可选）
   *
   * @param node - 节点
   * @returns 是否为片段
   */
  isFragment?(node: FrameworkNode): boolean;

  /**
   * 获取节点的子节点（可选）
   *
   * @param node - 节点
   * @returns 子节点数组
   */
  getChildren?(node: FrameworkNode): FrameworkNode[];

  /**
   * 设置节点的子节点（可选）
   *
   * @param node - 节点
   * @param children - 子节点数组
   */
  setChildren?(node: FrameworkNode, children: FrameworkNode[]): void;
}

