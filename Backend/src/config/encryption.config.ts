import { registerAs } from '@nestjs/config';

export type EncryptionConfig = {
  key: string;
};

export const encryptionConfig = registerAs(
  'encryption',
  (): EncryptionConfig => ({
    key: process.env.ENCRYPTION_KEY ?? '',
  }),
);
