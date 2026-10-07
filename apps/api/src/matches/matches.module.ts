import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.module.js';
import { MatchesResponse } from '../common/http/response.dto.js';
export class MatchesQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() locationId: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}
@Injectable()
export class MatchesService {
  constructor(private readonly db: PrismaService) {}
  async list(query: MatchesQueryDto) {
    const where = {
      locationId: query.locationId,
      status: { in: ['OPEN', 'CLOSED'] as ('OPEN' | 'CLOSED')[] },
      startsAt: { gt: new Date() },
      location: { active: true },
    };
    const [items, total] = await this.db.$transaction(
      [
        this.db.match.findMany({
          where,
          select: {
            id: true,
            location: { select: { id: true, name: true, type: true } },
            footballType: true,
            startsAt: true,
            venueName: true,
            address: true,
            pricePerPerson: true,
            availablePlaces: true,
            status: true,
            description: true,
          },
          orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
          take: 9,
          skip: (query.page - 1) * 9,
        }),
        this.db.match.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return {
      items,
      total,
      page: query.page,
      pageSize: 9,
      hasMore: query.page * 9 < total,
    };
  }
}
@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}
  @ApiOkResponse({ type: MatchesResponse }) @Get() list(
    @Query() query: MatchesQueryDto,
  ) {
    return this.service.list(query);
  }
}
@Module({ controllers: [MatchesController], providers: [MatchesService] })
export class MatchesModule {}
