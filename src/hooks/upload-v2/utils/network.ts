/**
 * 网络相关工具函数
 */

// ==================== 浏览器检测 ====================
/** 检测是否为 Safari 锁定模式 Safari 浏览器开启锁定模式无法获取到文件对象 */
export function isSafariLockMode(): boolean {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const fileReaderMissing = typeof FileReader === 'undefined';
  return isSafari && fileReaderMissing;
}

/** 检测浏览器类型 */
export function detectBrowser(): {
  name: string;
  version: string;
  isMobile: boolean;
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
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return { name, version, isMobile };
}

