import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ValidationDomainException } from '@common/exceptions/validation.exception';

const MIN_PASSWORD_LENGTH = 12;

@Injectable()
export class PasswordService {
  async hash(plainPassword: string): Promise<string> {
    this.assertValid(plainPassword);
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }

  private assertValid(plainPassword: string): void {
    if (plainPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationDomainException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }
  }
}
