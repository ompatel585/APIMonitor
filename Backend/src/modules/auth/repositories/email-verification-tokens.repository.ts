import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';

@Injectable()
export class EmailVerificationTokensRepository {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly repository: Repository<EmailVerificationToken>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    const record = this.repository.create({ ...data, usedAt: null });
    return this.repository.save(record);
  }

  async markUsed(id: string): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }
}
