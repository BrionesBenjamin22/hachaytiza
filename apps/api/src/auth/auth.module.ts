import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CsrfService } from './csrf.service.js';
import { EmailService } from './email.service.js';
import { UsersModule } from '../users/users.module.js';
import { UsersController } from '../users/users.controller.js';
@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController, UsersController],
  providers: [AuthService, CsrfService, EmailService],
  exports: [AuthService, CsrfService],
})
export class AuthModule {}
