/**
 * 统计信息管理器
 * 负责收集和分析上传历史统计信息
 */
import type { FileTask } from '../types';
import { UploadStatus } from '../types';

/** 历史统计信息 */
export interface HistoryStats {
  date: string; // YYYY-MM-DD
  totalFiles: number;
  totalSize: number;
  successFiles: number;
  failedFiles: number;
  averageSpeed: number; // KB/s
  totalTime: number; // seconds
}

/** 趋势分析 */
export interface TrendAnalysis {
  speedTrend: 'increasing' | 'stable' | 'decreasing';
  successRate: number;
  averageSpeed: number;
  peakSpeed: number;
  recentStats: HistoryStats[];
}

/**
 * 统计信息管理器
 */
export class StatsManager {
  private history: HistoryStats[] = [];
  private readonly maxHistoryDays = 30; // 保留 30 天历史

  /**
   * 记录任务完成
   */
  recordTaskCompletion(task: FileTask, uploadTime: number): void {
    const today = new Date().toISOString().split('T')[0];
    let todayStats = this.history.find(s => s.date === today);

    if (!todayStats) {
      todayStats = {
        date: today,
        totalFiles: 0,
        totalSize: 0,
        successFiles: 0,
        failedFiles: 0,
        averageSpeed: 0,
        totalTime: 0
      };
      this.history.push(todayStats);
    }

    todayStats.totalFiles++;
    todayStats.totalSize += task.file.size;
    todayStats.totalTime += uploadTime;

    if (task.status === UploadStatus.SUCCESS) {
      todayStats.successFiles++;
    } else if (task.status === UploadStatus.ERROR) {
      todayStats.failedFiles++;
    }

    // 更新平均速度（加权平均）
    const currentAvgSpeed = todayStats.averageSpeed;
    const taskSpeed = task.speed || 0;
    const totalFiles = todayStats.totalFiles;

    if (totalFiles === 1) {
      todayStats.averageSpeed = taskSpeed;
    } else {
      // 加权平均：新速度占 30%，历史平均占 70%
      todayStats.averageSpeed = currentAvgSpeed * 0.7 + taskSpeed * 0.3;
    }

    // 清理旧历史
    this.cleanupHistory();
  }

  /**
   * 获取今日统计
   */
  getTodayStats(): HistoryStats | null {
    const today = new Date().toISOString().split('T')[0];
    return this.history.find(s => s.date === today) || null;
  }

  /**
   * 获取历史统计
   */
  getHistoryStats(days: number = 7): HistoryStats[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    return this.history.filter(s => s.date >= cutoffDateStr).slice(-days);
  }

  /**
   * 获取趋势分析
   */
  getTrendAnalysis(days: number = 7): TrendAnalysis {
    const recentStats = this.getHistoryStats(days);

    if (recentStats.length === 0) {
      return {
        speedTrend: 'stable',
        successRate: 0,
        averageSpeed: 0,
        peakSpeed: 0,
        recentStats: []
      };
    }

    // 计算成功率
    const totalFiles = recentStats.reduce((sum, s) => sum + s.totalFiles, 0);
    const successFiles = recentStats.reduce((sum, s) => sum + s.successFiles, 0);
    const successRate = totalFiles > 0 ? (successFiles / totalFiles) * 100 : 0;

    // 计算平均速度
    const totalSize = recentStats.reduce((sum, s) => sum + s.totalSize, 0);
    const totalTime = recentStats.reduce((sum, s) => sum + s.totalTime, 0);
    const averageSpeed = totalTime > 0 ? (totalSize / 1024) / totalTime : 0; // KB/s

    // 找出峰值速度
    const peakSpeed = Math.max(...recentStats.map(s => s.averageSpeed), 0);

    // 分析速度趋势
    let speedTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentStats.length >= 2) {
      const firstHalf = recentStats.slice(0, Math.floor(recentStats.length / 2));
      const secondHalf = recentStats.slice(Math.floor(recentStats.length / 2));

      const firstAvg = firstHalf.reduce((sum, s) => sum + s.averageSpeed, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.averageSpeed, 0) / secondHalf.length;

      const change = (secondAvg - firstAvg) / firstAvg;
      if (change > 0.1) {
        speedTrend = 'increasing';
      } else if (change < -0.1) {
        speedTrend = 'decreasing';
      }
    }

    return {
      speedTrend,
      successRate,
      averageSpeed,
      peakSpeed,
      recentStats
    };
  }

  /**
   * 清理旧历史
   */
  private cleanupHistory(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    this.history = this.history.filter(s => s.date >= cutoffDateStr);
  }

  /**
   * 清空所有统计
   */
  clear(): void {
    this.history = [];
  }
}

