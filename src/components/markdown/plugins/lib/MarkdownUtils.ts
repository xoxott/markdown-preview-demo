import type { Token } from 'markdown-it';
// 工具函数类
export class MarkdownUtils {
  private static htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  private static htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };

  static escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, match => this.htmlEscapeMap[match] || match);
  }

  static unescapeAll(str: string): string {
    return str.replace(/&(amp|lt|gt|quot|#39);/g, (_, code) => 
      this.htmlUnescapeMap[`&${code};`] || _
    );
  }

  static validateAttrName(name: string): boolean {
    const attrNameReg = /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/;
    const attrEventReg = /^on/i;
    return attrNameReg.test(name) && !attrEventReg.test(name);
  }

  static sanitizeAttributes(token: Token, safeMode = false): void {
    if (!safeMode || !token.attrs) return;

    const sensitiveUrlReg = /^javascript:|vbscript:|file:/i;
    const sensitiveAttrReg = /^href|src|xlink:href|poster|srcset$/i;

    token.attrs.forEach(([name, val]) => {
      const lowerName = name.toLowerCase();
      if (sensitiveAttrReg.test(lowerName) && sensitiveUrlReg.test(val)) {
        token.attrSet(name, '');
      }
      if (lowerName === 'href' && val.toLowerCase().startsWith('data:')) {
        token.attrSet(name, '');
      }
    });
  }

  static getSourceLineRange(token: Token, env?: Record<string, any>): [number, number] {
    const [lineStart, lineEnd] = token.map || [0, 1];
    let sOffset = 0;

    if (env?.macroLines && env.bMarks && env.eMarks) {
      const sPos = env.bMarks[lineStart];
      for (const { matchPos, lineOffset, posOffset, currentPosOffset } of env.macroLines) {
        if (sPos + posOffset > matchPos && sPos + posOffset - currentPosOffset > matchPos) {
          sOffset = lineOffset;
        } else {
          break;
        }
      }
    }

    return [lineStart + sOffset, lineEnd + sOffset];
  }
}