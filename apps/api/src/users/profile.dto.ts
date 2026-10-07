import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsUUID,
  Length,
  ValidateIf,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  primaryLocationId?: string;
}
export class ProfileHistoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}
