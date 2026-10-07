import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { CsrfService } from './csrf.service.js';
import {
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  ChangePasswordDto,
} from './auth.dto.js';
import {
  SessionResponse,
  CsrfResponse,
  MessageResponse,
} from '../common/http/response.dto.js';
@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
  ) {}
  @ApiOkResponse({ type: MessageResponse })
  @Post('password/change')
  @HttpCode(200)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.changePassword(dto, req, res);
  }
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOkResponse({ type: CsrfResponse })
  @Get('csrf')
  csrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store');
    return this.csrf.issue(req, res);
  }
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOkResponse({ type: SessionResponse })
  @Get('session')
  session(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store');
    return this.auth.session(req);
  }
  @ApiCreatedResponse({ type: SessionResponse }) @Post('register') register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(dto, req, res);
  }
  @ApiOkResponse({ type: SessionResponse }) @Post('login') @HttpCode(200) login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, req, res);
  }
  @ApiOkResponse({ type: SessionResponse })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }
  @ApiNoContentResponse() @Post('logout') @HttpCode(204) logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }
  @ApiOkResponse({ type: MessageResponse })
  @Post('password/forgot')
  @HttpCode(200)
  forgot(@Body() dto: EmailDto) {
    return this.auth.forgot(dto.email);
  }
  @ApiOkResponse({ type: MessageResponse })
  @Post('password/reset')
  @HttpCode(200)
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.consume(dto.token, 'RESET', dto.password);
  }
  @ApiOkResponse({ type: MessageResponse })
  @Post('email/verify')
  @HttpCode(200)
  verify(@Body() dto: TokenDto) {
    return this.auth.consume(dto.token, 'VERIFY');
  }
  @ApiOkResponse({ type: MessageResponse })
  @Post('email/resend')
  @HttpCode(200)
  resend(@Req() req: Request) {
    return this.auth.resend(req);
  }
}
