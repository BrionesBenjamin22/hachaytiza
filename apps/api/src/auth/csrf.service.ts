import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { cookieName, cookieOptions } from './cookies.js';

@Injectable()
export class CsrfService {
  readonly csrf;
  constructor(config: ConfigService) {
    this.csrf = doubleCsrf({
      getSecret: () => config.getOrThrow<string>('CSRF_SECRET'),
      getSessionIdentifier: (req) => req.cookies?.[cookieName('browser')] ?? '',
      cookieName: cookieName('csrf'),
      cookieOptions,
      getCsrfTokenFromRequest: (req) => req.get('X-CSRF-Token'),
    });
  }
  issue(req: Request, res: Response) {
    if (!req.cookies[cookieName('browser')]) {
      const nonce = randomBytes(32).toString('hex');
      req.cookies[cookieName('browser')] = nonce;
      res.cookie(cookieName('browser'), nonce, cookieOptions);
    }
    return {
      csrfToken: this.csrf.generateCsrfToken(req, res, { overwrite: true }),
    };
  }
  rotate(req: Request, res: Response) {
    const nonce = randomBytes(32).toString('hex');
    req.cookies[cookieName('browser')] = nonce;
    res.cookie(cookieName('browser'), nonce, cookieOptions);
    this.csrf.generateCsrfToken(req, res, { overwrite: true });
  }
}
