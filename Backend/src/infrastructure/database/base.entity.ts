import { BeforeInsert, CreateDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { uuidV7 } from './uuid-v7.util';

export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidV7();
    }
  }
}
