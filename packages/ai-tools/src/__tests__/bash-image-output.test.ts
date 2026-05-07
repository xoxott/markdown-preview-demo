import { describe, expect, it } from 'vitest';
import {
  cleanImageSequences,
  detectImageOutput,
  detectIterm2Images,
  detectSixelImages,
  hasImageProtocolSupport
} from '../tools/bash-image-output';

describe('detectSixelImages', () => {
  it('detects Sixel DCS sequence', () => {
    const output = 'text\x1BPq\x1B\\more';
    const images = detectSixelImages(output);
    expect(images).toHaveLength(1);
    expect(images[0].protocol).toBe('sixel');
    expect(images[0].startOffset).toBe(4);
  });

  it('no Sixel → empty', () => {
    expect(detectSixelImages('normal text')).toHaveLength(0);
  });

  it('multiple Sixel images', () => {
    const output = '\x1BPq\x1B\\text\x1BPq\x1B\\';
    const images = detectSixelImages(output);
    expect(images).toHaveLength(2);
  });
});

describe('detectIterm2Images', () => {
  it('detects iTerm2 image sequence (BEL end)', () => {
    const output = 'text\x1B]1337;File=inline=1;base64=AAAA\x07more';
    const images = detectIterm2Images(output);
    expect(images).toHaveLength(1);
    expect(images[0].protocol).toBe('iterm2');
  });

  it('detects iTerm2 image sequence (ST end)', () => {
    const output = 'text\x1B]1337;File=inline=1;width=100\x1B\\more';
    const images = detectIterm2Images(output);
    expect(images).toHaveLength(1);
    if (images[0]) {
      expect(images[0].width).toBe(100);
    }
  });

  it('no iTerm2 → empty', () => {
    expect(detectIterm2Images('normal text')).toHaveLength(0);
  });
});

describe('detectImageOutput', () => {
  it('no images → hasImage false', () => {
    const result = detectImageOutput('normal bash output');
    expect(result.hasImage).toBe(false);
    expect(result.cleanText).toBe('normal bash output');
  });

  it('mixed Sixel+text → detected + cleaned', () => {
    const output = 'before\x1BPq\x1B\\after';
    const result = detectImageOutput(output);
    expect(result.hasImage).toBe(true);
    expect(result.images).toHaveLength(1);
    expect(result.cleanText).toBe('before[sixel image]after');
  });

  it('iTerm2 image → detected + cleaned', () => {
    const output = 'before\x1B]1337;File=inline=1\x07after';
    const result = detectImageOutput(output);
    expect(result.hasImage).toBe(true);
    expect(result.cleanText).toBe('before[iterm2 image]after');
  });
});

describe('cleanImageSequences', () => {
  it('removes image sequences', () => {
    const output = 'abc\x1BPq\x1B\\def';
    const images = detectSixelImages(output);
    const cleaned = cleanImageSequences(output, images);
    expect(cleaned).toBe('abc[sixel image]def');
  });

  it('no images → unchanged', () => {
    expect(cleanImageSequences('text only', [])).toBe('text only');
  });
});

describe('hasImageProtocolSupport', () => {
  it('iTerm2 detected', () => {
    const result = hasImageProtocolSupport('iTerm.app');
    expect(result.supported).toBe(true);
    expect(result.protocols).toContain('iterm2');
  });

  it('vt340 Sixel detected', () => {
    const result = hasImageProtocolSupport(undefined, 'vt340');
    expect(result.supported).toBe(true);
    expect(result.protocols).toContain('sixel');
  });

  it('no known terminal → not supported', () => {
    const result = hasImageProtocolSupport('unknown');
    expect(result.supported).toBe(false);
  });
});
