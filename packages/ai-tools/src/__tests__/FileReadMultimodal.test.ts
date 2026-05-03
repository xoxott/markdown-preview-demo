/** P72 测试 — FileRead多模态(图片+PDF页范围+notebook解析) */

import { describe, expect, it } from 'vitest';
import {
  readImageFile,
  parsePdfPageRange,
  readPdfFile,
  parseNotebook
} from '../tools/file-read-multimodal';

// ============================================================
// 图片读取
// ============================================================

describe('readImageFile — 基本读取', () => {
  it('读取PNG → base64+mimeType', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]); // PNG header bytes
    const result = readImageFile('/test.png', buffer, 'image/png');
    expect(result.mimeType).toBe('image/png');
    expect(result.base64.length).toBeGreaterThan(0);
    expect(result.resized).toBe(false);
    expect(result.byteSize).toBe(buffer.length);
  });

  it('读取JPEG → base64', () => {
    const buffer = Buffer.from('fake jpeg data');
    const result = readImageFile('/photo.jpg', buffer, 'image/jpeg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.resized).toBe(false);
  });

  it('无resizeProvider → 原始base64', () => {
    const buffer = Buffer.from('image data here');
    const result = readImageFile('/img.png', buffer, 'image/png', { maxWidth: 100 });
    expect(result.resized).toBe(false);
  });

  it('resizeProvider → resized结果', () => {
    const buffer = Buffer.from('large image');
    const mockResize = () => ({
      base64: 'resized_base64',
      width: 800,
      height: 600,
      byteSize: 5000
    });
    const result = readImageFile('/big.png', buffer, 'image/png', { maxWidth: 800 }, mockResize);
    expect(result.resized).toBe(true);
    expect(result.resizedWidth).toBe(800);
    expect(result.resizedHeight).toBe(600);
    expect(result.base64).toBe('resized_base64');
  });
});

// ============================================================
// PDF页范围解析
// ============================================================

describe('parsePdfPageRange', () => {
  it('"1-5" → [1,2,3,4,5]', () => {
    expect(parsePdfPageRange('1-5', 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('"3" → [3]', () => {
    expect(parsePdfPageRange('3', 10)).toEqual([3]);
  });

  it('"1,3,5" → [1,3,5]', () => {
    expect(parsePdfPageRange('1,3,5', 10)).toEqual([1, 3, 5]);
  });

  it('"1-3,8,10-12" → [1,2,3,8,10,11,12]', () => {
    expect(parsePdfPageRange('1-3,8,10-12', 15)).toEqual([1, 2, 3, 8, 10, 11, 12]);
  });

  it('超范围 → 截断到总页数', () => {
    expect(parsePdfPageRange('8-15', 10)).toEqual([8, 9, 10]);
  });

  it('无效页码(0,-1) → 忽略', () => {
    expect(parsePdfPageRange('0,5', 10)).toEqual([5]);
  });

  it('空字符串 → []', () => {
    expect(parsePdfPageRange('', 10)).toEqual([]);
  });
});

describe('readPdfFile — 基本读取', () => {
  it('无pdfProvider → 空文本+元数据', () => {
    const buffer = Buffer.from('fake pdf');
    const result = readPdfFile(buffer, '1-3', 10);
    expect(result.totalPages).toBe(10);
    expect(result.pageRangeApplied).toBe(true);
    expect(result.pages.length).toBe(3);
    expect(result.pages[0].text).toContain('requires pdfProvider');
  });

  it('pdfProvider → 完整文本提取', () => {
    const buffer = Buffer.from('pdf data');
    const mockPdfProvider = (_buf: Buffer, pages: readonly number[]) => {
      return pages.map(num => ({
        pageNumber: num,
        text: `Page ${num} content`
      }));
    };
    const result = readPdfFile(buffer, '1-3', 5, mockPdfProvider);
    expect(result.pages.length).toBe(3);
    expect(result.pages[0].text).toBe('Page 1 content');
  });

  it('无页范围 → 全页', () => {
    const buffer = Buffer.from('pdf');
    const result = readPdfFile(buffer, undefined, 5);
    expect(result.pages.length).toBe(5);
    expect(result.pageRangeApplied).toBe(false);
  });
});

// ============================================================
// Notebook解析
// ============================================================

describe('parseNotebook', () => {
  it('空notebook → 0 cells', () => {
    const result = parseNotebook('{ "cells": [] }');
    expect(result.totalCells).toBe(0);
    expect(result.cells.length).toBe(0);
  });

  it('单code cell → 解析正确', () => {
    const nb = JSON.stringify({
      cells: [{
        cell_type: 'code',
        source: ['print("hello")\n'],
        execution_count: 1,
        outputs: []
      }],
      metadata: { kernelspec: { name: 'python3', language: 'python' } }
    });
    const result = parseNotebook(nb);
    expect(result.totalCells).toBe(1);
    expect(result.cells[0].cellType).toBe('code');
    expect(result.cells[0].source).toBe('print("hello")\n');
    expect(result.cells[0].executionCount).toBe(1);
    expect(result.kernelInfo?.name).toBe('python3');
  });

  it('markdown cell → 无outputs', () => {
    const nb = JSON.stringify({
      cells: [{
        cell_type: 'markdown',
        source: '# Title\n\nSome text'
      }]
    });
    const result = parseNotebook(nb);
    expect(result.cells[0].cellType).toBe('markdown');
    expect(result.cells[0].outputs).toBeUndefined();
  });

  it('code cell + stream output → text提取', () => {
    const nb = JSON.stringify({
      cells: [{
        cell_type: 'code',
        source: 'print("hi")',
        execution_count: 2,
        outputs: [{
          output_type: 'stream',
          name: 'stdout',
          text: 'hi\n'
        }]
      }]
    });
    const result = parseNotebook(nb);
    const output = result.cells[0].outputs?.[0];
    expect(output?.outputType).toBe('stream');
    expect(output?.text).toBe('hi\n');
  });

  it('code cell + error output → traceback', () => {
    const nb = JSON.stringify({
      cells: [{
        cell_type: 'code',
        source: 'raise ValueError("bad")',
        execution_count: 3,
        outputs: [{
          output_type: 'error',
          ename: 'ValueError',
          evalue: 'bad',
          traceback: ['Traceback...', 'ValueError: bad']
        }]
      }]
    });
    const result = parseNotebook(nb);
    const output = result.cells[0].outputs?.[0];
    expect(output?.outputType).toBe('error');
    expect(output?.errorName).toBe('ValueError');
    expect(output?.errorValue).toBe('bad');
    expect(output?.traceback?.length).toBe(2);
  });

  it('code cell + display_data + image → imageData', () => {
    const nb = JSON.stringify({
      cells: [{
        cell_type: 'code',
        source: 'plot()',
        outputs: [{
          output_type: 'display_data',
          data: {
            'text/plain': '<Figure>',
            'image/png': 'base64_png_data'
          }
        }]
      }]
    });
    const result = parseNotebook(nb);
    const output = result.cells[0].outputs?.[0];
    expect(output?.imageData).toBe('base64_png_data');
    expect(output?.imageMimeType).toBe('image/png');
    expect(output?.text).toBe('<Figure>');
  });

  it('无效JSON → 空结果', () => {
    const result = parseNotebook('not valid json');
    expect(result.totalCells).toBe(0);
    expect(result.cells.length).toBe(0);
  });
});