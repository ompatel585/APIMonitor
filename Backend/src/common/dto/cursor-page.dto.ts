import { ApiProperty } from '@nestjs/swagger';

export class CursorPageDto<T> {
  @ApiProperty({ isArray: true })
  items!: T[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;
}
