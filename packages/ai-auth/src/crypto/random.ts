/**
 * NodeCryptoProvider — CryptoProvider的Node.js真实实现
 *
 * 使用Node.js crypto模块的randomBytes + createHash。 作为宿主注入的默认实现，也可被其他实现替换（如浏览器环境的Web Crypto API）。
 */

import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import type { CryptoProvider, HashInstance } from '../provider/AuthProviderInterface';

/**
 * NodeCryptoProvider — Node.js环境下的CryptoProvider实现
 *
 * 直接使用Node.js crypto模块，无需宿主注入即可使用。 对齐Claude Code services/oauth/crypto.ts的实现。
 */
export class NodeCryptoProvider implements CryptoProvider {
  randomBytes(size: number): Buffer {
    return randomBytes(size);
  }

  createHash(algorithm: string): HashInstance {
    const hash = createHash(algorithm);
    const wrapper: HashInstance = {
      update(data: string): HashInstance {
        hash.update(data);
        return wrapper;
      },
      digest(): Buffer {
        return hash.digest();
      }
    };
    return wrapper;
  }
}
