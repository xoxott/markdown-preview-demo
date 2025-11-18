import { ref, computed } from 'vue';
import type { FileMetadata } from '../types/file-explorer';

/**
 * 文件元数据管理 Hook
 * 
 * 管理文件的标签和备注数据，使用内存存储
 * 可选：支持 localStorage 持久化（后续扩展）
 */
export function useFileMetadata() {
  // 使用 Map 存储文件 ID 到元数据的映射
  const metadataMap = ref<Map<string, FileMetadata>>(new Map());

  /**
   * 获取文件的元数据
   * @param fileId 文件 ID
   * @returns 元数据对象，如果不存在则返回默认值
   */
  const getMetadata = (fileId: string): FileMetadata => {
    const existing = metadataMap.value.get(fileId);
    if (existing) {
      return existing;
    }
    // 返回默认值
    return {
      fileId,
      tags: [],
      notes: ''
    };
  };

  /**
   * 获取文件的标签
   * @param fileId 文件 ID
   * @returns 标签数组
   */
  const getTags = (fileId: string): string[] => {
    return getMetadata(fileId).tags;
  };

  /**
   * 获取文件的备注
   * @param fileId 文件 ID
   * @returns 备注文本
   */
  const getNotes = (fileId: string): string => {
    return getMetadata(fileId).notes;
  };

  /**
   * 设置文件的标签
   * @param fileId 文件 ID
   * @param tags 标签数组
   */
  const setTags = (fileId: string, tags: string[]) => {
    const metadata = getMetadata(fileId);
    metadata.tags = [...tags]; // 创建新数组避免引用问题
    metadataMap.value.set(fileId, metadata);
  };

  /**
   * 设置文件的备注
   * @param fileId 文件 ID
   * @param notes 备注文本
   */
  const setNotes = (fileId: string, notes: string) => {
    const metadata = getMetadata(fileId);
    metadata.notes = notes;
    metadataMap.value.set(fileId, metadata);
  };

  /**
   * 添加标签
   * @param fileId 文件 ID
   * @param tag 标签文本
   */
  const addTag = (fileId: string, tag: string) => {
    if (!tag || tag.trim() === '') return;
    const metadata = getMetadata(fileId);
    const trimmedTag = tag.trim();
    // 避免重复标签
    if (!metadata.tags.includes(trimmedTag)) {
      metadata.tags.push(trimmedTag);
      metadataMap.value.set(fileId, metadata);
    }
  };

  /**
   * 移除标签
   * @param fileId 文件 ID
   * @param tag 标签文本
   */
  const removeTag = (fileId: string, tag: string) => {
    const metadata = getMetadata(fileId);
    metadata.tags = metadata.tags.filter(t => t !== tag);
    metadataMap.value.set(fileId, metadata);
  };

  /**
   * 清除文件的所有元数据
   * @param fileId 文件 ID
   */
  const clearMetadata = (fileId: string) => {
    metadataMap.value.delete(fileId);
  };

  /**
   * 获取所有文件的元数据
   * @returns 元数据数组
   */
  const getAllMetadata = computed(() => {
    return Array.from(metadataMap.value.values());
  });

  /**
   * 清除所有元数据
   */
  const clearAllMetadata = () => {
    metadataMap.value.clear();
  };

  return {
    // 状态
    metadataMap: computed(() => metadataMap.value),

    // 方法
    getMetadata,
    getTags,
    getNotes,
    setTags,
    setNotes,
    addTag,
    removeTag,
    clearMetadata,
    getAllMetadata,
    clearAllMetadata
  };
}

