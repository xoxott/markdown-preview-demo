/**
 * 检查生产构建是否正确移除了 console 语句的脚本
 *
 * 此脚本用于验证 VITE_DROP_CONSOLE=Y 配置是否生效
 *
 * @module check-console-drop
 */

import fs from 'fs/promises';
import path from 'path';

async function checkConsoleStatements() {
  try {
    const distDir = path.resolve(process.cwd(), 'dist');

    // 检查 dist 目录是否存在
    const stat = await fs.stat(distDir);
    if (!stat.isDirectory()) {
      console.log('❌ dist 目录不存在，跳过检查');
      return;
    }

    // 递归搜索 dist 目录中的所有 JS 文件
    const jsFiles = await findJSFiles(distDir);

    let totalConsoleFound = 0;
    const filesWithConsole: string[] = [];

    for (const file of jsFiles) {
      const content = await fs.readFile(file, 'utf-8');

      // 搜索各种 console 语句
      const consoleMatches = content.match(/\bconsole\.(log|warn|error|info|debug|time|timeEnd|trace|group|groupEnd)\b/g);

      if (consoleMatches) {
        const count = consoleMatches.length;
        totalConsoleFound += count;
        filesWithConsole.push(`${file} (${count} occurrences)`);

        console.log(`🔍 Found ${count} console statements in: ${file}`);
      }
    }

    if (totalConsoleFound === 0) {
      console.log('✅ Production build successfully removed all console statements');
    } else {
      console.log(`⚠️  Found ${totalConsoleFound} console statements in ${filesWithConsole.length} files:`);
      filesWithConsole.forEach(file => console.log(`   - ${file}`));

      // 检查是否在开发模式下运行此检查（开发模式不会移除 console）
      const isProdBuild = process.env.NODE_ENV === 'production' ||
                         process.argv.some(arg => arg.includes('prod') || arg.includes('--mode') || arg.includes('production'));

      if (process.env.VITE_DROP_CONSOLE === 'Y' || isProdBuild) {
        console.log('❌ Expected console statements to be removed in production build!');
        process.exit(1);
      } else {
        console.log('ℹ️  This is expected in development builds (console statements kept for debugging)');
      }
    }

  } catch (error) {
    console.error('❌ Error checking console statements:', error);
    process.exit(1);
  }
}

async function findJSFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await findJSFiles(fullPath);
      files.push(...nestedFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// 只在直接运行此脚本时执行
if (require.main === module) {
  checkConsoleStatements();
}

export { checkConsoleStatements };