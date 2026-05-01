/** SSRF 防护测试 */

import { describe, expect, it } from 'vitest';
import { isPrivateIp } from '../utils/ssrfGuard';

describe('isPrivateIp', () => {
  describe('IPv4 私有地址', () => {
    it('应阻断 10.0.0.0/8 (A类私有)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('应阻断 172.16.0.0/12 (B类私有)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('172.20.10.5')).toBe(true);
    });

    it('应允许 172.15.x.x 和 172.32.x.x (非B类私有)', () => {
      expect(isPrivateIp('172.15.0.1')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);
    });

    it('应阻断 192.168.0.0/16 (C类私有)', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('应阻断 169.254.0.0/16 (链路本地)', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
    });

    it('应阻断 100.64.0.0/10 (CGN)', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
    });

    it('应阻断 0.0.0.0/8 (保留)', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('0.0.0.1')).toBe(true);
    });
  });

  describe('IPv4 loopback', () => {
    it('应允许 127.0.0.0/8 (loopback)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(false);
      expect(isPrivateIp('127.255.255.255')).toBe(false);
    });
  });

  describe('IPv4-mapped IPv6', () => {
    it('应阻断 ::ffff:10.x (IPv4-mapped 私有)', () => {
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    });

    it('应阻断 ::ffff:192.168.x (IPv4-mapped 私有)', () => {
      expect(isPrivateIp('::ffff:192.168.0.1')).toBe(true);
    });

    it('应允许 ::ffff:127.0.0.1 (IPv4-mapped loopback)', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(false);
    });
  });

  describe('IPv6', () => {
    it('应允许 ::1 (IPv6 loopback)', () => {
      expect(isPrivateIp('::1')).toBe(false);
    });

    it('应阻断 fc00::/7 (RFC 4193 unique local)', () => {
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd00::1')).toBe(true);
      expect(isPrivateIp('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    });
  });

  describe('公网 IP 和域名', () => {
    it('应允许公网 IP', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('203.0.113.1')).toBe(false);
    });

    it('域名不做阻断', () => {
      expect(isPrivateIp('example.com')).toBe(false);
      expect(isPrivateIp('localhost.localdomain')).toBe(false);
    });
  });
});
