export interface MenuItem {
  title: string
  anchor: string
  level: number
  children?: MenuItem[]
  docPath?: string // 对应的文档路径，用于动态导入
  content?: string // 缓存的内容
}

export interface TableItem {
  module: string
  description: string
  docPath: string
}

export class MarkdownMenuExtractor {
  
  /**
   * 从 Markdown 内容中提取菜单结构
   */
  extractMenuFromMarkdown(content: string): MenuItem[] {
    const lines = content.split('\n')
    const menu: MenuItem[] = []
    const stack: MenuItem[] = []
    
    for (const line of lines) {
      // 匹配标题：# ## ### 等
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const anchor = this.titleToAnchor(title)
        
        const item: MenuItem = {
          title,
          anchor,
          level,
          children: []
        }
        
        // 根据层级构建树形结构
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }
        
        if (stack.length === 0) {
          menu.push(item)
        } else {
          const parent = stack[stack.length - 1]
          if (!parent.children) parent.children = []
          parent.children.push(item)
        }
        
        stack.push(item)
      }
    }
    
    return menu
  }
  
  /**
   * 从 TypeDoc 生成的模块表格中提取菜单
   */
  extractModulesFromTable(content: string): TableItem[] {
    const modules: TableItem[] = []
    const lines = content.split('\n')
    
    let inTable = false
    let headerPassed = false
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // 检测表格开始
      if (trimmedLine.startsWith('| Module |')) {
        inTable = true
        continue
      }
      
      // 跳过表格分隔符
      if (inTable && trimmedLine.startsWith('| ------ |')) {
        headerPassed = true
        continue
      }
      
      // 解析表格内容
      if (inTable && headerPassed && trimmedLine.startsWith('|')) {
        const columns = trimmedLine.split('|').map(col => col.trim()).filter(col => col)
        
        if (columns.length >= 2) {
          const moduleCell = columns[0]
          const description = columns[1] || '-'
          
          // 提取模块名和链接
          const linkMatch = moduleCell.match(/\[([^\]]+)\]\(([^)]+)\)/)
          if (linkMatch) {
            const moduleName = linkMatch[1]
            const docPath = linkMatch[2].replace(/^\/docs\//, '').replace(/\.md$/, '')
            
            modules.push({
              module: moduleName,
              description,
              docPath
            })
          }
        }
      }
      
      // 表格结束
      if (inTable && trimmedLine && !trimmedLine.startsWith('|')) {
        break
      }
    }
    
    return modules
  }
  
  /**
   * 根据锚点分割内容
   */
  splitContentByAnchors(content: string): Record<string, string> {
    const sections: Record<string, string> = {}
    const lines = content.split('\n')
    
    let currentSection = 'overview' // 默认概览部分
    let currentContent: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headingMatch) {
        // 保存之前的部分
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        
        // 开始新的部分
        const title = headingMatch[2].trim()
        currentSection = this.titleToAnchor(title)
        currentContent = [line] // 包含标题本身
      } else {
        currentContent.push(line)
      }
    }
    
    // 保存最后一个部分
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }
    
    return sections
  }
  
  /**
   * 将标题转换为锚点ID
   */
  titleToAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格转连字符
      .replace(/-+/g, '-') // 多个连字符合并
      .trim()
  }
  
  /**
   * 生成导航菜单配置（用于 Naive UI 等组件）
   */
  generateNavConfig(menuItems: MenuItem[]): any[] {
    return menuItems.map(item => ({
      label: item.title,
      key: item.anchor,
      children: item.children && item.children.length > 0 
        ? this.generateNavConfig(item.children)
        : undefined
    }))
  }
  
  /**
   * 生成模块菜单配置
   */
  generateModuleNavConfig(modules: TableItem[]): any[] {
    return modules.map(module => ({
      label: module.module,
      key: module.docPath,
      description: module.description
    }))
  }
  
  /**
   * 从完整内容中提取特定部分
   */
  extractSection(content: string, anchor: string): string {
    const sections = this.splitContentByAnchors(content)
    
    if (sections[anchor]) {
      return sections[anchor]
    }
    
    // 如果找不到指定部分，返回概览或完整内容
    return sections['overview'] || content
  }
}