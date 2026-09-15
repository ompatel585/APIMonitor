import { Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@common/exceptions/not-found.exception';
import { UsersRepository } from '../repositories/users.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundDomainException('User');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(data: { email: string; displayName: string; passwordHash: string }): Promise<User> {
    return this.usersRepository.create(data);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepository.markEmailVerified(id);
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.updatePasswordHash(id, passwordHash);
  }

  async updateProfile(id: string, data: { displayName?: string }): Promise<User> {
    const user = await this.usersRepository.update(id, data);
    if (!user) {
      throw new NotFoundDomainException('User');
    }
    return user;
  }
}
