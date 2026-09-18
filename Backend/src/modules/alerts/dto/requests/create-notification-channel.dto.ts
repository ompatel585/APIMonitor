import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CHANNEL_TYPES, type ChannelType } from '../../constants/channel-type';

export class CreateNotificationChannelDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: Object.values(CHANNEL_TYPES) })
  @IsIn(Object.values(CHANNEL_TYPES))
  type!: ChannelType;

  @ApiProperty({ description: 'An email address for EMAIL, a URL for WEBHOOK' })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  target!: string;
}
