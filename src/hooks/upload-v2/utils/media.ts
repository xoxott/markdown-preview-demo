/**
 * 媒体文件处理工具函数
 */

/**
 * 获取媒体文件的时长
 *
 * @param file - 媒体文件
 * @returns 时长（秒）
 */
export function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio');
    const media = document.createElement(isAudio ? 'audio' : 'video') as HTMLMediaElement;

    media.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      media.remove();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('获取媒体时长超时'));
    }, 10000); // 10秒超时

    media.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(media.duration);
    };

    media.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('无法读取媒体文件时长'));
    };

    media.src = url;
  });
}

/**
 * 获取视频的分辨率
 *
 * @param file - 视频文件
 * @returns 分辨率对象 { width, height }
 */
export function getVideoResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      cleanup();
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('无法读取视频分辨率'));
    };

    video.src = url;
  });
}

