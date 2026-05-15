/** 生成本地 SVG 缩略图 data URI，用于 mock 数据（不依赖外网占位图服务） */
export function mockThumbnail(hexColor: string, label = ''): string {
  const fill = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="${fill}"/>${label ? `<text x="75" y="82" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="11" font-family="system-ui,sans-serif">${label}</text>` : ''}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
