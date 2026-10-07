import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.module.js';
import { lockUserCredentials } from '../prisma/user-lock.js';
import { userDto, userSelect, UsersService } from '../users/users.service.js';
import { cookieName, cookieOptions } from './cookies.js';
import { CsrfService } from './csrf.service.js';
import { EmailService } from './email.service.js';
import type { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dto.js';

export const hashToken = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const randomToken = () => randomBytes(32).toString('hex');
const accessMs = 15 * 60 * 1000;
const refreshMs = 30 * 24 * 60 * 60 * 1000;
const jwtOptions = {
  issuer: 'hyt-api',
  audience: 'hyt-web',
  algorithm: 'HS256' as const,
};
const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;
const signedOut = (refreshAvailable = false) => ({
  authenticated: false,
  accessExpiresAt: null,
  refreshAvailable,
  user: null,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash: Promise<string>;
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly csrf: CsrfService,
    private readonly email: EmailService,
  ) {
    this.dummyHash = argon2.hash(randomToken(), passwordOptions);
  }
  async register(dto: RegisterDto, req: Request, res: Response) {
    await this.users.validateLocation(dto.primaryLocationId);
    const passwordHash = await argon2.hash(dto.password, passwordOptions);
    let user;
    try {
      user = await this.db.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          primaryLocationId: dto.primaryLocationId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'REGISTRATION_UNAVAILABLE',
          message:
            'No pudimos crear la cuenta. Revise los datos o intente iniciar sesión.',
        });
      throw error;
    }
    await this.issueEmail(user.id, user.email, 'VERIFY');
    return this.createSession(user.id, passwordHash, req, res);
  }
  async login(dto: LoginDto, req: Request, res: Response) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    const valid = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !user.passwordHash || !valid)
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'No pudimos iniciar sesión. Revise su email y contraseña.',
      });
    return this.createSession(user.id, user.passwordHash, req, res);
  }
  private async createSession(
    userId: string,
    verifiedHash: string,
    req: Request,
    res: Response,
  ) {
    const token = randomToken();
    const session = await this.db.$transaction(async (tx) => {
      const current = await lockUserCredentials(tx, userId);
      if (!current || current.passwordHash !== verifiedHash)
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'No pudimos iniciar sesión. Revise su email y contraseña.',
        });
      return tx.session.create({
        data: {
          userId,
          refreshHash: hashToken(token),
          expiresAt: new Date(Date.now() + refreshMs),
        },
      });
    });
    await this.setCookies(session.id, userId, token, req, res);
    return this.session(req);
  }
  private async setCookies(
    id: string,
    userId: string,
    refresh: string,
    req: Request,
    res: Response,
  ) {
    const access = await this.jwt.signAsync(
      { sub: userId, sid: id },
      {
        ...jwtOptions,
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );
    res.cookie(cookieName('access'), access, {
      ...cookieOptions,
      maxAge: accessMs,
    });
    res.cookie(cookieName('refresh'), refresh, {
      ...cookieOptions,
      maxAge: refreshMs,
    });
    req.cookies[cookieName('access')] = access;
    req.cookies[cookieName('refresh')] = refresh;
    this.csrf.rotate(req, res);
  }
  private async access(req: Request) {
    const token = req.cookies?.[cookieName('access')];
    if (typeof token !== 'string') return null;
    let payload: { sub: string; sid: string; exp: number };
    try {
      payload = await this.jwt.verifyAsync<{
        sub: string;
        sid: string;
        exp: number;
      }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        issuer: jwtOptions.issuer,
        audience: jwtOptions.audience,
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
    const session = await this.db.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: userSelect } },
    });
    return session ? { session, payload } : null;
  }
  async session(req: Request) {
    const access = await this.access(req);
    const refresh = req.cookies?.[cookieName('refresh')];
    const refreshAvailable =
      typeof refresh === 'string' &&
      Boolean(
        await this.db.session.findFirst({
          where: {
            refreshHash: hashToken(refresh),
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
      );
    if (!access) return signedOut(refreshAvailable);
    return {
      authenticated: true,
      accessExpiresAt: new Date(access.payload.exp * 1000).toISOString(),
      refreshAvailable,
      user: userDto(access.session.user),
    };
  }
  async requireUser(req: Request) {
    const access = await this.access(req);
    if (!access) throw new UnauthorizedException();
    return access.session.user.id;
  }
  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[cookieName('refresh')];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException();
    const hash = hashToken(token);
    const next = randomToken();
    const rotated = await this.db.$transaction(async (tx) => {
      const previous = await tx.usedRefreshToken.findUnique({
        where: { hash },
      });
      if (previous) {
        await tx.session.updateMany({
          where: { id: previous.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      const session = await tx.session.findUnique({
        where: { refreshHash: hash },
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date())
        return null;
      const updated = await tx.session.updateMany({
        where: { id: session.id, refreshHash: hash, revokedAt: null },
        data: { refreshHash: hashToken(next) },
      });
      if (updated.count !== 1) {
        await tx.session.updateMany({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      await tx.usedRefreshToken.create({
        data: { hash, sessionId: session.id, expiresAt: session.expiresAt },
      });
      return session;
    });
    if (!rotated) {
      this.clearCookies(req, res);
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Su sesión finalizó. Inicie sesión nuevamente.',
      });
    }
    await this.setCookies(rotated.id, rotated.userId, next, req, res);
    return this.session(req);
  }
  async logout(req: Request, res: Response) {
    const access = await this.access(req);
    const token = req.cookies?.[cookieName('refresh')];
    await this.db.session.updateMany({
      where: {
        OR: [
          ...(access ? [{ id: access.session.id }] : []),
          ...(typeof token === 'string'
            ? [{ refreshHash: hashToken(token) }]
            : []),
        ],
      },
      data: { revokedAt: new Date() },
    });
    this.clearCookies(req, res);
  }
  private clearCookies(req: Request, res: Response) {
    for (const part of ['access', 'refresh']) {
      res.clearCookie(cookieName(part), cookieOptions);
      delete req.cookies[cookieName(part)];
    }
    this.csrf.rotate(req, res);
  }
  async issueEmail(userId: string, email: string, kind: 'VERIFY' | 'RESET') {
    const token = randomToken();
    const record = await this.db.emailToken.create({
      data: {
        userId,
        hash: hashToken(token),
        kind,
        expiresAt: new Date(
          Date.now() +
            (kind === 'VERIFY' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000),
        ),
      },
    });
    try {
      await this.email.send(email, kind, token);
    } catch {
      this.logger.warn({ event: 'email.delivery_failed', kind });
      await this.db.emailToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
    }
  }
  async forgot(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (user) {
      void this.issueEmail(user.id, user.email, 'RESET').catch(() => {
        this.logger.warn({ event: 'email.dispatch_failed', kind: 'RESET' });
      });
    }
    return {
      message:
        'Si existe una cuenta con ese email, recibirá instrucciones para continuar.',
    };
  }
  async resend(req: Request) {
    const id = await this.requireUser(req);
    const user = await this.db.user.findUniqueOrThrow({ where: { id } });
    if (!user.emailVerifiedAt) await this.issueEmail(id, user.email, 'VERIFY');
    return {
      message: 'Si corresponde, recibirá un enlace para verificar su email.',
    };
  }
  async changePassword(dto: ChangePasswordDto, req: Request, res: Response) {
    const access = await this.access(req);
    if (!access) throw new UnauthorizedException();
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: access.session.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user.passwordHash)
      throw new BadRequestException({
        code: 'LOCAL_PASSWORD_UNAVAILABLE',
        message: 'Esta cuenta no tiene una contraseña local configurada.',
      });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword)))
      throw new BadRequestException({
        code: 'CURRENT_PASSWORD_INVALID',
        message:
          'No pudimos actualizar la contraseña. Revise su contraseña actual e intente nuevamente.',
      });
    const passwordHash = await argon2.hash(dto.newPassword, passwordOptions);
    await this.db.$transaction(async (tx) => {
      const current = await lockUserCredentials(tx, user.id);
      const active = await tx.session.findFirst({
        where: {
          id: access.session.id,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!active || !current || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException({
          code: 'SESSION_EXPIRED',
          message: 'Su sesión finalizó. Inicie sesión nuevamente.',
        });
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.emailToken.updateMany({
        where: { userId: user.id, kind: 'RESET', usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    this.clearCookies(req, res);
    return {
      message:
        'Contraseña actualizada correctamente. Inicie sesión nuevamente.',
    };
  }
  async consume(token: string, kind: 'VERIFY' | 'RESET', password?: string) {
    const passwordHash = password
      ? await argon2.hash(password, passwordOptions)
      : undefined;
    const candidate = await this.db.emailToken.findUnique({
      where: { hash: hashToken(token) },
      select: { userId: true },
    });
    if (!candidate)
      throw new BadRequestException({
        code: 'TOKEN_INVALID',
        message: 'El enlace no es válido o expiró. Solicite uno nuevo.',
      });
    await this.db.$transaction(async (tx) => {
      await lockUserCredentials(tx, candidate.userId);
      const record = await tx.emailToken.findUnique({
        where: { hash: hashToken(token) },
      });
      if (!record || record.kind !== kind)
        throw new BadRequestException({
          code: 'TOKEN_INVALID',
          message: 'El enlace no es válido o expiró. Solicite uno nuevo.',
        });
      const consumed = await tx.emailToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new BadRequestException({
          code: 'TOKEN_INVALID',
          message: 'El enlace no es válido o expiró. Solicite uno nuevo.',
        });
      await tx.user.update({
        where: { id: record.userId },
        data:
          kind === 'VERIFY'
            ? { emailVerifiedAt: new Date() }
            : { passwordHash },
      });
      if (kind === 'RESET') {
        await tx.session.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.emailToken.updateMany({
          where: { userId: record.userId, kind: 'RESET', usedAt: null },
          data: { usedAt: new Date() },
        });
      }
    });
    return {
      message:
        kind === 'VERIFY'
          ? 'Email verificado correctamente.'
          : 'Contraseña actualizada correctamente. Inicie sesión.',
    };
  }
}
