import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`Invalid identifier: ${value}`);
    }
    return value;
  }
}
