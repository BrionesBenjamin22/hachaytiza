import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  name: string;
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  primaryLocationId: string;
}
export class LocationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  primaryLocationId: string;
}
export class EmailDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
export class TokenDto {
  @ApiProperty()
  @IsString()
  @Length(64, 64)
  token: string;
}
export class ResetPasswordDto extends TokenDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password: string;
}
export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  currentPassword: string;
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  newPassword: string;
}
