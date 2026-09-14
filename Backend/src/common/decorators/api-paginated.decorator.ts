import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CursorPageDto } from '../dto/cursor-page.dto';

export function ApiPaginated<TModel extends Type<unknown>>(
  model: TModel,
): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiExtraModels(CursorPageDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CursorPageDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
}
