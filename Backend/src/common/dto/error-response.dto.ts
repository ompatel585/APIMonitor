import { ApiProperty } from '@nestjs/swagger';
import type { ErrorCode } from '../constants/error-codes.constants';

export class ErrorResponseDto {
  @ApiProperty()
  code!: ErrorCode;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  timestamp!: string;
}
