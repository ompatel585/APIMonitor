import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailConfig } from '@config/mail.config';

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const mailConfig = configService.getOrThrow<MailConfig>('mail');
    this.from = mailConfig.from;

    this.transporter = createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      auth: mailConfig.user ? { user: mailConfig.user, pass: mailConfig.password } : undefined,
    });
  }

  async send(input: SendMailInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}
