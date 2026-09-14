import { registerAs } from '@nestjs/config';

export type MailConfig = {
  host?: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
};

export const mailConfig = registerAs(
  'mail',
  (): MailConfig => ({
    host: process.env.MAIL_HOST || undefined,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER || undefined,
    password: process.env.MAIL_PASSWORD || undefined,
    from: process.env.MAIL_FROM ?? 'noreply@apimonitor.local',
  }),
);
