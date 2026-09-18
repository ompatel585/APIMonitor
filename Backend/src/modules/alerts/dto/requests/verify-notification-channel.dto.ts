import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyNotificationChannelDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;
}
