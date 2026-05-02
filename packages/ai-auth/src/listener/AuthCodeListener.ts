/**
 * AuthCodeListener — OAuth回调本地HTTP服务器
 *
 * 对齐Claude Code services/oauth/auth-code-listener.ts。 在localhost上创建临时HTTP服务器监听OAuth授权码回调。
 *
 * 流程：
 *
 * 1. start() → 在指定/随机端口启动HTTP服务器
 * 2. waitForAuthorization(state, onReady) → 等待浏览器回调带授权码
 * 3. 收到code → 验证state → 返回authorizationCode
 * 4. close() → 关闭服务器
 */

import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StateMismatchError } from '../errors/auth-errors';

/** AuthCodeListener状态 */
type ListenerState = 'idle' | 'listening' | 'waiting' | 'completed' | 'error';

/**
 * AuthCodeListener — 临时localhost HTTP服务器捕获OAuth授权码
 *
 * 当用户在浏览器中授权后，OAuth provider重定向到： http://localhost:[port]/callback?code=AUTH_CODE&state=STATE
 *
 * 本服务器捕获该重定向并提取授权码。 注意：这不是OAuth服务器，只是redirect捕获机制。
 */
export class AuthCodeListener {
  private server: Server;
  private port: number = 0;
  private state: ListenerState = 'idle';
  private resolver: ((authorizationCode: string) => void) | null = null;
  private rejecter: ((error: Error) => void) | null = null;
  private expectedState: string | null = null;
  private pendingResponse: ServerResponse | null = null;
  private readonly callbackPath: string;
  private readonly handleRequestBound: (req: IncomingMessage, res: ServerResponse) => void;

  constructor(callbackPath: string = '/callback') {
    this.callbackPath = callbackPath;
    this.handleRequestBound = this.handleRequest.bind(this);
    this.server = createServer(this.handleRequestBound);
  }

  /** 当前状态 */
  readonly getState = (): ListenerState => this.state;

  /** 获取监听端口 */
  readonly getPort = (): number => this.port;

  /** 是否有pending响应（用于判断是自动还是手动流程） */
  readonly hasPendingResponse = (): boolean => this.pendingResponse !== null;

  /**
   * 启动HTTP服务器 — 在指定端口或OS分配的端口上监听
   *
   * @param port 可选特定端口，默认0让OS分配
   */
  async start(port?: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.server.once('error', err => {
        this.state = 'error';
        reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
      });

      this.server.listen(port ?? 0, 'localhost', () => {
        const address = this.server.address() as AddressInfo;
        this.port = address.port;
        this.state = 'listening';
        resolve(this.port);
      });
    });
  }

  /**
   * 等待授权码 — 设置请求处理器并等待浏览器回调
   *
   * @param state OAuth state参数（CSRF防护）
   * @param onReady 服务器准备好后调用的回调（如打开浏览器）
   */
  async waitForAuthorization(state: string, onReady: () => Promise<void>): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.resolver = resolve;
      this.rejecter = reject;
      this.expectedState = state;
      this.state = 'waiting';

      this.server.on('error', err => {
        this.reject(err);
        this.close();
      });

      // 服务器已经在监听，立即调用onReady
      // eslint-disable-next-line no-void
      void onReady();
    });
  }

  /** 处理成功重定向 — 发送302到成功页面 */
  handleSuccessRedirect(successUrl: string): void {
    if (!this.pendingResponse) return;
    this.pendingResponse.writeHead(302, { Location: successUrl });
    this.pendingResponse.end();
    this.pendingResponse = null;
  }

  /** 处理错误重定向 — 发送302到错误页面 */
  handleErrorRedirect(errorUrl: string): void {
    if (!this.pendingResponse) return;
    this.pendingResponse.writeHead(302, { Location: errorUrl });
    this.pendingResponse.end();
    this.pendingResponse = null;
  }

  /** 处理HTTP请求 — 检查callback路径并提取授权码 */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

    if (parsedUrl.pathname !== this.callbackPath) {
      res.writeHead(404);
      res.end();
      return;
    }

    const authCode = parsedUrl.searchParams.get('code') ?? undefined;
    const state = parsedUrl.searchParams.get('state') ?? undefined;
    const error = parsedUrl.searchParams.get('error');
    const errorDescription = parsedUrl.searchParams.get('error_description') ?? '';

    // OAuth错误响应
    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `<h1>Authentication Error</h1><p>${error}: ${errorDescription}</p><p>You can close this window.</p>`
      );
      this.reject(new Error(`OAuth error: ${error} - ${errorDescription}`));
      return;
    }

    // 缺少授权码
    if (!authCode) {
      res.writeHead(400);
      res.end('Authorization code not found');
      this.reject(new Error('No authorization code received'));
      return;
    }

    // State验证（CSRF防护）
    if (state !== this.expectedState) {
      res.writeHead(400);
      res.end('Invalid state parameter');
      this.reject(new StateMismatchError());
      return;
    }

    // 成功 — 保存response用于后续重定向
    this.pendingResponse = res;
    this.state = 'completed';
    this.resolve(authCode);
  }

  private resolve(code: string): void {
    if (this.resolver) {
      this.resolver(code);
      this.resolver = null;
      this.rejecter = null;
    }
  }

  private reject(error: Error): void {
    if (this.rejecter) {
      this.rejecter(error);
      this.resolver = null;
      this.rejecter = null;
    }
  }

  /** 关闭服务器 */
  close(): void {
    if (this.pendingResponse) {
      this.pendingResponse.writeHead(200, { 'Content-Type': 'text/html' });
      this.pendingResponse.end(
        '<h1>Authentication cancelled</h1><p>You can close this window.</p>'
      );
      this.pendingResponse = null;
    }

    this.server.removeAllListeners();
    this.server.close();
    this.state = 'idle';
    this.resolver = null;
    this.rejecter = null;
  }
}
