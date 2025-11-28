/**
 * 浏览器兼容性检测和降级方案
 */

/** 浏览器特性支持检测 */
export interface BrowserFeatures {
  fetch: boolean;
  abortController: boolean;
  fileReader: boolean;
  webWorker: boolean;
  indexedDB: boolean;
  blob: boolean;
  fileAPI: boolean;
  networkInformation: boolean;
}

/** 兼容性检测结果 */
export interface CompatibilityResult {
  supported: boolean;
  features: BrowserFeatures;
  warnings: string[];
  fallbacks: string[];
}

/**
 * 检测浏览器特性支持
 */
export function detectBrowserFeatures(): BrowserFeatures {
  return {
    fetch: typeof fetch !== 'undefined',
    abortController: typeof AbortController !== 'undefined',
    fileReader: typeof FileReader !== 'undefined',
    webWorker: typeof Worker !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    blob: typeof Blob !== 'undefined',
    fileAPI: typeof File !== 'undefined',
    networkInformation: 'connection' in navigator
  };
}

/**
 * 检查兼容性
 */
export function checkCompatibility(): CompatibilityResult {
  const features = detectBrowserFeatures();
  const warnings: string[] = [];
  const fallbacks: string[] = [];

  // 必需特性检查
  if (!features.fetch) {
    warnings.push('浏览器不支持 fetch API，将无法上传文件');
    fallbacks.push('请使用支持 fetch 的现代浏览器（Chrome 42+, Firefox 39+, Safari 10.1+）');
  }

  if (!features.abortController) {
    warnings.push('浏览器不支持 AbortController，无法取消上传请求');
    fallbacks.push('将使用替代方案，但取消功能可能不完整');
  }

  if (!features.fileReader) {
    warnings.push('浏览器不支持 FileReader，无法读取文件');
    fallbacks.push('请使用支持 FileReader 的浏览器');
  }

  if (!features.blob || !features.fileAPI) {
    warnings.push('浏览器不支持 File/Blob API，无法处理文件');
    fallbacks.push('请使用现代浏览器');
  }

  // 可选特性警告
  if (!features.webWorker) {
    warnings.push('浏览器不支持 Web Worker，MD5 计算将在主线程进行，可能影响性能');
    fallbacks.push('大文件 MD5 计算可能较慢');
  }

  if (!features.indexedDB) {
    warnings.push('浏览器不支持 IndexedDB，断点续传数据将使用内存缓存');
    fallbacks.push('页面刷新后断点续传数据可能丢失');
  }

  if (!features.networkInformation) {
    warnings.push('浏览器不支持 Network Information API，无法自动适配网络');
    fallbacks.push('网络自适应功能将被禁用');
  }

  const supported = features.fetch && features.abortController && features.fileReader && features.blob && features.fileAPI;

  return {
    supported,
    features,
    warnings,
    fallbacks
  };
}

/**
 * 获取浏览器信息
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  isMobile: boolean;
  userAgent: string;
} {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  if (ua.includes('Firefox/')) {
    name = 'Firefox';
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    name = 'Chrome';
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Edg/')) {
    name = 'Edge';
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    name = 'Opera';
    version = ua.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || 'Unknown';
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return {
    name,
    version,
    isMobile,
    userAgent: ua
  };
}

/**
 * 输出兼容性警告
 */
/**
 * 输出兼容性警告（使用 logger）
 */
export function warnCompatibility(): void {
  const result = checkCompatibility();
  const browserInfo = getBrowserInfo();

  // 尝试使用 logger，否则使用 console
  try {
    const { logger } = require('./logger');
    if (!result.supported) {
      logger.error('浏览器兼容性检查失败', {
        browser: `${browserInfo.name} ${browserInfo.version}`,
        warnings: result.warnings,
        fallbacks: result.fallbacks
      });
    } else if (result.warnings.length > 0) {
      logger.warn('浏览器兼容性警告', {
        browser: `${browserInfo.name} ${browserInfo.version}`,
        warnings: result.warnings,
        fallbacks: result.fallbacks
      });
    }
  } catch {
    // 如果 logger 不可用，使用 console
    if (!result.supported) {
      console.error('❌ 浏览器兼容性检查失败', {
        browser: `${browserInfo.name} ${browserInfo.version}`,
        warnings: result.warnings,
        fallbacks: result.fallbacks
      });
    } else if (result.warnings.length > 0) {
      console.warn('⚠️ 浏览器兼容性警告', {
        browser: `${browserInfo.name} ${browserInfo.version}`,
        warnings: result.warnings,
        fallbacks: result.fallbacks
      });
    }
  }
}

