import { Body, Controller, Get, Patch, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { LocationDto } from '../auth/auth.dto.js';
import { UsersService } from './users.service.js';
import { UserResponse } from '../common/http/response.dto.js';
import { UpdateProfileDto, ProfileHistoryQueryDto } from './profile.dto.js';
import { ProfileHistoryResponse } from '../common/http/response.dto.js';
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}
  @ApiOkResponse({ type: ProfileHistoryResponse })
  @Get('me/history')
  async history(@Query() query: ProfileHistoryQueryDto, @Req() req: Request) {
    return this.users.history(await this.auth.requireUser(req), query.page);
  }
  @ApiOkResponse({ type: UserResponse }) @Get('me') async profile(
    @Req() req: Request,
  ) {
    return this.users.profile(await this.auth.requireUser(req));
  }
  @ApiOkResponse({ type: UserResponse }) @Patch('me') async update(
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    return this.users.updateProfile(await this.auth.requireUser(req), dto);
  }
  @ApiOkResponse({ type: UserResponse }) @Patch('me/location') async location(
    @Body() dto: LocationDto,
    @Req() req: Request,
  ) {
    return this.users.location(
      await this.auth.requireUser(req),
      dto.primaryLocationId,
    );
  }
}
