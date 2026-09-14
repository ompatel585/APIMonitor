import { Module } from '@nestjs/common';
import { SafeHttpClient } from './safe-http.client';

@Module({
  providers: [SafeHttpClient],
  exports: [SafeHttpClient],
})
export class HttpModule {}
