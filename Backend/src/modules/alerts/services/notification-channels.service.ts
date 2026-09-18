import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { ConflictDomainException } from '@common/exceptions/conflict.exception';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { assertUrlAllowed, SsrfViolationError } from '@infrastructure/http/ssrf-guard';
import { EncryptionService } from '@infrastructure/encryption/encryption.service';
import { MailerService } from '@infrastructure/mailer/mailer.service';
import { channelVerificationEmail } from '@infrastructure/mailer/templates/channel-verification.template';
import { NotificationChannelsRepository } from '../repositories/notification-channels.repository';
import { AlertRulesRepository } from '../repositories/alert-rules.repository';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { CHANNEL_TYPES, type ChannelType } from '../constants/channel-type';

type CreateChannelInput = {
  name: string;
  type: ChannelType;
  target: string;
};

@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);

  constructor(
    private readonly notificationChannelsRepository: NotificationChannelsRepository,
    private readonly alertRulesRepository: AlertRulesRepository,
    private readonly encryptionService: EncryptionService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * A channel must be verified before it can receive alerts
   * (alerts/CLAUDE.md §6). EMAIL verification sends a token by mail; WEBHOOK
   * verification is a challenge/response the caller completes with
   * `verify()` using the token this method generates and stores (never
   * returned in the response DTO).
   */
  async create(organizationId: string, input: CreateChannelInput): Promise<NotificationChannel> {
    let encryptedSecret: string | null = null;

    if (input.type === CHANNEL_TYPES.WEBHOOK) {
      await this.assertWebhookUrlIsSafe(input.target);
      const secret = randomBytes(32).toString('hex');
      encryptedSecret = this.encryptionService.encrypt(secret);
    }

    const verificationToken = randomUUID();

    const channel = await this.notificationChannelsRepository.create({
      organizationId,
      name: input.name,
      type: input.type,
      target: input.target,
      encryptedSecret,
      verificationToken,
    });

    if (input.type === CHANNEL_TYPES.EMAIL) {
      const email = channelVerificationEmail(verificationToken);
      await this.mailerService.send({ to: input.target, subject: email.subject, text: email.text });
    }

    return channel;
  }

  async findByIdOrThrow(organizationId: string, id: string): Promise<NotificationChannel> {
    const channel = await this.notificationChannelsRepository.findByIdOrThrow(organizationId, id);
    if (!channel) {
      throw new NotFoundDomainException('NotificationChannel');
    }
    return channel;
  }

  async list(organizationId: string): Promise<NotificationChannel[]> {
    return this.notificationChannelsRepository.list(organizationId);
  }

  async verify(organizationId: string, id: string, token: string): Promise<NotificationChannel> {
    const channel = await this.findByIdOrThrow(organizationId, id);

    if (channel.verificationStatus === 'VERIFIED') {
      return channel;
    }

    if (!channel.verificationToken || channel.verificationToken !== token) {
      throw new ValidationDomainException('Invalid or expired verification token');
    }

    await this.notificationChannelsRepository.verify(id, new Date());
    return this.findByIdOrThrow(organizationId, id);
  }

  /**
   * Blocked with 409 when an active rule still references this channel —
   * never a silent cascade that leaves a rule notifying nobody
   * (alerts/CLAUDE.md §6).
   */
  async delete(organizationId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(organizationId, id);

    const referencingCount = await this.alertRulesRepository.countActiveReferencingChannel(organizationId, id);
    if (referencingCount > 0) {
      throw new ConflictDomainException(
        'Cannot delete a notification channel referenced by an active alert rule',
        'CHANNEL_IN_USE',
      );
    }

    await this.notificationChannelsRepository.delete(organizationId, id);
  }

  /** Used only by the notifications worker to decrypt a webhook secret for signing — never returned to a client. */
  decryptSecret(channel: NotificationChannel): string | null {
    return channel.encryptedSecret ? this.encryptionService.decrypt(channel.encryptedSecret) : null;
  }

  private async assertWebhookUrlIsSafe(url: string): Promise<void> {
    try {
      await assertUrlAllowed(url);
    } catch (error) {
      if (error instanceof SsrfViolationError) {
        throw new ValidationDomainException(error.message);
      }
      throw error;
    }
  }
}
