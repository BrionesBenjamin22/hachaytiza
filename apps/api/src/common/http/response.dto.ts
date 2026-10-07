import { ApiProperty } from '@nestjs/swagger';

export class PublicLocationResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['PROVINCIA', 'CIUDAD', 'LOCALIDAD', 'BARRIO', 'ZONA'] })
  type: string;
}
export class LocationResponse extends PublicLocationResponse {
  @ApiProperty({ format: 'uuid', nullable: true }) parentId: string | null;
}
export class LocationsResponse {
  @ApiProperty({ type: [LocationResponse] }) items: LocationResponse[];
}
export class UserResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() hasLocalPassword: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
  @ApiProperty({ type: PublicLocationResponse, nullable: true })
  primaryLocation: PublicLocationResponse | null;
}
export class SessionResponse {
  @ApiProperty() authenticated: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  accessExpiresAt: string | null;
  @ApiProperty() refreshAvailable: boolean;
  @ApiProperty({ type: UserResponse, nullable: true })
  user: UserResponse | null;
}
export class CsrfResponse {
  @ApiProperty() csrfToken: string;
}
export class MessageResponse {
  @ApiProperty() message: string;
}
export class MatchResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: PublicLocationResponse })
  location: PublicLocationResponse;
  @ApiProperty({ enum: ['FIVE', 'SIX', 'SEVEN'] }) footballType: string;
  @ApiProperty({ format: 'date-time' }) startsAt: string;
  @ApiProperty() venueName: string;
  @ApiProperty() address: string;
  @ApiProperty({ example: '5000.00' }) pricePerPerson: string;
  @ApiProperty() availablePlaces: number;
  @ApiProperty({ enum: ['OPEN', 'CLOSED'] }) status: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
}
export class MatchesResponse {
  @ApiProperty({ type: [MatchResponse] }) items: MatchResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty({ example: 9 }) pageSize: number;
  @ApiProperty() hasMore: boolean;
}
export class ProfileChangeResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'date-time' }) occurredAt: string;
  @ApiProperty({
    type: Object,
    example: { name: { before: 'Ana', after: 'Ana María' } },
  })
  changes: Record<string, unknown>;
}
export class ProfileHistoryResponse {
  @ApiProperty({ type: [ProfileChangeResponse] })
  items: ProfileChangeResponse[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty({ example: 3 }) pageSize: number;
  @ApiProperty() hasMore: boolean;
}
