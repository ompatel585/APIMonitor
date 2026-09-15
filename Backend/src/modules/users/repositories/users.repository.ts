import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async create(data: Pick<User, 'email' | 'displayName' | 'passwordHash'>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.repository.update({ id }, { isEmailVerified: true });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.repository.update({ id }, { passwordHash });
  }

  async update(id: string, data: Partial<Pick<User, 'displayName'>>): Promise<User | null> {
    await this.repository.update({ id }, data);
    return this.findById(id);
  }
}
