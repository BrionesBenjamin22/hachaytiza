import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LocationsModule,
    MatchesModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
