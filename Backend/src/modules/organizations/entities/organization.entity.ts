import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;
}
