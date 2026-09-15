import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokensRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repository: Repository<PasswordResetToken>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const record = this.repository.create({ ...data, usedAt: null });
    return this.repository.save(record);
  }

  async markUsed(id: string): Promise<void> {
    await this.repository.update({ id }, { usedAt: new Date() });
  }
}
