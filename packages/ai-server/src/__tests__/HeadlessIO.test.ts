/** @suga/ai-server — NodeHeadlessIO测试 */

import { describe, expect, it } from 'vitest';
import { NodeHeadlessIO } from '../io/HeadlessIO';
import { PassThrough } from 'node:stream';

describe('NodeHeadlessIO', () => {
  it('readMessage → 读取JSON消息', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    input.write(JSON.stringify({ type: 'user', message: 'hello' }) + '\n');

    const msg = await io.readMessage();
    expect(msg).toEqual({ type: 'user', message: 'hello' });

    io.close();
  });

  it('readMessage(多条) → 逐条返回', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    input.write(JSON.stringify({ type: 'msg1' }) + '\n');
    input.write(JSON.stringify({ type: 'msg2' }) + '\n');

    const msg1 = await io.readMessage();
    expect(msg1).toEqual({ type: 'msg1' });

    const msg2 = await io.readMessage();
    expect(msg2).toEqual({ type: 'msg2' });

    io.close();
  });

  it('writeMessage → 写入JSON到输出流', () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on('data', (chunk: string) => chunks.push(chunk));

    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    io.writeMessage({ type: 'assistant', content: 'response' });
    expect(chunks.length).toBeGreaterThan(0);
    const parsed = JSON.parse(chunks.join('').trim());
    expect(parsed.type).toBe('assistant');

    io.close();
  });

  it('writeError → 写入错误到stderr', () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const errorStream = new PassThrough();
    const errors: string[] = [];
    errorStream.on('data', (chunk: string) => errors.push(chunk));

    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream
    });

    io.writeError('Something went wrong');
    expect(errors.join('')).toContain('Something went wrong');

    io.close();
  });

  it('close → 标记为closed', () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    io.close();
    expect(io.closed).toBe(true);
  });

  it('readMessage(非JSON输入) → 包装为raw_input', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    input.write('plain text input\n');

    const msg = await io.readMessage();
    expect(msg).toEqual({ type: 'raw_input', content: 'plain text input' });

    io.close();
  });

  it('readMessage(stream关闭后) → 返回null', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const io = new NodeHeadlessIO({
      inputStream: input,
      outputStream: output,
      errorStream: new PassThrough()
    });

    input.end(); // 关闭输入流

    const msg = await io.readMessage();
    expect(msg).toBeNull();
  });
});