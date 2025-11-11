/**
 * Token 预处理模块
 * @module token-processor
 */

import type { Token, RenderEnv } from './types';
import { DOM_ATTR_NAME } from './constants';
import { getSourceLineRange, validateAttrValue } from './utils';

/**
 * 预处理 Token，添加元数据和安全检查
 * @param token - 需要处理的 Token
 * @param env - 渲染环境变量
 */
export function processToken(token: Token, env?: RenderEnv): void {
  // 初始化 meta 对象
  if (!token.meta) {
    token.meta = {};
  }
  
  // 安全模式处理
  if (env?.safeMode && token.attrs) {
    const safeAttrs: Array<[string, string]> = [];
    
    for (const [name, value] of token.attrs) {
      const lowerName = name.toLowerCase();
      
      // 验证属性值安全性
      if (validateAttrValue(lowerName, value)) {
        safeAttrs.push([name, value]);
      } else {
        // 不安全的属性，设为空值
        safeAttrs.push([name, '']);
      }
    }
    
    token.attrs = safeAttrs;
  }
  
  // 块级元素处理
  if (token.block && token.map) {
    const [lineStart, lineEnd] = getSourceLineRange(token, env);
    
    // 设置源码行号
    token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_START, String(lineStart + 1));
    token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_END, String(lineEnd + 1));
    
    // 初始化 meta.attrs
    if (!token.meta.attrs) {
      token.meta.attrs = {};
    }
    
    // 转换属性数组为对象（性能优化：使用 for 循环）
    if (token.attrs) {
      for (let i = 0; i < token.attrs.length; i++) {
        const [name, value] = token.attrs[i];
        token.meta.attrs[name] = value;
      }
    }
  }
}

/**
 * 批量预处理 Token 数组
 * @param tokens - Token 数组
 * @param env - 渲染环境
 */
export function processTokens(tokens: Token[], env?: RenderEnv): void {
  for (let i = 0; i < tokens.length; i++) {
    processToken(tokens[i], env);
    
    // 设置 Token 索引
    if (tokens[i].block) {
      tokens[i].attrSet(DOM_ATTR_NAME.TOKEN_IDX, i.toString());
    }
    
    // 递归处理子 Token
    if (tokens[i].children) {
      processTokens(tokens[i].children!, env);
    }
  }
}

