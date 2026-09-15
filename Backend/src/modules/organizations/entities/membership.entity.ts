import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '@infrastructure/database/base.entity';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from './organization.entity';
import { ROLES, type Role } from '../constants/roles';

@Entity('memberships')
@Unique(['organizationId', 'userId'])
@Index(['organizationId'])
export class Membership extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', enum: Object.values(ROLES) })
  role!: Role;
}
