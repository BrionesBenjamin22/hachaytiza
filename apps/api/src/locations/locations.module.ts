import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module.js';
import { LocationsResponse } from '../common/http/response.dto.js';
@Injectable()
export class LocationsService {
  constructor(private readonly db: PrismaService) {}
  async list() {
    return {
      items: await this.db.location.findMany({
        where: { active: true, type: { in: ['LOCALIDAD', 'BARRIO', 'ZONA'] } },
        select: { id: true, name: true, type: true, parentId: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
    };
  }
}
@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}
  @ApiOkResponse({ type: LocationsResponse }) @Get() list() {
    return this.service.list();
  }
}
@Module({ controllers: [LocationsController], providers: [LocationsService] })
export class LocationsModule {}
