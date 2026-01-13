// @unocss-include
import { getRgb } from '@suga/color';
import { DARK_CLASS } from '@/constants/app';
import { localStg } from '@/utils/storage';
import { toggleHtmlClass } from '@/utils/common';
import systemLogo from '@/assets/svg-icon/logo.svg?raw';
import { $t } from '@/locales';

export function setupLoading() {
  const themeColor = localStg.get('themeColor') || '#646cff';
  const darkMode = localStg.get('darkMode') || false;
  const { r, g, b } = getRgb(themeColor);

  const primaryColor = `--primary-color: ${r} ${g} ${b}`;

  if (darkMode) {
    toggleHtmlClass(DARK_CLASS).add();
  }

  const logoWithClass = systemLogo.replace('<svg', `<svg class="size-80px text-primary" style="filter: drop-shadow(0 4px 20px rgba(${r}, ${g}, ${b}, 0.4)); animation: float 3s ease-in-out infinite;"`);

  // 创建旋转圆环动画
  const spinnerRings = `
    <div class="relative" style="width: 120px; height: 120px;">
      <!-- 外圈 -->
      <div style="position: absolute; inset: 0; border: 3px solid transparent; border-top-color: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: spin 1.5s linear infinite;"></div>
      <!-- 中圈 -->
      <div style="position: absolute; inset: 12px; border: 3px solid transparent; border-right-color: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: spin 2s linear infinite reverse;"></div>
      <!-- 内圈 -->
      <div style="position: absolute; inset: 24px; border: 3px solid transparent; border-bottom-color: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: spin 2.5s linear infinite;"></div>
      <!-- 中心脉冲点 -->
      <div style="position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; margin: -10px 0 0 -10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; box-shadow: 0 0 20px rgba(${r}, ${g}, ${b}, 0.6); animation: pulse 1.5s ease-in-out infinite;"></div>
    </div>
  `;

  // 创建粒子点动画
  const particles = `
    <div style="display: flex; align-items: center; gap: 12px; margin-top: 32px;">
      <div style="width: 10px; height: 10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite;"></div>
      <div style="width: 10px; height: 10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite 0.2s;"></div>
      <div style="width: 10px; height: 10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite 0.4s;"></div>
      <div style="width: 10px; height: 10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite 0.6s;"></div>
      <div style="width: 10px; height: 10px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite 0.8s;"></div>
    </div>
  `;

  const loading = `
<div class="fixed inset-0 flex flex-col items-center justify-center bg-layout" style="${primaryColor}">
  <!-- 背景装饰圆 -->
  <div class="absolute inset-0 overflow-hidden opacity-50">
    <div style="position: absolute; top: 20%; right: 15%; width: 400px; height: 400px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; filter: blur(120px); opacity: 0.2; animation: float 8s ease-in-out infinite;"></div>
    <div style="position: absolute; bottom: 20%; left: 15%; width: 400px; height: 400px; background: rgb(${r}, ${g}, ${b}); border-radius: 50%; filter: blur(120px); opacity: 0.2; animation: float 8s ease-in-out infinite 2s;"></div>
  </div>

  <!-- 主内容区 -->
  <div class="relative z-10 flex flex-col items-center">
    <!-- Logo -->
    <div style="margin-bottom: 40px;">
      ${logoWithClass}
    </div>

    <!-- 旋转圆环动画 -->
    ${spinnerRings}

    <!-- 标题 -->
    <h2 style="font-size: 24px; font-weight: 600; color: rgb(${r}, ${g}, ${b}); margin-top: 40px; margin-bottom: 8px; text-align: center; text-shadow: 0 2px 10px rgba(${r}, ${g}, ${b}, 0.3);">${$t('system.title')}</h2>
    <p style="font-size: 14px; color: ${darkMode ? 'rgba(156, 163, 175, 1)' : 'rgba(107, 114, 128, 1)'}; text-align: center;">正在加载，请稍候...</p>

    <!-- 粒子点动画 -->
    ${particles}
  </div>
</div>

<style>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  33% {
    transform: translateY(-20px) rotate(5deg);
  }
  66% {
    transform: translateY(10px) rotate(-5deg);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  40% {
    transform: scale(1.3);
    opacity: 1;
  }
}
</style>`;

  const app = document.getElementById('app');

  if (app) {
    app.innerHTML = loading;
  }
}
